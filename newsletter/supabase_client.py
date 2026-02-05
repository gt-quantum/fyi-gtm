from supabase import create_client
from datetime import datetime, timezone, timedelta

from .config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY


def get_client():
    """Create and return Supabase client."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_newsletter_config(client) -> dict | None:
    """Fetch the newsletter configuration/context."""
    result = client.table("newsletter_config").select("*").limit(1).execute()
    return result.data[0] if result.data else None


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


def get_next_tech(client) -> dict | None:
    """Fetch the next unused tech from the backlog."""
    result = (
        client.table("tech_backlog")
        .select("*")
        .is_("used_at", "null")
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def get_next_tips(client, count: int = 2) -> list:
    """Fetch the next unused tips from the backlog."""
    result = (
        client.table("tips_backlog")
        .select("*")
        .is_("used_at", "null")
        .order("created_at", desc=False)
        .limit(count)
        .execute()
    )
    return result.data if result.data else []


def mark_topic_used(client, topic_id: str):
    """Mark a topic as used so it won't be selected again."""
    client.table("newsletter_topics").update(
        {"used_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", topic_id).execute()


def get_recent_topic_names(client, limit: int = 8) -> list[str]:
    """Fetch the most recently used topic names for avoidance context."""
    result = (
        client.table("newsletter_topics")
        .select("topic")
        .eq("active", True)
        .not_.is_("used_at", "null")
        .order("used_at", desc=True)
        .limit(limit)
        .execute()
    )
    return [row["topic"] for row in result.data] if result.data else []


def create_topic(client, topic: str, description: str = None, auto_generated: bool = False) -> dict:
    """
    Create a new topic in the newsletter_topics table.
    Returns the created topic record.
    """
    data = {
        "topic": topic,
        "active": True,
        "priority": 0,  # Low priority since it's auto-generated
    }
    if description:
        data["description"] = description

    result = client.table("newsletter_topics").insert(data).execute()
    return result.data[0] if result.data else None


def mark_tech_used(client, tech_id: str):
    """Mark a tech item as used."""
    client.table("tech_backlog").update(
        {"used_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", tech_id).execute()


def mark_tips_used(client, tip_ids: list):
    """Mark tips as used."""
    for tip_id in tip_ids:
        client.table("tips_backlog").update(
            {"used_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", tip_id).execute()


def get_next_issue_number(client) -> int:
    """
    Get the next newsletter issue number.
    Counts completed runs and adds to the starting issue number.
    """
    STARTING_ISSUE = 86  # Newsletter issues started before this system

    result = (
        client.table("newsletter_runs")
        .select("id", count="exact")
        .eq("status", "published")
        .execute()
    )
    return STARTING_ISSUE + (result.count or 0)


def create_run(client, topic_id: str = None, issue_number: int = None) -> dict:
    """Create a new newsletter run record."""
    data = {"status": "pending"}
    if topic_id:
        data["topic_id"] = topic_id
    if issue_number:
        data["issue_number"] = issue_number
    result = client.table("newsletter_runs").insert(data).execute()
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
