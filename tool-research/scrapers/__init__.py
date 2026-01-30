"""
Web Scrapers for Tool Research

Each scraper module handles fetching and parsing data from a specific source.
All scrapers return a dict with 'content' (text summary) and 'raw' (parsed data) keys.
"""

from .website import scrape_website
from .g2 import scrape_g2
from .trustpilot import scrape_trustpilot
from .reddit import scrape_reddit
from .logo import fetch_logo

__all__ = [
    "scrape_website",
    "scrape_g2",
    "scrape_trustpilot",
    "scrape_reddit",
    "fetch_logo",
]
