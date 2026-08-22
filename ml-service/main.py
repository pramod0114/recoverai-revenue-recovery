"""
RecoverAI ML Service
FastAPI-based predictive diagnostics microservice for AI Revenue Recovery.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router as api_router
from datetime import datetime

app = FastAPI(
    title="RecoverAI ML Intelligence Service",
    description="Predictive Revenue Recovery Scoring, Dunning Channel Optimization & Intelligent Retry Scheduling",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """
    ML Service Health Endpoint.
    Returns operational readiness and model metadata.
    """
    return {
        "status": "healthy",
        "service": "RecoverAI ML Service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "model_loaded": False,
        "mode": "PART_1_FOUNDATION",
    }

@app.get("/")
def root():
    return {
        "message": "RecoverAI ML Service is online.",
        "docs": "/docs",
        "health": "/health",
    }

app.include_router(api_router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
