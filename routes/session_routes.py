"""
Session management API routes
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json
import io
import zipfile
from pathlib import Path

router = APIRouter(prefix="", tags=["sessions"])


@router.get("/list_sessions")
async def list_sessions():
    """
    List all previous search sessions.
    
    Returns:
        Dict with list of session summaries
    """
    log_dir = Path("results/logs")
    if not log_dir.exists():
        return {"sessions": []}
    
    sessions = []
    for log_file in log_dir.glob("*.json"):
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                sessions.append({
                    "job_id": data.get("job_id"),
                    "query": data.get("query"),
                    "created_at": data.get("created_at"),
                    "status": data.get("status"),
                    "total_results": len(data.get("results", []))
                })
        except Exception:
            continue
    
    
    sessions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {"sessions": sessions}


@router.get("/get_session/{job_id}")
async def get_session(job_id: str):
    """
    Get a specific session's data.
    
    Args:
        job_id: Job identifier
        
    Returns:
        Complete session data
    """
    log_file = Path(f"results/logs/{job_id}.json")
    if not log_file.exists():
        raise HTTPException(status_code=404, detail="Session not found")
    
    with open(log_file, "r", encoding="utf-8") as f:
        return json.load(f)


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
