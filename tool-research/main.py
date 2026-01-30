#!/usr/bin/env python3
"""
Tool Research Automation Script

Can be run:
1. As a one-off to process a specific draft: python -m tool-research --draft-id <id>
2. As a worker to process all pending drafts: python -m tool-research --process-all
3. To publish a specific draft: python -m tool-research --publish <id>
"""

import sys
import argparse

from . import config
from . import supabase_client as db
from . import claude_client as claude
from .generator import process_draft
from .publisher import publish_tool_review


def process_single_draft(draft_id: str):
    """Process a single draft by ID."""
    print(f"Processing draft: {draft_id}")

    # Initialize clients
    supabase = db.get_client()
    anthropic = claude.get_client()

    # Process the draft
    result = process_draft(draft_id, supabase, anthropic)

    print(f"Draft processed: {result.get('name', result.get('slug', 'unknown'))}")
    print(f"Status: {result.get('status')}")

    return result


def process_all_pending():
    """Process all drafts with 'researching' status."""
    print("Looking for pending drafts...")

    supabase = db.get_client()
    anthropic = claude.get_client()

    drafts = db.get_pending_drafts(supabase)

    if not drafts:
        print("No pending drafts found.")
        return

    print(f"Found {len(drafts)} pending drafts")

    for draft in drafts:
        try:
            print(f"\n--- Processing: {draft.get('name') or draft.get('url')} ---")
            process_draft(draft["id"], supabase, anthropic)
            print("Done!")
        except Exception as e:
            print(f"Error processing draft {draft['id']}: {e}")
            continue


def publish_draft(draft_id: str):
    """Publish a draft to GitHub."""
    print(f"Publishing draft: {draft_id}")

    supabase = db.get_client()

    # Fetch draft
    draft = db.get_draft_by_id(supabase, draft_id)
    if not draft:
        print(f"Draft not found: {draft_id}")
        sys.exit(1)

    if draft["status"] not in ("draft", "approved"):
        print(f"Draft status is '{draft['status']}', expected 'draft' or 'approved'")
        sys.exit(1)

    try:
        result = publish_tool_review(draft)
        print(f"Published successfully!")
        print(f"  File: {result['file_path']}")
        if result.get("html_url"):
            print(f"  URL: {result['html_url']}")

        # Update draft status
        db.mark_draft_published(supabase, draft_id)
        print("Draft marked as published.")

    except Exception as e:
        print(f"Publish failed: {e}")
        sys.exit(1)


def run():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Tool Research Automation")
    parser.add_argument("--draft-id", help="Process a specific draft by ID")
    parser.add_argument("--process-all", action="store_true", help="Process all pending drafts")
    parser.add_argument("--publish", metavar="DRAFT_ID", help="Publish a draft to GitHub")

    args = parser.parse_args()

    # Validate configuration
    try:
        config.validate_config()
    except ValueError as e:
        print(f"Configuration error: {e}")
        sys.exit(1)

    if args.publish:
        config.validate_publish_config()
        publish_draft(args.publish)
    elif args.draft_id:
        process_single_draft(args.draft_id)
    elif args.process_all:
        process_all_pending()
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    run()
