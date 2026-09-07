from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

from app.routes.assistant import (
    router as assistant_router,
)
from app.routes.farms import (
    router as farms_router,
)
from app.routes.scans import (
    router as scans_router,
)
from app.routes.rag import (
    router as rag_router,
)
from app.routes.farm_intelligence import (
    router as farm_intelligence_router,
)
from app.routes.weather import (
    router as weather_router,
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="KisanX API",
    description=(
        "AI-Powered Crop Health, Harvest "
        "& Market Intelligence API"
    ),
    version="0.5.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTES
# ============================================================

app.include_router(
    farms_router
)

app.include_router(
    scans_router
)

app.include_router(
    rag_router
)

app.include_router(
    assistant_router
)

app.include_router(
    farm_intelligence_router
)

app.include_router(
    weather_router
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "status": "ok",
        "service": "kisanx-api",
        "version": "0.5.0",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():

    return {
        "status": "ok",
        "service": "kisanx-api",
        "ollama": {
            "base_url": settings.ollama_base_url,
            "model": settings.ollama_model,
        },
    }