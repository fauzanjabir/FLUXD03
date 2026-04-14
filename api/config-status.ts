import type { VercelRequest, VercelResponse } from "@vercel/node";
import { normalizeNotionDatabaseId } from "../lib/notion-engagement";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const contentDbId  = normalizeNotionDatabaseId(process.env.NOTION_DB_CONTENTS_ID  || "");
  const snapshotDbId = normalizeNotionDatabaseId(process.env.NOTION_DB_SNAPSHOTS_ID || "");
  const profileDbId  = normalizeNotionDatabaseId(process.env.NOTION_DB_PROFILE_ID   || "");

  return res.status(200).json({
    hasNotion:            !!process.env.NOTION_API_KEY,
    hasNotionDbProfile:   !!profileDbId,
    hasNotionDbContents:  !!contentDbId,
    hasNotionDbSnapshots: !!snapshotDbId,
  });
}
