"""
Trustpilot Reviews Scraper

Scrapes Trustpilot for:
- Overall rating
- Review count
- Review themes
"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

from ..config import REQUEST_TIMEOUT, USER_AGENT


def scrape_trustpilot(tool_domain: str) -> dict:
    """
    Scrape Trustpilot reviews for a tool.

    Args:
        tool_domain: The tool's domain (e.g., "notion.so")

    Returns:
        dict with 'content' (text summary) and 'raw' (structured data)
    """
    # Clean up domain
    domain = tool_domain.lower()
    if domain.startswith("www."):
        domain = domain[4:]

    url = f"https://www.trustpilot.com/review/{domain}"

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    try:
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)

        if response.status_code == 404:
            return {
                "content": f"No Trustpilot listing found for {domain}",
                "raw": None,
                "source": url,
            }

        if response.status_code != 200:
            return {
                "content": f"Could not fetch Trustpilot page for {domain}",
                "raw": None,
                "source": url,
            }

        soup = BeautifulSoup(response.text, "html.parser")

        # Extract review data
        data = {
            "rating": extract_rating(soup),
            "review_count": extract_review_count(soup),
            "rating_breakdown": extract_rating_breakdown(soup),
            "recent_reviews": extract_recent_reviews(soup),
        }

        # Build content summary
        content_parts = [f"Trustpilot Reviews for {domain}:"]

        if data["rating"]:
            content_parts.append(f"Rating: {data['rating']}/5")

        if data["review_count"]:
            content_parts.append(f"Total Reviews: {data['review_count']}")

        if data["rating_breakdown"]:
            content_parts.append("Rating Breakdown:")
            for stars, count in data["rating_breakdown"].items():
                content_parts.append(f"  {stars} stars: {count}")

        if data["recent_reviews"]:
            content_parts.append("Recent Review Excerpts:")
            for review in data["recent_reviews"][:3]:
                stars = review.get("stars", "?")
                text = review.get("text", "")[:150]
                content_parts.append(f"  [{stars}/5] {text}...")

        return {
            "content": "\n".join(content_parts),
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


def extract_rating(soup: BeautifulSoup) -> str | None:
    """Extract the overall rating."""
    for selector in [
        '[data-rating-label]',
        '[class*="star-rating"]',
        'span[class*="rating"]',
    ]:
        element = soup.select_one(selector)
        if element:
            # Check for data attribute first
            rating = element.get("data-rating-label")
            if rating:
                return rating

            text = element.get_text(strip=True)
            import re
            match = re.search(r"(\d+\.?\d*)", text)
            if match:
                return match.group(1)
    return None


def extract_review_count(soup: BeautifulSoup) -> str | None:
    """Extract the total review count."""
    for selector in [
        '[class*="reviewsCount"]',
        '[data-reviews-count-typography]',
    ]:
        element = soup.select_one(selector)
        if element:
            text = element.get_text(strip=True)
            import re
            # Match numbers with optional commas
            match = re.search(r"([\d,]+)", text)
            if match:
                return match.group(1)

    # Try to find in page content
    for text_pattern in ["reviews", "total"]:
        for element in soup.find_all(string=lambda s: s and text_pattern in s.lower()):
            import re
            match = re.search(r"([\d,]+)\s*(?:reviews|total)", str(element), re.I)
            if match:
                return match.group(1)

    return None


def extract_rating_breakdown(soup: BeautifulSoup) -> dict:
    """Extract rating breakdown by stars."""
    breakdown = {}

    for selector in [
        '[class*="rating-bar"]',
        '[class*="star-distribution"]',
    ]:
        elements = soup.select(selector)
        for i, el in enumerate(elements[:5], start=1):
            # Try to find the count
            count_el = el.select_one('[class*="count"]')
            if count_el:
                breakdown[6 - i] = count_el.get_text(strip=True)

    return breakdown


def extract_recent_reviews(soup: BeautifulSoup) -> list:
    """Extract recent review excerpts."""
    reviews = []

    for selector in [
        '[class*="review-card"]',
        '[class*="review-content"]',
        'article[class*="review"]',
    ]:
        elements = soup.select(selector)
        for el in elements[:5]:
            review = {}

            # Find rating
            rating_el = el.select_one('[data-service-review-rating]')
            if rating_el:
                review["stars"] = rating_el.get("data-service-review-rating", "?")

            # Find text
            text_el = el.select_one('[data-service-review-text-typography]')
            if not text_el:
                text_el = el.select_one('p')
            if text_el:
                review["text"] = text_el.get_text(strip=True)

            if review.get("text"):
                reviews.append(review)

    return reviews[:5]
