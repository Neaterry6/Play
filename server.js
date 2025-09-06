import express from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

// Path to yt-dlp binary (in bin folder)
const YT_DLP = path.join(process.cwd(), "bin", "yt-dlp");

// Path to cookies.txt (optional)
const COOKIES_PATH = path.join(process.cwd(), "cookies.txt");

// Middleware
app.use(express.json());

// --- Search + Download Endpoint ---
app.get("/api/yt", async (req, res) => {
  const query = req.query.q;
  const format = req.query.format || "best"; // video/audio/best

  if (!query) {
    return res.status(400).json({ error: "Missing query ?q=" });
  }

  try {
    let args = [
      `ytsearch1:${query}`,
      "--dump-json",
      "--no-check-certificate",
      "--no-playlist"
    ];

    // Add cookies if file exists
    if (fs.existsSync(COOKIES_PATH)) {
      args.push(`--cookies=${COOKIES_PATH}`);
    }

    // Format options
    if (format === "audio") {
      args.push("-f", "bestaudio");
    } else if (format === "video") {
      args.push("-f", "bestvideo+bestaudio");
    }

    const yt = spawn(YT_DLP, args);

    let output = "";
    let errorOutput = "";

    yt.stdout.on("data", (data) => {
      output += data.toString();
    });

    yt.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    yt.on("close", (code) => {
      if (code === 0) {
        try {
          const json = JSON.parse(output);
          return res.json({
            title: json.title,
            url: json.url || json.webpage_url,
            thumbnail: json.thumbnail,
            duration: json.duration,
            channel: json.channel,
            format
          });
        } catch (err) {
          return res.status(500).json({ error: "Failed to parse yt-dlp output" });
        }
      } else {
        return res.status(500).json({
          error: "yt-dlp failed",
          details: errorOutput
        });
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});