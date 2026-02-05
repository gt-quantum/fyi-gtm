import time
import anthropic

from .config import ANTHROPIC_API_KEY, WRITING_MODEL, MAX_WRITING_TOKENS

# Models for 2-step pipeline
RESEARCH_MODEL = "claude-3-5-haiku-20241022"
MAX_RESEARCH_TOKENS = 2000

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


def generate_topic(client, config: dict | None = None) -> dict:
    """
    Generate a newsletter topic based on current trends and the newsletter context.
    Returns a dict with 'topic' (short title) and 'description' (context for content generation).
    """
    context = ""
    if config:
        if config.get("description"):
            context += f"Newsletter: {config['description']}\n"
        if config.get("audience"):
            context += f"Audience: {config['audience']}\n"
        if config.get("themes"):
            context += f"Themes: {config['themes']}\n"

    if not context:
        context = "A weekly newsletter for sales and GTM professionals."

    prompt = f"""You are helping generate a topic for a weekly GTM/sales newsletter.

{context}

Generate a fresh, timely topic for this week's newsletter.

REQUIREMENTS:
- Must be SPECIFIC: Name a concrete GTM challenge, trend, or shift tied to a particular stage, function, or motion. Avoid broad category labels like "Sales Tips" or "Marketing Trends." The topic should be narrow enough that a reader knows exactly what the issue will cover before opening it.
- Must be TIMELY - reference something happening NOW in the industry
- Must be 3-6 words
- Do NOT use generic phrases like "This Week in GTM", "Weekly Roundup", "Sales Update", etc.

Use web search to find what's currently trending in the GTM/sales/revenue space. Look for:
- New tool launches or funding announcements
- Industry shifts or emerging trends
- Seasonal business themes (Q1 planning, EOY pushes, etc.)
- Hot debates or controversial takes in the space

Respond with ONLY a JSON object (no markdown, no code blocks, no explanation):
{{"topic": "Specific Topic Title", "description": "1-2 sentences explaining the angle and why it's relevant now"}}"""

    def make_request():
        return client.messages.create(
            model=RESEARCH_MODEL,
            max_tokens=500,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}],
            messages=[{"role": "user", "content": prompt}],
        )

    print("  Calling Claude to generate topic...")
    response = call_with_retry(make_request)

    # Extract text from response
    text_parts = [block.text for block in response.content if hasattr(block, "text")]
    response_text = "\n".join(text_parts).strip()
    print(f"  Raw response: {response_text[:200]}...")

    # Parse JSON response
    import json
    import re

    # Try to extract JSON from the response
    json_match = re.search(r'\{[^{}]+\}', response_text)
    if json_match:
        try:
            result = json.loads(json_match.group())
            if "topic" in result:
                # Reject generic topics
                generic_phrases = ["this week in", "weekly roundup", "sales update", "gtm update", "weekly digest"]
                if any(phrase in result["topic"].lower() for phrase in generic_phrases):
                    print(f"  Rejected generic topic: {result['topic']}")
                else:
                    print(f"  Generated topic: {result['topic']}")
                    return result
        except json.JSONDecodeError as e:
            print(f"  JSON parse error: {e}")

    # Fallback - try to generate something based on current month/quarter
    from datetime import datetime
    now = datetime.now()
    month = now.strftime("%B")
    quarter = f"Q{(now.month - 1) // 3 + 1}"

    fallback = {
        "topic": f"{quarter} Pipeline Strategies",
        "description": f"Tactical approaches to building and accelerating pipeline in {month}."
    }
    print(f"  Using fallback topic: {fallback['topic']}")
    return fallback


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

    return "\n".join(parts)


def build_avoid_section(config: dict | None) -> str:
    """Build a dedicated section for writing constraints from the avoid list."""
    if not config or not config.get("avoid"):
        return ""
    return f"""WRITING CONSTRAINTS (follow strictly):
{config['avoid']}"""


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
            parts.append(f"  Website: {tech['url']}")
            parts.append(f"  IMPORTANT: Link the tool name to this URL in the Spotlight section.")

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
    Generate a newsletter using a 2-step pipeline:
    1. Haiku + web search → research notes
    2. Sonnet (no tools) → final newsletter

    This mirrors the proven tool-research approach for reliable output.
    """
    context_section = build_context_section(config)
    backlog_section = build_backlog_section(topic, tech, tips or [])
    structure_section = get_structure(config)
    avoid_section = build_avoid_section(config)

    # ========== STEP 1: RESEARCH WITH HAIKU ==========
    print("  Step 1: Researching with Haiku...")
    research_notes = run_research_step(client, context_section, backlog_section)
    print("  Research complete.")

    # ========== STEP 2: WRITING WITH SONNET ==========
    print("  Step 2: Writing with Sonnet...")
    newsletter = run_writing_step(
        client, context_section, backlog_section, structure_section,
        research_notes, avoid_section, tech
    )
    print("  Writing complete.")

    return newsletter


def run_research_step(
    client,
    context_section: str,
    backlog_section: str,
) -> str:
    """
    Step 1: Use Haiku with web search to gather current information.
    Returns research notes to be used by the writing step.
    """
    prompt = f"""You are a research assistant gathering information for a weekly newsletter.

{context_section}

{backlog_section}

YOUR TASK:
1. Use web search to find current, relevant information:
   - If a TECH TO SPOTLIGHT was provided, search for recent news, updates, or reviews about it
   - If no tech was provided, search for a specific, named trending sales/GTM tool this week
   - Search for current sales statistics, trends, or insights
   - Look for timely, credible data points

2. Research source guidance (follow strictly):
   - Prefer signals from recent product launches, pricing changes, customer adoption patterns, acquisitions, platform policy shifts, or measurable behavior changes in buyer or seller workflows
   - Use observable discussion from sources like LinkedIn posts by GTM operators, Reddit GTM communities, public earnings calls, or credible industry reporting
   - Do NOT rely on vendor blogs, marketing pages, or press releases as primary sources. These may be used for factual product details only after independent signals confirm relevance.
   - The tech must be a real, named product or platform that can be independently verified. Do not use generic category descriptions.

3. Output a structured research summary with:
   - Tech tool information (name, what it does, why it's relevant now, pricing if found)
   - The tool's primary website URL and domain (e.g., https://gong.io, https://apollo.io)
   - 2-3 current statistics or trends relevant to sales/GTM with sources
   - Any notable news or developments in the space
   - Specific facts, quotes, or data points to include

Be factual and concise. This research will be used to write the newsletter."""

    def make_request():
        return client.messages.create(
            model=RESEARCH_MODEL,
            max_tokens=MAX_RESEARCH_TOKENS,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}],
            messages=[{"role": "user", "content": prompt}],
        )

    response = call_with_retry(make_request)

    # Extract all text from response (research notes can include all commentary)
    text_parts = [block.text for block in response.content if hasattr(block, "text")]
    return "\n".join(text_parts)


def _extract_tech_domain(tech: dict | None) -> str | None:
    """Extract the domain from a tech URL for logo generation."""
    if not tech or not tech.get("url"):
        return None
    from urllib.parse import urlparse
    parsed = urlparse(tech["url"])
    domain = parsed.netloc or parsed.path
    domain = domain.removeprefix("www.")
    return domain if domain else None


def run_writing_step(
    client,
    context_section: str,
    backlog_section: str,
    structure_section: str,
    research_notes: str,
    avoid_section: str = "",
    tech: dict | None = None,
) -> str:
    """
    Step 2: Use Sonnet (NO tools) to write the final newsletter.
    No web search = no tool-use commentary = clean output.
    """
    # Images disabled - Unsplash IDs are unreliable and Clearbit logos
    # were not being used by the model. Can re-enable later with a
    # reliable image source.
    image_instructions = """IMAGES:
- Do NOT include any images in the newsletter. No Unsplash, no logos, no markdown image tags."""

    # Build the avoid section block
    avoid_block = f"\n\n{avoid_section}" if avoid_section else ""

    prompt = f"""{context_section}

{backlog_section}

RESEARCH NOTES:
{research_notes}

NEWSLETTER STRUCTURE:

{structure_section}

---

FORMATTING:
- Follow the formatting rules in the NEWSLETTER STRUCTURE above exactly
- In the Spotlight: link the tool name to its website using markdown (e.g., [Tool Name](https://tool.com))
- Format in Markdown
- End with a brief closing line and sign off with exactly: "-- FYI GTM Team" (use two hyphens)

{image_instructions}{avoid_block}

Write the newsletter now. Start directly with the first section heading (## One:)."""

    def make_request():
        return client.messages.create(
            model=WRITING_MODEL,
            max_tokens=MAX_WRITING_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )

    response = call_with_retry(make_request)

    # Extract text - should be clean since no tools were used
    text_parts = [block.text for block in response.content if hasattr(block, "text")]

    if not text_parts:
        raise ValueError("No text content in response")

    content = "\n".join(text_parts)

    # Clean any preamble before first heading (safety measure)
    return clean_newsletter_content(content)


def clean_newsletter_content(content: str) -> str:
    """
    Clean up newsletter content:
    1. Remove any preamble before the first section heading
    2. Ensure sign-off is exactly "-- FYI GTM Team"
    """
    import re

    # Strip preamble: everything before the first ## heading
    heading_match = re.search(r'^(.*?)(## )', content, re.DOTALL)
    if heading_match:
        before = heading_match.group(1).strip()
        # Only strip if there's actual preamble (not just whitespace)
        if before and not before.startswith('#'):
            content = content[heading_match.start(2):]

    content = content.strip()

    # Ensure correct sign-off
    # Look for common sign-off patterns and replace with correct one
    signoff_patterns = [
        r'(--|—)\s*The\s+\w+\s+Team\s*$',
        r'(--|—)\s*\w+\s+Newsletter\s+Team\s*$',
        r'(--|—)\s*The\s+GTM\s+Newsletter\s+Team\s*$',
        r'(--|—)\s*GTM\s+Team\s*$',
        r'-\s*The\s+\w+\s+Team\s*$',
        r'-\s*FYI\s+GTM\s+Team\s*$',
    ]

    correct_signoff = "-- FYI GTM Team"

    for pattern in signoff_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            content = re.sub(pattern, correct_signoff, content, flags=re.IGNORECASE)
            break

    # If no sign-off found, add one
    if not re.search(r'(--|—)\s*FYI\s+GTM\s+Team\s*$', content, re.IGNORECASE):
        content = content.rstrip() + "\n\n-- FYI GTM Team"

    return content
