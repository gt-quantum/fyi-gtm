import requests

from .config import SENDER_API_KEY, SENDER_FROM_NAME, SENDER_REPLY_TO

SENDER_API_BASE = "https://api.sender.net/v2"


def create_draft_campaign(title: str, subject: str, content: str) -> dict:
    """
    Create a draft campaign in sender.net.
    Returns the API response including the campaign ID.
    """
    url = f"{SENDER_API_BASE}/campaigns"

    headers = {
        "Authorization": f"Bearer {SENDER_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    # Convert markdown to HTML
    html_content = markdown_to_html(content)

    payload = {
        "title": title,
        "subject": subject,
        "from": SENDER_FROM_NAME,
        "reply_to": SENDER_REPLY_TO,
        "content_type": "html",
        "content": html_content,
    }

    response = requests.post(url, json=payload, headers=headers, timeout=30)

    if not response.ok:
        print(f"Sender API error: {response.status_code}")
        print(f"Response: {response.text}")
        response.raise_for_status()

    return response.json()


def markdown_to_html(markdown_text: str) -> str:
    """
    Convert markdown to HTML for sender.net.
    """
    try:
        import markdown
        html_body = markdown.markdown(
            markdown_text,
            extensions=["extra", "smarty", "sane_lists"],
        )
        # Wrap in basic HTML email template
        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
{html_body}
<p style="margin-top: 40px; font-size: 12px; color: #666;">
    <a href="{{{{$unsubscribe_link}}}}">Unsubscribe</a>
</p>
</body>
</html>"""
    except ImportError:
        # Fallback if markdown library not available
        return f"<div>{markdown_text}</div>"
