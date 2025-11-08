"""
Pydantic models for the Global Search Visualizer API
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class ProxyInput(BaseModel):
    """Model for proxy validation request"""
    proxy_list: List[str]
    proxy_url: Optional[str] = None


class SearchRequest(BaseModel):
    """Model for search job request"""
    proxies: List[Dict[str, Any]]
    query: str
    engines: List[str]
    google_api_key: Optional[str] = None
    google_cse_id: Optional[str] = None


class ProxyInfo(BaseModel):
    """Model for proxy information"""
    proxy: str
    public_ip: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    isp: Optional[str] = None
    status: str = "pending"
    error: Optional[str] = None
    protocol: Optional[str] = "http"
    username: Optional[str] = None
    password: Optional[str] = None
