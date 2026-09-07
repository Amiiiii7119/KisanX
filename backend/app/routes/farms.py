from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from supabase import Client, create_client

from app.schemas.farms import FarmRegistrationRequest


router = APIRouter(
    prefix="/api/farms",
    tags=["Farms"],
)


class AuthenticatedUser(BaseModel):
    id: str


def get_settings():
    from app.config import settings
    return settings


def get_supabase() -> Client:
    settings = get_settings()

    # ---------------------------------------------------------
    # DEBUG: CHECK SUPABASE CONFIGURATION
    # ---------------------------------------------------------

    print("")
    print("========== SUPABASE CONFIG CHECK ==========")
    print("SUPABASE_URL loaded:", bool(settings.supabase_url))
    print(
        "SUPABASE_PUBLISHABLE_KEY loaded:",
        bool(settings.supabase_publishable_key),
    )
    print(
        "SUPABASE_SERVICE_KEY loaded:",
        bool(settings.supabase_service_key),
    )
    print("============================================")
    print("")

    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase URL is not configured.",
        )

    if not settings.supabase_service_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase server secret is not configured.",
        )

    try:
        return create_client(
            settings.supabase_url,
            settings.supabase_service_key,
        )
    except Exception as exc:
        print("========== SUPABASE CLIENT ERROR ==========")
        print(type(exc).__name__)
        print(repr(exc))
        print("============================================")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase client creation failed: {str(exc)}",
        ) from exc


def get_authenticated_user(
    authorization: str = Header(...),
) -> AuthenticatedUser:

    # ---------------------------------------------------------
    # CHECK AUTHORIZATION HEADER
    # ---------------------------------------------------------

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header.",
        )

    token = authorization.replace(
        "Bearer ",
        "",
        1,
    ).strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access token.",
        )

    settings = get_settings()

    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase URL is not configured.",
        )

    if not settings.supabase_publishable_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase publishable key is not configured.",
        )

    # ---------------------------------------------------------
    # VERIFY USER TOKEN
    # ---------------------------------------------------------

    try:
        supabase = create_client(
            settings.supabase_url,
            settings.supabase_publishable_key,
        )

        response = supabase.auth.get_user(token)

    except Exception as exc:
        print("")
        print("========== AUTHENTICATION ERROR ==========")
        print("ERROR TYPE:", type(exc).__name__)
        print("ERROR:", repr(exc))
        print("==========================================")
        print("")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        ) from exc

    if not response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user not found.",
        )

    print(
        "Authenticated user:",
        response.user.id,
    )

    return AuthenticatedUser(
        id=response.user.id,
    )


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
)
def register_farm(
    payload: FarmRegistrationRequest,
    user: AuthenticatedUser = Depends(
        get_authenticated_user
    ),
):

    # ---------------------------------------------------------
    # CREATE SUPABASE CLIENT
    # ---------------------------------------------------------

    supabase = get_supabase()

    farm_id = None
    plot_id = None

    try:

        # =====================================================
        # 1. CREATE FARM
        # =====================================================

        farm_data = {
            "owner_id": user.id,
            "name": payload.farm.name,
            "village": payload.farm.village,
            "district": payload.farm.district,
            "latitude": payload.farm.latitude,
            "longitude": payload.farm.longitude,
            "area_acres": payload.farm.area_acres,
        }

        print("")
        print("========== CREATING FARM ==========")
        print(farm_data)
        print("====================================")

        farm_response = (
            supabase
            .table("farms")
            .insert(farm_data)
            .execute()
        )

        if not farm_response.data:
            raise Exception(
                "Farm insert returned no data."
            )

        farm = farm_response.data[0]
        farm_id = farm["id"]

        print(
            "Farm created successfully:",
            farm_id,
        )

        # =====================================================
        # 2. CREATE PLOT
        # =====================================================

        plot_data = {
            "farm_id": farm_id,
            "owner_id": user.id,
            "name": payload.plot.name,
            "area_acres": payload.plot.area_acres,
            "latitude": payload.plot.latitude,
            "longitude": payload.plot.longitude,
            "boundary": payload.plot.boundary,
        }

        print("")
        print("========== CREATING PLOT ==========")
        print(plot_data)
        print("====================================")

        plot_response = (
            supabase
            .table("plots")
            .insert(plot_data)
            .execute()
        )

        if not plot_response.data:
            raise Exception(
                "Plot insert returned no data."
            )

        plot = plot_response.data[0]
        plot_id = plot["id"]

        print(
            "Plot created successfully:",
            plot_id,
        )

        # =====================================================
        # 3. CREATE CROP CYCLE
        # =====================================================

        crop_cycle_data = {
            "plot_id": plot_id,
            "owner_id": user.id,
            "crop_name": payload.crop_cycle.crop_name,
            "variety": payload.crop_cycle.variety,
            "crop_stage": payload.crop_cycle.crop_stage,
            "planting_date": (
                payload.crop_cycle.planting_date.isoformat()
                if payload.crop_cycle.planting_date
                else None
            ),
            "soil_type": payload.crop_cycle.soil_type,
            "status": "ACTIVE",
        }

        print("")
        print("======= CREATING CROP CYCLE =======")
        print(crop_cycle_data)
        print("====================================")

        crop_response = (
            supabase
            .table("crop_cycles")
            .insert(crop_cycle_data)
            .execute()
        )

        if not crop_response.data:
            raise Exception(
                "Crop cycle insert returned no data."
            )

        crop_cycle = crop_response.data[0]

        print(
            "Crop cycle created successfully:",
            crop_cycle["id"],
        )

        # =====================================================
        # SUCCESS
        # =====================================================

        print("")
        print("==========================================")
        print("     FARM REGISTRATION SUCCESSFUL")
        print("==========================================")
        print("")

        return {
            "success": True,
            "message": "Farm registered successfully.",
            "farm": farm,
            "plot": plot,
            "crop_cycle": crop_cycle,
        }

    # =========================================================
    # FASTAPI HTTP ERROR
    # =========================================================

    except HTTPException:
        print("")
        print("========== HTTP ERROR ==========")
        print("An HTTP error occurred.")
        print("================================")
        print("")

        # Rollback plot
        if plot_id:
            try:
                (
                    supabase
                    .table("plots")
                    .delete()
                    .eq("id", plot_id)
                    .execute()
                )
            except Exception as rollback_error:
                print(
                    "Plot rollback failed:",
                    repr(rollback_error),
                )

        # Rollback farm
        if farm_id:
            try:
                (
                    supabase
                    .table("farms")
                    .delete()
                    .eq("id", farm_id)
                    .execute()
                )
            except Exception as rollback_error:
                print(
                    "Farm rollback failed:",
                    repr(rollback_error),
                )

        raise

    # =========================================================
    # DATABASE / UNKNOWN ERROR
    # =========================================================

    except Exception as exc:

        print("")
        print("==============================================")
        print("       FARM REGISTRATION ERROR")
        print("==============================================")
        print("ERROR TYPE:")
        print(type(exc).__name__)
        print("")
        print("ERROR:")
        print(repr(exc))
        print("")
        print("ERROR STRING:")
        print(str(exc))
        print("==============================================")
        print("")

        # -----------------------------------------------------
        # ROLLBACK PLOT
        # -----------------------------------------------------

        if plot_id:
            try:
                (
                    supabase
                    .table("plots")
                    .delete()
                    .eq("id", plot_id)
                    .execute()
                )

                print(
                    "Plot rollback successful."
                )

            except Exception as rollback_error:
                print(
                    "Plot rollback failed:",
                    repr(rollback_error),
                )

        # -----------------------------------------------------
        # ROLLBACK FARM
        # -----------------------------------------------------

        if farm_id:
            try:
                (
                    supabase
                    .table("farms")
                    .delete()
                    .eq("id", farm_id)
                    .execute()
                )

                print(
                    "Farm rollback successful."
                )

            except Exception as rollback_error:
                print(
                    "Farm rollback failed:",
                    repr(rollback_error),
                )

        # -----------------------------------------------------
        # RETURN REAL ERROR
        # -----------------------------------------------------

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Farm registration failed: {str(exc)}",
        ) from exc