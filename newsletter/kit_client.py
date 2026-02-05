import requests
from datetime import datetime, timezone, timedelta

from .config import KIT_API_KEY

KIT_API_BASE = "https://api.kit.com/v4"


def get_next_friday_10am_et() -> str:
    """
    Calculate next Friday at 10:00 AM ET.
    Returns ISO8601 timestamp.
    """
    # ET is UTC-5 (EST) or UTC-4 (EDT)
    # For simplicity, using UTC-5 (standard time)
    # 10:00 AM ET = 15:00 UTC
    now = datetime.now(timezone.utc)

    # Find next Friday (weekday 4)
    days_until_friday = (4 - now.weekday()) % 7
    if days_until_friday == 0 and now.hour >= 15:
        # It's Friday but past 10 AM ET, schedule for next Friday
        days_until_friday = 7

    next_friday = now + timedelta(days=days_until_friday)
    # Set to 15:00 UTC (10:00 AM ET)
    send_time = next_friday.replace(hour=15, minute=0, second=0, microsecond=0)

    return send_time.isoformat()


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
        import re
        preview = line.replace("**", "").replace("*", "")
        # Strip markdown links: [text](url) → text
        preview = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', preview)
        if len(preview) > max_length:
            preview = preview[:max_length-3].rsplit(" ", 1)[0] + "..."
        return preview
    return ""


def create_draft_broadcast(subject: str, content: str, description: str = None, schedule: bool = True) -> dict:
    """
    Create a broadcast in Kit.com, optionally scheduled.
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

    # Schedule for next Friday 10 AM ET, or leave as draft
    send_at = get_next_friday_10am_et() if schedule else None

    payload = {
        "subject": subject,
        "content": html_content,
        "description": description or subject,
        "public": False,  # Don't publish to web
        "send_at": send_at,
        "preview_text": preview_text,
    }

    # Debug: dump payload before sending
    import json as _json
    print(f"  Kit payload subject: {payload.get('subject')}")
    print(f"  Kit payload description: {payload.get('description')}")
    print(f"  Kit payload public: {payload.get('public')}")
    print(f"  Kit payload send_at: {payload.get('send_at')}")
    print(f"  Kit payload preview_text: {payload.get('preview_text')}")
    print(f"  Kit payload content (first 500 chars): {payload.get('content', '')[:500]}")
    print(f"  Kit payload keys: {list(payload.keys())}")

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
