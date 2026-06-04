import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const projectRoot = process.cwd();
const sourcePath = path.join(
  projectRoot,
  "Images",
  "Logo",
  "Logo no background.png"
);
const targetDir = path.join(projectRoot, "public", "images", "logo");
const targetPath = path.join(targetDir, "logo-no-background-clean.png");

const checker = [
  [255, 255, 255],
  [204, 204, 202]
];

const tileSize = 32;
const sampleStep = 4;
const tileThreshold = 18;
const pixelThreshold = 22;

function maxChannelDistance(r, g, b, target) {
  return Math.max(
    Math.abs(r - target[0]),
    Math.abs(g - target[1]),
    Math.abs(b - target[2])
  );
}

function expectedCheckerColor(tileX, tileY) {
  return checker[(tileX + tileY) % 2];
}

function nearestCheckerColor(r, g, b) {
  const d0 = maxChannelDistance(r, g, b, checker[0]);
  const d1 = maxChannelDistance(r, g, b, checker[1]);

  return d0 <= d1 ? d0 : d1;
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
    const expected = expectedCheckerColor(tileX, tileY);
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

        totalDistance += maxChannelDistance(r, g, b, expected);
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

        if (nearestCheckerColor(r, g, b) <= pixelThreshold) {
          out.data[index + 3] = 0;
        }
      }
    }
  }
}

fs.writeFileSync(targetPath, PNG.sync.write(out));
process.stdout.write(`${targetPath}\n`);
