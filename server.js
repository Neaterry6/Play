const express = require("express");
const { execFile } = require("child_process");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const YTDLP_PATH = path.join(__dirname, "bin", "yt-dlp");

app.get("/play", (req, res) => {
  const query = req.query.q;
  const type = req.query.type || "video"; // "video" | "audio"

  if (!query) {
    return res.status(400).json({ error: "Missing ?q=search term" });
  }

  // search on YouTube and fetch JSON
  const args = [
    "ytsearch1:" + query,
    "--dump-json"
  ];

  // add format flags
  if (type === "audio") {
    args.push("-f", "bestaudio");
  } else {
    args.push("-f", "best");
  }

  execFile(YTDLP_PATH, args, (err, stdout, stderr) => {
    if (err) {
      console.error("yt-dlp error:", stderr);
      return res.status(500).json({ error: "yt-dlp failed" });
    }

    try {
      const info = JSON.parse(stdout);
      res.json({
        creator: "Broken Vzn",
        title: info.title,
        url: info.webpage_url,
        thumbnail: info.thumbnail,
        download: info.url, // direct downloadable link
        type
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to parse yt-dlp output" });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});