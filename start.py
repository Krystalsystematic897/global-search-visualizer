"""
Startup script for Global Search Visualizer API
Uses Windows ProactorEventLoop which supports Playwright subprocess operations
"""
import sys
import asyncio


if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    print("✓ Using WindowsProactorEventLoopPolicy for Playwright subprocess support")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Global Search Visualizer API...")
    
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
