"""
Logo Fetcher

Attempts to fetch the tool's logo from multiple sources:
1. Favicon from the tool's website
2. Clearbit Logo API
3. Google Favicon service
"""

import requests
from urllib.parse import urlparse
import base64

from ..config import REQUEST_TIMEOUT, USER_AGENT


def fetch_logo(tool_url: str) -> dict:
    """
    Fetch the tool's logo from various sources.

    Args:
        tool_url: The tool's website URL

    Returns:
        dict with 'url' (logo URL), 'source' (where it came from), and optionally 'data' (base64)
    """
    domain = urlparse(tool_url).netloc
    if domain.startswith("www."):
        domain = domain[4:]

    headers = {"User-Agent": USER_AGENT}

    # Try sources in order of preference
    sources = [
        ("clearbit", f"https://logo.clearbit.com/{domain}"),
        ("favicon", f"https://{domain}/favicon.ico"),
        ("google", f"https://www.google.com/s2/favicons?domain={domain}&sz=128"),
    ]

    for source_name, url in sources:
        try:
            response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)

            if response.status_code == 200:
                content_type = response.headers.get("content-type", "")

                # Check if it's an actual image
                if "image" in content_type or url.endswith((".ico", ".png", ".jpg", ".svg")):
                    # For Clearbit and larger icons, we have a good logo
                    if source_name == "clearbit" or len(response.content) > 1000:
                        return {
                            "url": url,
                            "source": source_name,
                            "content_type": content_type,
                            "size": len(response.content),
                        }

        except requests.RequestException:
            continue

    # If nothing worked, return Google favicon as fallback (always works)
    return {
        "url": f"https://www.google.com/s2/favicons?domain={domain}&sz=64",
        "source": "google_fallback",
        "content_type": "image/png",
    }


def download_logo(logo_url: str, save_path: str = None) -> bytes | None:
    """
    Download a logo and optionally save it to disk.

    Args:
        logo_url: URL of the logo to download
        save_path: Optional path to save the logo file

    Returns:
        The logo bytes if successful, None otherwise
    """
    headers = {"User-Agent": USER_AGENT}

    try:
        response = requests.get(logo_url, headers=headers, timeout=REQUEST_TIMEOUT)

        if response.status_code == 200:
            if save_path:
                with open(save_path, "wb") as f:
                    f.write(response.content)
            return response.content

    except requests.RequestException:
        pass

    return None


def logo_to_base64(logo_bytes: bytes, content_type: str = "image/png") -> str:
    """Convert logo bytes to base64 data URL."""
    b64 = base64.b64encode(logo_bytes).decode("utf-8")
    return f"data:{content_type};base64,{b64}"
