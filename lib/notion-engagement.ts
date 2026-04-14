import { Client } from "@notionhq/client";

// ─── Property Helpers ─────────────────────────────────────────────────────────

const getProperty = (props: any, names: string[]) => {
  const exactMatch = names.map((name) => props[name]).find(Boolean);
  if (exactMatch) return exactMatch;
  const propEntries = Object.entries(props);
  const normalizedNames = names.map((name) => name.trim().toLowerCase());
  return propEntries.find(([name]) =>
    normalizedNames.includes(name.trim().toLowerCase())
  )?.[1];
};

export const getText = (props: any, names: string[], fallback = "") => {
  const prop = getProperty(props, names);
  if (!prop) return fallback;
  return (
    prop.title?.[0]?.plain_text ||
    prop.rich_text?.[0]?.plain_text ||
    prop.url ||
    prop.status?.name ||
    prop.select?.name ||
    fallback
  );
};

export const getNumber = (props: any, names: string[], fallback = 0) => {
  const prop = getProperty(props, names);
  return prop?.number ?? fallback;
};

export const getDate = (props: any, names: string[], fallback: string) => {
  const prop = getProperty(props, names);
  return prop?.date?.start || fallback;
};

export const parseHistory = (props: any) => {
  const rawHistory = getText(props, ["History"], "[]");
  try {
    return JSON.parse(rawHistory);
  } catch {
    return [];
  }
};

export const normalizeNotionDatabaseId = (value = "") => {
  const withoutQuery = value.split("?")[0];
  const match = withoutQuery.match(/[0-9a-fA-F]{32}/);
  return match ? match[0] : value.trim();
};

export const normalizeUrlKey = (url: string) =>
  url.replace(/^https?:\/\//, "").replace(/\/$/, "").trim().toLowerCase();

// ─── DB IDs ───────────────────────────────────────────────────────────────────

export const contentDbId  = normalizeNotionDatabaseId(process.env.NOTION_DB_CONTENTS_ID  || "");
export const snapshotDbId = normalizeNotionDatabaseId(process.env.NOTION_DB_SNAPSHOTS_ID || "");
export const profileDbId  = normalizeNotionDatabaseId(process.env.NOTION_DB_PROFILE_ID   || "");

// ─── Notion Client ────────────────────────────────────────────────────────────

export const notion = new Client({ auth: process.env.NOTION_API_KEY });

// ─── Pagination helper: ambil SEMUA halaman dari sebuah database ──────────────

export async function queryAll(database_id: string): Promise<any[]> {
  const results: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await (notion.databases as any).query({
      database_id,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

export const mapSnapshotPage = (page: any) => {
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

export const mapContentPage = (page: any) => {
  const props = page.properties;
  return {
    id:      page.id,
    url:     getText(props, ["Content URL", "Content Url", "URL", "Url"]),
    label:   getText(props, ["Label", "Name"], "Untitled"),
    status:  getText(props, ["Status"]),
    addedAt: new Date(getDate(props, ["Added On", "Date"], page.created_time)).toLocaleDateString(),
  };
};
