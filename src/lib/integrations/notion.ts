export interface NotionCredentials {
  accessToken: string;
  workspaceId?: string;
  databaseId?: string;
}

export async function createNotionPage(
  accessToken: string,
  databaseId: string,
  payload: {
    title: string;
    content?: string;
    properties?: Record<string, unknown>;
  }
): Promise<{ ok: boolean; error?: string; pageId?: string }> {
  const url = databaseId
    ? "https://api.notion.com/v1/pages"
    : "https://api.notion.com/v1/pages";
  const body: Record<string, unknown> = {
    parent: databaseId ? { database_id: databaseId } : undefined,
    properties: {
      Name: { title: [{ text: { content: payload.title } }] },
      ...(payload.properties ?? {}),
    },
  };
  if (payload.content) {
    body.children = [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: payload.content } }],
        },
      },
    ];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json() as { id?: string; message?: string };
  if (!res.ok) {
    return { ok: false, error: data.message ?? await res.text() };
  }
  return { ok: true, pageId: data.id };
}
