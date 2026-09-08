from typing import Any, Dict, Optional

from app.services.rag_service import rag_service
from app.services.ollama_service import ollama_service


ADVISORY_SCHEMA = {
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


def validate_sources(
    sources: Any,
    document_count: int,
) -> list[int]:

    if not isinstance(
        sources,
        list,
    ):
        return []

    valid = []

    for source in sources:

        if not isinstance(
            source,
            int,
        ):
            continue

        if (
            1
            <= source
            <= document_count
        ):
            valid.append(
                source
            )

    return sorted(
        set(valid)
    )


def clean_answer(
    answer: Any,
) -> str:

    if not isinstance(
        answer,
        str,
    ):
        return (
            "I don't have enough trusted "
            "agricultural evidence to answer "
            "that safely."
        )

    import re

    answer = re.sub(
        r"\s*source[s]?\s*:\s*"
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


SYSTEM_PROMPT = """
You are KisanX Crop Doctor.

You provide evidence-grounded agricultural guidance
to farmers after an AI crop-disease scan.

============================================================
MOST IMPORTANT RULE
============================================================

The image classifier prediction is an AI prediction.

It is NOT automatically a confirmed diagnosis.

Use the disease prediction as context.

Use ONLY the supplied trusted retrieved evidence
for agricultural facts.

Do not use your internal agricultural knowledge
as evidence.

============================================================
USE THE EVIDENCE PROPERLY
============================================================

Read ALL supplied sources carefully.

If a retrieved source contains a practical
management recommendation that directly applies
to the farmer's question, USE that recommendation.

Do not merely tell the farmer to "consult the source"
when the supplied evidence already contains the
relevant practical guidance.

However, do not extend the recommendation beyond
what the source actually says.

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

unless explicitly supported by the supplied evidence.

If a source mentions a chemical or treatment but
does NOT provide a dose or concentration, do not
invent a dose or concentration.

============================================================
DIAGNOSIS CAUTION
============================================================

The classifier result is not laboratory confirmation.

Use language such as:

"the scan indicates"

"the result is consistent with"

"this may be associated with"

"check for"

when certainty is not established.

Do not claim that a photograph alone proves
the disease.

============================================================
ACTIONABLE GUIDANCE
============================================================

When evidence supports an action:

- clearly explain what the farmer should check
- clearly explain what action is supported
- keep the instruction practical
- do not bury the recommendation in generic disclaimers

For example, if retrieved evidence explicitly
supports a disease-management action, explain that
action rather than only saying "seek expert advice."

============================================================
INSUFFICIENT EVIDENCE
============================================================

If the retrieved evidence does not answer the
specific question:

DO NOT GUESS.

Explain that the available trusted evidence is
insufficient for that specific question.

Set:

evidence_sufficient = false

and

needs_more_information = true

when additional information is genuinely required.

============================================================
LANGUAGE
============================================================

Answer in the same language requested by the farmer.

English -> English.

Hindi -> Hindi.

Marathi -> Marathi.

Keep the language simple and farmer-friendly.

============================================================
TERMINOLOGY
============================================================

Use "rouging" when referring to removal of infected
plants.

Never use "roughening" for this meaning.

============================================================
SOURCES
============================================================

Only cite source numbers that directly support
the answer.

Do not automatically cite every retrieved source.

Never put source numbers inside the natural-language
answer.

The source numbers belong ONLY in the "sources" field.

============================================================
FOLLOW-UP
============================================================

Only ask a follow-up question when it is genuinely
necessary.

Do not ask unnecessary questions.

============================================================
OUTPUT
============================================================

Return ONLY valid JSON matching the supplied schema.

No Markdown.

No text outside JSON.
"""


async def generate_crop_advisory(
    disease: str,
    classifier_confidence: float,
    crop: str,
    language: str = "en",
    farm_context: Optional[str] = None,
) -> Dict[str, Any]:

    query_parts = [
        f"Crop: {crop}",
        f"Detected disease: {disease}",
        (
            "Provide a practical farmer advisory "
            "for this disease."
        ),
    ]

    if farm_context:
        query_parts.append(
            f"Farm context: {farm_context}"
        )

    retrieval_query = "\n".join(
        query_parts
    )

    documents = rag_service.retrieve(
        query=retrieval_query,
        match_count=5,
        crop=crop,
        disease=disease,
    )

    if not documents:

        return {
            "answer": (
                "The scan produced a result, but "
                "I do not have enough trusted "
                "agricultural evidence to provide "
                "a safe advisory."
            ),
            "confidence": "low",
            "evidence_sufficient": False,
            "needs_more_information": True,
            "follow_up_question": (
                "Can you provide more details about "
                "what you are seeing in the field?"
            ),
            "sources": [],
            "retrieved_documents": 0,
            "evidence": [],
        }

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

    user_prompt = f"""
CROP

{crop}

AI SCAN RESULT

Detected disease:
{disease}

Classifier confidence:
{classifier_confidence}

REQUESTED LANGUAGE

{language}

FARM CONTEXT

{farm_context or "Not provided"}

TRUSTED RETRIEVED EVIDENCE

{evidence}

TASK

Generate a practical initial advisory for the farmer.

Explain what the AI scan may indicate.

Tell the farmer what to check in the field.

If the supplied evidence contains practical
management guidance relevant to this disease,
use that guidance directly.

Do not merely tell the farmer to consult the
source if the source already contains the
relevant recommendation.

Only provide actions supported by the supplied
evidence.

Do not invent missing treatment information.

If a chemical dose, concentration, application
rate, or schedule is not explicitly present in
the evidence, do not provide one.

The AI scan is a prediction, not absolute proof.

Return valid JSON only.
"""

    result = await ollama_service.generate_json(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        schema=ADVISORY_SCHEMA,
    )

    if "error" in result:

        return {
            "answer": (
                "The scan completed, but the "
                "advisory service could not safely "
                "generate a grounded recommendation."
            ),
            "confidence": "low",
            "evidence_sufficient": False,
            "needs_more_information": True,
            "follow_up_question": (
                "Please try asking Crop Doctor again."
            ),
            "sources": [],
            "retrieved_documents": len(
                documents
            ),
            "evidence": documents,
            "error": result,
        }

    sources = validate_sources(
        result.get(
            "sources",
            [],
        ),
        len(documents),
    )

    answer = clean_answer(
        result.get(
            "answer",
            "",
        )
    )

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

    return {
        "answer": answer,

        "confidence": (
            calculate_retrieval_confidence(
                documents
            )
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

        "sources": sources,

        "retrieved_documents": len(
            documents
        ),

        "evidence": documents,
    }
