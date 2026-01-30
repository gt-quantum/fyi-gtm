from supabase import create_client
from datetime import datetime, timezone

from .config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY


def get_client():
    """Create and return Supabase client."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_next_topic(client) -> dict | None:
    """
    Fetch the next available topic (highest priority, not yet used).
    Returns None if no topics available.
    """
    result = (
        client.table("newsletter_topics")
        .select("*")
        .eq("active", True)
        .is_("used_at", "null")
        .order("priority", desc=True)
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def create_run(client, topic_id: str) -> dict:
    """Create a new newsletter run record."""
    result = (
        client.table("newsletter_runs")
        .insert({"topic_id": topic_id, "status": "pending"})
        .execute()
    )
    return result.data[0]


def update_run(client, run_id: str, **updates) -> dict:
    """Update a newsletter run with new data."""
    result = (
        client.table("newsletter_runs")
        .update(updates)
        .eq("id", run_id)
        .execute()
    )
    return result.data[0]


def mark_topic_used(client, topic_id: str):
    """Mark a topic as used so it won't be selected again."""
    client.table("newsletter_topics").update(
        {"used_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", topic_id).execute()


def complete_run(client, run_id: str, broadcast_id: str):
    """Mark a run as successfully completed."""
    update_run(
        client,
        run_id,
        status="published",
        beehiiv_post_id=broadcast_id,  # Column name kept for compatibility
        completed_at=datetime.now(timezone.utc).isoformat(),
    )


def fail_run(client, run_id: str, error_message: str):
    """Mark a run as failed with error details."""
    update_run(
        client,
        run_id,
        status="failed",
        error_message=error_message,
        completed_at=datetime.now(timezone.utc).isoformat(),
    )
