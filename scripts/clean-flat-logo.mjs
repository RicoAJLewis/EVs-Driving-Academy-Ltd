import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const projectRoot = process.cwd();
const sourcePath = path.join(projectRoot, "Images", "Logo", "Logo.png");
const targetDir = path.join(projectRoot, "public", "images", "logo");
const targetPath = path.join(targetDir, "logo-flat-clean.png");

const white = [255, 255, 255];
const tileSize = 32;
const sampleStep = 4;
const tileThreshold = 14;
const pixelThreshold = 20;

function maxChannelDistance(r, g, b, target) {
  return Math.max(
    Math.abs(r - target[0]),
    Math.abs(g - target[1]),
    Math.abs(b - target[2])
  );
}

fs.mkdirSync(targetDir, { recursive: true });

const png = PNG.sync.read(fs.readFileSync(sourcePath));
const out = new PNG({ width: png.width, height: png.height });
png.data.copy(out.data);

const tilesX = Math.ceil(png.width / tileSize);
const tilesY = Math.ceil(png.height / tileSize);
const backgroundTiles = Array.from({ length: tilesY }, () =>
  Array.from({ length: tilesX }, () => false)
);

for (let tileY = 0; tileY < tilesY; tileY += 1) {
  for (let tileX = 0; tileX < tilesX; tileX += 1) {
    let totalDistance = 0;
    let sampleCount = 0;

    for (
      let y = tileY * tileSize;
      y < Math.min((tileY + 1) * tileSize, png.height);
      y += sampleStep
    ) {
      for (
        let x = tileX * tileSize;
        x < Math.min((tileX + 1) * tileSize, png.width);
        x += sampleStep
      ) {
        const index = (png.width * y + x) << 2;
        const r = png.data[index];
        const g = png.data[index + 1];
        const b = png.data[index + 2];

        totalDistance += maxChannelDistance(r, g, b, white);
        sampleCount += 1;
      }
    }

    backgroundTiles[tileY][tileX] =
      totalDistance / Math.max(sampleCount, 1) <= tileThreshold;
  }
}

for (let tileY = 0; tileY < tilesY; tileY += 1) {
  for (let tileX = 0; tileX < tilesX; tileX += 1) {
    if (!backgroundTiles[tileY][tileX]) {
      continue;
    }

    for (
      let y = tileY * tileSize;
      y < Math.min((tileY + 1) * tileSize, png.height);
      y += 1
    ) {
      for (
        let x = tileX * tileSize;
        x < Math.min((tileX + 1) * tileSize, png.width);
        x += 1
      ) {
        const index = (png.width * y + x) << 2;
        const r = png.data[index];
        const g = png.data[index + 1];
        const b = png.data[index + 2];

        if (maxChannelDistance(r, g, b, white) <= pixelThreshold) {
          out.data[index + 3] = 0;
        }
      }
    }
  }
}

fs.writeFileSync(targetPath, PNG.sync.write(out));
process.stdout.write(`${targetPath}\n`);
