import type { VercelRequest, VercelResponse } from "@vercel/node";

const normalizeNotionDatabaseId = (value = "") => {
  const withoutQuery = value.split("?")[0];
  const match = withoutQuery.match(/[0-9a-fA-F]{32}/);
  return match ? match[0] : value.trim();
};

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.status(200).json({
    hasNotion:            !!process.env.NOTION_API_KEY,
    hasNotionDbProfile:   !!normalizeNotionDatabaseId(process.env.NOTION_DB_PROFILE_ID),
    hasNotionDbContents:  !!normalizeNotionDatabaseId(process.env.NOTION_DB_CONTENTS_ID),
    hasNotionDbSnapshots: !!normalizeNotionDatabaseId(process.env.NOTION_DB_SNAPSHOTS_ID),
  });
}
