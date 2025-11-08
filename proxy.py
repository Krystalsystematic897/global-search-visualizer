"""
Proxy validation logic for the Global Search Visualizer API
"""
import httpx
import logging
import sys
import asyncio


if sys.platform == 'win32':
    try:
        import nest_asyncio
        nest_asyncio.apply()
    except ImportError:
        pass

from models import ProxyInfo
from config import cfg
from utils import parse_proxy_auth, build_proxy_url

logger = logging.getLogger(__name__)


try:
    from httpx_socks import AsyncProxyTransport  
    HAVE_SOCKS = True
except Exception:
    HAVE_SOCKS = False


async def quick_validate_proxy(proxy: str, protocol: str = "http", timeout: int = 8) -> ProxyInfo:
    """
    Quick proxy validation - just check if it responds.
    
    Args:
        proxy: Proxy address
        protocol: Proxy protocol (http/socks4/socks5)
        timeout: Timeout in seconds
        
    Returns:
        ProxyInfo object with validation results
    """
    proxy_info = ProxyInfo(proxy=proxy, status="validating", protocol=protocol)
    
    try:
        
        proxy_url = build_proxy_url(proxy, protocol)
        if protocol in ("socks4", "socks5"):
            if not HAVE_SOCKS:
                raise RuntimeError("SOCKS support not installed. Install 'httpx-socks'.")
            transport = AsyncProxyTransport.from_url(proxy_url)
            client_ctx = httpx.AsyncClient(transport=transport, timeout=timeout, verify=False)
        else:
            
            client_ctx = httpx.AsyncClient(proxies=proxy_url, timeout=timeout, verify=False)

        async with client_ctx as client:
            
            ip_endpoint = (
                "https://api.ipify.org?format=json" if protocol == "http" else "http://api.ipify.org?format=json"
            )
            response = await client.get(ip_endpoint)
            if response.status_code == 200:
                data = response.json()
                proxy_info.public_ip = data.get("ip")
                proxy_info.status = "valid"
                proxy_info.country = "Unknown"
                logger.info(f"✓ Quick validated: {proxy} ({protocol})")
            else:
                proxy_info.status = "failed"
                proxy_info.error = f"HTTP {response.status_code}"
    except Exception as e:
        proxy_info.status = "failed"
        proxy_info.error = str(e)[:50]
    
    return proxy_info


async def validate_single_proxy(proxy: str, timeout: int = 15, protocol: str = "http") -> ProxyInfo:
    """
    Validate a single proxy and get its geolocation.
    
    Args:
        proxy: Proxy address
        timeout: Timeout in seconds
        protocol: Proxy protocol (http/socks4/socks5)
        
    Returns:
        ProxyInfo object with validation and geolocation results
    """
    proxy_info = ProxyInfo(proxy=proxy, status="validating", protocol=protocol)
    
    try:
        auth = parse_proxy_auth(proxy)
        if auth.get("username") and not proxy_info.username:
            proxy_info.username = auth["username"]
        if auth.get("password") and not proxy_info.password:
            proxy_info.password = auth["password"]
    except Exception:
        pass
    
    logger.info(f"Validating {protocol} proxy: {proxy}")
    
    try:
        
        proxy_url = build_proxy_url(proxy, protocol)
        if protocol in ("socks4", "socks5"):
            if not HAVE_SOCKS:
                raise httpx.ProxyError("SOCKS support not installed. Install 'httpx-socks'.")
            transport = AsyncProxyTransport.from_url(proxy_url)
            client_ctx = httpx.AsyncClient(
                transport=transport,
                timeout=timeout,
                follow_redirects=True,
                verify=False,
            )
        else:
            
            client_ctx = httpx.AsyncClient(
                proxies=proxy_url,
                timeout=timeout,
                follow_redirects=True,
                verify=False,
            )
        
        
        
        test_endpoints = (
            [
                "https://api.ipify.org?format=json",
                "https://ifconfig.me/ip",
                "http://ip-api.com/json/",  
            ]
            if protocol == "http"
            else [
                "http://api.ipify.org?format=json",
                "http://ifconfig.me/ip",
                "http://ip-api.com/json/",
            ]
        )
        
        public_ip = None
        
        async with client_ctx as client:
            
            for endpoint in test_endpoints:
                try:
                    response = await client.get(endpoint)
                    if response.status_code == 200:
                        if "ipify" in endpoint:
                            data = response.json()
                            public_ip = data.get("ip")
                        elif "ip-api" in endpoint:
                            data = response.json()
                            public_ip = data.get("query")
                        else:
                            public_ip = response.text.strip()
                        
                        if public_ip:
                            proxy_info.public_ip = public_ip
                            break
                except Exception as e:
                    continue  
            
            if not public_ip:
                proxy_info.status = "failed"
                proxy_info.error = "Could not get IP through proxy"
                return proxy_info

            
            try:
                probe_urls = cfg(
                    "validation.engine_probe_urls",
                    [
                        "https://www.google.com/generate_204",
                        "https://duckduckgo.com/?q=connectivity",
                    ],
                )
                probe_ok = False
                for url in probe_urls:
                    try:
                        r = await client.get(url, timeout=6)
                        if r.status_code < 400:
                            probe_ok = True
                            break
                    except Exception:
                        continue
                if not probe_ok:
                    proxy_info.status = "failed"
                    proxy_info.error = "Engine reachability failed (tunnel)"
                    return proxy_info
            except Exception:
                
                pass
            
            
            try:
                geo_response = await client.get(
                    f"http://ip-api.com/json/{public_ip}?fields=status,country,countryCode,regionName,city,isp,query",
                    timeout=10
                )
                if geo_response.status_code == 200:
                    geo_data = geo_response.json()
                    if geo_data.get("status") == "success":
                        proxy_info.country = geo_data.get("country", "Unknown")
                        proxy_info.country_code = geo_data.get("countryCode")
                        proxy_info.region = geo_data.get("regionName", "Unknown")
                        proxy_info.city = geo_data.get("city", "Unknown")
                        proxy_info.isp = geo_data.get("isp", "Unknown")
                        proxy_info.status = "valid"
                        logger.info(f"✓ Proxy {proxy} validated - {proxy_info.country}")
                    else:
                        
                        proxy_info.status = "valid"
                        proxy_info.country = "Unknown"
                        proxy_info.error = "Geolocation lookup failed"
                else:
                    proxy_info.status = "valid"
                    proxy_info.country = "Unknown"
                    proxy_info.error = f"Geo API returned {geo_response.status_code}"
            except Exception as e:
                
                proxy_info.status = "valid"
                proxy_info.country = "Unknown"
                proxy_info.error = f"Geolocation error: {str(e)[:50]}"
    
    except httpx.ProxyError as e:
        proxy_info.status = "failed"
        proxy_info.error = f"Proxy error: {str(e)[:50]}"
        logger.error(f"✗ Proxy {proxy} failed: Proxy error - {str(e)[:100]}")
    except httpx.ConnectError as e:
        proxy_info.status = "failed"
        proxy_info.error = f"Connection error: {str(e)[:50]}"
        logger.error(f"✗ Proxy {proxy} failed: Connection error - {str(e)[:100]}")
    except httpx.TimeoutException as e:
        proxy_info.status = "failed"
        proxy_info.error = "Timeout - proxy too slow"
        logger.error(f"✗ Proxy {proxy} failed: Timeout")
    except Exception as e:
        proxy_info.status = "failed"
        proxy_info.error = f"Error: {str(e)[:50]}"
        logger.error(f"✗ Proxy {proxy} failed: {str(e)[:100]}")
    
    return proxy_info
