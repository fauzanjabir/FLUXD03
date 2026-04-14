import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Client } from "@notionhq/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const normalizeNotionDatabaseId = (value = "") => {
  const withoutQuery = value.split("?")[0];
  const match = withoutQuery.match(/[0-9a-fA-F]{32}/);
  return match ? match[0] : value.trim();
};

const normalizeUrlKey = (url: string) =>
  url.replace(/^https?:\/\//, "").replace(/\/$/, "").trim().toLowerCase();

const getProperty = (props: any, names: string[]) => {
  const exactMatch = names.map((n) => props[n]).find(Boolean);
  if (exactMatch) return exactMatch;
  const entries = Object.entries(props);
  const normalized = names.map((n) => n.trim().toLowerCase());
  return entries.find(([k]) => normalized.includes(k.trim().toLowerCase()))?.[1];
};

const getText = (props: any, names: string[], fallback = "") => {
  const prop = getProperty(props, names);
  if (!prop) return fallback;
  return prop.title?.[0]?.plain_text || prop.rich_text?.[0]?.plain_text || prop.url || prop.status?.name || prop.select?.name || fallback;
};

const getNumber = (props: any, names: string[], fallback = 0) => {
  const prop = getProperty(props, names);
  return prop?.number ?? fallback;
};

const getDate = (props: any, names: string[], fallback: string) => {
  const prop = getProperty(props, names);
  return prop?.date?.start || fallback;
};

const parseHistory = (props: any) => {
  const raw = getText(props, ["History"], "[]");
  try { return JSON.parse(raw); } catch { return []; }
};

const mapSnapshotPage = (page: any) => {
  const props = page.properties;
  const snapshotDate = getDate(props, ["Date", "Added On"], page.created_time);
  const views    = getNumber(props, ["View Total", "Views", "View"]);
  const likes    = getNumber(props, ["Likes Total", "Likes"]);
  const comments = getNumber(props, ["Comments Total", "Comments"]);
  const history  = parseHistory(props);
  return {
    id:        page.id,
    url:       getText(props, ["Content URL", "Content Url", "URL", "Url"]),
    label:     getText(props, ["Label", "Name"], "Untitled"),
    views, likes, comments,
    thumbnail: getText(props, ["Thumbnail URL", "Thumbnail"], "https://picsum.photos/seed/post/400/500"),
    addedAt:   new Date(snapshotDate).toLocaleDateString(),
    snapshotDate,
    history: history.length ? history : [{ date: snapshotDate, views, likes, comments }],
  };
};

const mapContentPage = (page: any) => {
  const props = page.properties;
  return {
    id:      page.id,
    url:     getText(props, ["Content URL", "Content Url", "URL", "Url"]),
    label:   getText(props, ["Label", "Name"], "Untitled"),
    status:  getText(props, ["Status"]),
    addedAt: new Date(getDate(props, ["Added On", "Date"], page.created_time)).toLocaleDateString(),
  };
};

async function queryAll(notion: Client, database_id: string): Promise<any[]> {
  const results: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await (notion.databases as any).query({
      database_id, page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const snapshotDbId = normalizeNotionDatabaseId(process.env.NOTION_DB_SNAPSHOTS_ID);
  const contentDbId  = normalizeNotionDatabaseId(process.env.NOTION_DB_CONTENTS_ID);

  try {
    if (!snapshotDbId) {
      return res.status(500).json({ error: "Missing NOTION_DB_SNAPSHOTS_ID" });
    }

    const snapshotPages = await queryAll(notion, snapshotDbId);
    const snapshots = snapshotPages.map(mapSnapshotPage).filter((s: any) => s.url);

    const snapshotsByUrl = new Map<string, any>();
    snapshots.forEach((snapshot: any) => {
      const key = normalizeUrlKey(snapshot.url);
      const existing = snapshotsByUrl.get(key);
      if (!existing || new Date(snapshot.snapshotDate) > new Date(existing.snapshotDate)) {
        snapshotsByUrl.set(key, snapshot);
      }
    });

    let contentsPages: any[] = [];
    let contentsError = "";
    if (contentDbId) {
      try {
        contentsPages = await queryAll(notion, contentDbId);
      } catch (err: any) {
        contentsError = err?.message || "Failed to fetch FLUX Contents";
      }
    }

    const joinedItems = contentsPages
      .map(mapContentPage)
      .filter((c: any) => !c.status || c.status.toLowerCase() === "active")
      .map((content: any) => {
        const snapshot = snapshotsByUrl.get(normalizeUrlKey(content.url));
        return {
          ...content,
          hasSnapshot: !!snapshot,
          views:     snapshot?.views     ?? 0,
          likes:     snapshot?.likes     ?? 0,
          comments:  snapshot?.comments  ?? 0,
          thumbnail: snapshot?.thumbnail ?? "https://picsum.photos/seed/post/400/500",
          history:   snapshot?.history   ?? [],
        };
      });

    const hasAnyMatchedSnapshot = joinedItems.some((item: any) => item.hasSnapshot);
    const items = hasAnyMatchedSnapshot
      ? joinedItems.map(({ hasSnapshot, ...item }: any) => item)
      : snapshots;

    return res.status(200).json({
      items,
      meta: {
        contents: contentsPages.length, snapshots: snapshots.length,
        joined: joinedItems.length,
        matched: joinedItems.filter((i: any) => i.hasSnapshot).length,
        fallback: !hasAnyMatchedSnapshot, contentsError,
      },
    });
  } catch (error: any) {
    console.error("Notion engagement error:", error);
    return res.status(500).json({ error: error?.message || "Failed to fetch from Notion" });
  }
}
