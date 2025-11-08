"""
Configuration management for the Global Search Visualizer API
"""
import json
import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from dotenv import load_dotenv

logger = logging.getLogger(__name__)


try:
    dotenv_loaded = load_dotenv()
    if dotenv_loaded:
        logger.info("Environment variables loaded from .env")
except Exception as dotenv_error:
    logger.warning(f"Failed to load .env file: {dotenv_error}")


CONFIG: Dict[str, Any] = {}
CONFIG_PATH = Path("config.json")


try:
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            CONFIG = json.load(f)
    else:
        CONFIG = {}
except Exception as e:
    logger.warning(f"Failed to load config.json: {e}")


def cfg(path: str, default=None):
    """
    Get configuration value by dot-separated path.
    
    Args:
        path: Dot-separated path to config value (e.g., "google_search_api.api_key")
        default: Default value if path not found
        
    Returns:
        Configuration value or default
    """
    try:
        parts = path.split('.')
        cur = CONFIG
        for p in parts:
            cur = cur[p]
        return cur
    except Exception:
        return default


def get_google_programmable_credentials() -> Tuple[Optional[str], Optional[str]]:
    """
    Resolve Google Programmable Search credentials from env or config.
    
    Returns:
        Tuple of (api_key, search_engine_id)
    """
    api_key = os.getenv("GOOGLE_API_KEY") or cfg("google_search_api.api_key", None)
    search_engine_id = os.getenv("GOOGLE_CSE_ID") or cfg("google_search_api.search_engine_id", None)
    return api_key, search_engine_id


def set_google_programmable_credentials(api_key: Optional[str], search_engine_id: Optional[str]) -> None:
    """
    Apply Google Programmable Search credentials to runtime config.
    
    Args:
        api_key: Google API key
        search_engine_id: Google Custom Search Engine ID
    """
    if not api_key and not search_engine_id:
        return

    CONFIG.setdefault("google_search_api", {})

    if api_key:
        os.environ["GOOGLE_API_KEY"] = api_key
        CONFIG["google_search_api"]["api_key"] = api_key

    if search_engine_id:
        os.environ["GOOGLE_CSE_ID"] = search_engine_id
        CONFIG["google_search_api"]["search_engine_id"] = search_engine_id

    logger.info("Google Programmable Search credentials updated from request payload.")


def announce_google_api_status() -> None:
    """Log whether Google Programmable Search credentials are available."""
    api_key, search_engine_id = get_google_programmable_credentials()
    if api_key and search_engine_id:
        logger.info("Google Programmable Search API credentials detected; API ready.")
    else:
        logger.warning(
            "Google Programmable Search API credentials not found; Google captures will rely on browser fallback."
        )


def ensure_results_directory():
    """Ensure results directories exist"""
    Path("results/logs").mkdir(parents=True, exist_ok=True)
    Path("results/screenshots").mkdir(parents=True, exist_ok=True)
    Path("results/html").mkdir(parents=True, exist_ok=True)



announce_google_api_status()
