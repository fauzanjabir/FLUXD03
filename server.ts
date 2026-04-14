import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Client } from "@notionhq/client";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Helpers ────────────────────────────────────────────────────────────────

const getProperty = (props: any, names: string[]) => {
  const exactMatch = names.map((name) => props[name]).find(Boolean);
  if (exactMatch) return exactMatch;
  const propEntries = Object.entries(props);
  const normalizedNames = names.map((name) => name.trim().toLowerCase());
  return propEntries.find(([name]) => normalizedNames.includes(name.trim().toLowerCase()))?.[1];
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
  const rawHistory = getText(props, ["History"], "[]");
  try { return JSON.parse(rawHistory); } catch { return []; }
};

const normalizeNotionDatabaseId = (value = "") => {
  const withoutQuery = value.split("?")[0];
  const match = withoutQuery.match(/[0-9a-fA-F]{32}/);
  return match ? match[0] : value.trim();
};

const normalizeUrlKey = (url: string) =>
  url.replace(/^https?:\/\//, "").replace(/\/$/, "").trim().toLowerCase();

// ─── DB IDs (baca dari env) ──────────────────────────────────────────────────

const contentDbId  = normalizeNotionDatabaseId(process.env.NOTION_DB_CONTENTS_ID  || "");
const snapshotDbId = normalizeNotionDatabaseId(process.env.NOTION_DB_SNAPSHOTS_ID || "");
const profileDbId  = normalizeNotionDatabaseId(process.env.NOTION_DB_PROFILE_ID   || "");

// ─── Mappers ─────────────────────────────────────────────────────────────────

const mapSnapshotPage = (page: any) => {
  const props = page.properties;
  const snapshotDate = getDate(props, ["Date", "Added On"], page.created_time);
  const views    = getNumber(props, ["View Total", "Views", "View"]);
  const likes    = getNumber(props, ["Likes Total", "Likes"]);
  const comments = getNumber(props, ["Comments Total", "Comments"]);
  const history  = parseHistory(props);
  return {
    id: page.id,
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

// ─── Notion: query semua halaman (handle pagination) ────────────────────────

async function queryAll(notion: Client, database_id: string) {
  const results: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await (notion.databases as any).query({
      database_id,
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

// ─── Server ──────────────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  // Port 3001 agar tidak bertabrakan dengan Vite dev server (5173)
  // Ubah PORT sesuai kebutuhan
  const PORT = Number(process.env.API_PORT || 3001);

  app.use(express.json());

  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  // ── GET /api/config-status ──────────────────────────────────────────────
  app.get("/api/config-status", (_req, res) => {
    res.json({
      hasNotion:           !!process.env.NOTION_API_KEY,
      hasNotionDbProfile:  !!profileDbId,
      hasNotionDbContents: !!contentDbId,
      hasNotionDbSnapshots:!!snapshotDbId,
    });
  });

  // ── GET /api/engagement ─────────────────────────────────────────────────
  app.get("/api/engagement", async (_req, res) => {
    try {
      if (!snapshotDbId) {
        return res.status(500).json({ error: "Missing NOTION_DB_SNAPSHOTS_ID" });
      }

      // Baca snapshot DB (dengan pagination)
      const snapshotPages = await queryAll(notion, snapshotDbId);
      const snapshots = snapshotPages.map(mapSnapshotPage).filter((s: any) => s.url);

      // Ambil snapshot terbaru per URL
      const snapshotsByUrl = new Map<string, any>();
      snapshots.forEach((snapshot: any) => {
        const key = normalizeUrlKey(snapshot.url);
        const existing = snapshotsByUrl.get(key);
        if (!existing || new Date(snapshot.snapshotDate) > new Date(existing.snapshotDate)) {
          snapshotsByUrl.set(key, snapshot);
        }
      });

      // Baca contents DB jika ada
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

      res.json({
        items,
        meta: {
          contents:     contentsPages.length,
          snapshots:    snapshots.length,
          joined:       joinedItems.length,
          matched:      joinedItems.filter((item: any) => item.hasSnapshot).length,
          fallback:     !hasAnyMatchedSnapshot,
          contentsError,
        },
      });
    } catch (error: any) {
      console.error("Notion engagement error:", error);
      res.status(500).json({ error: error?.message || "Failed to fetch from Notion" });
    }
  });

  // ── GET /api/profile ────────────────────────────────────────────────────
  app.get("/api/profile", async (_req, res) => {
    try {
      if (!profileDbId) {
        return res.json({
          followers: 99000, following: 0, growthToday: 24,
          bio: "— Creative Storyteller ⚡️ Documenting life, Creativity, Content Creation & Strategy 📸",
          profilePic: "", history: [],
        });
      }

      const pages = await queryAll(notion, profileDbId);
      if (!pages.length) {
        return res.json({ followers: 0, following: 0, growthToday: 0, bio: "", profilePic: "", history: [] });
      }

      const latest = pages[0];
      const snapshots = pages.map((page: any) => {
        const props = page.properties;
        return {
          date:      getDate(props, ["Date"], page.created_time),
          followers: getNumber(props, ["Followers Count", "Followers"]),
        };
      });

      const props = latest.properties;
      const followers  = getNumber(props, ["Followers Count", "Followers"]);
      const following  = getNumber(props, ["Following Count", "Following"]);
      const postsCount = getNumber(props, ["Posts Count", "Posts"]);
      const parsedHistory = parseHistory(props);

      const profileHistory = snapshots
        .slice()
        .reverse()
        .map((s: any, i: number, list: any[]) => ({
          date:  s.date,
          delta: i === 0 ? 0 : s.followers - list[i - 1].followers,
        }));

      res.json({
        followers, following,
        growthToday: getNumber(props, ["Growth"], postsCount),
        bio:         getText(props, ["Bio"]),
        profilePic:  getText(props, ["Profile Pic URL", "Profile Picture"]),
        history: parsedHistory.length ? parsedHistory : profileHistory,
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // ── Vite / Static ───────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅  API server running → http://localhost:${PORT}`);
    console.log(`    Config: hasNotion=${!!process.env.NOTION_API_KEY} | snapshotDb=${!!snapshotDbId} | contentsDb=${!!contentDbId} | profileDb=${!!profileDbId}`);
  });
}

startServer();
