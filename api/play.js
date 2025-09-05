import { exec } from "child_process";

export default function handler(req, res) {
  const { q, url } = req.query;

  if (!q && !url) {
    return res.status(400).json({
      creator: "Broken Vzn",
      error: "Provide either ?q=search_term or ?url=video_url"
    });
  }

  if (q) {
    // 🔍 Search mode
    exec(`yt-dlp "ytsearch5:${q}" --dump-json`, (err, stdout) => {
      if (err) {
        return res.status(500).json({ creator: "Broken Vzn", error: err.message });
      }

      const results = stdout
        .trim()
        .split("\n")
        .map(line => {
          const j = JSON.parse(line);
          return {
            id: j.id,
            title: j.title,
            url: `https://youtube.com/watch?v=${j.id}`,
            duration: j.duration,
            thumbnail: j.thumbnail,
            channel: j.channel
          };
        });

      res.json({
        creator: "Broken Vzn",
        type: "search",
        results
      });
    });
  } else if (url) {
    // ⬇️ Download info mode
    exec(`yt-dlp -j "${url}"`, (err, stdout) => {
      if (err) {
        return res.status(500).json({ creator: "Broken Vzn", error: err.message });
      }

      const info = JSON.parse(stdout);
      const formats = info.formats.map(f => ({
        quality: f.format_note,
        ext: f.ext,
        size: f.filesize,
        url: f.url
      }));

      res.json({
        creator: "Broken Vzn",
        type: "download",
        title: info.title,
        channel: info.channel,
        thumbnail: info.thumbnail,
        duration: info.duration,
        formats
      });
    });
  }
    }
