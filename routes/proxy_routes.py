"""
Proxy validation API routes
"""
from fastapi import APIRouter, HTTPException
import httpx
import asyncio
import logging

from models import ProxyInput
from proxy import validate_single_proxy
from utils import detect_proxy_protocol
from config import cfg

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["proxy"])


@router.post("/validate_proxies")
async def validate_proxies(proxy_input: ProxyInput):
    """
    Validate proxies and return geolocation info.
    
    Args:
        proxy_input: ProxyInput model containing proxy list and/or URL
        
    Returns:
        Dict with validation results including total, valid, failed counts and proxy details
    """
    proxies_to_validate: list[str] = []

    
    if proxy_input.proxy_url:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(proxy_input.proxy_url)
                if response.status_code == 200:
                    proxy_list = response.text.strip().split("\n")
                    proxies_to_validate.extend([p.strip() for p in proxy_list if p.strip()])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch proxy list: {str(e)}")

    
    proxies_to_validate.extend(proxy_input.proxy_list)

    
    seen_proxies: set[str] = set()
    unique_proxies: list[str] = []
    for proxy in proxies_to_validate:
        if proxy and proxy not in seen_proxies:
            seen_proxies.add(proxy)
            unique_proxies.append(proxy)

    proxies_to_validate = unique_proxies

    if not proxies_to_validate:
        raise HTTPException(status_code=400, detail="No proxies provided")
    
    
    proxies_with_protocol = []
    for proxy_string in proxies_to_validate:
        proxy_addr, protocol = detect_proxy_protocol(proxy_string)
        proxies_with_protocol.append((proxy_addr, protocol))
    
    logger.info(f"Detected {len([p for p in proxies_with_protocol if p[1] == 'http'])} HTTP, "
                f"{len([p for p in proxies_with_protocol if p[1] == 'socks4'])} SOCKS4, "
                f"{len([p for p in proxies_with_protocol if p[1] == 'socks5'])} SOCKS5 proxies")
    
    
    max_conc = int(cfg("proxy.max_concurrent_validations", 20) or 20)
    semaphore = asyncio.Semaphore(max_conc)
    
    async def validate_with_semaphore(proxy_tuple):
        async with semaphore:
            proxy_addr, protocol = proxy_tuple
            return await validate_single_proxy(
                proxy_addr, 
                protocol=protocol, 
                timeout=int(cfg("proxy.validation_timeout", 15) or 15)
            )
    
    logger.info(f"Starting validation of {len(proxies_with_protocol)} proxies...")
    validated_proxies = await asyncio.gather(
        *[validate_with_semaphore(proxy) for proxy in proxies_with_protocol],
        return_exceptions=True
    )
    
    
    result_proxies = []
    for proxy in validated_proxies:
        if hasattr(proxy, 'model_dump'):
            result_proxies.append(proxy.model_dump())
        elif isinstance(proxy, Exception):
            logger.error(f"Validation exception: {str(proxy)}")
    
    return {
        "total": len(result_proxies),
        "valid": sum(1 for p in result_proxies if p["status"] == "valid"),
        "failed": sum(1 for p in result_proxies if p["status"] == "failed"),
        "proxies": result_proxies,
        "source": "manual"
    }
