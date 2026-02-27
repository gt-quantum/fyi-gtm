/**
 * GitHub client for:
 * 1. Batch committing files (bulk publish to Astro site)
 * 2. Triggering GitHub Actions workflows
 */

const GITHUB_API = 'https://api.github.com';

function headers() {
  return {
    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
}

function repo() {
  return process.env.GITHUB_REPOSITORY; // e.g. 'user/fyi-gtm'
}

/**
 * Push multiple files to GitHub in a single commit using the Git Trees API.
 * This creates ONE commit regardless of how many files are changed.
 *
 * @param {Array<{path: string, content: string}>} files - Files to commit
 * @param {string} message - Commit message
 * @param {string} branch - Target branch (default: 'main')
 * @returns {Promise<{success: boolean, sha: string, url: string}>}
 */
async function batchCommit(files, message, branch = 'main') {
  const repoPath = repo();

  // 1. Get the latest commit SHA for the branch
  const refRes = await fetch(`${GITHUB_API}/repos/${repoPath}/git/ref/heads/${branch}`, {
    headers: headers()
  });
  if (!refRes.ok) throw new Error(`Failed to get ref: ${await refRes.text()}`);
  const refData = await refRes.json();
  const latestCommitSha = refData.object.sha;

  // 2. Get the tree SHA from the latest commit
  const commitRes = await fetch(`${GITHUB_API}/repos/${repoPath}/git/commits/${latestCommitSha}`, {
    headers: headers()
  });
  if (!commitRes.ok) throw new Error(`Failed to get commit: ${await commitRes.text()}`);
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  // 3. Create blobs for each file
  const tree = [];
  for (const file of files) {
    const blobRes = await fetch(`${GITHUB_API}/repos/${repoPath}/git/blobs`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        content: file.content,
        encoding: 'utf-8'
      })
    });
    if (!blobRes.ok) throw new Error(`Failed to create blob for ${file.path}: ${await blobRes.text()}`);
    const blobData = await blobRes.json();

    tree.push({
      path: file.path,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha
    });
  }

  // 4. Create a new tree
  const treeRes = await fetch(`${GITHUB_API}/repos/${repoPath}/git/trees`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree
    })
  });
  if (!treeRes.ok) throw new Error(`Failed to create tree: ${await treeRes.text()}`);
  const treeData = await treeRes.json();

  // 5. Create the commit
  const newCommitRes = await fetch(`${GITHUB_API}/repos/${repoPath}/git/commits`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [latestCommitSha]
    })
  });
  if (!newCommitRes.ok) throw new Error(`Failed to create commit: ${await newCommitRes.text()}`);
  const newCommitData = await newCommitRes.json();

  // 6. Update the branch ref
  const updateRefRes = await fetch(`${GITHUB_API}/repos/${repoPath}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ sha: newCommitData.sha })
  });
  if (!updateRefRes.ok) throw new Error(`Failed to update ref: ${await updateRefRes.text()}`);

  return {
    success: true,
    sha: newCommitData.sha,
    url: newCommitData.html_url
  };
}

/**
 * Trigger a GitHub Actions workflow via workflow_dispatch.
 *
 * @param {string} automationId - e.g. 'agents/newsletter'
 * @param {string} automationType - 'worker' or 'agent'
 * @returns {Promise<{success: boolean}>}
 */
async function triggerWorkflow(automationId, automationType) {
  const repoPath = repo();

  const res = await fetch(`${GITHUB_API}/repos/${repoPath}/actions/workflows/run-automation.yml/dispatches`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      ref: 'main',
      inputs: {
        automation_id: automationId,
        automation_type: automationType
      }
    })
  });

  if (!res.ok) {
    const error = await res.text();
    return { success: false, error };
  }

  return { success: true };
}

module.exports = { batchCommit, triggerWorkflow };
