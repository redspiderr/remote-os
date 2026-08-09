export interface GitHubCredentials {
  accessToken: string;
  username?: string;
  repo?: string;
}

export async function fetchGitHubUser(
  accessToken: string
): Promise<{ ok: boolean; login?: string; error?: string }> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const data = await res.json() as { login?: string; message?: string };
  if (!res.ok) {
    return { ok: false, error: data.message ?? await res.text() };
  }
  return { ok: true, login: data.login };
}

export async function createGitHubIssue(
  accessToken: string,
  owner: string,
  repo: string,
  payload: { title: string; body?: string; labels?: string[] }
): Promise<{ ok: boolean; error?: string; issueNumber?: number }> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json() as { number?: number; message?: string };
  if (!res.ok) {
    return { ok: false, error: data.message ?? await res.text() };
  }
  return { ok: true, issueNumber: data.number };
}
