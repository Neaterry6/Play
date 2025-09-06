import express from "express";
import { create } from "youtube-dl-exec";

const youtubedl = create("./bin/yt-dlp"); // use our fetched binary
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/play", async (req, res) => {
  const { q, url, mode } = req.query;

  if (!q && !url) {
    return res.status(400).json({ creator: "Broken Vzn", error: "Provide ?q= or ?url=" });
  }

  try {
    if (q) {
      // 🔍 Search
      const result = await youtubedl(`ytsearch5:${q}`, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true
      });

      const items = result.entries.map(v => ({
        id: v.id,
        title: v.title,
        url: `https://youtube.com/watch?v=${v.id}`,
        channel: v.channel,
        duration: v.duration,
        thumbnail: v.thumbnail
      }));

      return res.json({ creator: "Broken Vzn", type: "search", results: items });
    }

    if (url) {
      // ⬇️ Download URL
      let options = {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true
      };

      if (mode === "audio") {
        options.extractAudio = true;
        options.format = "bestaudio";
      } else {
        options.format = "best";
      }

      const info = await youtubedl(url, options);

      return res.json({
        creator: "Broken Vzn",
        type: mode || "video",
        title: info.title,
        channel: info.channel,
        duration: info.duration,
        thumbnail: info.thumbnail,
        download: info.url || (info.formats ? info.formats[0].url : null)
      });
    }
  } catch (err) {
    return res.status(500).json({ creator: "Broken Vzn", error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
