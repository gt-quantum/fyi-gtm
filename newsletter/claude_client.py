import anthropic

from .config import ANTHROPIC_API_KEY, RESEARCH_MODEL, WRITING_MODEL, MAX_RESEARCH_TOKENS, MAX_WRITING_TOKENS


def get_client():
    """Create and return Anthropic client."""
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def research_topic(client, topic: str, description: str | None = None) -> str:
    """
    Research a topic using Claude with web search.
    Returns a research brief.
    """
    context = f"Topic: {topic}"
    if description:
        context += f"\nContext: {description}"

    response = client.messages.create(
        model=RESEARCH_MODEL,
        max_tokens=MAX_RESEARCH_TOKENS,
        tools=[{"type": "web_search_20250305"}],
        messages=[
            {
                "role": "user",
                "content": f"""You are a research assistant preparing a brief for a newsletter writer.

{context}

Research this topic thoroughly using web search. Focus on:
1. Recent developments and news (last 1-2 weeks if possible)
2. Key facts and statistics
3. Notable quotes from experts or companies
4. Interesting angles or perspectives
5. Any controversies or debates

Compile your findings into a structured research brief with:
- Executive summary (2-3 sentences)
- Key findings (bullet points)
- Notable quotes (with sources)
- Suggested angles for the newsletter

Be factual and cite your sources.""",
            }
        ],
    )

    # Extract text from response
    text_parts = [block.text for block in response.content if hasattr(block, "text")]
    return "\n".join(text_parts)


def write_newsletter(client, topic: str, research_brief: str, template: str) -> str:
    """
    Write a newsletter based on research.
    Uses a fresh context (no web search access).
    """
    response = client.messages.create(
        model=WRITING_MODEL,
        max_tokens=MAX_WRITING_TOKENS,
        messages=[
            {
                "role": "user",
                "content": f"""You are a skilled newsletter writer. Write an engaging newsletter based on the research provided.

TOPIC: {topic}

RESEARCH BRIEF:
{research_brief}

TEMPLATE STRUCTURE:
{template}

Guidelines:
- Write in a conversational but authoritative tone
- Lead with the most interesting or important insight
- Use short paragraphs for readability
- Include 2-3 actionable takeaways
- End with a thought-provoking question or call to action
- Keep total length around 800-1200 words
- Format in Markdown

Write the newsletter now:""",
            }
        ],
    )

    text_parts = [block.text for block in response.content if hasattr(block, "text")]
    return "\n".join(text_parts)
