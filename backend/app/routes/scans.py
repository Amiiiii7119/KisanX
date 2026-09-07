from io import BytesIO
from typing import Optional
from uuid import uuid4

from fastapi import (
    APIRouter,
    File,
    Form,
    Header,
    HTTPException,
    UploadFile,
)
from PIL import Image

from app.config import settings
from app.services.crop_disease_model import crop_disease_model
from app.services.crop_advisory_service import (
    generate_crop_advisory,
)
from app.services.supabase_service import (
    get_server_supabase,
)


router = APIRouter(
    prefix="/api/scans",
    tags=["Scans"],
)


# ============================================================
# CONSTANTS
# ============================================================

MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

ALLOWED_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
}

STORAGE_BUCKET = "crop-scans"


# ============================================================
# AUTHENTICATION
# ============================================================

def extract_bearer_token(
    authorization: Optional[str],
) -> str:

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is required.",
        )

    parts = authorization.strip().split()

    if len(parts) != 2:
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization header.",
        )

    scheme, token = parts

    if scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Authorization must use Bearer token.",
        )

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Bearer token is missing.",
        )

    return token


def get_authenticated_user(
    authorization: Optional[str],
):
    """
    Validate the Supabase access token using the
    Supabase publishable key.

    Server-side database and storage operations use
    the secret key through get_server_supabase().
    """

    token = extract_bearer_token(
        authorization
    )

    try:
        from supabase import create_client

        if not settings.supabase_url:
            raise RuntimeError(
                "SUPABASE_URL is not configured."
            )

        if not settings.supabase_publishable_key:
            raise RuntimeError(
                "SUPABASE_PUBLISHABLE_KEY is not configured."
            )

        auth_client = create_client(
            settings.supabase_url,
            settings.supabase_publishable_key,
        )

        response = auth_client.auth.get_user(
            token
        )

        user = response.user

        if user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired access token.",
            )

        return user

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail=(
                "Authentication failed: "
                f"{str(exc)}"
            ),
        )


# ============================================================
# FARM / PLOT / CROP-CYCLE RESOLUTION
# ============================================================

def resolve_scan_context(
    owner_id: str,
    farm_id: Optional[str],
    plot_id: Optional[str],
) -> tuple[str, Optional[str], Optional[str]]:
    """
    Resolve and validate the farm, plot, and active crop cycle
    for a scan.

    The farmer only selects the farm and plot.

    KisanX automatically finds the ACTIVE crop cycle belonging
    to that plot.
    """

    if not farm_id:
        raise HTTPException(
            status_code=400,
            detail="Farm is required for a crop scan.",
        )

    if not plot_id:
        raise HTTPException(
            status_code=400,
            detail="Plot is required for a crop scan.",
        )

    supabase = get_server_supabase()

    # --------------------------------------------------------
    # 1. VERIFY FARM OWNERSHIP
    # --------------------------------------------------------

    try:
        farm_response = (
            supabase
            .table("farms")
            .select("id")
            .eq("id", farm_id)
            .eq("owner_id", owner_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to verify farm: "
                f"{str(exc)}"
            ),
        )

    farm_data = farm_response.data or []

    if not farm_data:
        raise HTTPException(
            status_code=404,
            detail=(
                "The selected farm was not found "
                "or does not belong to your account."
            ),
        )

    # --------------------------------------------------------
    # 2. VERIFY PLOT OWNERSHIP + FARM RELATIONSHIP
    # --------------------------------------------------------

    try:
        plot_response = (
            supabase
            .table("plots")
            .select("id, farm_id")
            .eq("id", plot_id)
            .eq("farm_id", farm_id)
            .eq("owner_id", owner_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to verify plot: "
                f"{str(exc)}"
            ),
        )

    plot_data = plot_response.data or []

    if not plot_data:
        raise HTTPException(
            status_code=404,
            detail=(
                "The selected plot was not found "
                "or does not belong to the selected farm."
            ),
        )

    # --------------------------------------------------------
    # 3. FIND ACTIVE CROP CYCLE
    # --------------------------------------------------------

    try:
        crop_cycle_response = (
            supabase
            .table("crop_cycles")
            .select(
                "id, plot_id, crop_name, variety, "
                "crop_stage, planting_date, soil_type, status"
            )
            .eq("plot_id", plot_id)
            .eq("owner_id", owner_id)
            .eq("status", "ACTIVE")
            .order(
                "created_at",
                desc=True,
            )
            .limit(1)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to resolve active crop cycle: "
                f"{str(exc)}"
            ),
        )

    crop_cycle_data = (
        crop_cycle_response.data or []
    )

    if not crop_cycle_data:
        raise HTTPException(
            status_code=409,
            detail=(
                "No active crop cycle was found for "
                "this plot. Please register an active "
                "sugarcane crop cycle before scanning."
            ),
        )

    crop_cycle = crop_cycle_data[0]

    crop_cycle_id = crop_cycle.get("id")

    if not crop_cycle_id:
        raise HTTPException(
            status_code=500,
            detail=(
                "The active crop cycle is missing its ID."
            ),
        )

    return (
        farm_id,
        plot_id,
        crop_cycle_id,
    )


# ============================================================
# IMAGE VALIDATION
# ============================================================

async def read_and_validate_image(
    file: UploadFile,
) -> tuple[bytes, Image.Image, str]:

    if not file:
        raise HTTPException(
            status_code=400,
            detail="Image file is required.",
        )

    content_type = (
        file.content_type or ""
    ).lower()

    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported image format. "
                "Use JPG, JPEG, PNG, or WEBP."
            ),
        )

    filename = file.filename or "scan.jpg"

    extension = (
        filename.rsplit(".", 1)[-1].lower()
        if "." in filename
        else ""
    )

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file extension. "
                "Use JPG, JPEG, PNG, or WEBP."
            ),
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty.",
        )

    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image size must not exceed 10 MB.",
        )

    try:
        image = Image.open(
            BytesIO(image_bytes)
        )

        image.verify()

        image = Image.open(
            BytesIO(image_bytes)
        ).convert("RGB")

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not a valid image.",
        )

    return (
        image_bytes,
        image,
        extension,
    )


# ============================================================
# MODEL PREDICTION
# ============================================================

def run_disease_prediction(
    image: Image.Image,
):
    """
    Run the trained MobileNetV3 disease classifier.

    Expected result:

    {
        "disease": "...",
        "confidence": 0.99,
        "class_probabilities": {...},
        ...
    }
    """

    try:
        prediction = (
            crop_disease_model.predict(
                image
            )
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Disease model inference failed: "
                f"{str(exc)}"
            ),
        )

    if not isinstance(
        prediction,
        dict,
    ):
        raise HTTPException(
            status_code=500,
            detail=(
                "Disease model returned an "
                "invalid prediction."
            ),
        )

    disease = prediction.get(
        "disease"
    )

    confidence = prediction.get(
        "confidence"
    )

    if not disease:
        raise HTTPException(
            status_code=500,
            detail=(
                "Disease model did not return "
                "a disease prediction."
            ),
        )

    try:
        confidence = float(
            confidence
        )

    except (
        TypeError,
        ValueError,
    ):
        raise HTTPException(
            status_code=500,
            detail=(
                "Disease model returned "
                "an invalid confidence."
            ),
        )

    prediction["confidence"] = confidence

    return prediction


# ============================================================
# STORAGE
# ============================================================

def upload_scan_image(
    image_bytes: bytes,
    extension: str,
    owner_id: str,
) -> str:

    supabase = get_server_supabase()

    scan_uuid = uuid4()

    storage_path = (
        f"{owner_id}/"
        f"{scan_uuid.hex}."
        f"{extension}"
    )

    try:
        supabase.storage.from_(
            STORAGE_BUCKET
        ).upload(
            storage_path,
            image_bytes,
            {
                "content-type": (
                    f"image/{extension}"
                    if extension != "jpg"
                    else "image/jpeg"
                ),
                "upsert": False,
            },
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to upload scan image "
                "to Supabase Storage: "
                f"{str(exc)}"
            ),
        )

    return storage_path


# ============================================================
# DATABASE INSERT
# ============================================================

def save_scan(
    owner_id: str,
    farm_id: Optional[str],
    plot_id: Optional[str],
    crop_cycle_id: Optional[str],
    image_url: str,
    prediction: dict,
    latitude: Optional[float],
    longitude: Optional[float],
):

    supabase = get_server_supabase()

    row = {
        "owner_id": owner_id,
        "farm_id": farm_id,
        "plot_id": plot_id,
        "crop_cycle_id": crop_cycle_id,
        "image_url": image_url,
        "disease": prediction.get(
            "disease"
        ),
        "confidence": prediction.get(
            "confidence"
        ),

        # ----------------------------------------------------
        # IMPORTANT:
        # No validated severity score is claimed here.
        # ----------------------------------------------------

        "severity": None,

        "latitude": latitude,
        "longitude": longitude,
    }

    try:
        response = (
            supabase
            .table("crop_scans")
            .insert(row)
            .execute()
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save crop scan: "
                f"{str(exc)}"
            ),
        )

    data = response.data or []

    if not data:
        raise HTTPException(
            status_code=500,
            detail=(
                "Crop scan was not saved "
                "by the database."
            ),
        )

    return data[0]


# ============================================================
# CREATE SCAN
# ============================================================

@router.post("/create")
async def create_scan(
    file: UploadFile = File(...),

    farm_id: Optional[str] = Form(
        default=None
    ),

    plot_id: Optional[str] = Form(
        default=None
    ),

    # --------------------------------------------------------
    # Kept for backward compatibility.
    #
    # The backend now resolves the active crop cycle
    # automatically instead of trusting the frontend.
    # --------------------------------------------------------

    crop_cycle_id: Optional[str] = Form(
        default=None
    ),

    latitude: Optional[float] = Form(
        default=None
    ),

    longitude: Optional[float] = Form(
        default=None
    ),

    language: str = Form(
        default="en"
    ),

    farm_context: Optional[str] = Form(
        default=None
    ),

    authorization: Optional[str] = Header(
        default=None
    ),
):

    # ========================================================
    # 1. AUTHENTICATE
    # ========================================================

    user = get_authenticated_user(
        authorization
    )

    owner_id = str(
        user.id
    )

    # ========================================================
    # 2. RESOLVE FARM / PLOT / ACTIVE CYCLE
    # ========================================================

    (
        resolved_farm_id,
        resolved_plot_id,
        resolved_crop_cycle_id,
    ) = resolve_scan_context(
        owner_id=owner_id,
        farm_id=farm_id,
        plot_id=plot_id,
    )

    # ========================================================
    # IMPORTANT:
    #
    # We intentionally DO NOT trust crop_cycle_id supplied
    # by the frontend.
    #
    # The backend determines the active cycle from the
    # authenticated user's farm + plot.
    # ========================================================

    crop_cycle_id = (
        resolved_crop_cycle_id
    )

    farm_id = (
        resolved_farm_id
    )

    plot_id = (
        resolved_plot_id
    )

    # ========================================================
    # 3. VALIDATE IMAGE
    # ========================================================

    (
        image_bytes,
        image,
        extension,
    ) = await read_and_validate_image(
        file
    )

    # ========================================================
    # 4. MOBILE NET DISEASE PREDICTION
    # ========================================================

    prediction = run_disease_prediction(
        image
    )

    disease = prediction[
        "disease"
    ]

    classifier_confidence = float(
        prediction[
            "confidence"
        ]
    )

    # ========================================================
    # 5. UPLOAD ORIGINAL IMAGE
    # ========================================================

    image_path = upload_scan_image(
        image_bytes=image_bytes,
        extension=extension,
        owner_id=owner_id,
    )

    # ========================================================
    # 6. SAVE SCAN
    # ========================================================

    scan = save_scan(
        owner_id=owner_id,
        farm_id=farm_id,
        plot_id=plot_id,
        crop_cycle_id=crop_cycle_id,
        image_url=image_path,
        prediction=prediction,
        latitude=latitude,
        longitude=longitude,
    )

    # ========================================================
    # 7. RAG + GEMMA ADVISORY
    # ========================================================

    try:

        advisory = await generate_crop_advisory(
            disease=disease,
            classifier_confidence=(
                classifier_confidence
            ),
            crop="Sugarcane",
            language=language,
            farm_context=farm_context,
        )

    except Exception as exc:

        # ----------------------------------------------------
        # IMPORTANT:
        #
        # The scan has already been successfully classified
        # and saved.
        #
        # Advisory failure must NOT erase the scan.
        # ----------------------------------------------------

        advisory = {
            "answer": (
                "The crop scan was completed, "
                "but a grounded advisory could "
                "not be generated right now."
            ),
            "confidence": "low",
            "evidence_sufficient": False,
            "needs_more_information": True,
            "follow_up_question": (
                "Please try asking Crop Doctor "
                "again."
            ),
            "sources": [],
            "retrieved_documents": 0,
            "evidence": [],
            "error": str(exc),
        }

    # ========================================================
    # 8. FINAL RESPONSE
    # ========================================================

    return {
        "success": True,

        "scan_id": scan.get(
            "id"
        ),

        "scan": {
            "id": scan.get(
                "id"
            ),

            "image_url": image_path,

            "farm_id": farm_id,

            "plot_id": plot_id,

            "crop_cycle_id": crop_cycle_id,

            "latitude": latitude,

            "longitude": longitude,

            "created_at": scan.get(
                "created_at"
            ),
        },

        "prediction": prediction,

        "advisory": advisory,
    }