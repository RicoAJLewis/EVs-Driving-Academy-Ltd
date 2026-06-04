import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const projectRoot = process.cwd();
const inputDir = path.join(projectRoot, "public", "images", "landing-page");
const outputDir = path.join(projectRoot, "public", "images", "landing-page-clean");

const checker = [
  [255, 255, 255],
  [204, 204, 202]
];

const assets = [
  "background.png",
  "middle-ground-no-car.png",
  "middleground-car.png",
  "foreground.png"
];

const tileSize = 32;
const tileThreshold = 16;
const channelThreshold = 24;

function maxChannelDistance(r, g, b, target) {
  return Math.max(
    Math.abs(r - target[0]),
    Math.abs(g - target[1]),
    Math.abs(b - target[2])
  );
}

function nearestCheckerColor(r, g, b) {
  const distance0 = maxChannelDistance(r, g, b, checker[0]);
  const distance1 = maxChannelDistance(r, g, b, checker[1]);

  return distance0 <= distance1
    ? { color: checker[0], distance: distance0 }
    : { color: checker[1], distance: distance1 };
}

function expectedCheckerColor(tileX, tileY) {
  return checker[(tileX + tileY) % 2];
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function writePng(filePath, png) {
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

function cleanAsset(filename) {
  const sourcePath = path.join(inputDir, filename);
  const targetPath = path.join(outputDir, filename);
  const png = readPng(sourcePath);
  const clean = new PNG({ width: png.width, height: png.height });

  png.data.copy(clean.data);

  const tilesX = Math.ceil(png.width / tileSize);
  const tilesY = Math.ceil(png.height / tileSize);
  const backgroundTiles = Array.from({ length: tilesY }, () =>
    Array.from({ length: tilesX }, () => false)
  );

  for (let tileY = 0; tileY < tilesY; tileY += 1) {
    for (let tileX = 0; tileX < tilesX; tileX += 1) {
      const expected = expectedCheckerColor(tileX, tileY);
      let totalDistance = 0;
      let samples = 0;

      for (let y = tileY * tileSize; y < Math.min((tileY + 1) * tileSize, png.height); y += 4) {
        for (let x = tileX * tileSize; x < Math.min((tileX + 1) * tileSize, png.width); x += 4) {
          const index = (png.width * y + x) << 2;
          const r = png.data[index];
          const g = png.data[index + 1];
          const b = png.data[index + 2];

          totalDistance += maxChannelDistance(r, g, b, expected);
          samples += 1;
        }
      }

      backgroundTiles[tileY][tileX] = totalDistance / Math.max(samples, 1) <= tileThreshold;
    }
  }

  for (let tileY = 0; tileY < tilesY; tileY += 1) {
    for (let tileX = 0; tileX < tilesX; tileX += 1) {
      if (!backgroundTiles[tileY][tileX]) {
        continue;
      }

      for (let y = tileY * tileSize; y < Math.min((tileY + 1) * tileSize, png.height); y += 1) {
        for (let x = tileX * tileSize; x < Math.min((tileX + 1) * tileSize, png.width); x += 1) {
          const index = (png.width * y + x) << 2;
          const r = png.data[index];
          const g = png.data[index + 1];
          const b = png.data[index + 2];
          const nearest = nearestCheckerColor(r, g, b);

          if (nearest.distance <= channelThreshold) {
            clean.data[index + 3] = 0;
          }
        }
      }
    }
  }

  writePng(targetPath, clean);
  return targetPath;
}

ensureDir(outputDir);

for (const asset of assets) {
  const output = cleanAsset(asset);
  process.stdout.write(`cleaned ${path.basename(output)}\n`);
}
