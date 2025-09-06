// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const { create } = require("youtube-dl-exec");

const app = express();
const PORT = process.env.PORT || 3000;

// Use local binary if present, otherwise let the package use its default behavior
const localBinary = path.join(__dirname, "bin", "yt-dlp");
let youtubedl;
try {
  if (fs.existsSync(localBinary)) {
    youtubedl = create(localBinary);
    console.log("Using local yt-dlp binary:", localBinary);
  } else {
    youtubedl = create(); // uses default binary path (may require postinstall or installed binary)
    console.log("Using bundled/system yt-dlp binary (create()).");
  }
} catch (err) {
  youtubedl = create();
  console.log("Fallback to create() - no local binary.");
}

// CORS + simple preflight
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

/**
 * /play
 * q   = search query (can end with " audio" or " video" to auto-set mode)
 * url = direct video url (YouTube) - takes precedence if provided
 * mode= audio | video | both  (optional; overrides q suffix)
 * limit (for search) - default 5
 */
app.get("/play", async (req, res) => {
  let { q, url, mode, limit = "5" } = req.query;

  // detect audio/video suffix in q (e.g. "baby girl joeboy audio")
  if (q) {
    const low = q.toString().trim();
    if (low.toLowerCase().endsWith(" audio")) {
      mode = mode || "audio";
      q = low.replace(/\s+audio$/i, "").trim();
    } else if (low.toLowerCase().endsWith(" video")) {
      mode = mode || "video";
      q = low.replace(/\s+video$/i, "").trim();
    }
  }

  if (!q && !url) {
    return res.status(400).json({
      creator: "Broken Vzn",
      error: "Missing parameters. Provide ?q=search_term or ?url=video_url"
    });
  }

  try {
    // If q provided and mode not set => return search results (list)
    if (q && !mode && !url) {
      // search and return entries
      const data = await youtubedl(`ytsearch${limit}:${q}`, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificates: true,
        skipDownload: true
      });

      const entries = Array.isArray(data?.entries)
        ? data.entries.map((e) => ({
            id: e.id,
            title: e.title,
            url: e.webpage_url || (e.id ? `https://www.youtube.com/watch?v=${e.id}` : null),
            duration: e.duration,
            thumbnail: e.thumbnail,
            channel: e.channel || e.uploader
          }))
        : [];

      return res.json({
        creator: "Broken Vzn",
        type: "search",
        count: entries.length,
        results: entries
      });
    }

    // If q provided and mode set (or url provided), ensure we have a target url
    if (q && !url) {
      // find first match
      const data = await youtubedl(`ytsearch1:${q}`, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificates: true,
        skipDownload: true
      });
      const first = Array.isArray(data?.entries) ? data.entries[0] : data;
      if (!first) {
        return res.status(404).json({
          creator: "Broken Vzn",
          error: "No search results"
        });
      }
      url = first.webpage_url || (first.id ? `https://www.youtube.com/watch?v=${first.id}` : null);
      if (!url) {
        return res.status(500).json({
          creator: "Broken Vzn",
          error: "Could not resolve URL from search result"
        });
      }
    }

    // Now inspect the target URL and return format URLs (no downloading)
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      skipDownload: true
    });

    const allFormats = (info?.formats || []).filter((f) => f && f.url);

    // audio-only formats
    const audioFormats = allFormats
      .filter((f) => (f.vcodec === "none" || !f.vcodec) && f.acodec && f.acodec !== "none")
      .map((f) => ({
        itag: f.itag,
        ext: f.ext,
        mime: f.mime_type || f.format, 
        abr: f.abr || f.tbr || null,
        audio_channels: f.audio_channels || null,
        filesize: f.filesize || f.filesize_approx || null,
        url: f.url
      }));

    // video formats (may have audio or be video-only)
    const videoFormats = allFormats
      .filter((f) => f.vcodec && f.vcodec !== "none")
      .map((f) => ({
        itag: f.itag,
        ext: f.ext,
        mime: f.mime_type || f.format,
        vcodec: f.vcodec,
        acodec: f.acodec || null,
        quality: f.format_note || f.resolution || null,
        resolution: f.resolution || (f.height ? `${f.width}x${f.height}` : null),
        height: f.height || null,
        width: f.width || null,
        fps: f.fps || null,
        filesize: f.filesize || f.filesize_approx || null,
        url: f.url
      }));

    // Pick response based on mode
    if (mode === "audio") {
      return res.json({
        creator: "Broken Vzn",
        type: "audio",
        id: info.id,
        title: info.title,
        channel: info.channel || info.uploader,
        duration: info.duration,
        thumbnail: info.thumbnail,
        audio: audioFormats
      });
    }

    if (mode === "video") {
      return res.json({
        creator: "Broken Vzn",
        type: "video",
        id: info.id,
        title: info.title,
        channel: info.channel || info.uploader,
        duration: info.duration,
        thumbnail: info.thumbnail,
        video: videoFormats
      });
    }

    // default: return both lists
    return res.json({
      creator: "Broken Vzn",
      type: "both",
      id: info.id,
      title: info.title,
      channel: info.channel || info.uploader,
      duration: info.duration,
      thumbnail: info.thumbnail,
      video: videoFormats,
      audio: audioFormats
    });
  } catch (err) {
    const message = (err && (err.stderr || err.stdout || err.message)) || String(err);
    return res.status(500).json({ creator: "Broken Vzn", error: message });
  }
});

app.listen(PORT, () => console.log(`🚀 ytplay API listening on port ${PORT}`));