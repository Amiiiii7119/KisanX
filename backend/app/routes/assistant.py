from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from pydantic import BaseModel, Field
from supabase import Client, create_client

from app.config import settings
from app.services.rag_service import rag_service
from app.services.ollama_service import ollama_service
from app.services.supabase_service import get_server_supabase


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/assistant",
    tags=["Assistant"],
)


# ============================================================
# SWAGGER / BEARER AUTHENTICATION
# ============================================================

bearer_scheme = HTTPBearer(
    auto_error=True
)


# ============================================================
# REQUEST MODELS
# ============================================================

class ChatMessage(BaseModel):
    role: str
    content: str


class AssistantChatRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=2000,
    )

    crop: str = "Sugarcane"

    disease: Optional[str] = None

    classifier_confidence: Optional[float] = None

    language: str = "en"

    # --------------------------------------------------------
    # FARM MEMORY REFERENCES
    # --------------------------------------------------------

    farm_id: Optional[str] = None

    plot_id: Optional[str] = None

    crop_cycle_id: Optional[str] = None

    scan_id: Optional[str] = None

    # --------------------------------------------------------
    # BACKWARD-COMPATIBLE MANUAL CONTEXT
    # --------------------------------------------------------

    farm_context: Optional[str] = None

    # --------------------------------------------------------
    # FRONTEND HISTORY
    # --------------------------------------------------------

    history: List[ChatMessage] = Field(
        default_factory=list,
        max_length=10,
    )


# ============================================================
# RESPONSE SCHEMA
# ============================================================

ASSISTANT_SCHEMA = {
    "type": "object",
    "properties": {
        "answer": {
            "type": "string",
        },
        "evidence_sufficient": {
            "type": "boolean",
        },
        "needs_more_information": {
            "type": "boolean",
        },
        "follow_up_question": {
            "type": ["string", "null"],
        },
        "sources": {
            "type": "array",
            "items": {
                "type": "integer",
            },
        },
    },
    "required": [
        "answer",
        "evidence_sufficient",
        "needs_more_information",
        "follow_up_question",
        "sources",
    ],
}


# ============================================================
# AUTHENTICATION
# ============================================================

def get_authenticated_user(
    credentials: HTTPAuthorizationCredentials,
):
    """
    Validate the Supabase access token.

    HTTPBearer handles the Authorization header and
    extracts the Bearer token.

    Server-side database operations use the backend
    secret key through get_server_supabase().
    """

    token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token is missing.",
        )

    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_URL is not configured.",
        )

    if not settings.supabase_publishable_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "SUPABASE_PUBLISHABLE_KEY "
                "is not configured."
            ),
        )

    try:
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
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired access token.",
            )

        return user

    except HTTPException:
        raise

    except Exception as exc:
        print("")
        print(
            "========== ASSISTANT AUTH ERROR =========="
        )
        print(
            "ERROR TYPE:",
            type(exc).__name__,
        )
        print(
            "ERROR:",
            repr(exc),
        )
        print(
            "=========================================="
        )
        print("")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        ) from exc


# ============================================================
# RETRIEVAL CONFIDENCE
# ============================================================

def calculate_retrieval_confidence(
    documents: list,
) -> str:

    if not documents:
        return "low"

    similarities = []

    for document in documents:

        similarity = document.get(
            "similarity"
        )

        if similarity is None:
            continue

        try:
            similarities.append(
                float(similarity)
            )

        except (
            TypeError,
            ValueError,
        ):
            continue

    if not similarities:
        return "low"

    top_similarity = max(
        similarities
    )

    if top_similarity >= 0.80:
        return "high"

    if top_similarity >= 0.65:
        return "medium"

    return "low"


# ============================================================
# SOURCE VALIDATION
# ============================================================

def validate_source_ids(
    source_ids,
    document_count: int,
) -> List[int]:

    if not isinstance(
        source_ids,
        list,
    ):
        return []

    valid_sources = []

    for source_id in source_ids:

        if not isinstance(
            source_id,
            int,
        ):
            continue

        if (
            1
            <= source_id
            <= document_count
        ):
            valid_sources.append(
                source_id
            )

    return sorted(
        set(valid_sources)
    )


# ============================================================
# CLEAN ANSWER
# ============================================================

def clean_answer(
    answer: str,
) -> str:

    if not answer:
        return (
            "I don't have enough trusted "
            "agricultural evidence to answer "
            "that safely."
        )

    import re

    answer = re.sub(
        r"\s*\*\\?source[s]?\*?\s*:\s*"
        r"\[[^\]]*\]",
        "",
        answer,
        flags=re.IGNORECASE,
    )

    answer = re.sub(
        r"\s*\[[0-9]+(?:\s*,\s*[0-9]+)*\]\s*$",
        "",
        answer,
    )

    answer = answer.replace(
        "roughening",
        "rouging",
    )

    answer = answer.replace(
        "Roughening",
        "Rouging",
    )

    return answer.strip()


# ============================================================
# VERIFY FARM
# ============================================================

def verify_farm_ownership(
    supabase: Client,
    farm_id: str,
    user_id: str,
) -> Dict[str, Any]:

    response = (
        supabase
        .table("farms")
        .select("*")
        .eq("id", farm_id)
        .eq("owner_id", user_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found.",
        )

    return response.data[0]


# ============================================================
# VERIFY PLOT
# ============================================================

def verify_plot_ownership(
    supabase: Client,
    plot_id: str,
    farm_id: str,
    user_id: str,
) -> Dict[str, Any]:

    response = (
        supabase
        .table("plots")
        .select("*")
        .eq("id", plot_id)
        .eq("farm_id", farm_id)
        .eq("owner_id", user_id)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plot not found.",
        )

    return response.data[0]


# ============================================================
# VERIFY CROP CYCLE
# ============================================================

def verify_crop_cycle_ownership(
    supabase: Client,
    crop_cycle_id: str,
    plot_id: Optional[str],
    user_id: str,
) -> Dict[str, Any]:

    query = (
        supabase
        .table("crop_cycles")
        .select("*")
        .eq("id", crop_cycle_id)
        .eq("owner_id", user_id)
    )

    if plot_id:
        query = query.eq(
            "plot_id",
            plot_id,
        )

    response = (
        query
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crop cycle not found.",
        )

    return response.data[0]


# ============================================================
# VERIFY SCAN
# ============================================================

def verify_scan_ownership(
    supabase: Client,
    scan_id: str,
    farm_id: str,
    plot_id: Optional[str],
    user_id: str,
) -> Dict[str, Any]:

    query = (
        supabase
        .table("crop_scans")
        .select("*")
        .eq("id", scan_id)
        .eq("farm_id", farm_id)
        .eq("owner_id", user_id)
    )

    if plot_id:
        query = query.eq(
            "plot_id",
            plot_id,
        )

    response = (
        query
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found.",
        )

    return response.data[0]


# ============================================================
# LOAD FARM MEMORY
# ============================================================

def load_farm_context(
    supabase: Client,
    farm_id: str,
    user_id: str,
    plot_id: Optional[str] = None,
    crop_cycle_id: Optional[str] = None,
) -> List[Dict[str, Any]]:

    # --------------------------------------------------------
    # IMPORTANT
    #
    # Load all memory belonging to the farm first.
    #
    # We then filter it in Python according to the
    # Farm -> Plot -> Crop Cycle hierarchy.
    #
    # This prevents farm-level memory from disappearing
    # when a specific plot or crop cycle is selected.
    # --------------------------------------------------------

    query = (
        supabase
        .table("farm_context_entries")
        .select("*")
        .eq("farm_id", farm_id)
        .eq("owner_id", user_id)
    )

    response = (
        query
        .order(
            "recorded_at",
            desc=True,
        )
        .limit(200)
        .execute()
    )

    entries = response.data or []

    filtered_entries = []

    for entry in entries:

        entry_plot_id = entry.get(
            "plot_id"
        )

        entry_crop_cycle_id = entry.get(
            "crop_cycle_id"
        )

        # ====================================================
        # 1. FARM-LEVEL MEMORY
        #
        # plot_id = NULL
        # crop_cycle_id = NULL
        #
        # Available throughout the farm.
        # ====================================================

        if (
            entry_plot_id is None
            and entry_crop_cycle_id is None
        ):
            filtered_entries.append(
                entry
            )

            continue

        # ====================================================
        # 2. PLOT-LEVEL MEMORY
        #
        # plot_id = selected plot
        # crop_cycle_id = NULL
        #
        # Available for that plot.
        # ====================================================

        if (
            entry_plot_id is not None
            and entry_crop_cycle_id is None
        ):

            if (
                plot_id
                and entry_plot_id == plot_id
            ):
                filtered_entries.append(
                    entry
                )

            continue

        # ====================================================
        # 3. CROP-CYCLE-LEVEL MEMORY
        #
        # crop_cycle_id = selected cycle
        #
        # Available for that crop cycle.
        # ====================================================

        if (
            entry_crop_cycle_id is not None
            and entry_crop_cycle_id == crop_cycle_id
        ):

            # If this memory also belongs to a plot,
            # make sure that plot is the selected plot.
            if (
                entry_plot_id is not None
                and entry_plot_id != plot_id
            ):
                continue

            filtered_entries.append(
                entry
            )

            continue

    # --------------------------------------------------------
    # Return newest 100 relevant entries.
    # --------------------------------------------------------

    return filtered_entries[:100]


# ============================================================
# FORMAT FARM MEMORY
# ============================================================

def format_farm_context(
    context_entries: List[Dict[str, Any]],
) -> str:

    if not context_entries:
        return (
            "No persistent farm context available."
        )

    lines = []

    for entry in context_entries:

        category = (
            entry.get("category")
            or "unknown"
        )

        key = (
            entry.get("key")
            or "unknown"
        )

        source_type = (
            entry.get("source_type")
            or "unknown"
        )

        confidence = (
            entry.get("confidence")
            or "unknown"
        )

        value_text = entry.get(
            "value_text"
        )

        value_number = entry.get(
            "value_number"
        )

        value_json = entry.get(
            "value_json"
        )

        if value_text is not None:
            value = value_text

        elif value_number is not None:
            value = str(
                value_number
            )

        elif value_json is not None:
            value = str(
                value_json
            )

        else:
            value = "No value"

        lines.append(
            f"- Category: {category}; "
            f"Key: {key}; "
            f"Value: {value}; "
            f"Source: {source_type}; "
            f"Confidence: {confidence}"
        )

    return "\n".join(lines)


# ============================================================
# LOAD PERSISTENT CONVERSATION
# ============================================================

def load_persistent_messages(
    supabase: Client,
    farm_id: str,
    user_id: str,
    plot_id: Optional[str] = None,
    crop_cycle_id: Optional[str] = None,
    scan_id: Optional[str] = None,
) -> List[Dict[str, Any]]:

    query = (
        supabase
        .table("assistant_messages")
        .select(
            "id,role,content,language,"
            "farm_id,plot_id,crop_cycle_id,"
            "scan_id,created_at"
        )
        .eq("farm_id", farm_id)
        .eq("owner_id", user_id)
    )

    if plot_id:
        query = query.eq(
            "plot_id",
            plot_id,
        )

    if crop_cycle_id:
        query = query.eq(
            "crop_cycle_id",
            crop_cycle_id,
        )

    if scan_id:
        query = query.eq(
            "scan_id",
            scan_id,
        )

    response = (
        query
        .order(
            "created_at",
            desc=True,
        )
        .limit(10)
        .execute()
    )

    messages = response.data or []

    messages.reverse()

    return messages


# ============================================================
# FORMAT CONVERSATION
# ============================================================

def format_conversation(
    messages: List[Dict[str, Any]],
) -> str:

    if not messages:
        return "No previous conversation."

    lines = []

    for message in messages:

        role = (
            message.get("role")
            or ""
        ).lower().strip()

        if role not in {
            "user",
            "assistant",
        }:
            continue

        content = (
            message.get("content")
            or ""
        ).strip()

        if not content:
            continue

        lines.append(
            f"{role.upper()}: {content}"
        )

    if not lines:
        return "No previous conversation."

    return "\n".join(lines)


# ============================================================
# SAVE MESSAGE
# ============================================================

def save_assistant_message(
    supabase: Client,
    user_id: str,
    farm_id: Optional[str],
    plot_id: Optional[str],
    crop_cycle_id: Optional[str],
    scan_id: Optional[str],
    role: str,
    content: str,
    language: str,
) -> Dict[str, Any]:

    row = {
        "owner_id": user_id,
        "farm_id": farm_id,
        "plot_id": plot_id,
        "crop_cycle_id": crop_cycle_id,
        "scan_id": scan_id,
        "role": role,
        "content": content,
        "language": language,
    }

    try:

        response = (
            supabase
            .table("assistant_messages")
            .insert(row)
            .execute()
        )

    except Exception as exc:

        print("")
        print(
            "========== ASSISTANT MESSAGE SAVE ERROR =========="
        )
        print(
            "ROLE:",
            role,
        )
        print(
            "ERROR TYPE:",
            type(exc).__name__,
        )
        print(
            "ERROR:",
            repr(exc),
        )
        print(
            "==================================================="
        )
        print("")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Failed to save assistant conversation."
            ),
        ) from exc

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Assistant conversation was not saved."
            ),
        )

    return response.data[0]


# ============================================================
# SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are KisanX Crop Doctor.

You are answering a farmer's follow-up question
about their sugarcane crop.

============================================================
CORE RULE
============================================================

Use ONLY the supplied retrieved evidence for
agricultural facts.

Farm memory and farmer-reported information are
CONTEXT, not scientific evidence.

Conversation history is CONTEXT only.

Conversation history is NOT agricultural evidence.

The AI disease prediction is also context,
not scientific proof.

============================================================
USE RETRIEVED EVIDENCE
============================================================

Read every supplied source.

If the sources directly answer the farmer's
question, provide the supported answer.

If the source contains a practical management
recommendation, explain that recommendation.

Do not simply say "consult ICAR" when the
retrieved evidence already contains relevant
guidance.

Do not extend a source beyond what it actually
supports.

============================================================
NEVER INVENT
============================================================

Never invent:

- pesticide names
- fungicide names
- insecticide names
- chemical doses
- concentrations
- application rates
- spray schedules
- fertilizer quantities
- disease causes
- transmission mechanisms
- weather thresholds
- temperature thresholds
- treatment timelines

unless explicitly supported by retrieved evidence.

If evidence gives a product but not its dose,
do not invent the dose.

============================================================
FARM MEMORY
============================================================

Farm memory may contain:

- farmer-reported observations
- measured values
- estimated values
- AI-inferred values
- external information

Treat each according to its source label.

Never turn:

farmer_reported

into:

measured fact.

Never turn:

estimated

into:

measured fact.

Never claim that a farmer-reported observation
was scientifically verified.

Use farm memory to understand the farmer's
specific situation and to personalize the answer.

============================================================
DIAGNOSIS
============================================================

Do not treat the AI prediction as a confirmed diagnosis.

Use wording such as:

"the scan indicates"

"this may be consistent with"

"check for"

when appropriate.

============================================================
INSUFFICIENT EVIDENCE
============================================================

If the retrieved evidence does not answer the
farmer's specific question:

DO NOT GUESS.

Set:

evidence_sufficient = false

and:

needs_more_information = true

if additional information is genuinely required.

============================================================
LANGUAGE
============================================================

Answer in the requested language.

English -> English.

Hindi -> Hindi.

Marathi -> Marathi.

Keep the answer simple and farmer-friendly.

============================================================
CONVERSATION
============================================================

Use previous messages to understand references
such as:

"this"

"it"

"the disease"

"what about that"

But do not treat previous answers as factual evidence.

============================================================
SOURCES
============================================================

Only return source numbers that directly support
the answer.

Never put source numbers inside the answer text.

============================================================
OUTPUT
============================================================

Return ONLY valid JSON matching the supplied schema.

No Markdown.

No text outside JSON.
"""


# ============================================================
# CHAT ROUTE
# ============================================================

@router.post(
    "/chat",
    dependencies=[
        Depends(bearer_scheme)
    ],
)
async def assistant_chat(
    request: AssistantChatRequest,
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
):

    # ========================================================
    # 1. AUTHENTICATE USER
    # ========================================================

    user = get_authenticated_user(
        credentials
    )

    user_id = user.id

    # ========================================================
    # 2. SERVER SUPABASE CLIENT
    # ========================================================

    supabase = get_server_supabase()

    # ========================================================
    # 3. VERIFY FARM / PLOT / CYCLE / SCAN
    # ========================================================

    if request.farm_id:

        verify_farm_ownership(
            supabase=supabase,
            farm_id=request.farm_id,
            user_id=user_id,
        )

    if request.plot_id:

        if not request.farm_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "farm_id is required when "
                    "plot_id is provided."
                ),
            )

        verify_plot_ownership(
            supabase=supabase,
            plot_id=request.plot_id,
            farm_id=request.farm_id,
            user_id=user_id,
        )

    if request.crop_cycle_id:

        if not request.farm_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "farm_id is required when "
                    "crop_cycle_id is provided."
                ),
            )

        verify_crop_cycle_ownership(
            supabase=supabase,
            crop_cycle_id=request.crop_cycle_id,
            plot_id=request.plot_id,
            user_id=user_id,
        )

    if request.scan_id:

        if not request.farm_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "farm_id is required when "
                    "scan_id is provided."
                ),
            )

        verify_scan_ownership(
            supabase=supabase,
            scan_id=request.scan_id,
            farm_id=request.farm_id,
            plot_id=request.plot_id,
            user_id=user_id,
        )

    # ========================================================
    # 4. LOAD PERSISTENT FARM MEMORY
    # ========================================================

    persistent_context_entries = []

    if request.farm_id:

        persistent_context_entries = (
            load_farm_context(
                supabase=supabase,
                farm_id=request.farm_id,
                user_id=user_id,
                plot_id=request.plot_id,
                crop_cycle_id=request.crop_cycle_id,
            )
        )

    persistent_farm_context = (
        format_farm_context(
            persistent_context_entries
        )
    )

    # ========================================================
    # 5. LOAD PERSISTENT CONVERSATION
    # ========================================================

    persistent_messages = []

    if request.farm_id:

        persistent_messages = (
            load_persistent_messages(
                supabase=supabase,
                farm_id=request.farm_id,
                user_id=user_id,
                plot_id=request.plot_id,
                crop_cycle_id=request.crop_cycle_id,
                scan_id=request.scan_id,
            )
        )

    persistent_history_text = (
        format_conversation(
            persistent_messages
        )
    )

    # ========================================================
    # 6. SAVE USER MESSAGE
    # ========================================================

    if request.farm_id:

        save_assistant_message(
            supabase=supabase,
            user_id=user_id,
            farm_id=request.farm_id,
            plot_id=request.plot_id,
            crop_cycle_id=request.crop_cycle_id,
            scan_id=request.scan_id,
            role="user",
            content=request.question,
            language=request.language,
        )

    # ========================================================
    # 7. BUILD RAG QUERY
    # ========================================================

    query_parts = [
        f"Crop: {request.crop}",
    ]

    if request.disease:

        query_parts.append(
            f"Disease: {request.disease}"
        )

    if request.classifier_confidence is not None:

        query_parts.append(
            "AI classifier confidence: "
            f"{request.classifier_confidence}"
        )

    if request.farm_context:

        query_parts.append(
            "Current farmer-provided context: "
            f"{request.farm_context}"
        )

    if persistent_farm_context:

        query_parts.append(
            "Persistent farm context: "
            f"{persistent_farm_context}"
        )

    query_parts.append(
        "Farmer question: "
        f"{request.question}"
    )

    retrieval_query = "\n".join(
        query_parts
    )

    # ========================================================
    # 8. RETRIEVE TRUSTED EVIDENCE
    # ========================================================

    try:

        documents = rag_service.retrieve(
            query=retrieval_query,
            match_count=5,
            crop=request.crop,
            disease=request.disease,
        )

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Knowledge retrieval failed: "
                f"{str(exc)}"
            ),
        ) from exc

    # ========================================================
    # 9. NO EVIDENCE
    # ========================================================

    if not documents:

        answer_text = (
            "I don't have enough trusted "
            "agricultural evidence to answer "
            "that specific question safely."
        )

        if request.farm_id:

            save_assistant_message(
                supabase=supabase,
                user_id=user_id,
                farm_id=request.farm_id,
                plot_id=request.plot_id,
                crop_cycle_id=request.crop_cycle_id,
                scan_id=request.scan_id,
                role="assistant",
                content=answer_text,
                language=request.language,
            )

        return {
            "question": request.question,
            "crop": request.crop,
            "disease": request.disease,
            "answer": {
                "answer": answer_text,
                "confidence": "low",
                "evidence_sufficient": False,
                "needs_more_information": True,
                "follow_up_question": (
                    "Can you provide more details "
                    "about what you are seeing "
                    "in the field?"
                ),
                "sources": [],
            },
            "retrieved_documents": 0,
            "evidence": [],
            "memory": {
                "farm_context_loaded": (
                    len(
                        persistent_context_entries
                    )
                ),
                "messages_loaded": (
                    len(
                        persistent_messages
                    )
                ),
                "conversation_saved": bool(
                    request.farm_id
                ),
            },
        }

    # ========================================================
    # 10. RETRIEVAL CONFIDENCE
    # ========================================================

    retrieval_confidence = (
        calculate_retrieval_confidence(
            documents
        )
    )

    # ========================================================
    # 11. BUILD TRUSTED EVIDENCE
    # ========================================================

    evidence_blocks = []

    for index, document in enumerate(
        documents,
        start=1,
    ):

        evidence_blocks.append(
            (
                f"SOURCE {index}\n"
                f"Title: "
                f"{document.get('title')}\n"
                f"Organization: "
                f"{document.get('source_name')}\n"
                f"URL: "
                f"{document.get('source_url')}\n"
                f"Similarity: "
                f"{document.get('similarity')}\n"
                f"Evidence:\n"
                f"{document.get('content')}"
            )
        )

    evidence = "\n\n".join(
        evidence_blocks
    )

    # ========================================================
    # 12. FRONTEND HISTORY
    # ========================================================

    frontend_history_lines = []

    for message in request.history[-10:]:

        role = (
            message.role
            .lower()
            .strip()
        )

        if role not in {
            "user",
            "assistant",
        }:
            continue

        content = (
            message.content
            .strip()
        )

        if not content:
            continue

        frontend_history_lines.append(
            f"{role.upper()}: {content}"
        )

    frontend_history_text = (
        "\n".join(
            frontend_history_lines
        )
        if frontend_history_lines
        else "No frontend conversation history."
    )

    # ========================================================
    # 13. GEMMA USER PROMPT
    # ========================================================

    user_prompt = f"""
CURRENT CROP

{request.crop}


CURRENT AI DISEASE PREDICTION

{request.disease or "Unknown"}


AI CLASSIFIER CONFIDENCE

{
    request.classifier_confidence
    if request.classifier_confidence is not None
    else "Not provided"
}


REQUESTED LANGUAGE

{request.language}


FARM ID

{request.farm_id or "Not provided"}


PLOT ID

{request.plot_id or "Not provided"}


CROP CYCLE ID

{request.crop_cycle_id or "Not provided"}


SCAN ID

{request.scan_id or "Not provided"}


CURRENT MANUAL FARM CONTEXT

{request.farm_context or "Not provided"}


PERSISTENT FARM MEMORY

{persistent_farm_context}


PERSISTENT CONVERSATION

{persistent_history_text}


FRONTEND CONVERSATION HISTORY

{frontend_history_text}


NEW FARMER QUESTION

{request.question}


TRUSTED RETRIEVED EVIDENCE

{evidence}


TASK

Answer the farmer's NEW question.

Use persistent farm memory only as context.

Use previous conversations only to understand
the context of the question.

Use ONLY the trusted retrieved evidence for
agricultural facts.

If the evidence directly supports an actionable
answer, give that answer clearly.

If the evidence does not support the requested
claim, do not guess.

Do not invent pesticide doses, concentrations,
treatment schedules, causes, transmission
mechanisms, or other missing facts.

If the farmer asks for information not present
in the retrieved evidence, explicitly explain
that the available trusted evidence is
insufficient.

Return ONLY valid JSON.
"""

    # ========================================================
    # 14. GEMMA
    # ========================================================

    result = await ollama_service.generate_json(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema=ASSISTANT_SCHEMA,
    )

    # ========================================================
    # 15. MODEL FAILURE
    # ========================================================

    if "error" in result:

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "The crop assistant could not "
                "generate a valid grounded answer."
            ),
        )

    # ========================================================
    # 16. VALIDATE SOURCES
    # ========================================================

    source_ids = validate_source_ids(
        result.get(
            "sources",
            [],
        ),
        len(documents),
    )

    # ========================================================
    # 17. CLEAN ANSWER
    # ========================================================

    answer_text = clean_answer(
        result.get(
            "answer",
            "",
        )
    )

    # ========================================================
    # 18. OUTPUT FLAGS
    # ========================================================

    evidence_sufficient = bool(
        result.get(
            "evidence_sufficient",
            False,
        )
    )

    needs_more_information = bool(
        result.get(
            "needs_more_information",
            False,
        )
    )

    follow_up_question = result.get(
        "follow_up_question"
    )

    if not isinstance(
        follow_up_question,
        str,
    ):

        follow_up_question = None

    # ========================================================
    # 19. SAVE ASSISTANT RESPONSE
    # ========================================================

    if request.farm_id:

        save_assistant_message(
            supabase=supabase,
            user_id=user_id,
            farm_id=request.farm_id,
            plot_id=request.plot_id,
            crop_cycle_id=request.crop_cycle_id,
            scan_id=request.scan_id,
            role="assistant",
            content=answer_text,
            language=request.language,
        )

    # ========================================================
    # 20. FINAL RESPONSE
    # ========================================================

    return {
        "question": request.question,

        "crop": request.crop,

        "disease": request.disease,

        "answer": {
            "answer": answer_text,

            "confidence": (
                retrieval_confidence
            ),

            "evidence_sufficient": (
                evidence_sufficient
            ),

            "needs_more_information": (
                needs_more_information
            ),

            "follow_up_question": (
                follow_up_question
            ),

            "sources": source_ids,
        },

        "retrieved_documents": len(
            documents
        ),

        "evidence": documents,

        "memory": {
            "farm_context_loaded": (
                len(
                    persistent_context_entries
                )
            ),

            "messages_loaded": (
                len(
                    persistent_messages
                )
            ),

            "conversation_saved": (
                bool(request.farm_id)
            ),
        },
    }