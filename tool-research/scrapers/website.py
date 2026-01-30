"""
Website Scraper

Scrapes the tool's main website for:
- Name and tagline
- Description
- Features
- Pricing info
"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

from ..config import REQUEST_TIMEOUT, USER_AGENT


def scrape_website(url: str) -> dict:
    """
    Scrape the tool's main website.

    Returns:
        dict with 'content' (text summary) and 'raw' (structured data)
    """
    headers = {"User-Agent": USER_AGENT}

    try:
        # Fetch main page
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Extract data
        data = {
            "name": extract_name(soup),
            "tagline": extract_tagline(soup),
            "description": extract_description(soup),
            "features": extract_features(soup),
        }

        # Try to fetch pricing page
        pricing_url = find_pricing_url(soup, url)
        if pricing_url:
            data["pricing"] = scrape_pricing_page(pricing_url, headers)

        # Build content summary
        content_parts = []

        if data["name"]:
            content_parts.append(f"Name: {data['name']}")

        if data["tagline"]:
            content_parts.append(f"Tagline: {data['tagline']}")

        if data["description"]:
            content_parts.append(f"Description: {data['description']}")

        if data["features"]:
            content_parts.append("Features:")
            for feature in data["features"][:10]:
                content_parts.append(f"  - {feature}")

        if data.get("pricing"):
            content_parts.append(f"Pricing: {data['pricing']}")

        return {
            "content": "\n".join(content_parts) if content_parts else None,
            "raw": data,
            "source": url,
        }

    except requests.RequestException as e:
        return {
            "content": None,
            "raw": None,
            "source": url,
            "error": str(e),
        }


def extract_name(soup: BeautifulSoup) -> str | None:
    """Extract the tool name from the page."""
    # Try common patterns
    for selector in [
        "h1",
        '[class*="logo"]',
        '[class*="brand"]',
        "title",
    ]:
        element = soup.select_one(selector)
        if element:
            text = element.get_text(strip=True)
            if text and len(text) < 100:
                # Clean up title tags
                if selector == "title":
                    text = text.split("|")[0].split("-")[0].strip()
                return text
    return None


def extract_tagline(soup: BeautifulSoup) -> str | None:
    """Extract the tool's tagline/headline."""
    for selector in [
        "h1 + p",
        "h1 + h2",
        '[class*="tagline"]',
        '[class*="subtitle"]',
        '[class*="hero"] p',
        'meta[name="description"]',
    ]:
        if selector.startswith("meta"):
            element = soup.select_one(selector)
            if element:
                return element.get("content", "")[:200]
        else:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                if text and 10 < len(text) < 300:
                    return text
    return None


def extract_description(soup: BeautifulSoup) -> str | None:
    """Extract the tool's main description."""
    # Try meta description first
    meta = soup.select_one('meta[name="description"]')
    if meta:
        return meta.get("content", "")

    # Try og:description
    og = soup.select_one('meta[property="og:description"]')
    if og:
        return og.get("content", "")

    # Try first substantial paragraph
    for p in soup.find_all("p"):
        text = p.get_text(strip=True)
        if 50 < len(text) < 500:
            return text

    return None


def extract_features(soup: BeautifulSoup) -> list:
    """Extract feature list from the page."""
    features = []

    # Look for feature sections
    for selector in [
        '[class*="feature"] h3',
        '[class*="feature"] h4',
        '[class*="features"] li',
        '[class*="benefit"] h3',
        '[class*="benefit"] h4',
    ]:
        elements = soup.select(selector)
        for el in elements[:15]:
            text = el.get_text(strip=True)
            if text and 5 < len(text) < 200:
                features.append(text)

    return features[:10]


def find_pricing_url(soup: BeautifulSoup, base_url: str) -> str | None:
    """Find the pricing page URL."""
    for link in soup.find_all("a", href=True):
        href = link.get("href", "")
        text = link.get_text(strip=True).lower()

        if "pricing" in href.lower() or "pricing" in text:
            return urljoin(base_url, href)

    return None


def scrape_pricing_page(url: str, headers: dict) -> str | None:
    """Scrape pricing information from a pricing page."""
    try:
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Look for pricing information
        pricing_parts = []

        # Find plan names and prices
        for selector in [
            '[class*="price"]',
            '[class*="plan"]',
            '[class*="tier"]',
        ]:
            elements = soup.select(selector)
            for el in elements[:10]:
                text = el.get_text(strip=True)
                if text and ("$" in text or "free" in text.lower() or "mo" in text.lower()):
                    pricing_parts.append(text[:100])

        return " | ".join(pricing_parts[:5]) if pricing_parts else None

    except requests.RequestException:
        return None
