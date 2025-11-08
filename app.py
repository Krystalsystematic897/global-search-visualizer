"""
Global Search Visualizer API - Main Application Entry Point

This is a clean, modular, API-only FastAPI backend for the Global Search Visualizer.
All frontend serving has been removed. This API provides endpoints for:
- Proxy validation with geolocation
- Multi-engine search result capture via proxies
- Session management and result retrieval
"""
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import datetime, timezone, timedelta
import logging
import os

from prometheus_fastapi_instrumentator import Instrumentator

from routes.proxy_routes import router as proxy_router
from routes.search_routes import router as search_router
from routes.websocket_routes import router as websocket_router

from config import ensure_results_directory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Global Search Visualizer API",
    description="API for capturing and analyzing search engine results from different geographic locations using proxies",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


Instrumentator().instrument(app).expose(app)


# Read CORS origins from environment variable (comma-separated)
cors_env = os.getenv("CORS", "http://localhost:5173")
allow_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



def get_ist_time():
    """Returns current time in IST (UTC+5:30)"""
    ist_offset = timedelta(hours=5, minutes=30)
    ist_tz = timezone(ist_offset)
    return datetime.now(ist_tz).isoformat()


app.mount("/results", StaticFiles(directory="results"), name="results")


app.include_router(proxy_router)
app.include_router(search_router)
app.include_router(websocket_router)


@app.get("/", tags=["root"])
async def root():
    """
    API root endpoint - returns API information.
    """
    return {
        "name": "Global Search Visualizer API",
        "version": "2.0.0",
        "status": "operational",
        "timestamp": get_ist_time(),
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health",
            "metrics": "/metrics",
            "proxy_validation": "/validate_proxies",
            "start_search": "/start_search",
            "get_status": "/get_status/{job_id}",
            "get_results": "/get_results/{job_id}",
            "websocket": "/ws/job/{job_id}"
        },
        "description": "API for capturing search engine results from different geographic locations"
    }


@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint for monitoring.
    """
    return {
        "status": "healthy",
        "timestamp": get_ist_time()
    }



@app.on_event("startup")
async def startup_event():
    """
    Initialize application on startup.
    """
    ensure_results_directory()
    logger.info("✓ Global Search Visualizer API started successfully")
    logger.info("✓ Results directories initialized")
    logger.info("✓ API documentation available at /docs")
    logger.info("✓ Prometheus metrics available at /metrics")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
