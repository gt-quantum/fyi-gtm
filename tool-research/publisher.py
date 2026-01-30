"""
GitHub Publisher

Handles publishing tool reviews to GitHub:
1. Generates markdown file with frontmatter
2. Commits to the repository via GitHub API
3. Optionally uploads logo
"""

import base64
import requests

from .config import GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, validate_publish_config


def build_markdown_file(content: str, frontmatter: dict) -> str:
    """
    Build a complete markdown file with YAML frontmatter.

    Args:
        content: The markdown content
        frontmatter: Dict of frontmatter fields

    Returns:
        Complete markdown file string
    """
    # Build YAML frontmatter
    yaml_lines = ["---"]

    for key, value in frontmatter.items():
        if value is None:
            continue

        if isinstance(value, str):
            # Escape quotes and wrap in quotes
            escaped = value.replace('"', '\\"')
            yaml_lines.append(f'{key}: "{escaped}"')
        elif isinstance(value, bool):
            yaml_lines.append(f'{key}: {str(value).lower()}')
        elif isinstance(value, (int, float)):
            yaml_lines.append(f'{key}: {value}')
        elif isinstance(value, list):
            items = ", ".join(f'"{item}"' for item in value)
            yaml_lines.append(f'{key}: [{items}]')

    yaml_lines.append("---")
    yaml_lines.append("")

    # Combine frontmatter and content
    return "\n".join(yaml_lines) + content


def commit_file_to_github(
    path: str,
    content: str,
    message: str,
    token: str = None,
    repo: str = None,
    branch: str = None,
) -> dict:
    """
    Commit a file to GitHub via the API.

    Args:
        path: File path in the repository
        content: File content
        message: Commit message
        token: GitHub token (defaults to env var)
        repo: Repository (defaults to env var)
        branch: Branch (defaults to env var)

    Returns:
        GitHub API response
    """
    token = token or GITHUB_TOKEN
    repo = repo or GITHUB_REPO
    branch = branch or GITHUB_BRANCH

    if not token:
        raise ValueError("GitHub token not configured")

    api_base = f"https://api.github.com/repos/{repo}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    # Check if file exists (to get SHA for updates)
    existing_sha = None
    try:
        response = requests.get(
            f"{api_base}/contents/{path}",
            headers=headers,
            params={"ref": branch},
        )
        if response.status_code == 200:
            existing_sha = response.json().get("sha")
    except requests.RequestException:
        pass

    # Create or update the file
    payload = {
        "message": message,
        "content": base64.b64encode(content.encode()).decode(),
        "branch": branch,
    }
    if existing_sha:
        payload["sha"] = existing_sha

    response = requests.put(
        f"{api_base}/contents/{path}",
        headers=headers,
        json=payload,
    )

    if not response.ok:
        error = response.json()
        raise RuntimeError(f"GitHub API error: {error.get('message', 'Unknown error')}")

    return response.json()


def publish_tool_review(draft: dict) -> dict:
    """
    Publish a tool review to GitHub.

    Args:
        draft: The tool draft record with generated content

    Returns:
        dict with publish results
    """
    validate_publish_config()

    slug = draft.get("slug")
    content = draft.get("generated_content")
    frontmatter = draft.get("frontmatter", {})
    name = draft.get("name") or frontmatter.get("name") or slug

    if not slug:
        raise ValueError("Draft missing slug")
    if not content:
        raise ValueError("Draft missing generated content")

    # Build the markdown file
    markdown_content = build_markdown_file(content, frontmatter)

    # File path in the repo
    file_path = f"fyigtmdotcom/fyigtm-web/src/content/tools/{slug}.md"

    print(f"Publishing {name} to {file_path}...")

    # Commit to GitHub
    result = commit_file_to_github(
        path=file_path,
        content=markdown_content,
        message=f"Add tool review: {name}",
    )

    return {
        "success": True,
        "file_path": file_path,
        "commit_sha": result.get("commit", {}).get("sha"),
        "html_url": result.get("content", {}).get("html_url"),
    }


def upload_logo_to_github(
    slug: str,
    logo_bytes: bytes,
    extension: str = "png",
) -> dict:
    """
    Upload a logo image to GitHub.

    Args:
        slug: Tool slug for filename
        logo_bytes: Raw logo bytes
        extension: File extension

    Returns:
        dict with upload results
    """
    validate_publish_config()

    file_path = f"fyigtmdotcom/fyigtm-web/public/logos/{slug}.{extension}"

    print(f"Uploading logo to {file_path}...")

    # Commit to GitHub (using raw bytes, base64 encoded)
    api_base = f"https://api.github.com/repos/{GITHUB_REPO}"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }

    # Check if file exists
    existing_sha = None
    try:
        response = requests.get(
            f"{api_base}/contents/{file_path}",
            headers=headers,
            params={"ref": GITHUB_BRANCH},
        )
        if response.status_code == 200:
            existing_sha = response.json().get("sha")
    except requests.RequestException:
        pass

    payload = {
        "message": f"Add logo: {slug}",
        "content": base64.b64encode(logo_bytes).decode(),
        "branch": GITHUB_BRANCH,
    }
    if existing_sha:
        payload["sha"] = existing_sha

    response = requests.put(
        f"{api_base}/contents/{file_path}",
        headers=headers,
        json=payload,
    )

    if not response.ok:
        error = response.json()
        raise RuntimeError(f"GitHub API error: {error.get('message', 'Unknown error')}")

    return {
        "success": True,
        "file_path": file_path,
    }
