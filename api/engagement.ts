import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  contentDbId,
  mapContentPage,
  mapSnapshotPage,
  normalizeUrlKey,
  queryAll,
  snapshotDbId,
} from "../lib/notion-engagement";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  // CORS untuk dev lokal
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (!snapshotDbId) {
      return res.status(500).json({ error: "Missing NOTION_DB_SNAPSHOTS_ID" });
    }

    const snapshotPages = await queryAll(snapshotDbId);
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
        contentsPages = await queryAll(contentDbId);
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
    return res.status(500).json({ error: error?.message || "Failed to fetch from Notion" });
  }
}
