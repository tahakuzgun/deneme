import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const distDir = path.join(rootDir, "dist");

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await cp(publicDir, distDir, { recursive: true });

  const runtimeConfig = `window.__GAME_SERVER_URL__ = ${JSON.stringify(process.env.GAME_SERVER_URL || "")};\n`;
  await writeFile(path.join(distDir, "config.js"), runtimeConfig, "utf8");

  const vercelEntrypoint = `const express = require("express");
const path = require("path");

const app = express();
const staticDir = __dirname;

app.use(express.static(staticDir));

app.get("*", (_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

module.exports = app;
`;
  await writeFile(path.join(distDir, "index.js"), vercelEntrypoint, "utf8");

  const fallbackHtml = `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=/index.html" />
    <title>FPS Duel Arena</title>
  </head>
  <body>
    <p>Yonlendiriliyor...</p>
  </body>
</html>
`;

  await writeFile(path.join(distDir, "404.html"), fallbackHtml, "utf8");
  console.log(`Build tamamlandi: ${distDir}`);
}

main().catch((error) => {
  console.error("Build basarisiz:", error);
  process.exitCode = 1;
});
