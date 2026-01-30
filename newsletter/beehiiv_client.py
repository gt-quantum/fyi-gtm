import requests

from .config import BEEHIIV_API_KEY, BEEHIIV_PUBLICATION_ID

BEEHIIV_API_BASE = "https://api.beehiiv.com/v2"


def create_draft_post(title: str, content: str, subtitle: str | None = None) -> dict:
    """
    Create a draft post in beehiiv.
    Returns the API response including the post ID.
    """
    url = f"{BEEHIIV_API_BASE}/publications/{BEEHIIV_PUBLICATION_ID}/posts"

    headers = {
        "Authorization": f"Bearer {BEEHIIV_API_KEY}",
        "Content-Type": "application/json",
    }

    # beehiiv expects content in their web_content format
    payload = {
        "title": title,
        "subtitle": subtitle or "",
        "content_html": markdown_to_html(content),
        "status": "draft",  # Create as draft, not published
    }

    response = requests.post(url, json=payload, headers=headers, timeout=30)
    response.raise_for_status()

    return response.json()


def markdown_to_html(markdown_text: str) -> str:
    """
    Convert markdown to HTML for beehiiv.
    Uses a simple conversion - you may want to use a proper library.
    """
    try:
        import markdown
        return markdown.markdown(
            markdown_text,
            extensions=["extra", "smarty", "sane_lists"],
        )
    except ImportError:
        # Fallback: wrap in pre tags if markdown library not available
        # This is not ideal but ensures the workflow doesn't break
        return f"<div>{markdown_text}</div>"
