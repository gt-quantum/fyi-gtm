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


def generate_newsletter(client, topic: str, guidance: str | None = None) -> str:
    """
    Generate a newsletter with quick web lookups for current context.
    Single API call that searches and writes in one step.
    """
    topic_context = f"Focus area: {topic}"
    if guidance:
        topic_context += f"\nAdditional guidance: {guidance}"

    def make_request():
        return client.messages.create(
            model=WRITING_MODEL,
            max_tokens=MAX_WRITING_TOKENS,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 2}],
            messages=[
                {
                    "role": "user",
                    "content": f"""You are a sales newsletter writer. Write this week's newsletter using the structure below.

{topic_context}

Do 1-2 quick web searches to find current, relevant information, then write the newsletter.

NEWSLETTER STRUCTURE:

## 1️⃣ Sales Tech Spotlight
Feature ONE sales technology that has recent relevance. Brief description of what it does and why it matters now.

## 2️⃣ Two Tips to Try This Week
Two actionable sales tips based on recent trends, news, or best practices. Keep them practical and specific.

## 3️⃣ Three Takeaways
Three quick insights or learnings from the past week. These can be observations, stats, or lessons relevant to sales professionals.

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
