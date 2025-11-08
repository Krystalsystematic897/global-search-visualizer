"""
WebSocket routes for real-time job updates
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio
import logging
from pathlib import Path
from typing import Dict, Set

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["websocket"])


active_connections: Dict[str, Set[WebSocket]] = {}


class ConnectionManager:
    """Manage WebSocket connections for job updates"""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, job_id: str):
        """Connect a client to a specific job's updates"""
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = set()
        self.active_connections[job_id].add(websocket)
        logger.info(f"WebSocket connected for job {job_id} (total: {len(self.active_connections[job_id])})")
    
    def disconnect(self, websocket: WebSocket, job_id: str):
        """Disconnect a client from job updates"""
        if job_id in self.active_connections:
            self.active_connections[job_id].discard(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
            logger.info(f"WebSocket disconnected for job {job_id}")
    
    async def broadcast_to_job(self, job_id: str, message: dict):
        """Broadcast a message to all clients watching a specific job"""
        if job_id not in self.active_connections:
            return
        
        disconnected = set()
        for connection in self.active_connections[job_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to WebSocket: {e}")
                disconnected.add(connection)
        
        
        for connection in disconnected:
            self.active_connections[job_id].discard(connection)



manager = ConnectionManager()


@router.websocket("/ws/job/{job_id}")
async def websocket_job_updates(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint for real-time job updates.
    
    Clients connect to this endpoint to receive real-time updates
    about job progress, results, and completion status.
    
    Args:
        websocket: WebSocket connection
        job_id: Job identifier to monitor
    """
    await manager.connect(websocket, job_id)
    
    try:
        
        from routes.search_routes import jobs_state
        
        
        if job_id in jobs_state:
            await websocket.send_json({
                "type": "status",
                "data": {
                    "job_id": job_id,
                    "status": jobs_state[job_id]["status"],
                    "total_tasks": jobs_state[job_id].get("total_tasks", 0),
                    "completed_tasks": jobs_state[job_id].get("completed_tasks", 0),
                    "progress": (jobs_state[job_id].get("completed_tasks", 0) / 
                               jobs_state[job_id].get("total_tasks", 1) * 100),
                    "results": jobs_state[job_id].get("results", [])
                }
            })
        else:
            
            log_file = Path(f"results/logs/{job_id}.json")
            if log_file.exists():
                with open(log_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    await websocket.send_json({
                        "type": "completed",
                        "data": data
                    })
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": "Job not found"
                })
        
        
        while True:
            
            await asyncio.sleep(1)
            
            if job_id in jobs_state:
                job = jobs_state[job_id]
                
                
                await websocket.send_json({
                    "type": "progress",
                    "data": {
                        "job_id": job_id,
                        "status": job["status"],
                        "total_tasks": job.get("total_tasks", 0),
                        "completed_tasks": job.get("completed_tasks", 0),
                        "progress": (job.get("completed_tasks", 0) / 
                                   job.get("total_tasks", 1) * 100),
                        "latest_results": job.get("results", [])[-5:]  
                    }
                })
                
                
                if job["status"] == "completed":
                    await websocket.send_json({
                        "type": "completed",
                        "data": job
                    })
                    break
            else:
                
                log_file = Path(f"results/logs/{job_id}.json")
                if log_file.exists():
                    with open(log_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        await websocket.send_json({
                            "type": "completed",
                            "data": data
                        })
                        break
            
            
            try:
                await websocket.send_json({"type": "ping"})
            except:
                break
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, job_id)
    except Exception as e:
        logger.error(f"WebSocket error for job {job_id}: {e}")
        manager.disconnect(websocket, job_id)
        try:
            await websocket.close()
        except:
            pass


async def broadcast_job_update(job_id: str, update_type: str, data: dict):
    """
    Helper function to broadcast updates to all clients watching a job.
    Call this from search processing to send real-time updates.
    
    Args:
        job_id: Job identifier
        update_type: Type of update (progress, result, completed, error)
        data: Update data
    """
    await manager.broadcast_to_job(job_id, {
        "type": update_type,
        "data": data
    })
