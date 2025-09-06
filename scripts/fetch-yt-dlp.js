// scripts/fetch-yt-dlp.js (CommonJS)
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
if (!GITHUB_TOKEN) {
  console.error("Missing GITHUB_TOKEN env var — aborting download.");
  process.exit(1);
}

const binDir = path.join(__dirname, "..", "bin");
if (!fs.existsSync(binDir)) fs.mkdirSync(binDir);
const out = path.join(binDir, "yt-dlp");
const url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

(async () => {
  try {
    console.log("Downloading yt-dlp to", out);
    const resp = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "User-Agent": "ytplay-fetch"
      }
    });
    fs.writeFileSync(out, resp.data);
    fs.chmodSync(out, "755");
    console.log("yt-dlp downloaded.");
  } catch (e) {
    console.error("Failed to download yt-dlp:", e.message || e);
    process.exit(1);
  }
})();
