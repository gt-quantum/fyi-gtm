#!/usr/bin/env python3
"""
Newsletter Automation Script

Runs weekly via GitHub Actions to:
1. Load newsletter config and check backlogs
2. Generate a newsletter with available items or fresh content
3. Save content to Supabase
4. Create a draft broadcast in Kit.com
"""

import sys

from . import config
from . import supabase_client as db
from . import claude_client as claude
from . import kit_client as kit


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

    # Step 1: Load newsletter config
    print("Loading newsletter config...")
    newsletter_config = db.get_newsletter_config(supabase)
    if newsletter_config:
        print(f"  Newsletter: {newsletter_config.get('name', 'FYI GTM')}")
    else:
        print("  No config found, using defaults")

    # Step 2: Check backlogs for available items
    print("Checking backlogs...")
    topic = db.get_next_topic(supabase)
    tech = db.get_next_tech(supabase)
    tips = db.get_next_tips(supabase, count=2)

    # If no topic available, generate one
    if not topic:
        print("  No topic in backlog, generating one...")
        recent_topics = db.get_recent_topic_names(supabase, limit=8)
        generated = claude.generate_topic(anthropic, newsletter_config, recent_topics)
        topic = db.create_topic(
            supabase,
            topic=generated["topic"],
            description=generated.get("description"),
            auto_generated=True
        )
        print(f"  Generated topic: {topic['topic']}")

    print(f"  Topic: {topic['topic'] if topic else 'None'}")
    print(f"  Tech: {tech['name'] if tech else 'None (will generate)'}")
    print(f"  Tips: {len(tips)} available")

    # Step 3: Get issue number and create run record
    issue_number = db.get_next_issue_number(supabase)
    run_record = db.create_run(supabase, topic["id"], issue_number)
    run_id = run_record["id"]
    print(f"Created run: {run_id} (Issue #{issue_number})")

    try:
        # Step 4: Generate newsletter
        print("Generating newsletter...")
        db.update_run(supabase, run_id, status="writing")

        recent_tech = db.get_recent_tech_names(supabase, limit=8)
        newsletter_content = claude.generate_newsletter(
            anthropic,
            config=newsletter_config,
            topic=topic,
            tech=tech,
            tips=tips,
            recent_tech=recent_tech,
        )
        db.update_run(supabase, run_id, newsletter_content=newsletter_content)
        print("Newsletter generated.")

        # Step 5: Mark backlog items as used
        if topic:
            db.mark_topic_used(supabase, topic["id"])
            print(f"  Marked topic used: {topic['topic']}")
        if tech:
            db.mark_tech_used(supabase, tech["id"])
            print(f"  Marked tech used: {tech['name']}")
        if tips:
            db.mark_tips_used(supabase, [t["id"] for t in tips])
            print(f"  Marked {len(tips)} tips used")

        # Step 6: Create Kit.com draft broadcast
        print("Creating draft broadcast in Kit.com...")

        # Build subject line with issue number and topic
        subject = f"FYI GTM #{issue_number}: {topic['topic']}"

        kit_response = kit.create_draft_broadcast(
            subject=subject,
            content=newsletter_content,
            description=topic.get("description") if topic else None,
        )
        broadcast_id = kit_response.get("broadcast", {}).get("id", "unknown")
        print(f"Created Kit.com draft: {broadcast_id}")

        # Step 7: Mark run complete
        db.complete_run(supabase, run_id, str(broadcast_id))

        print("Newsletter automation complete!")
        print(f"  Run ID: {run_id}")
        print(f"  Kit Broadcast ID: {broadcast_id}")

    except Exception as e:
        print(f"Error during newsletter generation: {e}")
        db.fail_run(supabase, run_id, str(e))
        sys.exit(1)


if __name__ == "__main__":
    run()
