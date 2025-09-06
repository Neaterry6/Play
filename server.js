// server.js
import express from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

const YT_DLP = "/bin/yt-dlp"; // yt-dlp binary we downloaded
const COOKIES_PATH = path.resolve("./cookies.txt");

// --- Play Endpoint (pretty URL like /play baby girl by joeboy) ---
app.get("/play/:query*", async (req, res) => {
  const query = [req.params.query, req.params[0]].filter(Boolean).join(" ");
  const format = req.query.format || "audio";

  if (!query) {
    return res.status(400).json({ error: "Missing search text" });
  }

  try {
    let args = [
      `ytsearch1:${query}`,
      "--dump-json",
      "--no-check-certificate",
      "--no-playlist"
    ];

    if (fs.existsSync(COOKIES_PATH)) {
      args.push(`--cookies=${COOKIES_PATH}`);
    }

    if (format === "audio") {
      args.push("-f", "bestaudio");
    } else if (format === "video") {
      args.push("-f", "bestvideo+bestaudio");
    }

    const yt = spawn(YT_DLP, args);

    let output = "";
    let errorOutput = "";

    yt.stdout.on("data", (data) => (output += data.toString()));
    yt.stderr.on("data", (data) => (errorOutput += data.toString()));

    yt.on("close", (code) => {
      if (code === 0) {
        try {
          const json = JSON.parse(output);
          return res.json({
            creator: "Broken Vzn",
            title: json.title,
            url: json.webpage_url,
            thumbnail: json.thumbnail,
            duration: json.duration,
            channel: json.channel,
            format,
            download: `/download/${encodeURIComponent(query)}?format=${format}`
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

// --- Download Endpoint (pretty URL too) ---
app.get("/download/:query*", async (req, res) => {
  const query = [req.params.query, req.params[0]].filter(Boolean).join(" ");
  const format = req.query.format || "audio";

  if (!query) {
    return res.status(400).json({ error: "Missing search text" });
  }

  let args = [
    `ytsearch1:${query}`,
    "-o", "-", // output to stdout
    "--no-check-certificate",
    "--no-playlist"
  ];

  if (fs.existsSync(COOKIES_PATH)) {
    args.push(`--cookies=${COOKIES_PATH}`);
  }

  if (format === "audio") {
    args.push("-f", "bestaudio");
    res.setHeader("Content-Type", "audio/mpeg");
  } else if (format === "video") {
    args.push("-f", "bestvideo+bestaudio");
    res.setHeader("Content-Type", "video/mp4");
  }

  const yt = spawn(YT_DLP, args);

  yt.stdout.pipe(res);
  yt.stderr.on("data", (data) => console.error("yt-dlp error:", data.toString()));

  yt.on("close", (code) => {
    if (code !== 0) {
      res.end();
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});