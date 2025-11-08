"""
Utility functions for the Global Search Visualizer API
"""
import re
import random
import html
from urllib.parse import quote_plus
from typing import Dict, Optional
from config import cfg


def format_query_for_url(query: str) -> str:
    """
    Format query - if it's a URL, convert to site: search.
    
    Args:
        query: The search query
        
    Returns:
        Formatted query string
    """
    
    url_pattern = r'^(https?://)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}'
    if re.match(url_pattern, query):
        
        clean_url = re.sub(r'^(https?://)?(www\.)?', '', query)
        return f'site:"{clean_url}"'
    return query


def get_search_url(engine: str, query: str) -> str:
    """
    Generate search URL for different engines.
    
    Args:
        engine: Search engine name (google, bing, duckduckgo, yahoo)
        query: Search query
        
    Returns:
        Full search URL
    """
    formatted_query = format_query_for_url(query)
    encoded_query = quote_plus(formatted_query)
    
    engines_map = {
        "google": f"https://www.google.com/search?q={encoded_query}",
        "bing": f"https://www.bing.com/search?q={encoded_query}",
        "duckduckgo": f"https://duckduckgo.com/?q={encoded_query}",
        "yahoo": f"https://search.yahoo.com/search?p={encoded_query}"
    }
    
    return engines_map.get(engine.lower(), engines_map["google"])


def get_country_language(country_code: str) -> str:
    """
    Map country to Accept-Language header.
    
    Args:
        country_code: Two-letter country code
        
    Returns:
        Accept-Language header value
    """
    language_map = {
        "US": "en-US,en;q=0.9",
        "GB": "en-GB,en;q=0.9",
        "IN": "en-IN,en;q=0.9",
        "DE": "de-DE,de;q=0.9",
        "FR": "fr-FR,fr;q=0.9",
        "JP": "ja-JP,ja;q=0.9",
        "CN": "zh-CN,zh;q=0.9",
        "ES": "es-ES,es;q=0.9",
    }
    return language_map.get(country_code, "en-US,en;q=0.9")


def first_locale_from_accept_language(accept_language: str) -> str:
    """
    Extract first locale from Accept-Language header.
    
    Args:
        accept_language: Accept-Language header value
        
    Returns:
        First locale (e.g., 'en-US')
    """
    try:
        return (accept_language.split(',')[0] or 'en-US').strip()
    except Exception:
        return 'en-US'


def choose_user_agent() -> str:
    """
    Return a realistic desktop UA with light rotation.
    
    Returns:
        User agent string
    """
    uas = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    ]
    try:
        return random.choice(uas)
    except Exception:
        return uas[0]


def parse_proxy_auth(addr: str) -> Dict[str, Optional[str]]:
    """
    Parse proxy address that may contain auth in either format:
    - user:pass@host:port
    - host:port:user:pass
    
    Args:
        addr: Proxy address string
        
    Returns:
        Dict with normalized addr (host:port), username, password
    """
    username = password = None
    hostport = addr
    if '@' in addr:
        creds, hostport = addr.split('@', 1)
        if ':' in creds:
            username, password = creds.split(':', 1)
        else:
            username = creds
            password = None
    else:
        
        parts = addr.split(':')
        if len(parts) == 4:
            host, port, username, password = parts
            hostport = f"{host}:{port}"
    return {"addr": hostport, "username": username, "password": password}


def build_proxy_url(addr: str, protocol: str) -> str:
    """
    Build a proxy URL including credentials if present for httpx.
    
    Args:
        addr: Proxy address (may include user:pass@host:port)
        protocol: Proxy protocol (http/socks4/socks5)
        
    Returns:
        Full proxy URL
    """
    
    if addr.startswith("http://") or addr.startswith("https://") or addr.startswith("socks"):
        return addr
    
    return f"{protocol}://{addr}"


def detect_proxy_protocol(proxy_string: str) -> tuple[str, str]:
    """
    Detect proxy protocol from input string.
    Supports: http://IP:PORT, socks4://IP:PORT, socks5://IP:PORT, or just IP:PORT
    
    Args:
        proxy_string: Proxy string with optional protocol prefix
        
    Returns:
        Tuple of (proxy_address, protocol)
    """
    proxy_string = proxy_string.strip()
    
    
    proto = None
    if proxy_string.startswith("socks5://"):
        proto = "socks5"
        stripped = proxy_string.replace("socks5://", "")
    elif proxy_string.startswith("socks4://"):
        proto = "socks4"
        stripped = proxy_string.replace("socks4://", "")
    elif proxy_string.startswith("http://") or proxy_string.startswith("https://"):
        proto = "http"
        stripped = proxy_string.replace("http://", "").replace("https://", "")
    else:
        stripped = proxy_string
        proto = "http"

    
    
    if '@' not in stripped:
        parts = stripped.split(':')
        if len(parts) == 4:
            host, port, user, pwd = parts
            stripped = f"{user}:{pwd}@{host}:{port}"

    return stripped, proto


def build_google_programmable_html(query: str, items: list, search_info: dict) -> str:
    """
    Build a lightweight HTML page mirroring Google results for screenshotting.
    
    Args:
        query: Search query
        items: List of search result items from Google API
        search_info: Search information metadata from Google API
        
    Returns:
        HTML string
    """
    from datetime import datetime
    
    esc = html.escape
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    total_results = esc(str(search_info.get("totalResults", "unknown"))) if isinstance(search_info, dict) else "unknown"
    search_time = esc(str(search_info.get("searchTime", "?"))) if isinstance(search_info, dict) else "?"

    results_markup = []
    for item in items:
        title = esc(item.get("title", "Untitled Result"))
        snippet = esc(item.get("snippet", ""))
        link = esc(item.get("link", ""))
        display_link = esc(item.get("displayLink", link))
        results_markup.append(
            f"<article class='result'>"
            f"<h2><a href='{link}'>{title}</a></h2>"
            f"<p class='link'>{display_link}</p>"
            f"<p class='snippet'>{snippet}</p>"
            "</article>"
        )

    if not results_markup:
        results_markup.append("<p class='empty'>No results returned by Google Programmable Search API.</p>")

    results_html = "\n".join(results_markup)

    return f"""<!doctype html>
<html lang='en'>
<head>
  <meta charset='utf-8'>
  <title>Google Programmable Search Results</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 32px auto; max-width: 920px; color: #202124; }}
    header {{ margin-bottom: 24px; }}
    header h1 {{ font-size: 20px; margin: 0 0 8px; color: #1a73e8; }}
    header p {{ margin: 4px 0; color: #5f6368; font-size: 14px; }}
    .meta {{ font-size: 13px; color: #5f6368; margin-bottom: 16px; }}
    .result {{ padding: 16px 0; border-bottom: 1px solid #dadce0; }}
    .result h2 {{ margin: 0; font-size: 18px; }}
    .result a {{ color: #1a0dab; text-decoration: none; }}
    .result a:hover {{ text-decoration: underline; }}
    .result .link {{ font-size: 14px; color: #006621; margin: 6px 0; }}
    .result .snippet {{ font-size: 14px; line-height: 1.54; color: #4d5156; margin: 0; }}
    .empty {{ color: #5f6368; font-style: italic; }}
  </style>
</head>
<body>
  <header>
    <h1>Google Programmable Search</h1>
    <div class='meta'>Query: <strong>{esc(query)}</strong></div>
    <p>Retrieved {total_results} results in {search_time} seconds · Generated {ts}</p>
  </header>
  <main>
    {results_html}
  </main>
</body>
</html>
"""
