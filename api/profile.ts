import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getDate,
  getNumber,
  getText,
  parseHistory,
  profileDbId,
  queryAll,
} from "../lib/notion-engagement";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (!profileDbId) {
      return res.status(200).json({
        followers: 99000, following: 0, growthToday: 24,
        bio: "— Creative Storyteller ⚡️ Documenting life, Creativity, Content Creation & Strategy 📸",
        profilePic: "", history: [],
      });
    }

    const pages = await queryAll(profileDbId);

    if (!pages.length) {
      return res.status(200).json({
        followers: 0, following: 0, growthToday: 0,
        bio: "", profilePic: "", history: [],
      });
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

    return res.status(200).json({
      followers,
      following,
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
