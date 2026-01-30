import time
import anthropic

from .config import ANTHROPIC_API_KEY, WRITING_MODEL, MAX_WRITING_TOKENS


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


def build_research_prompt(tool_url: str, tool_name: str | None, research_data: dict, config: dict) -> str:
    """Build the prompt for generating a tool review."""

    # Build research summary
    research_parts = []

    for source, data in research_data.items():
        if data and data.get("content"):
            research_parts.append(f"### {source.upper()}")
            research_parts.append(data["content"][:3000])  # Limit each source
            research_parts.append("")

    research_summary = "\n".join(research_parts) if research_parts else "No research data gathered yet."

    # Get config values
    template = config.get("review_template", "")
    tone = config.get("tone", "Professional but conversational.")
    emphasize = config.get("emphasize", "Real user feedback and practical use cases.")
    avoid = config.get("avoid", "Overly promotional language.")
    word_count = config.get("word_count_target", 1500)

    return f"""You are a tech product reviewer writing a comprehensive review of a software tool.

TOOL INFORMATION:
URL: {tool_url}
Name: {tool_name or "(To be determined from research)"}

RESEARCH DATA:
{research_summary}

WRITING GUIDELINES:
- Tone: {tone}
- Emphasize: {emphasize}
- Avoid: {avoid}
- Target word count: {word_count} words

TEMPLATE STRUCTURE:
{template}

FRONTMATTER TO EXTRACT:
Based on your research, extract the following into a JSON object:
- name: Tool name
- slug: URL-friendly slug (lowercase, hyphens)
- description: One-line description for SEO (under 160 chars)
- pricing: One of "free", "freemium", "paid", "trial"
- priceNote: Brief pricing summary (e.g., "Free tier, paid from $10/mo")
- category: Primary category
- tags: Array of relevant tags (3-5)

OUTPUT FORMAT:
First, output the frontmatter as a JSON code block:
```json
{{
  "name": "...",
  "slug": "...",
  "description": "...",
  "pricing": "...",
  "priceNote": "...",
  "category": "...",
  "tags": ["...", "..."]
}}
```

Then, output the review content in Markdown format following the template structure above.

Write the review now:"""


def generate_tool_review(
    client,
    tool_url: str,
    tool_name: str | None,
    research_data: dict,
    config: dict,
) -> tuple[str, dict]:
    """
    Generate a tool review with frontmatter extraction.
    Uses web search to supplement research data.

    Returns: (content, frontmatter)
    """
    prompt = build_research_prompt(tool_url, tool_name, research_data, config)

    def make_request():
        return client.messages.create(
            model=WRITING_MODEL,
            max_tokens=MAX_WRITING_TOKENS,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}],
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
        )

    response = call_with_retry(make_request)

    # Extract text from response
    text_parts = [block.text for block in response.content if hasattr(block, "text")]
    full_response = "\n".join(text_parts)

    # Parse frontmatter from JSON block
    frontmatter = extract_frontmatter(full_response)

    # Extract content (everything after the JSON block)
    content = extract_content(full_response)

    return content, frontmatter


def extract_frontmatter(response: str) -> dict:
    """Extract JSON frontmatter from response."""
    import json

    # Look for JSON code block
    start_marker = "```json"
    end_marker = "```"

    start = response.find(start_marker)
    if start == -1:
        return {}

    start += len(start_marker)
    end = response.find(end_marker, start)
    if end == -1:
        return {}

    json_str = response[start:end].strip()

    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        return {}


def extract_content(response: str) -> str:
    """Extract Markdown content from response (everything after JSON block)."""
    # Find end of JSON block
    end_marker = "```"

    # Find the second occurrence (end of JSON block)
    first = response.find("```json")
    if first == -1:
        return response.strip()

    second = response.find(end_marker, first + 7)
    if second == -1:
        return response.strip()

    # Return everything after the JSON block
    content = response[second + 3:].strip()
    return content
