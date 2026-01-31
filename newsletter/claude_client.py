import time
import anthropic

from .config import ANTHROPIC_API_KEY, WRITING_MODEL, MAX_WRITING_TOKENS

# Default newsletter structure used when none is configured in the database
DEFAULT_STRUCTURE = """## 1️⃣ Sales Tech Spotlight
Feature ONE sales technology. If a specific tech was provided above, use it. Otherwise, choose something relevant and timely.
Brief description of what it does and why it matters now.

## 2️⃣ Two Tips to Try This Week
Two actionable tips. If specific tips were provided above, expand on them. Otherwise, generate relevant tips based on the newsletter context.
Keep them practical and specific.

## 3️⃣ Three Takeaways
Three quick insights or learnings. These should be observations, stats, or lessons relevant to the audience."""


def get_client():
    """Create and return Anthropic client."""
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def call_with_retry(func, max_retries=3):
    """Call a function with exponential backoff on rate limit errors."""
    for attempt in range(max_retries):
        try:
            return func()
        except anthropic.RateLimitError as e:
            if attempt == max_retries - 1:
                raise
            wait_time = 60 * (attempt + 1)  # 60s, 120s, 180s
            print(f"Rate limited, waiting {wait_time}s before retry {attempt + 2}/{max_retries}...")
            time.sleep(wait_time)


def build_context_section(config: dict | None) -> str:
    """Build the newsletter context section from config."""
    if not config:
        return """NEWSLETTER CONTEXT:
A weekly newsletter for sales and GTM professionals covering sales technology, tips, and insights."""

    parts = ["NEWSLETTER CONTEXT:"]
    if config.get("description"):
        parts.append(f"About: {config['description']}")
    if config.get("audience"):
        parts.append(f"Audience: {config['audience']}")
    if config.get("themes"):
        parts.append(f"Themes: {config['themes']}")
    if config.get("tone"):
        parts.append(f"Tone: {config['tone']}")
    if config.get("avoid"):
        parts.append(f"Avoid: {config['avoid']}")

    return "\n".join(parts)


def build_backlog_section(topic: dict | None, tech: dict | None, tips: list) -> str:
    """Build the backlog items section."""
    parts = []

    if topic:
        parts.append(f"TOPIC TO COVER: {topic['topic']}")
        if topic.get("description"):
            parts.append(f"  Context: {topic['description']}")

    if tech:
        parts.append(f"\nTECH TO SPOTLIGHT: {tech['name']}")
        if tech.get("description"):
            parts.append(f"  What it does: {tech['description']}")
        if tech.get("why_relevant"):
            parts.append(f"  Why now: {tech['why_relevant']}")
        if tech.get("url"):
            parts.append(f"  URL: {tech['url']}")

    if tips:
        parts.append(f"\nTIPS TO INCLUDE:")
        for tip in tips:
            parts.append(f"  - {tip['tip']}")
            if tip.get("context"):
                parts.append(f"    ({tip['context']})")

    if not parts:
        return "BACKLOG: No specific items provided. Generate all content based on newsletter context and current trends."

    return "\n".join(parts)


def get_structure(config: dict | None) -> str:
    """Get the newsletter structure from config or use default."""
    if config and config.get("structure"):
        return config["structure"]
    return DEFAULT_STRUCTURE


def generate_newsletter(
    client,
    config: dict | None = None,
    topic: dict | None = None,
    tech: dict | None = None,
    tips: list = None,
) -> str:
    """
    Generate a newsletter with optional backlog items.
    Uses web search for freshness.
    """
    context_section = build_context_section(config)
    backlog_section = build_backlog_section(topic, tech, tips or [])
    structure_section = get_structure(config)

    def make_request():
        return client.messages.create(
            model=WRITING_MODEL,
            max_tokens=MAX_WRITING_TOKENS,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 1}],
            messages=[
                {
                    "role": "user",
                    "content": f"""You are a newsletter writer. Write this week's newsletter using the structure below.

{context_section}

{backlog_section}

Do a quick web search to find current, relevant information to supplement the content, then write the newsletter.

NEWSLETTER STRUCTURE:

{structure_section}

---

GUIDELINES:
- Conversational but professional tone
- Short paragraphs, easy to scan
- Each section should be concise (2-4 sentences for the spotlight, 1-2 sentences per tip/takeaway)
- Total length: 400-600 words
- Format in Markdown
- End with a brief sign-off

IMAGES:
- Include 1-2 relevant images total (not per section), only where they add value
- Use Unsplash images with this markdown format: ![alt text](https://images.unsplash.com/photo-IMAGE_ID?w=600&h=400&fit=crop)
- Good image topics: sales team, technology, business meeting, data dashboard, handshake, office
- Example: ![Sales team collaborating](https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop)
- Place images after the section heading, before the text
- Skip images if none feel relevant

Write the newsletter now:""",
                }
            ],
        )

    response = call_with_retry(make_request)

    # Extract text from response
    text_parts = [block.text for block in response.content if hasattr(block, "text")]
    return "\n".join(text_parts)
