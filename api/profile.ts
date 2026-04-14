import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Client } from "@notionhq/client";

const normalizeNotionDatabaseId = (value = "") => {
  const withoutQuery = value.split("?")[0];
  const match = withoutQuery.match(/[0-9a-fA-F]{32}/);
  return match ? match[0] : value.trim();
};

const getProperty = (props: any, names: string[]) => {
  const exactMatch = names.map((n) => props[n]).find(Boolean);
  if (exactMatch) return exactMatch;
  const entries = Object.entries(props);
  const normalized = names.map((n) => n.trim().toLowerCase());
  return entries.find(([k]) => normalized.includes(k.trim().toLowerCase()))?.[1];
};

const getText = (props: any, names: string[], fallback = "") => {
  const prop = getProperty(props, names) as any;
  if (!prop) return fallback;
  return prop.title?.[0]?.plain_text || prop.rich_text?.[0]?.plain_text || prop.url || prop.status?.name || prop.select?.name || fallback;
};

const getNumber = (props: any, names: string[], fallback = 0) => {
  const prop = getProperty(props, names) as any;
  return prop?.number ?? fallback;
};

const getDate = (props: any, names: string[], fallback: string) => {
  const prop = getProperty(props, names) as any;
  return prop?.date?.start || fallback;
};

const parseHistory = (props: any) => {
  const raw = getText(props, ["History"], "[]");
  try { return JSON.parse(raw); } catch { return []; }
};

async function queryAll(notion: Client, database_id: string): Promise<any[]> {
  const results: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.databases.query({
      database_id,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    } as any);
    results.push(...(res as any).results);
    cursor = (res as any).has_more ? (res as any).next_cursor ?? undefined : undefined;
  } while (cursor);
  return results;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const profileDbId = normalizeNotionDatabaseId(process.env.NOTION_DB_PROFILE_ID);

  try {
    if (!profileDbId) {
      return res.status(200).json({
        followers: 99000, following: 0, growthToday: 24,
        bio: "— Creative Storyteller ⚡️", profilePic: "", history: [],
      });
    }

    const pages = await queryAll(notion, profileDbId);
    if (!pages.length) {
      return res.status(200).json({ followers: 0, following: 0, growthToday: 0, bio: "", profilePic: "", history: [] });
    }

    const latest = pages[0];
    const snapshots = pages.map((page: any) => ({
      date:      getDate(page.properties, ["Date"], page.created_time),
      followers: getNumber(page.properties, ["Followers Count", "Followers"]),
    }));

    const props = latest.properties;
    const followers  = getNumber(props, ["Followers Count", "Followers"]);
    const following  = getNumber(props, ["Following Count", "Following"]);
    const postsCount = getNumber(props, ["Posts Count", "Posts"]);
    const parsedHistory = parseHistory(props);

    const profileHistory = snapshots.slice().reverse().map((s: any, i: number, list: any[]) => ({
      date:  s.date,
      delta: i === 0 ? 0 : s.followers - list[i - 1].followers,
    }));

    return res.status(200).json({
      followers, following,
      growthToday: getNumber(props, ["Growth"], postsCount),
      bio:         getText(props, ["Bio"]),
      profilePic:  getText(props, ["Profile Pic URL", "Profile Picture"]),
      history: parsedHistory.length ? parsedHistory : profileHistory,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
}
