# FYI GTM Content Management Guide

This document explains how to add, edit, and organize tools and categories in the FYI GTM directory.

## Directory Structure

```
src/content/
├── config.ts          # Schema definitions (don't edit unless adding fields)
├── tools/             # One markdown file per tool
│   ├── chatgpt.md
│   ├── hubspot.md
│   └── ...
└── categories/        # One markdown file per category
    ├── crm.md
    ├── analytics.md
    └── ...
```

## Adding a New Tool

### 1. Create the file

Create a new `.md` file in `src/content/tools/`. The filename becomes the URL slug.

**Naming convention:** lowercase, hyphens for spaces, no special characters
- `hubspot.md` → `/tools/hubspot`
- `google-analytics.md` → `/tools/google-analytics`
- `apollo-io.md` → `/tools/apollo-io`

### 2. Frontmatter Fields

```yaml
---
name: "Tool Name"                    # Display name (required)
description: "Short description"     # One sentence, ~100 chars (required)
url: "https://example.com"          # Tool's website (required)
logo: "/logos/tool-name.png"        # Path to logo in /public/logos/ (optional)
pricing: "freemium"                 # Required: free | freemium | paid | trial
priceNote: "Free tier, Pro $29/mo"  # Pricing details (optional)
category: "CRM"                     # Must match a category name exactly (required)
subcategory: "Sales"                # More specific grouping (optional)
tags: ["sales", "automation"]       # 3-5 relevant keywords (required)
upvotes: 0                          # Start at 0 for new tools (required)
comments: 0                         # Start at 0 (required)
views: 0                            # Start at 0 (required)
featured: false                     # true = appears on Featured page (required)
isNew: true                         # true = appears on New page (required)
isVerified: false                   # true = verified by FYI GTM team (optional)
hasDeal: false                      # true = has active discount (required)
dealDescription: "20% off"          # Only if hasDeal is true (optional)
isDiscontinued: false               # true = tool is shut down (required)
dateAdded: "2024-01-30"             # YYYY-MM-DD format (required)
dateUpdated: "2024-01-30"           # When last updated (optional)
---
```

### 3. Body Content (Markdown)

After the frontmatter, write the full description in Markdown:

```markdown
---
(frontmatter above)
---

Brief intro paragraph about what the tool does and who it's for.

## What is [Tool Name]?

Detailed explanation of the tool, its purpose, and key value proposition.

## Key Features

- Feature one with brief explanation
- Feature two with brief explanation
- Feature three with brief explanation

## Pricing

Detailed breakdown of pricing tiers and what's included.

## Best For

Describe the ideal user: company size, use case, industry, etc.
```

## Field Guidelines

### pricing
| Value | When to use |
|-------|-------------|
| `free` | Completely free, no paid tier |
| `freemium` | Has meaningful free tier + paid upgrades |
| `paid` | Requires payment to use (may have trial) |
| `trial` | Free trial only, then paid |

### featured
Set to `true` for tools that are:
- Best-in-class in their category
- Highly recommended by the FYI GTM team
- Have exceptional value or unique capabilities

**Keep featured tools limited** - if everything is featured, nothing is.

### isNew
Set to `true` for:
- Tools added in the last 30 days
- **Remember to set to `false` after 30 days**

### tags
Use 3-5 lowercase tags. Common tags:
- Function: `automation`, `analytics`, `reporting`, `integration`
- Use case: `sales`, `marketing`, `outbound`, `inbound`
- Size: `enterprise`, `startup`, `smb`
- Type: `ai`, `no-code`, `open-source`

### category
Must match an existing category name exactly. Current categories:

| Category | Use for |
|----------|---------|
| Image Generation | AI image creation tools |
| Chat | Conversational AI, chatbots |
| Writing | Content creation, copywriting |
| Video | Video creation, editing |
| Audio | Voice, music, podcasting |
| Code | Developer tools, IDEs |
| Productivity | Workflow, task management |
| Search | Search engines, research tools |
| Marketing | Marketing automation, campaigns |
| Design | Graphics, UI/UX tools |
| Business | Operations, analytics |
| Education | Learning, training tools |

## Adding a New Category

Create a file in `src/content/categories/`:

```yaml
---
name: "Category Name"
icon: "icon-name"           # Lucide icon name (optional)
color: "#3B82F6"            # Hex color for UI (optional)
toolCount: 0                # Update as tools are added
featured: true              # Show on homepage tabs
order: 13                   # Display order (lower = first)
---

Description of what tools belong in this category.
```

## Workflow for Adding Tools

1. **Create the file** with proper naming
2. **Fill all required fields** in frontmatter
3. **Set `isNew: true`** for new additions
4. **Set `featured: false`** initially (promote later if warranted)
5. **Write quality body content** - this helps SEO
6. **Add logo** to `/public/logos/` if available
7. **Test locally** with `npm run dev`

## Maintenance Tasks

### Monthly
- Review `isNew` flags - set to `false` after 30 days
- Update `toolCount` in categories
- Check for discontinued tools

### When Promoting to Featured
- Verify tool quality and reliability
- Ensure description is comprehensive
- Confirm pricing info is accurate

## Example: Complete Tool Entry

```markdown
---
name: "HubSpot"
description: "All-in-one CRM platform for marketing, sales, and customer service."
url: "https://hubspot.com"
logo: "/logos/hubspot.png"
pricing: "freemium"
priceNote: "Free CRM, paid hubs from $45/mo"
category: "CRM"
subcategory: "All-in-One"
tags: ["crm", "marketing", "sales", "automation", "enterprise"]
upvotes: 0
comments: 0
views: 0
featured: true
isNew: false
isVerified: true
hasDeal: false
isDiscontinued: false
dateAdded: "2024-01-30"
---

HubSpot is a comprehensive CRM platform that brings marketing, sales, content management, and customer service together in one place.

## What is HubSpot?

HubSpot offers a complete growth platform with a free CRM at its core. It's designed to help businesses attract visitors, convert leads, and close customers through integrated marketing, sales, and service tools.

## Key Features

- Free CRM with contact management and deal tracking
- Marketing Hub for email, ads, and content
- Sales Hub for pipeline management and automation
- Service Hub for tickets and customer support
- CMS Hub for website management

## Pricing

- **Free Tools**: CRM, forms, email marketing basics
- **Starter**: $45/mo - Essential marketing and sales tools
- **Professional**: $800/mo - Advanced automation
- **Enterprise**: $3,200/mo - Full platform access

## Best For

Mid-market to enterprise companies looking for an all-in-one platform. Particularly strong for businesses that want tight integration between marketing and sales.
```
