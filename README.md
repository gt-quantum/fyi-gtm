# FYI GTM

Automated newsletter workflow with a future Astro website.

## Project Structure

```
fyi-gtm/
├── .github/workflows/    # GitHub Actions
│   └── newsletter.yml    # Weekly newsletter automation
├── newsletter/           # Newsletter automation scripts
│   ├── main.py          # Main workflow orchestrator
│   ├── config.py        # Configuration and env vars
│   ├── supabase_client.py
│   ├── claude_client.py
│   ├── kit_client.py    # Kit.com (ConvertKit) API
│   └── templates/
│       └── newsletter_template.md
├── website/              # Astro site (coming soon)
├── supabase/
│   └── migrations/       # Database schemas
└── requirements.txt
```

## Newsletter Automation

Runs weekly via GitHub Actions:

1. Pulls an available topic from Supabase (`newsletter_topics` table)
2. Generates a newsletter using Claude with web search (1-2-3 format)
3. Saves content to Supabase (`newsletter_runs` table)
4. Creates a draft broadcast in Kit.com

### Newsletter Format

Each newsletter follows the 1-2-3 structure:
- **1** Sales Tech Spotlight
- **2** Tips to Try This Week
- **3** Takeaways

### Setup

1. **Run the Supabase migration:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the contents of `supabase/migrations/001_initial_schema.sql`

2. **Add GitHub Secrets:**
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `KIT_API_KEY` - Your Kit.com API key (v4)
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

3. **Add topics to the database:**
   - Insert rows into `newsletter_topics` table
   - Set `priority` (higher = picked first)
   - Set `active` to true

### Manual Run

Trigger the workflow manually from GitHub Actions > Weekly Newsletter > Run workflow

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export ANTHROPIC_API_KEY=your_key
export KIT_API_KEY=your_key
export SUPABASE_URL=your_url
export SUPABASE_SERVICE_ROLE_KEY=your_key

# Run
python -m newsletter.main
```

## Customization

- **Newsletter template:** Edit `newsletter/templates/newsletter_template.md`
- **Topics:** Add/modify rows in `newsletter_topics` table
- **Schedule:** Modify cron in `.github/workflows/newsletter.yml` (default: Mondays 9AM UTC)
- **Model:** Adjust `WRITING_MODEL` in `newsletter/config.py`
