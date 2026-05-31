import fs from "fs"
import path from "path"
import sharp from "sharp"

const sourceFile = path.join(process.cwd(), "public/icons/icon-source.png")
const outputDir = path.join(process.cwd(), "public/icons")

// Ensure directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

async function generateStandardIcons() {
  console.log("Generating standard PWA icons...")
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`)
    await sharp(sourceFile)
      .resize(size, size)
      .toFile(outputPath)
    console.log(`Generated: icon-${size}.png`)
  }
}

async function generateMaskableIcons() {
  console.log("Generating maskable icons with 80% safe zone padding...")
  const maskableSizes = [192, 512]
  for (const size of maskableSizes) {
    const targetSize = Math.round(size * 0.8)
    const padding = Math.round((size - targetSize) / 2)
    
    const outputPath = path.join(outputDir, `icon-${size}-maskable.png`)
    
    // Resize source to target size (80%)
    const iconBuffer = await sharp(sourceFile)
      .resize(targetSize, targetSize)
      .toBuffer()
      
    // Create container with dark background (#09090b) and composite icon in center
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 9, g: 9, b: 11, alpha: 1 }
      }
    })
    .composite([{ input: iconBuffer, top: padding, left: padding }])
    .toFile(outputPath)
    
    console.log(`Generated: icon-${size}-maskable.png`)
  }
}

const shortcutSvgs = {
  "shortcut-compose.png": `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  "shortcut-sent.png": `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  "shortcut-templates.png": `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
  "shortcut-bulk.png": `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
}

async function generateShortcutIcons() {
  console.log("Generating shortcut icons...")
  for (const [filename, svgContent] of Object.entries(shortcutSvgs)) {
    const outputPath = path.join(outputDir, filename)
    
    // Build transparent background canvas, composite styling svg in center
    await sharp(Buffer.from(svgContent))
      .resize(96, 96)
      .toFile(outputPath)
      
    console.log(`Generated shortcut: ${filename}`)
  }
}

async function run() {
  try {
    await generateStandardIcons()
    await generateMaskableIcons()
    await generateShortcutIcons()
    console.log("PWA Icons generation complete!")
  } catch (error) {
    console.error("Error generating icons:", error)
  }
}

run()
