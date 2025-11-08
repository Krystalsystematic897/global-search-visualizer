"""
Search job API routes
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import uuid
import logging
import random
import asyncio
import sys
import io
import zipfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any

from models import SearchRequest
from search import process_search_job
from config import cfg

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["search"])



def get_ist_time():
    """Returns current time in IST (UTC+5:30)"""
    ist_offset = timedelta(hours=5, minutes=30)
    ist_tz = timezone(ist_offset)
    return datetime.now(ist_tz).isoformat()


jobs_state: Dict[str, Dict[str, Any]] = {}
stop_flags: Dict[str, bool] = {}


@router.post("/start_search")
async def start_search(search_request: SearchRequest, background_tasks: BackgroundTasks):
    """
    Start the screenshot capture process.
    
    Args:
        search_request: SearchRequest model with proxies, query, engines, and optional Google credentials
        background_tasks: FastAPI background tasks
        
    Returns:
        Dict with job_id and status
    """
    job_id = str(uuid.uuid4())
    
    logger.info(f"🚀 Starting search job {job_id} - Query: '{search_request.query}' - Engines: {search_request.engines}")

    request_api_key = (search_request.google_api_key or "").strip() or None
    request_cse_id = (search_request.google_cse_id or "").strip() or None
    google_credentials_payload: dict[str, str] | None = None

    if request_api_key and request_cse_id:
        from config import set_google_programmable_credentials
        set_google_programmable_credentials(request_api_key, request_cse_id)
        google_credentials_payload = {
            "api_key": request_api_key,
            "search_engine_id": request_cse_id,
        }
        logger.info("Google Programmable Search credentials received from client request for job %s", job_id)
    elif request_api_key or request_cse_id:
        raise HTTPException(
            status_code=400,
            detail="Provide both Google API key and Search Engine ID (CX) when supplying credentials.",
        )
    
    
    jobs_state[job_id] = {
        "job_id": job_id,
        "query": search_request.query,
        "engines": search_request.engines,
        "status": "queued",
        "created_at": get_ist_time(),
        "total_tasks": 0,
        "completed_tasks": 0,
        "results": [],
        "google_credentials_provided": bool(google_credentials_payload),
    }
    
    
    stop_flags[job_id] = False
    
    
    proxies_for_job = list(search_request.proxies)
    try:
        
        proto_rank = {"socks5": 0, "socks4": 1, "http": 2}
        proxies_for_job.sort(key=lambda p: proto_rank.get((p.get("protocol") or "http").lower(), 3))
        
        
        if cfg("playwright.reject_http_proxies", True) is True:
            socks_only = [p for p in proxies_for_job if (p.get("protocol") or "http").lower() in ("socks4", "socks5")]
            if socks_only:
                proxies_for_job = socks_only
    except Exception:
        pass

    
    background_tasks.add_task(
        process_search_job,
        job_id,
        proxies_for_job,
        search_request.query,
        search_request.engines,
        jobs_state,
        google_credentials_payload,
        stop_flags,
    )
    
    return {"job_id": job_id, "status": "started"}


@router.get("/get_status/{job_id}")
async def get_status(job_id: str):
    """
    Get the current status of a job.
    
    Args:
        job_id: Job identifier
        
    Returns:
        Dict with job status, progress, and results
    """
    if job_id not in jobs_state:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs_state[job_id]
    return {
        "job_id": job_id,
        "status": job["status"],
        "total_tasks": job["total_tasks"],
        "completed_tasks": job["completed_tasks"],
        "progress": (job["completed_tasks"] / job["total_tasks"] * 100) if job["total_tasks"] > 0 else 0,
        "results": job.get("results", [])
    }


@router.post("/stop_job/{job_id}")
async def stop_job(job_id: str):
    """
    Stop a running job.
    
    Args:
        job_id: Job identifier
        
    Returns:
        Dict with job status
    """
    if job_id not in jobs_state:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs_state[job_id]
    if job["status"] not in ["running", "queued"]:
        raise HTTPException(status_code=400, detail=f"Cannot stop job with status: {job['status']}")
    
    
    stop_flags[job_id] = True
    logger.info(f"🛑 Stop requested for job {job_id}")
    
    
    try:
        from routes.websocket_routes import broadcast_job_update
        await broadcast_job_update(job_id, "stop_requested", {
            "job_id": job_id,
            "message": "Stop signal sent",
            "status": job["status"]
        })
    except Exception as e:
        logger.debug(f"Failed to broadcast stop message: {e}")
    
    return {
        "job_id": job_id,
        "message": "Stop signal sent",
        "status": job["status"]
    }


@router.get("/get_results/{job_id}")
async def get_results(job_id: str):
    """
    Get the results of a completed job.
    
    Args:
        job_id: Job identifier
        
    Returns:
        Complete job data including all results
    """
    import json
    from pathlib import Path
    
    if job_id not in jobs_state:
        
        log_file = Path(f"results/logs/{job_id}.json")
        if log_file.exists():
            with open(log_file, "r", encoding="utf-8") as f:
                return json.load(f)
        raise HTTPException(status_code=404, detail="Job not found")
    
    return jobs_state[job_id]


@router.get("/download_screenshots/{job_id}")
async def download_screenshots(job_id: str):
    """
    Download all screenshots for a job as a ZIP file.
    
    Args:
        job_id: Job identifier
        
    Returns:
        ZIP file containing all screenshots
    """
    screenshot_dir = Path(f"results/screenshots/{job_id}")
    
    if not screenshot_dir.exists():
        raise HTTPException(status_code=404, detail="No screenshots found for this job")
    
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for screenshot in screenshot_dir.rglob("*.png"):
            arcname = screenshot.relative_to(screenshot_dir)
            zip_file.write(screenshot, arcname)
    
    zip_buffer.seek(0)
    
    headers = {"Content-Disposition": f"attachment; filename=\"screenshots_{job_id}.zip\""}
    return StreamingResponse(io.BytesIO(zip_buffer.getvalue()), media_type="application/zip", headers=headers)
