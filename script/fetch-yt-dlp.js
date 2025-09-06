// scripts/fetch-yt-dlp.js
import fs from "fs";
import { execSync } from "child_process";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
if (!GITHUB_TOKEN) {
  console.error("❌ Missing GITHUB_TOKEN env var!");
  process.exit(1);
}

const url = "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest";

console.log("🔍 Fetching yt-dlp latest release info...");

const curlCmd = `curl -s -H "Authorization: token ${GITHUB_TOKEN}" ${url}`;
const releaseInfo = JSON.parse(execSync(curlCmd).toString());

const asset = releaseInfo.assets.find(a => a.name === "yt-dlp");
if (!asset) {
  console.error("❌ Could not find yt-dlp asset in release");
  process.exit(1);
}

console.log("⬇️ Downloading:", asset.browser_download_url);

execSync(
  `curl -L -H "Authorization: token ${GITHUB_TOKEN}" -o bin/yt-dlp ${asset.browser_download_url}`
);

fs.chmodSync("bin/yt-dlp", "755");
console.log("✅ yt-dlp downloaded to ./bin/yt-dlp");
