"""
Reddit Search Scraper

Searches Reddit for tool mentions to gather:
- Community sentiment
- Real user experiences
- Common issues/praises
"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
import json

from ..config import REQUEST_TIMEOUT, USER_AGENT


def scrape_reddit(tool_name: str, tool_domain: str = None) -> dict:
    """
    Search Reddit for tool discussions.

    Args:
        tool_name: The tool name to search for
        tool_domain: Optional domain for more specific searches

    Returns:
        dict with 'content' (text summary) and 'raw' (structured data)
    """
    # Use old.reddit.com for easier scraping (no JS required)
    search_query = f'"{tool_name}"'
    if tool_domain:
        search_query += f" OR {tool_domain}"

    # Search URL
    search_url = f"https://old.reddit.com/search?q={quote_plus(search_query)}&sort=relevance&t=year"

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    try:
        response = requests.get(search_url, headers=headers, timeout=REQUEST_TIMEOUT)

        if response.status_code != 200:
            return {
                "content": f"Could not search Reddit for {tool_name}",
                "raw": None,
                "source": search_url,
            }

        soup = BeautifulSoup(response.text, "html.parser")

        # Extract search results
        posts = extract_posts(soup)

        if not posts:
            return {
                "content": f"No Reddit discussions found for {tool_name}",
                "raw": None,
                "source": search_url,
            }

        # Build content summary
        content_parts = [f"Reddit Discussions about {tool_name}:"]
        content_parts.append(f"Found {len(posts)} relevant discussions")
        content_parts.append("")

        for i, post in enumerate(posts[:5], start=1):
            content_parts.append(f"[{i}] {post.get('title', 'No title')}")
            content_parts.append(f"    Subreddit: r/{post.get('subreddit', 'unknown')}")
            if post.get("score"):
                content_parts.append(f"    Score: {post['score']}")
            if post.get("comments"):
                content_parts.append(f"    Comments: {post['comments']}")
            content_parts.append("")

        return {
            "content": "\n".join(content_parts),
            "raw": {"posts": posts, "total": len(posts)},
            "source": search_url,
        }

    except requests.RequestException as e:
        return {
            "content": None,
            "raw": None,
            "source": search_url,
            "error": str(e),
        }


def extract_posts(soup: BeautifulSoup) -> list:
    """Extract post data from search results."""
    posts = []

    # Old Reddit uses specific class names
    for thing in soup.select('div.thing[data-type="link"]'):
        post = {}

        # Title and URL
        title_el = thing.select_one('a.title')
        if title_el:
            post["title"] = title_el.get_text(strip=True)
            post["url"] = title_el.get("href", "")

        # Subreddit
        subreddit_el = thing.select_one('a.subreddit')
        if subreddit_el:
            post["subreddit"] = subreddit_el.get_text(strip=True).replace("r/", "")

        # Score
        score_el = thing.select_one('div.score')
        if score_el:
            post["score"] = score_el.get_text(strip=True)

        # Comments
        comments_el = thing.select_one('a.comments')
        if comments_el:
            text = comments_el.get_text(strip=True)
            import re
            match = re.search(r"(\d+)", text)
            if match:
                post["comments"] = match.group(1)

        if post.get("title"):
            posts.append(post)

    return posts


def scrape_reddit_json(tool_name: str) -> dict:
    """
    Alternative: Use Reddit's JSON API (no auth required for search).
    Falls back to this if old.reddit.com scraping fails.
    """
    search_url = f"https://www.reddit.com/search.json?q={quote_plus(tool_name)}&sort=relevance&t=year&limit=10"

    headers = {
        "User-Agent": USER_AGENT,
    }

    try:
        response = requests.get(search_url, headers=headers, timeout=REQUEST_TIMEOUT)

        if response.status_code != 200:
            return {
                "content": None,
                "raw": None,
                "source": search_url,
                "error": f"Status {response.status_code}",
            }

        data = response.json()
        posts = []

        for child in data.get("data", {}).get("children", []):
            post_data = child.get("data", {})
            posts.append({
                "title": post_data.get("title"),
                "subreddit": post_data.get("subreddit"),
                "score": post_data.get("score"),
                "comments": post_data.get("num_comments"),
                "url": post_data.get("permalink"),
            })

        content_parts = [f"Reddit Discussions about {tool_name}:"]
        content_parts.append(f"Found {len(posts)} discussions")

        for post in posts[:5]:
            content_parts.append(f"- [{post.get('score', 0)} pts] {post.get('title', '')} (r/{post.get('subreddit', '')})")

        return {
            "content": "\n".join(content_parts),
            "raw": {"posts": posts},
            "source": search_url,
        }

    except (requests.RequestException, json.JSONDecodeError) as e:
        return {
            "content": None,
            "raw": None,
            "source": search_url,
            "error": str(e),
        }
