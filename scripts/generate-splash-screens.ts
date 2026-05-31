import fs from "fs"
import path from "path"
import sharp from "sharp"

const sourceFile = path.join(process.cwd(), "public/icons/icon-source.png")
const outputDir = path.join(process.cwd(), "public/splash")

// Ensure directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const splashSizes = [
  { width: 390, height: 844, name: "splash-390.png" }, // iPhone 14
  { width: 414, height: 896, name: "splash-414.png" }, // iPhone 11/XR
  { width: 375, height: 812, name: "splash-375.png" }, // iPhone X/11 Pro
  { width: 428, height: 926, name: "splash-428.png" }  // iPhone 14 Plus
]

async function generateSplashScreens() {
  console.log("Generating iOS splash screens...")
  
  // Resize source to 192x192 for the center icon
  const centerIconBuffer = await sharp(sourceFile)
    .resize(192, 192)
    .toBuffer()

  for (const { width, height, name } of splashSizes) {
    const outputPath = path.join(outputDir, name)
    
    // Calculate centering positions
    const iconTop = Math.round((height - 192) / 2) - 40 // offset upward slightly to leave space for text
    const iconLeft = Math.round((width - 192) / 2)
    
    // SVG overlay for the text "Custom Mail" below the icon
    const textTop = iconTop + 192 + 40
    const textSvg = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="${textTop}" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1">Custom Mail</text>
        <text x="50%" y="${textTop + 24}" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500" fill="#71717a" text-anchor="middle">PROFESSIONAL EMAIL CLIENT</text>
      </svg>
    `)
    
    // Create base dark canvas, overlay the icon, and overlay the text
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 9, g: 9, b: 11, alpha: 1 } // #09090b
      }
    })
    .composite([
      { input: centerIconBuffer, top: iconTop, left: iconLeft },
      { input: textSvg, top: 0, left: 0 }
    ])
    .toFile(outputPath)
    
    console.log(`Generated splash: ${name} (${width}x${height})`)
  }
  
  console.log("Splash screen generation complete!")
}

generateSplashScreens().catch(err => {
  console.error("Error generating splash screens:", err)
})
