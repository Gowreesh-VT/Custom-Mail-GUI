import sharp from "sharp";

async function icon(size: number) {
  const unit = size / 16;
  const cells = [
    [3, 3], [4, 3], [5, 3], [3, 4], [5, 4], [3, 5], [4, 5], [5, 5],
    [10, 3], [11, 3], [12, 3], [10, 4], [12, 4], [10, 5], [11, 5], [12, 5],
    [3, 10], [4, 10], [5, 10], [3, 11], [5, 11], [3, 12], [4, 12], [5, 12],
    [9, 9], [11, 9], [12, 10], [8, 11], [10, 11], [12, 12]
  ];
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#09090b"/>
    ${cells.map(([x, y]) => `<rect x="${x * unit}" y="${y * unit}" width="${unit * 0.78}" height="${unit * 0.78}" rx="${unit * 0.12}" fill="#ffffff"/>`).join("")}
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`public/scan-icon-${size}.png`);
}

Promise.all([icon(192), icon(512)]).catch((error) => {
  console.error(error);
  process.exit(1);
});
