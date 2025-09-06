// scripts/fetch-yt-dlp.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// --- CONFIG ---
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // <-- Set this in Render Dashboard
const BINARY_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";

// Ensure bin folder exists
const binDir = path.join(__dirname, "..", "bin");
if (!fs.existsSync(binDir)) fs.mkdirSync(binDir);

// Target file
const ytDlpPath = path.join(binDir, "yt-dlp");

// Download function
async function fetchBinary() {
  try {
    console.log("⬇️ Fetching yt-dlp binary...");

    const response = await axios({
      url: BINARY_URL,
      method: "GET",
      responseType: "arraybuffer",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "User-Agent": "yt-dlp-fetch-script"
      }
    });

    fs.writeFileSync(ytDlpPath, response.data);
    fs.chmodSync(ytDlpPath, "755");

    console.log("✅ yt-dlp binary downloaded successfully.");
  } catch (err) {
    console.error("❌ Failed to fetch yt-dlp:", err.message);
    process.exit(1);
  }
}

fetchBinary();