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
│   ├── beehiiv_client.py
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
2. Researches the topic using Claude with web search
3. Writes a newsletter from the research (separate Claude context)
4. Saves research and content to Supabase (`newsletter_runs` table)
5. Creates a draft post in beehiiv

### Setup

1. **Run the Supabase migration:**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the contents of `supabase/migrations/001_initial_schema.sql`

2. **Add GitHub Secrets:**
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `BEEHIIV_API_KEY` - Your beehiiv API key
   - `BEEHIIV_PUBLICATION_ID` - Your beehiiv publication ID
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
export BEEHIIV_API_KEY=your_key
export BEEHIIV_PUBLICATION_ID=your_id
export SUPABASE_URL=your_url
export SUPABASE_SERVICE_ROLE_KEY=your_key

# Run
python -m newsletter.main
```

## Customization

- **Newsletter template:** Edit `newsletter/templates/newsletter_template.md`
- **Topics:** Add/modify rows in `newsletter_topics` table
- **Schedule:** Modify cron in `.github/workflows/newsletter.yml`
- **Models:** Adjust `RESEARCH_MODEL` and `WRITING_MODEL` in `newsletter/config.py`
