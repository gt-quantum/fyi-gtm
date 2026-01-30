from supabase import create_client
from datetime import datetime, timezone

from .config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY


def get_client():
    """Create and return Supabase client."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_tool_config(client) -> dict | None:
    """Fetch the tool review configuration."""
    result = client.table("tool_review_config").select("*").limit(1).execute()
    return result.data[0] if result.data else None


def get_pending_drafts(client) -> list:
    """Fetch all drafts with 'researching' status (queued for processing)."""
    result = (
        client.table("tool_drafts")
        .select("*")
        .eq("status", "researching")
        .order("created_at", desc=False)
        .execute()
    )
    return result.data if result.data else []


def get_draft_by_id(client, draft_id: str) -> dict | None:
    """Fetch a specific draft by ID."""
    result = (
        client.table("tool_drafts")
        .select("*")
        .eq("id", draft_id)
        .single()
        .execute()
    )
    return result.data if result.data else None


def update_draft(client, draft_id: str, **updates) -> dict:
    """Update a draft with new data."""
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = (
        client.table("tool_drafts")
        .update(updates)
        .eq("id", draft_id)
        .execute()
    )
    return result.data[0] if result.data else None


def update_draft_status(client, draft_id: str, status: str, error_message: str = None):
    """Update draft status with optional error message."""
    updates = {"status": status}
    if error_message:
        updates["error_message"] = error_message
    return update_draft(client, draft_id, **updates)


def save_research_data(client, draft_id: str, research_data: dict):
    """Save research data to draft."""
    return update_draft(client, draft_id, research_data=research_data)


def save_generated_content(client, draft_id: str, content: str, frontmatter: dict, name: str = None, slug: str = None):
    """Save generated content and frontmatter to draft."""
    updates = {
        "generated_content": content,
        "frontmatter": frontmatter,
        "status": "draft",
    }
    if name:
        updates["name"] = name
    if slug:
        updates["slug"] = slug
    return update_draft(client, draft_id, **updates)


def mark_draft_published(client, draft_id: str):
    """Mark a draft as published."""
    return update_draft(
        client,
        draft_id,
        status="published",
        published_at=datetime.now(timezone.utc).isoformat(),
    )


def mark_draft_failed(client, draft_id: str, error_message: str):
    """Mark a draft as failed with error details."""
    return update_draft(
        client,
        draft_id,
        status="draft",  # Revert to draft so it can be retried
        error_message=error_message,
    )
