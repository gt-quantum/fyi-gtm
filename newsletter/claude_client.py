import time
import anthropic

from .config import ANTHROPIC_API_KEY, WRITING_MODEL, MAX_WRITING_TOKENS

# Default newsletter structure used when none is configured in the database
DEFAULT_STRUCTURE = """## One: Sales Tech Spotlight
Feature ONE sales technology.
- If TECH TO SPOTLIGHT was provided above, use it and research current details about that tool.
- If no tech was provided, search for a trending or noteworthy sales tool and feature it.
Include: what it does, why it matters now, and a practical use case.

## Two: Tips to Try This Week
Two actionable sales tips.
- If TIPS TO INCLUDE were provided above, expand on those with practical context.
- If no tips were provided, generate two relevant tips based on the newsletter context and current trends.
Keep each tip specific and immediately actionable.

## Three: Takeaways
Three quick insights, stats, or lessons relevant to the audience.
- If a TOPIC TO COVER was provided above, tie at least one takeaway to that theme.
- Research current data or trends to make these timely and credible.
Each takeaway should be 1-2 sentences max."""


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
            system="""You are a newsletter writer. Your output will be sent directly to subscribers.

CRITICAL: Output ONLY the newsletter content. Never include:
- Explanations of what you're doing ("I'll search for...", "Let me find...")
- Meta-commentary about the writing process
- References to being an AI, Claude, or using tools
- Preambles or conclusions about your research

Start your response with the first section heading. End with only the sign-off.""",
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}],
            messages=[
                {
                    "role": "user",
                    "content": f"""{context_section}

{backlog_section}

Use web search to research current, relevant information, then write the newsletter.

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

OUTPUT THE NEWSLETTER ONLY - no preamble, no explanation, start directly with the first section:""",
                }
            ],
        )

    response = call_with_retry(make_request)

    # Extract text blocks from response
    text_blocks = [block.text for block in response.content if hasattr(block, "text")]

    if not text_blocks:
        raise ValueError("No text content in response")

    # Find the block that contains the actual newsletter (has section headings)
    newsletter = None
    for block in text_blocks:
        if "## " in block and len(block) > 200:
            newsletter = block
            break

    # Fallback: use the longest block
    if not newsletter:
        newsletter = max(text_blocks, key=len)

    # Clean the content: strip any preamble before first ## heading
    # and any closing remarks after the sign-off
    return clean_newsletter_content(newsletter)


def clean_newsletter_content(content: str) -> str:
    """
    Remove any preamble before the first section heading
    and any AI commentary that might slip through.
    """
    import re

    # Strip preamble: everything before the first ## heading
    heading_match = re.search(r'^(.*?)(## )', content, re.DOTALL)
    if heading_match:
        before = heading_match.group(1).strip()
        # Only strip if there's actual preamble (not just whitespace)
        if before and not before.startswith('#'):
            content = content[heading_match.start(2):]

    # Strip closing AI commentary patterns
    # Look for common AI sign-off patterns after the newsletter content
    closing_patterns = [
        r'\n\n(?:I hope|Let me know|Feel free|If you|Happy to|Hope this)',
        r'\n\n(?:Is there anything|Would you like|I can also)',
    ]
    for pattern in closing_patterns:
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            content = content[:match.start()]

    return content.strip()
