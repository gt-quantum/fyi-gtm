import os

# Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Anthropic
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# Sender.net
SENDER_API_KEY = os.environ.get("SENDER_API_KEY")
SENDER_FROM_NAME = os.environ.get("SENDER_FROM_NAME", "FYI GTM")
SENDER_REPLY_TO = os.environ.get("SENDER_REPLY_TO")

# Newsletter settings
WRITING_MODEL = "claude-sonnet-4-20250514"
MAX_WRITING_TOKENS = 2000


def validate_config():
    """Ensure all required environment variables are set."""
    required = [
        ("SUPABASE_URL", SUPABASE_URL),
        ("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY),
        ("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY),
        ("SENDER_API_KEY", SENDER_API_KEY),
        ("SENDER_REPLY_TO", SENDER_REPLY_TO),
    ]
    missing = [name for name, value in required if not value]
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
