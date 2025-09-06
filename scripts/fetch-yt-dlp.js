// scripts/fetch-yt-dlp.js
const https = require("https");
const fs = require("fs");
const path = require("path");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OUTPUT_PATH = path.join(__dirname, "..", "bin", "yt-dlp");

// Ensure bin dir
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: "/repos/yt-dlp/yt-dlp/releases/latest",
      headers: {
        "User-Agent": "yt-dlp-fetcher",
        "Authorization": GITHUB_TOKEN ? `token ${GITHUB_TOKEN}` : undefined
      }
    };

    https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
        }
        resolve(JSON.parse(data));
      });
    }).on("error", reject);
  });
}

function downloadBinary(url) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(OUTPUT_PATH, { mode: 0o755 });
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed: ${res.statusCode}`));
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

(async () => {
  try {
    console.log("Fetching latest yt-dlp release...");
    const release = await fetchLatestRelease();
    const asset = release.assets.find(a => a.name === "yt-dlp");
    if (!asset) throw new Error("yt-dlp binary not found in release assets");
    console.log(`Downloading yt-dlp from ${asset.browser_download_url}`);
    await downloadBinary(asset.browser_download_url);
    console.log("yt-dlp downloaded successfully.");
  } catch (err) {
    console.error("Failed to fetch yt-dlp:", err);
    process.exit(1);
  }
})();