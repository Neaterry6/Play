const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { execSync } = require("child_process");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
const outDir = path.join(__dirname, "..", "bin");
const outFile = path.join(outDir, "yt-dlp");

(async () => {
  try {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
    });

    fs.writeFileSync(outFile, response.data);
    execSync(`chmod +x ${outFile}`);  // 👈 ensure executable
    console.log("✅ yt-dlp binary downloaded and made executable");
  } catch (err) {
    console.error("❌ Failed to fetch yt-dlp binary:", err.message);
    process.exit(1);
  }
})();