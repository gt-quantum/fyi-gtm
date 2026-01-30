import os

# Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Anthropic
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# Beehiiv
BEEHIIV_API_KEY = os.environ.get("BEEHIIV_API_KEY")
BEEHIIV_PUBLICATION_ID = os.environ.get("BEEHIIV_PUBLICATION_ID")

# Newsletter settings
WRITING_MODEL = "claude-sonnet-4-20250514"
MAX_WRITING_TOKENS = 2000


def validate_config():
    """Ensure all required environment variables are set."""
    required = [
        ("SUPABASE_URL", SUPABASE_URL),
        ("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY),
        ("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY),
        ("BEEHIIV_API_KEY", BEEHIIV_API_KEY),
        ("BEEHIIV_PUBLICATION_ID", BEEHIIV_PUBLICATION_ID),
    ]
    missing = [name for name, value in required if not value]
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
