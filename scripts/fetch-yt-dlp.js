const fs = require("fs");
const path = require("path");
const axios = require("axios");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
const outDir = path.join(__dirname, "..", "bin");
const outFile = path.join(outDir, "yt-dlp");

(async () => {
  try {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: GITHUB_TOKEN
        ? { Authorization: `token ${GITHUB_TOKEN}` }
        : {}
    });

    fs.writeFileSync(outFile, response.data, { mode: 0o755 });
    console.log("yt-dlp binary downloaded successfully ✅");
  } catch (err) {
    console.error("Failed to fetch yt-dlp binary ❌", err.message);
    process.exit(1);
  }
})();