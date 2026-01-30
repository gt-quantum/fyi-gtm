import requests
from datetime import datetime, timezone

from .config import KIT_API_KEY

KIT_API_BASE = "https://api.kit.com/v4"


def extract_preview_text(content: str, max_length: int = 100) -> str:
    """
    Extract preview text from the newsletter content.
    Gets the first meaningful sentence/paragraph, skipping headings and images.
    """
    lines = content.strip().split("\n")
    for line in lines:
        line = line.strip()
        # Skip empty lines, headings, and images
        if not line or line.startswith("#") or line.startswith("!") or line.startswith("---"):
            continue
        # Found a content line - clean it up and truncate
        preview = line.replace("**", "").replace("*", "")
        if len(preview) > max_length:
            preview = preview[:max_length-3].rsplit(" ", 1)[0] + "..."
        return preview
    return ""


def create_draft_broadcast(subject: str, content: str, description: str = None) -> dict:
    """
    Create a draft broadcast in Kit.com.
    Returns the API response including the broadcast ID.
    """
    url = f"{KIT_API_BASE}/broadcasts"

    headers = {
        "X-Kit-Api-Key": KIT_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    # Convert markdown to HTML
    html_content = markdown_to_html(content)

    # Extract preview text from first paragraph
    preview_text = extract_preview_text(content)

    payload = {
        "subject": subject,
        "content": html_content,
        "description": description or subject,
        "public": False,  # Don't publish to web
        "send_at": None,  # null = draft, not scheduled
        "preview_text": preview_text,
    }

    response = requests.post(url, json=payload, headers=headers, timeout=30)

    if not response.ok:
        print(f"Kit API error: {response.status_code}")
        print(f"Response: {response.text}")
        response.raise_for_status()

    return response.json()


def markdown_to_html(markdown_text: str) -> str:
    """
    Convert markdown to HTML for Kit.
    """
    try:
        import markdown
        return markdown.markdown(
            markdown_text,
            extensions=["extra", "smarty", "sane_lists"],
        )
    except ImportError:
        # Fallback if markdown library not available
        return f"<div>{markdown_text}</div>"
