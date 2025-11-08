"""Windows-specific asyncio configuration helpers.

This module is imported before any other asyncio-using code to ensure
Playwright and FastAPI background tasks run with a Proactor-compatible
loop on Windows. The Proactor loop supports subprocess operations needed by Playwright.
"""
from __future__ import annotations

import asyncio
import logging
import sys

logger = logging.getLogger(__name__)

if sys.platform == "win32":
    
    
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        logger.info("Windows Proactor event loop policy applied for Playwright support.")
    except Exception as exc:  
        logger.warning("Failed to set Windows event loop policy: %s", exc)

    
    try:
        import nest_asyncio  

        nest_asyncio.apply()
        logger.info("nest_asyncio patch applied.")
    except Exception as exc:  
        logger.debug("nest_asyncio not applied: %s", exc)