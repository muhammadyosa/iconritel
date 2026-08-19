/**
 * Optional GitHub backup layer (hybrid mode).
 *
 * Lovable Cloud stays the source of truth for live, multi-user data. GitHub is
 * used ONLY to push periodic JSON snapshots into the repo's `data/` folder so
 * the dataset is versioned and exportable.
 *
 * The Personal Access Token is provided by the user through the "Key" button
 * and stored in localStorage on their own device. It is never sent anywhere
 * except api.github.com.
 */

const TOKEN_KEY = "noc_github_token";
const REPO_KEY = "noc_github_repo";

export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  branch: string;
}

export interface GitHubSettings {
  token: string;
  config: GitHubRepoConfig | null;
}

export const GITHUB_SETTINGS_EVENT = "noc-github-settings";

export function getGitHubToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function getGitHubRepoConfig(): GitHubRepoConfig | null {
  try {
    const raw = localStorage.getItem(REPO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GitHubRepoConfig>;
    if (!parsed.owner || !parsed.repo) return null;
    return { owner: parsed.owner, repo: parsed.repo, branch: parsed.branch || "main" };
  } catch {
    return null;
  }
}

export function saveGitHubSettings(token: string, config: GitHubRepoConfig | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);

    if (config) localStorage.setItem(REPO_KEY, JSON.stringify(config));
    else localStorage.removeItem(REPO_KEY);
  } catch {
    /* noop */
  }
  try {
    window.dispatchEvent(new CustomEvent(GITHUB_SETTINGS_EVENT));
  } catch {
    /* noop */
  }
}

export function isGitHubBackupConfigured(): boolean {
  return Boolean(getGitHubToken() && getGitHubRepoConfig());
}

/** UTF-8 safe base64 encode (plain btoa breaks on non-ASCII characters). */
export function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

/** UTF-8 safe base64 decode. */
export function decodeBase64(input: string): string {
  const binary = atob(input.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function headers(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function contentsUrl(config: GitHubRepoConfig, path: string): string {
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
}

/**
 * Read a JSON file from the repo. Returns `null` when the file does not exist.
 * Throws when the token/repo is invalid so callers can fall back to local data.
 */
export async function readJsonFile<T>(path: string): Promise<{ data: T; sha: string } | null> {
  const token = getGitHubToken();
  const config = getGitHubRepoConfig();
  if (!token || !config) throw new Error("GitHub belum dikonfigurasi");

  const response = await fetch(`${contentsUrl(config, path)}?ref=${encodeURIComponent(config.branch)}`, {
    headers: headers(token),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub GET ${path} gagal [${response.status}]: ${await response.text()}`);
  }

  const body = (await response.json()) as { content?: string; sha: string };
  const raw = body.content ? decodeBase64(body.content) : "";
  return { data: (raw ? JSON.parse(raw) : null) as T, sha: body.sha };
}

/**
 * Write a JSON snapshot to the repo. Always re-reads the freshest `sha` first
 * so concurrent writers do not hit a 409 conflict, and retries once if the
 * blob moved between the read and the write.
 */
export async function writeJsonFile(path: string, data: unknown, message: string): Promise<void> {
  const token = getGitHubToken();
  const config = getGitHubRepoConfig();
  if (!token || !config) throw new Error("GitHub belum dikonfigurasi");

  const content = encodeBase64(`${JSON.stringify(data, null, 2)}\n`);

  const put = async (sha?: string) =>
    fetch(contentsUrl(config, path), {
      method: "PUT",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ message, content, branch: config.branch, ...(sha ? { sha } : {}) }),
    });

  const existing = await readJsonFile<unknown>(path).catch(() => null);
  let response = await put(existing?.sha);

  if (response.status === 409 || response.status === 422) {
    // The file changed under us — grab the newest sha and retry once.
    const latest = await readJsonFile<unknown>(path).catch(() => null);
    response = await put(latest?.sha);
  }

  if (!response.ok) {
    throw new Error(`GitHub PUT ${path} gagal [${response.status}]: ${await response.text()}`);
  }
}
