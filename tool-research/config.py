import os

# Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Anthropic
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# GitHub (for publishing)
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "fyigtm/fyi-gtm")
GITHUB_BRANCH = os.environ.get("GITHUB_BRANCH", "main")

# Model settings
WRITING_MODEL = "claude-sonnet-4-20250514"
MAX_WRITING_TOKENS = 4000

# Scraping settings
REQUEST_TIMEOUT = 30
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


def validate_config():
    """Ensure all required environment variables are set."""
    required = [
        ("SUPABASE_URL", SUPABASE_URL),
        ("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY),
        ("ANTHROPIC_API_KEY", ANTHROPIC_API_KEY),
    ]
    missing = [name for name, value in required if not value]
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")


def validate_publish_config():
    """Ensure GitHub config is set for publishing."""
    if not GITHUB_TOKEN:
        raise ValueError("GITHUB_TOKEN environment variable is required for publishing")
