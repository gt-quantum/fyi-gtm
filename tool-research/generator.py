"""
Content Generator

Orchestrates the research and content generation process:
1. Gathers research from all sources
2. Fetches logo
3. Generates review content via Claude
4. Saves results to database
"""

from urllib.parse import urlparse

from .scrapers import (
    scrape_website,
    scrape_g2,
    scrape_trustpilot,
    scrape_reddit,
    fetch_logo,
)
from . import supabase_client as db
from . import claude_client as claude


def run_research(draft: dict, config: dict) -> dict:
    """
    Run all research scrapers for a tool.

    Args:
        draft: The tool draft record from Supabase
        config: The tool review config

    Returns:
        dict of research data from all sources
    """
    tool_url = draft["url"]
    tool_name = draft.get("name")

    # Parse domain from URL
    parsed = urlparse(tool_url)
    domain = parsed.netloc
    if domain.startswith("www."):
        domain = domain[4:]

    # If no name provided, we'll detect it from the website
    research_data = {}

    print(f"Researching: {tool_name or tool_url}")

    # 1. Scrape the tool's website
    print("  Scraping website...")
    website_data = scrape_website(tool_url)
    research_data["website"] = website_data

    # Extract name from website if not provided
    if not tool_name and website_data.get("raw", {}).get("name"):
        tool_name = website_data["raw"]["name"]
        print(f"  Detected name: {tool_name}")

    # 2. Scrape G2 reviews
    if tool_name:
        print("  Scraping G2...")
        research_data["g2"] = scrape_g2(tool_name, domain)

    # 3. Scrape Trustpilot
    print("  Scraping Trustpilot...")
    research_data["trustpilot"] = scrape_trustpilot(domain)

    # 4. Search Reddit
    if tool_name:
        print("  Searching Reddit...")
        research_data["reddit"] = scrape_reddit(tool_name, domain)

    # 5. Fetch logo
    print("  Fetching logo...")
    logo_data = fetch_logo(tool_url)
    research_data["logo"] = logo_data

    # 6. Process extra sources if provided
    extra_sources = draft.get("extra_sources")
    if extra_sources:
        print(f"  Scraping {len(extra_sources)} extra sources...")
        for i, source_url in enumerate(extra_sources):
            research_data[f"extra_{i}"] = scrape_website(source_url)

    return research_data


def generate_content(
    draft: dict,
    research_data: dict,
    config: dict,
    anthropic_client,
) -> tuple[str, dict, str, str]:
    """
    Generate review content from research data.

    Args:
        draft: The tool draft record
        research_data: Research data gathered from all sources
        config: The tool review config
        anthropic_client: Anthropic API client

    Returns:
        tuple of (content, frontmatter, detected_name, slug)
    """
    tool_url = draft["url"]
    tool_name = draft.get("name")

    # Try to get name from research if not provided
    if not tool_name:
        website_data = research_data.get("website", {})
        if website_data.get("raw", {}).get("name"):
            tool_name = website_data["raw"]["name"]

    print(f"Generating content for: {tool_name or tool_url}")

    # Generate content via Claude
    content, frontmatter = claude.generate_tool_review(
        client=anthropic_client,
        tool_url=tool_url,
        tool_name=tool_name,
        research_data=research_data,
        config=config,
    )

    # Extract name and slug from frontmatter
    detected_name = frontmatter.get("name", tool_name)
    slug = frontmatter.get("slug")

    if not slug and detected_name:
        slug = detected_name.lower().replace(" ", "-")
        slug = "".join(c for c in slug if c.isalnum() or c == "-")
        frontmatter["slug"] = slug

    # Add standard frontmatter fields
    frontmatter["url"] = frontmatter.get("url", tool_url)
    frontmatter["featured"] = frontmatter.get("featured", False)
    frontmatter["isNew"] = frontmatter.get("isNew", True)

    # Add logo URL if we found one
    logo_data = research_data.get("logo", {})
    if logo_data.get("source") == "clearbit":
        frontmatter["logo"] = logo_data["url"]
    elif slug:
        # Placeholder for uploaded logo
        frontmatter["logo"] = f"/logos/{slug}.png"

    return content, frontmatter, detected_name, slug


def process_draft(draft_id: str, supabase_client, anthropic_client) -> dict:
    """
    Process a single draft: research, generate, and save.

    Args:
        draft_id: The draft ID to process
        supabase_client: Supabase client
        anthropic_client: Anthropic API client

    Returns:
        The updated draft record
    """
    # Fetch draft and config
    draft = db.get_draft_by_id(supabase_client, draft_id)
    if not draft:
        raise ValueError(f"Draft not found: {draft_id}")

    config = db.get_tool_config(supabase_client)
    if not config:
        raise ValueError("Tool review config not found")

    try:
        # Run research
        print(f"Processing draft: {draft['id']}")
        research_data = run_research(draft, config)

        # Save research data
        db.save_research_data(supabase_client, draft_id, research_data)

        # Generate content
        content, frontmatter, name, slug = generate_content(
            draft, research_data, config, anthropic_client
        )

        # Save generated content
        db.save_generated_content(
            supabase_client,
            draft_id,
            content=content,
            frontmatter=frontmatter,
            name=name,
            slug=slug,
        )

        print(f"Draft processed successfully: {name or slug}")

        # Return updated draft
        return db.get_draft_by_id(supabase_client, draft_id)

    except Exception as e:
        print(f"Error processing draft: {e}")
        db.mark_draft_failed(supabase_client, draft_id, str(e))
        raise
