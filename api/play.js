import ytdlp from "yt-dlp-exec";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  let { q, url, limit = "5", type } = req.query;

  // Detect audio/video flag from q
  if (q) {
    const lowered = q.toLowerCase().trim();
    if (lowered.endsWith(" audio")) {
      type = "audio";
      q = lowered.replace(/ audio$/, "");
    } else if (lowered.endsWith(" video")) {
      type = "video";
      q = lowered.replace(/ video$/, "");
    }
  }

  if (!q && !url) {
    return res.status(400).json({
      creator: "Broken Vzn",
      error: "Provide either ?q=search_term or ?url=video_url"
    });
  }

  try {
    if (q) {
      // 🔍 SEARCH MODE
      const data = await ytdlp(`ytsearch1:${q}`, {
        dumpSingleJson: true,
        noWarnings: true,
        simulate: true,
        skipDownload: true,
        addHeader: [
          "User-Agent: Mozilla/5.0",
          "Referer: https://www.youtube.com"
        ]
      });

      const first = Array.isArray(data?.entries) ? data.entries[0] : null;
      if (!first) {
        return res.json({
          creator: "Broken Vzn",
          type: "search",
          results: []
        });
      }

      if (!type) {
        // Normal search result
        return res.json({
          creator: "Broken Vzn",
          type: "search",
          results: [
            {
              id: first.id,
              title: first.title,
              url: first.webpage_url,
              duration: first.duration,
              thumbnail: first.thumbnail,
              channel: first.channel || first.uploader
            }
          ]
        });
      } else {
        // If user asked for audio/video, fetch formats
        url = first.webpage_url;
      }
    }

    // ⬇️ DOWNLOAD MODE
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      simulate: true,
      skipDownload: true,
      addHeader: [
        "User-Agent: Mozilla/5.0",
        "Referer: https://www.youtube.com"
      ]
    });

    const allFormats = (info?.formats || []).filter(f => f.url);

    const videoFormats = allFormats
      .filter(f => f.vcodec !== "none")
      .map(f => ({
        itag: f.itag,
        ext: f.ext,
        mime: f.mime_type,
        quality: f.format_note || f.resolution || f.quality,
        resolution: f.resolution,
        height: f.height,
        width: f.width,
        fps: f.fps,
        filesize: f.filesize || f.filesize_approx,
        url: f.url
      }));

    const audioFormats = allFormats
      .filter(f => f.vcodec === "none" && f.acodec !== "none")
      .map(f => ({
        itag: f.itag,
        ext: f.ext,
        mime: f.mime_type,
        quality: f.abr ? `${f.abr}kbps` : "audio",
        audio_channels: f.audio_channels,
        filesize: f.filesize || f.filesize_approx,
        url: f.url
      }));

    // If type flag provided, return only that
    if (type === "audio") {
      return res.json({
        creator: "Broken Vzn",
        type: "audio",
        title: info.title,
        channel: info.channel || info.uploader,
        duration: info.duration,
        thumbnail: info.thumbnail,
        audio: audioFormats
      });
    }

    if (type === "video") {
      return res.json({
        creator: "Broken Vzn",
        type: "video",
        title: info.title,
        channel: info.channel || info.uploader,
        duration: info.duration,
        thumbnail: info.thumbnail,
        video: videoFormats
      });
    }

    // Otherwise return both
    return res.json({
      creator: "Broken Vzn",
      type: "download",
      id: info.id,
      title: info.title,
      channel: info.channel || info.uploader,
      thumbnail: info.thumbnail,
      duration: info.duration,
      video: videoFormats,
      audio: audioFormats
    });
  } catch (e) {
    const message = e?.stderr || e?.stdout || e?.message || "Unknown error";
    return res.status(500).json({ creator: "Broken Vzn", error: message });
  }
      }
