"""
G2 Reviews Scraper

Scrapes G2.com for:
- Overall rating
- Review count
- Pros/cons patterns
- User quotes
"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import quote_plus

from ..config import REQUEST_TIMEOUT, USER_AGENT


def scrape_g2(tool_name: str, tool_domain: str = None) -> dict:
    """
    Scrape G2 reviews for a tool.

    Args:
        tool_name: The tool name to search for
        tool_domain: Optional domain to help find the right product

    Returns:
        dict with 'content' (text summary) and 'raw' (structured data)
    """
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    # Try to find the product page via search
    search_url = f"https://www.g2.com/search?query={quote_plus(tool_name)}"

    try:
        # First, search for the product
        response = requests.get(search_url, headers=headers, timeout=REQUEST_TIMEOUT)

        if response.status_code != 200:
            return {
                "content": f"Could not search G2 for {tool_name}",
                "raw": None,
                "source": search_url,
            }

        soup = BeautifulSoup(response.text, "html.parser")

        # Find product links in search results
        product_link = find_product_link(soup, tool_name, tool_domain)

        if not product_link:
            return {
                "content": f"No G2 listing found for {tool_name}",
                "raw": None,
                "source": search_url,
            }

        # Fetch the product page
        product_url = f"https://www.g2.com{product_link}"
        response = requests.get(product_url, headers=headers, timeout=REQUEST_TIMEOUT)

        if response.status_code != 200:
            return {
                "content": f"Could not fetch G2 page for {tool_name}",
                "raw": None,
                "source": product_url,
            }

        soup = BeautifulSoup(response.text, "html.parser")

        # Extract review data
        data = {
            "rating": extract_rating(soup),
            "review_count": extract_review_count(soup),
            "pros": extract_pros(soup),
            "cons": extract_cons(soup),
            "summary": extract_summary(soup),
        }

        # Build content summary
        content_parts = [f"G2 Reviews for {tool_name}:"]

        if data["rating"]:
            content_parts.append(f"Rating: {data['rating']}/5")

        if data["review_count"]:
            content_parts.append(f"Reviews: {data['review_count']}")

        if data["summary"]:
            content_parts.append(f"Summary: {data['summary']}")

        if data["pros"]:
            content_parts.append("Common Pros:")
            for pro in data["pros"][:5]:
                content_parts.append(f"  + {pro}")

        if data["cons"]:
            content_parts.append("Common Cons:")
            for con in data["cons"][:5]:
                content_parts.append(f"  - {con}")

        return {
            "content": "\n".join(content_parts),
            "raw": data,
            "source": product_url,
        }

    except requests.RequestException as e:
        return {
            "content": None,
            "raw": None,
            "source": search_url,
            "error": str(e),
        }


def find_product_link(soup: BeautifulSoup, tool_name: str, tool_domain: str = None) -> str | None:
    """Find the most relevant product link from search results."""
    # Look for product cards in search results
    for link in soup.select('a[href*="/products/"]'):
        href = link.get("href", "")
        text = link.get_text(strip=True).lower()

        # Match by name
        if tool_name.lower() in text:
            return href

        # Match by domain in href
        if tool_domain and tool_domain.lower() in href.lower():
            return href

    return None


def extract_rating(soup: BeautifulSoup) -> str | None:
    """Extract the overall rating."""
    for selector in [
        '[class*="star-rating"]',
        '[class*="rating-score"]',
        '[itemprop="ratingValue"]',
    ]:
        element = soup.select_one(selector)
        if element:
            text = element.get_text(strip=True)
            # Extract number from text
            import re
            match = re.search(r"(\d+\.?\d*)", text)
            if match:
                return match.group(1)
    return None


def extract_review_count(soup: BeautifulSoup) -> str | None:
    """Extract the review count."""
    for selector in [
        '[class*="review-count"]',
        '[itemprop="reviewCount"]',
    ]:
        element = soup.select_one(selector)
        if element:
            text = element.get_text(strip=True)
            import re
            match = re.search(r"(\d+)", text.replace(",", ""))
            if match:
                return match.group(1)
    return None


def extract_pros(soup: BeautifulSoup) -> list:
    """Extract common pros from reviews."""
    pros = []
    for selector in [
        '[class*="pros"] li',
        '[class*="like"] li',
        '[data-review-section="pros"] p',
    ]:
        elements = soup.select(selector)
        for el in elements[:10]:
            text = el.get_text(strip=True)
            if text and 10 < len(text) < 300:
                pros.append(text)
    return pros[:5]


def extract_cons(soup: BeautifulSoup) -> list:
    """Extract common cons from reviews."""
    cons = []
    for selector in [
        '[class*="cons"] li',
        '[class*="dislike"] li',
        '[data-review-section="cons"] p',
    ]:
        elements = soup.select(selector)
        for el in elements[:10]:
            text = el.get_text(strip=True)
            if text and 10 < len(text) < 300:
                cons.append(text)
    return cons[:5]


def extract_summary(soup: BeautifulSoup) -> str | None:
    """Extract the product summary."""
    for selector in [
        '[class*="product-description"]',
        '[class*="about"] p',
        'meta[name="description"]',
    ]:
        if "meta" in selector:
            element = soup.select_one(selector)
            if element:
                return element.get("content", "")[:300]
        else:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                if text and len(text) > 20:
                    return text[:300]
    return None
