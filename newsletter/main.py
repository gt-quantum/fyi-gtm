#!/usr/bin/env python3
"""
Newsletter Automation Script

Runs weekly via GitHub Actions to:
1. Pull an available topic from Supabase
2. Generate a newsletter with quick web lookups
3. Save content to Supabase
4. Create a draft campaign in sender.net
"""

import sys
from pathlib import Path

from . import config
from . import supabase_client as db
from . import claude_client as claude
from . import sender_client as sender


def run():
    """Main workflow execution."""
    print("Starting newsletter automation...")

    # Validate configuration
    try:
        config.validate_config()
    except ValueError as e:
        print(f"Configuration error: {e}")
        sys.exit(1)

    # Initialize clients
    supabase = db.get_client()
    anthropic = claude.get_client()

    # Step 1: Get next topic
    print("Fetching next available topic...")
    topic = db.get_next_topic(supabase)

    if not topic:
        print("No available topics found. Add topics to newsletter_topics table.")
        sys.exit(0)

    print(f"Selected topic: {topic['topic']}")

    # Step 2: Create run record
    run_record = db.create_run(supabase, topic["id"])
    run_id = run_record["id"]
    print(f"Created run: {run_id}")

    try:
        # Step 3: Generate newsletter (single call with web search)
        print("Generating newsletter...")
        db.update_run(supabase, run_id, status="writing")

        newsletter_content = claude.generate_newsletter(
            anthropic, topic["topic"], topic.get("description")
        )
        db.update_run(supabase, run_id, newsletter_content=newsletter_content)
        print("Newsletter generated.")

        # Step 4: Create sender.net draft campaign
        print("Creating draft campaign in sender.net...")

        # Use topic as subject, with a title for internal tracking
        title = f"FYI GTM: {topic['topic']}"
        subject = topic["topic"]

        sender_response = sender.create_draft_campaign(
            title=title,
            subject=subject,
            content=newsletter_content,
        )
        campaign_id = sender_response.get("data", {}).get("id", "unknown")
        print(f"Created sender.net draft: {campaign_id}")

        # Step 5: Mark complete
        db.mark_topic_used(supabase, topic["id"])
        db.complete_run(supabase, run_id, campaign_id)

        print("Newsletter automation complete!")
        print(f"  Topic: {topic['topic']}")
        print(f"  Run ID: {run_id}")
        print(f"  Sender Campaign ID: {campaign_id}")

    except Exception as e:
        print(f"Error during newsletter generation: {e}")
        db.fail_run(supabase, run_id, str(e))
        sys.exit(1)


if __name__ == "__main__":
    run()
