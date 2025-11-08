"""
Search job processing logic for the Global Search Visualizer API
"""
import httpx
import asyncio
import sys
import logging
import random
import psutil
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List
from playwright.async_api import async_playwright



from config import cfg, get_google_programmable_credentials, ensure_results_directory
from utils import (
    get_search_url,
    get_country_language,
    first_locale_from_accept_language,
    choose_user_agent,
    parse_proxy_auth,
    build_google_programmable_html,
)

logger = logging.getLogger(__name__)



def get_ist_time():
    """Returns current time in IST (UTC+5:30)"""
    ist_offset = timedelta(hours=5, minutes=30)
    ist_tz = timezone(ist_offset)
    return datetime.now(ist_tz).isoformat()


try:
    from playwright_stealth import stealth_async  
    HAVE_STEALTH = True
except Exception:
    HAVE_STEALTH = False



def get_system_resources():
    """Get current system resource utilization."""
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        return {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_mb": memory.available / (1024 * 1024)
        }
    except Exception as e:
        logger.warning(f"Failed to get system resources: {e}")
        return {"cpu_percent": 50, "memory_percent": 50, "memory_available_mb": 1000}


def calculate_optimal_concurrency():
    """Calculate optimal concurrency based on system resources."""
    try:
        
        max_browsers = cfg("concurrency.max_concurrent_browsers", None)
        max_jobs = cfg("concurrency.max_concurrent_jobs", None)
        
        
        cpu_count = os.cpu_count() or 4
        resources = get_system_resources()
        
        
        cpu_based = max(2, cpu_count - 1)
        
        
        memory_based = max(2, int(resources["memory_available_mb"] / 200))
        
        
        optimal = min(cpu_based, memory_based)
        
        
        if max_browsers is not None:
            optimal = min(optimal, max_browsers)
        
        
        return max(2, optimal)
    except Exception as e:
        logger.warning(f"Failed to calculate optimal concurrency: {e}")
        return 3  



browser_semaphore = None


def get_browser_semaphore():
    """Get or create the browser semaphore for concurrent task limiting."""
    global browser_semaphore
    if browser_semaphore is None:
        limit = calculate_optimal_concurrency()
        logger.info(f"🚀 Initializing browser concurrency with limit: {limit}")
        browser_semaphore = asyncio.Semaphore(limit)
    return browser_semaphore


async def fetch_google_programmable_results(
    query: str,
    country_code: Optional[str] = None,
    locale_hint: Optional[str] = None,
    num_results: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Query Google Programmable Search API and return raw JSON payload.
    
    Args:
        query: Search query
        country_code: Two-letter country code
        locale_hint: Locale hint (e.g., 'en-US')
        num_results: Number of results to fetch (max 10)
        
    Returns:
        Raw JSON response from Google API
    """
    api_key, search_engine_id = get_google_programmable_credentials()
    if not api_key or not search_engine_id:
        raise RuntimeError("Google Programmable Search credentials are missing")

    requested = num_results if num_results is not None else cfg("google_search_api.results", 10) or 10
    
    num = max(1, min(int(requested), 10))

    params: Dict[str, Any] = {
        "key": api_key,
        "cx": search_engine_id,
        "q": query,
        "num": num,
    }

    timeout = cfg("google_search_api.timeout", 15) or 15

    safe_setting = cfg("google_search_api.safe", None)
    if isinstance(safe_setting, str) and safe_setting.strip():
        params["safe"] = safe_setting.strip()

    if country_code:
        params["gl"] = country_code.lower()

    if locale_hint:
        lang = locale_hint.split('-')[0].lower()
        params["lr"] = f"lang_{lang}"

    extra_params = cfg("google_search_api.extra_params", {}) or {}
    if isinstance(extra_params, dict):
        for key, value in extra_params.items():
            if key not in params and value is not None:
                params[key] = value

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get("https://www.googleapis.com/customsearch/v1", params=params)
        response.raise_for_status()
        return response.json()


async def handle_bing_page(page, query: str) -> bool:
    """
    Ensure Bing shows results; accept cookies and submit query if needed.
    
    Args:
        page: Playwright page object
        query: Search query
        
    Returns:
        True if results appear, else False
    """
    try:
        
        consent_selectors = [
            "#bnp_btn_accept",
            "button[aria-label='Accept']",
            "#bnp_btn_reject",
        ]
        for sel in consent_selectors:
            try:
                loc = page.locator(sel)
                if await loc.count() > 0:
                    await loc.first.click()
                    await page.wait_for_timeout(800)
                    break
            except Exception:
                continue

        
        if await page.locator('#b_results').count() == 0:
            q = page.locator('#sb_form_q')
            if await q.count() > 0:
                try:
                    await q.first.fill('')
                    await q.first.type(query, delay=50)
                    await page.keyboard.press('Enter')
                    await page.wait_for_load_state('networkidle')
                except Exception:
                    pass

        
        try:
            await page.locator('#b_results').first.wait_for(state='visible', timeout=6000)
            return True
        except Exception:
            return False
    except Exception:
        return False


async def capture_google_programmable_search(
    job_id: str,
    proxy: str,
    proxy_info: Dict[str, Any],
    query: str,
    engine: str,
    base_result: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Capture Google results using the Programmable Search API instead of live browsing.
    
    Args:
        job_id: Job identifier
        proxy: Proxy address
        proxy_info: Proxy information dict
        query: Search query
        engine: Search engine name
        base_result: Base result dict to update
        
    Returns:
        Updated result dict or None if fallback to browser
    """
    if engine.lower() != "google":
        return None

    enabled = bool(cfg("google_search_api.enabled", False))
    if not enabled:
        return None

    fallback_allowed = bool(cfg("google_search_api.fallback_to_browser", False))

    try:
        country_code = (proxy_info.get("country_code") or "").upper() or None
        accept_language = get_country_language(country_code or "US")
        locale_hint = first_locale_from_accept_language(accept_language)
        payload = await fetch_google_programmable_results(
            query=query,
            country_code=country_code,
            locale_hint=locale_hint,
        )
    except Exception as exc:
        logger.error(f"Google Programmable Search API failed: {exc}")
        if fallback_allowed:
            return None
        base_result.update(
            {
                "status": "failed",
                "blocked": False,
                "error": f"Google API error: {str(exc)[:120]}",
                "source": "google_programmable_search",
            }
        )
        return base_result

    items = payload.get("items", []) if isinstance(payload, dict) else []
    search_info = payload.get("searchInformation", {}) if isinstance(payload, dict) else {}
    html_markup = build_google_programmable_html(query, items, search_info)

    html_dir = Path(f"results/html/{job_id}")
    html_dir.mkdir(parents=True, exist_ok=True)
    proxy_safe = proxy.replace(":", "_").replace(".", "_")
    html_path = html_dir / f"{proxy_safe or 'google'}.html"
    try:
        html_path.write_text(html_markup, encoding="utf-8")
    except Exception as exc:
        logger.warning(f"Could not persist Google API HTML mockup: {exc}")

    browser = None
    context = None

    try:
        async with async_playwright() as p:
            launch_headless = cfg("playwright.headless", True)
            browser = await p.chromium.launch(
                headless=launch_headless,
                args=[
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                ],
            )

            context = await browser.new_context(
                viewport={
                    "width": cfg("playwright.viewport.width", 1366),
                    "height": cfg("playwright.viewport.height", 768),
                },
                user_agent=choose_user_agent(),
                ignore_https_errors=True,
                bypass_csp=True,
            )

            page = await context.new_page()
            await page.set_content(html_markup, wait_until="load")
            await page.wait_for_timeout(500)

            country_safe = (proxy_info.get("country", "Unknown") or "Unknown").replace(" ", "_")
            screenshot_dir = Path(f"results/screenshots/{job_id}/{country_safe}/{engine}")
            screenshot_dir.mkdir(parents=True, exist_ok=True)

            viewport_path = screenshot_dir / f"{proxy_safe}_viewport.png"
            full_path = screenshot_dir / f"{proxy_safe}_full.png"

            if cfg("features.viewport_screenshot", True):
                await page.screenshot(path=str(viewport_path), full_page=False)
                base_result["screenshot_path"] = str(viewport_path).replace("\\", "/")
            if cfg("features.full_page_screenshot", True):
                await page.screenshot(path=str(full_path), full_page=True)
                base_result["screenshot_full_path"] = str(full_path).replace("\\", "/")

            base_result.update(
                {
                    "status": "success",
                    "blocked": False,
                    "error": None,
                    "source": "google_programmable_search",
                    "api_items": len(items),
                    "html_path": str(html_path).replace("\\", "/"),
                }
            )

    except Exception as exc:
        logger.error(f"Failed to render Google Programmable Search HTML: {exc}")
        if fallback_allowed:
            return None
        base_result.update(
            {
                "status": "failed",
                "blocked": False,
                "error": f"HTML render error: {str(exc)[:120]}",
                "source": "google_programmable_search",
            }
        )
        return base_result
    finally:
        try:
            if context:
                await context.close()
            if browser:
                await browser.close()
        except Exception:
            pass

    return base_result


async def capture_screenshot(
    job_id: str,
    proxy: str,
    proxy_info: Dict[str, Any],
    query: str,
    engine: str
) -> Dict[str, Any]:
    """
    Capture screenshot using Playwright with proxy.
    
    Args:
        job_id: Job identifier
        proxy: Proxy address
        proxy_info: Proxy information dict
        query: Search query
        engine: Search engine name
        
    Returns:
        Result dict with screenshot paths and status
    """
    result = {
        "proxy": proxy,
        "country": proxy_info.get("country", "Unknown"),
        "region": proxy_info.get("region", "Unknown"),
        "city": proxy_info.get("city", "Unknown"),
        "isp": proxy_info.get("isp", "Unknown"),
        "engine": engine,
        "screenshot_path": None,
        "screenshot_full_path": None,
        "status": "pending",
        "blocked": False,
        "error": None,
        "timestamp": get_ist_time()
    }
    
    try:
        if engine.lower() == "google":
            api_result = await capture_google_programmable_search(
                job_id=job_id,
                proxy=proxy,
                proxy_info=proxy_info,
                query=query,
                engine=engine,
                base_result=result,
            )
            if api_result is not None:
                return api_result
    except Exception as exc:
        logger.error(f"Google Programmable Search capture attempt failed unexpectedly: {exc}")

    browser = None
    context = None
    
    try:
        async with async_playwright() as p:
            
            protocol = proxy_info.get("protocol", "http")
            auth = parse_proxy_auth(proxy)
            proxy_addr = auth["addr"]
            username = proxy_info.get("username") or auth["username"]
            password = proxy_info.get("password") or auth["password"]
            proxy_server = f"{protocol}://{proxy_addr}"

            
            try:
                launch_headless = cfg("playwright.headless", True)
                browser = await p.chromium.launch(
                    headless=launch_headless,
                    args=[
                        '--disable-blink-features=AutomationControlled',
                        '--disable-dev-shm-usage',
                        '--no-sandbox'
                    ],
                    proxy={
                        "server": proxy_server,
                        **({"username": username} if username else {}),
                        **({"password": password} if password else {})
                    }
                )
                logger.info(f"Browser launched with {protocol} proxy {proxy_addr}")
            except Exception as e:
                result["status"] = "failed"
                result["error"] = f"Proxy launch failed: {str(e)[:120]}"
                logger.error(f"Failed to launch with proxy {proxy}: {e}")
                return result
            
            
            accept_language = get_country_language(proxy_info.get("country_code", "US") or "US")
            ua = choose_user_agent()
            context = await browser.new_context(
                viewport={"width": cfg("playwright.viewport.width", 1366), "height": cfg("playwright.viewport.height", 768)},
                user_agent=ua,
                ignore_https_errors=True,
                bypass_csp=True,
                extra_http_headers={
                    "Accept-Language": accept_language,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                    "Accept-Encoding": "gzip, deflate, br",
                    "DNT": "1",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1",
                    "Cache-Control": "max-age=0"
                }
            )
            
            
            try:
                await context.add_init_script(
                    """
                    
                    Object.defineProperty(navigator, 'webdriver', { get: () => false });
                    
                    
                    window.chrome = { runtime: {} };
                    
                    
                    Object.defineProperty(navigator, 'plugins', { 
                        get: () => [1, 2, 3, 4, 5] 
                    });
                    
                    
                    Object.defineProperty(navigator, 'languages', { 
                        get: () => ['en-US', 'en'] 
                    });
                    
                    
                    Object.defineProperty(navigator, 'platform', {
                        get: () => 'Win32'
                    });
                    
                    
                    const originalQuery = window.navigator.permissions.query;
                    window.navigator.permissions.query = (parameters) => (
                        parameters.name === 'notifications' ?
                            Promise.resolve({ state: Notification.permission }) :
                            originalQuery(parameters)
                    );
                    
                    
                    const getParameter = WebGLRenderingContext.prototype.getParameter;
                    WebGLRenderingContext.prototype.getParameter = function(parameter) {
                        if (parameter === 37445) return 'Intel Inc.';
                        if (parameter === 37446) return 'Intel Iris OpenGL Engine';
                        return getParameter.call(this, parameter);
                    };
                    
                    
                    delete navigator.__proto__.webdriver;
                    
                    
                    Object.defineProperty(navigator, 'connection', {
                        get: () => ({
                            effectiveType: '4g',
                            rtt: 50,
                            downlink: 10,
                            saveData: false
                        })
                    });
                    """
                )
            except Exception:
                pass
            
            page = await context.new_page()
            
            
            try:
                if HAVE_STEALTH:
                    await stealth_async(page)
            except Exception:
                pass

            
            search_url = get_search_url(engine, query)
            
            
            if engine.lower() == 'bing':
                locale = first_locale_from_accept_language(accept_language)
                glue = '&' if '?' in search_url else '?'
                search_url = f"{search_url}{glue}mkt={locale}&setlang={locale}"
            
            logger.info(f"🔍 Searching '{query}' on {engine}: {search_url}")

            max_attempts = 2
            attempt = 0
            last_err = None
            
            while attempt < max_attempts:
                try:
                    await page.goto(search_url, wait_until="domcontentloaded", timeout=cfg("playwright.timeout", 45000))
                    await page.wait_for_timeout(2000)

                    
                    if engine.lower() == 'duckduckgo':
                        try:
                            search_form = page.locator('form[action="/"]').first
                            if await search_form.count() > 0:
                                logger.warning(f"DuckDuckGo loaded homepage, submitting search for: {query}")
                                search_input = page.locator('input[name="q"]').first
                                await search_input.fill(query)
                                await search_input.press("Enter")
                                await page.wait_for_timeout(3000)
                        except Exception as e:
                            logger.debug(f"DuckDuckGo special handling: {e}")

                    
                    try:
                        consent_btns = [
                            "button:has-text('I agree')",
                            "button:has-text('Accept all')",
                            "button:has-text('Agree to all')",
                        ]
                        for sel in consent_btns:
                            loc = page.locator(sel)
                            if await loc.count() > 0:
                                await loc.first.click()
                                await page.wait_for_timeout(1500)
                                break
                    except Exception:
                        pass

                    
                    try:
                        await page.mouse.move(100, 100)
                        await page.mouse.move(300, 180)
                        await page.mouse.move(500, 220)
                        await page.evaluate("() => window.scrollBy(0, 120)")
                        await page.wait_for_timeout(500)
                    except Exception:
                        pass

                    
                    captcha_indicators = set(cfg("captcha_detection.keywords", [
                        "unusual traffic", "verify you're human", "captcha", "recaptcha", 
                        "security check", "access denied", "detected unusual traffic", "i'm not a robot"
                    ]))
                    page_content = await page.content()
                    blocked = any(indicator in page_content.lower() for indicator in captcha_indicators)

                    if blocked and engine.lower() == 'bing':
                        ok = await handle_bing_page(page, query)
                        if ok:
                            blocked = False
                            page_content = await page.content()
                    
                    if blocked:
                        logger.warning("CAPTCHA or block detected")
                        
                        try:
                            for fr in page.frames:
                                try:
                                    fr_url = (fr.url or '').lower()
                                    fr_title = (await fr.title()).lower() if hasattr(fr, 'title') else ''
                                    if 'recaptcha' in fr_url or 'recaptcha' in fr_title:
                                        anchor = fr.locator('#recaptcha-anchor')
                                        if await anchor.count() > 0:
                                            await anchor.click()
                                            await page.wait_for_timeout(3500)
                                            break
                                except Exception:
                                    continue
                        except Exception:
                            pass

                        
                        page_content = await page.content()
                        blocked = any(indicator in page_content.lower() for indicator in captcha_indicators)

                    if blocked:
                        result["blocked"] = True
                        result["status"] = "blocked"
                        result["error"] = "CAPTCHA or access denied detected"
                        logger.warning("Blocked persists after attempts; skipping screenshots")
                    else:
                        
                        country_safe = (proxy_info.get("country", "Unknown") or "Unknown").replace(" ", "_")
                        screenshot_dir = Path(f"results/screenshots/{job_id}/{country_safe}/{engine}")
                        screenshot_dir.mkdir(parents=True, exist_ok=True)

                        proxy_safe = proxy.replace(":", "_").replace(".", "_")
                        viewport_path = screenshot_dir / f"{proxy_safe}_viewport.png"
                        full_path = screenshot_dir / f"{proxy_safe}_full.png"

                        if cfg("features.viewport_screenshot", True):
                            await page.screenshot(path=str(viewport_path), full_page=False)
                            result["screenshot_path"] = str(viewport_path).replace("\\", "/")
                        if cfg("features.full_page_screenshot", True):
                            await page.screenshot(path=str(full_path), full_page=True)
                            result["screenshot_full_path"] = str(full_path).replace("\\", "/")

                        result["status"] = "success"
                        logger.info(f"✓ Screenshot captured for {proxy} on {engine} (attempt {attempt+1})")

                    break
                    
                except Exception as e:
                    last_err = e
                    attempt += 1
                    if attempt < max_attempts:
                        await page.wait_for_timeout(1500)
                        logger.info(f"Retrying navigation (attempt {attempt+1}/{max_attempts})...")
                    else:
                        result["status"] = "failed"
                        result["error"] = f"Page load error: {str(e)[:120]}"
                        logger.error(f"✗ Page load failed for {proxy}: {str(e)[:150]}")
            
            if context:
                await context.close()
            if browser:
                await browser.close()
    
    except Exception as e:
        result["status"] = "failed"
        result["error"] = f"Browser error: {str(e)[:100]}"
        logger.error(f"✗ Browser error for {proxy}: {str(e)[:150]}")
        
        try:
            if context:
                await context.close()
            if browser:
                await browser.close()
        except:
            pass
    
    return result


async def capture_screenshot_with_semaphore(
    job_id: str,
    proxy: str,
    proxy_info: Dict[str, Any],
    query: str,
    engine: str,
    stop_flags: Optional[Dict[str, bool]] = None
) -> Optional[Dict[str, Any]]:
    """
    Wrapper for capture_screenshot that uses semaphore for concurrency control.
    
    Args:
        job_id: Job identifier
        proxy: Proxy address
        proxy_info: Proxy information dict
        query: Search query
        engine: Search engine name
        stop_flags: Dictionary to check if job should stop
        
    Returns:
        Result dict or None if job was stopped
    """
    
    if stop_flags and stop_flags.get(job_id, False):
        return None
    
    semaphore = get_browser_semaphore()
    async with semaphore:
        
        if stop_flags and stop_flags.get(job_id, False):
            return None
        
        try:
            result = await capture_screenshot(
                job_id=job_id,
                proxy=proxy,
                proxy_info=proxy_info,
                query=query,
                engine=engine
            )
            return result
        except asyncio.CancelledError:
            
            logger.info(f"Task cancelled for {proxy} on {engine}")
            return None
        except Exception as e:
            logger.error(f"Error in capture_screenshot_with_semaphore: {e}")
            return {
                "proxy": proxy,
                "country": proxy_info.get("country", "Unknown"),
                "engine": engine,
                "status": "failed",
                "error": str(e)[:120]
            }


async def process_search_job(
    job_id: str,
    proxies: list,
    query: str,
    engines: list,
    jobs_state: Dict[str, Dict[str, Any]],
    google_credentials: Optional[Dict[str, str]] = None,
    stop_flags: Optional[Dict[str, bool]] = None,
):
    """
    Background task to process all screenshots.
    
    Args:
        job_id: Job identifier
        proxies: List of proxy dicts
        query: Search query
        engines: List of search engines
        jobs_state: Global jobs state dict
        google_credentials: Optional Google API credentials
        stop_flags: Optional dict to check for stop signals
    """
    from config import set_google_programmable_credentials
    import json
    
    
    try:
        from routes.websocket_routes import broadcast_job_update
        has_websocket = True
    except ImportError:
        has_websocket = False
    
    jobs_state[job_id]["status"] = "running"
    jobs_state[job_id]["total_tasks"] = len(proxies) * len(engines)
    jobs_state[job_id]["completed_tasks"] = 0
    jobs_state[job_id]["results"] = []
    
    
    if has_websocket:
        try:
            await broadcast_job_update(job_id, "started", {
                "job_id": job_id,
                "status": "running",
                "total_tasks": jobs_state[job_id]["total_tasks"],
                "query": query,
                "engines": engines
            })
        except Exception as e:
            logger.debug(f"WebSocket broadcast failed: {e}")

    if google_credentials:
        set_google_programmable_credentials(
            google_credentials.get("api_key"),
            google_credentials.get("search_engine_id"),
        )
    
    
    tasks = []
    for proxy_info in proxies:
        if proxy_info["status"] != "valid":
            continue
        
        eng_order = list(engines)
        try:
            if cfg("behavior.shuffle_engines", True):
                random.shuffle(eng_order)
        except Exception:
            pass
        
        for engine in eng_order:
            tasks.append({
                "proxy_info": proxy_info,
                "engine": engine
            })
    
    logger.info(f"� Processing {len(tasks)} tasks concurrently for job {job_id}")
    
    
    async def process_task(task_data):
        """Process a single task and update state."""
        try:
            
            if stop_flags and stop_flags.get(job_id, False):
                return None
            
            result = await capture_screenshot_with_semaphore(
                job_id=job_id,
                proxy=task_data["proxy_info"]["proxy"],
                proxy_info=task_data["proxy_info"],
                query=query,
                engine=task_data["engine"],
                stop_flags=stop_flags
            )
            
            
            if result is None:
                return None
            
            
            jobs_state[job_id]["results"].append(result)
            jobs_state[job_id]["completed_tasks"] += 1
            
            
            if has_websocket:
                try:
                    await broadcast_job_update(job_id, "progress", {
                        "job_id": job_id,
                        "status": "running",
                        "total_tasks": jobs_state[job_id]["total_tasks"],
                        "completed_tasks": jobs_state[job_id]["completed_tasks"],
                        "progress": (jobs_state[job_id]["completed_tasks"] / 
                                   jobs_state[job_id]["total_tasks"] * 100),
                        "latest_result": result
                    })
                except Exception as e:
                    logger.debug(f"WebSocket broadcast failed: {e}")
            
            
            try:
                delay_min_ms = int(cfg("behavior.task_delay_min_ms", 200) or 200)
                delay_max_ms = int(cfg("behavior.task_delay_max_ms", 500) or 500)
                if delay_max_ms < delay_min_ms:
                    delay_max_ms = delay_min_ms + 100
                await asyncio.sleep(random.uniform(delay_min_ms/1000.0, delay_max_ms/1000.0))
            except asyncio.CancelledError:
                
                return None
            except Exception:
                pass
            
            return result
        
        except asyncio.CancelledError:
            
            logger.debug(f"Task cancelled for {task_data['proxy_info']['proxy']} on {task_data['engine']}")
            return None
    
    
    
    try:
        task_coroutines = [process_task(task_data) for task_data in tasks]
        running_tasks = [asyncio.create_task(coro) for coro in task_coroutines]
        
        
        jobs_state[job_id]["running_tasks"] = running_tasks
        
        
        while running_tasks:
            
            if stop_flags and stop_flags.get(job_id, False):
                logger.info(f"🛑 Job {job_id} stop requested - cancelling {len(running_tasks)} running tasks")
                
                
                for task in running_tasks:
                    if not task.done():
                        task.cancel()
                
                
                await asyncio.gather(*running_tasks, return_exceptions=True)
                
                logger.info(f"🛑 All tasks cancelled for job {job_id}")
                jobs_state[job_id]["status"] = "stopped"
                break
            
            
            done, pending = await asyncio.wait(running_tasks, timeout=0.5, return_when=asyncio.FIRST_COMPLETED)
            
            
            running_tasks = list(pending)
            
            
            if not running_tasks:
                break
        
        
        if "running_tasks" in jobs_state[job_id]:
            del jobs_state[job_id]["running_tasks"]
            
    except Exception as e:
        logger.error(f"Error in concurrent task processing: {e}")
    
    
    if stop_flags and stop_flags.get(job_id, False):
        if jobs_state[job_id]["status"] != "stopped":
            logger.info(f"🛑 Job {job_id} stopped by user request")
            jobs_state[job_id]["status"] = "stopped"
    
    
    
    if jobs_state[job_id]["status"] != "stopped":
        jobs_state[job_id]["status"] = "completed"
    jobs_state[job_id]["completed_at"] = datetime.utcnow().isoformat()
    
    
    if has_websocket:
        try:
            
            status_type = "stopped" if jobs_state[job_id]["status"] == "stopped" else "completed"
            await broadcast_job_update(job_id, status_type, jobs_state[job_id])
        except Exception as e:
            logger.debug(f"WebSocket broadcast failed: {e}")
    
    
    ensure_results_directory()
    log_file = Path(f"results/logs/{job_id}.json")
    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(jobs_state[job_id], f, indent=2, ensure_ascii=False)
