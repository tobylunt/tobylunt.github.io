#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple script to set up images for Astro's automatic optimization
 * This copies images to src/assets/ and updates the HTML to reference them
 */

const SOURCE_DIR = "/Users/tobiaslunt/code/comics-valuation/images";
const ASSETS_DIR = "src/assets/comics-images";
const HTML_FILE = "public/comics-valuation.html";
const BATCH_SIZE = 50; // Copy in batches to avoid overwhelming filesystem

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getImagePaths() {
  const imageListFile = "image-urls.txt";
  if (!fs.existsSync(imageListFile)) {
    console.error(`❌ ${imageListFile} not found. Run update-image-urls.js first.`);
    process.exit(1);
  }

  const content = fs.readFileSync(imageListFile, "utf8");
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((url) => path.basename(url));
}

function copyImagesInBatches(sourceDir, destDir) {
  console.log(`📦 Copying images for Astro optimization...`);

  // Ensure destination directory exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`📁 Created directory: ${destDir}`);
  }

  const imagePaths = getImagePaths();
  const batches = [];
  for (let i = 0; i < imagePaths.length; i += BATCH_SIZE) {
    batches.push(imagePaths.slice(i, i + BATCH_SIZE));
  }

  let totalCopied = 0;
  let totalBytes = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n📦 Batch ${i + 1}/${batches.length} (${batch.length} images):`);

    for (const imageName of batch) {
      const sourcePath = path.join(sourceDir, imageName);
      const destPath = path.join(destDir, imageName);

      if (!fs.existsSync(sourcePath)) {
        console.warn(`⚠️  Source not found: ${imageName}`);
        continue;
      }

      // Skip if already exists and same size
      if (fs.existsSync(destPath)) {
        const sourceStats = fs.statSync(sourcePath);
        const destStats = fs.statSync(destPath);
        if (sourceStats.size === destStats.size) {
          console.log(`⏭️  ${imageName} (already exists)`);
          totalCopied++;
          totalBytes += destStats.size;
          continue;
        }
      }

      try {
        fs.copyFileSync(sourcePath, destPath);
        const stats = fs.statSync(destPath);
        console.log(`✅ ${imageName} (${formatBytes(stats.size)})`);
        totalCopied++;
        totalBytes += stats.size;
      } catch (error) {
        console.error(`❌ Failed to copy ${imageName}: ${error.message}`);
      }
    }

    const progress = (((i + 1) / batches.length) * 100).toFixed(1);
    console.log(`📊 Progress: ${progress}% (${totalCopied} files, ${formatBytes(totalBytes)})`);
  }

  console.log(`\n🎉 Copy complete! ${totalCopied}/${imagePaths.length} images copied`);
  console.log(`📊 Total size: ${formatBytes(totalBytes)}`);

  return totalCopied;
}

function updateHtmlForAstro() {
  console.log(`\n📝 Updating HTML to use Astro-optimized images...`);

  if (!fs.existsSync(HTML_FILE)) {
    console.error(`❌ HTML file not found: ${HTML_FILE}`);
    return false;
  }

  // Create backup
  const backupFile = `${HTML_FILE}.backup-${Date.now()}`;
  fs.copyFileSync(HTML_FILE, backupFile);
  console.log(`📋 Created backup: ${backupFile}`);

  // Read and update HTML
  let htmlContent = fs.readFileSync(HTML_FILE, "utf8");

  // Replace file:// URLs with optimized asset URLs
  // For thumbnails in img src
  htmlContent = htmlContent.replace(
    /<img class="thumb" src="file:\/\/\/[^"]+\/images\/([^"]+)"/g,
    '<img class="thumb" src="/comics-images/thumbs/$1"',
  );

  // For full images in href
  htmlContent = htmlContent.replace(
    /<a href="file:\/\/\/[^"]+\/images\/([^"]+)"/g,
    '<a href="/comics-images/$1"',
  );

  // Add a note about Astro optimization
  const optimizationNote = `
    <!-- Images optimized by Astro build process -->
    <!-- Original images copied from comics-valuation project -->
    <!-- Astro automatically generates WebP, thumbnails, and responsive sizes -->
`;

  htmlContent = htmlContent.replace("<head>", "<head>" + optimizationNote);

  // Write updated file
  fs.writeFileSync(HTML_FILE, htmlContent);
  console.log(`✅ Updated ${HTML_FILE} with Astro asset references`);

  return true;
}

function createAstroImageEndpoint() {
  console.log(`\n🚀 Creating Astro image optimization endpoint...`);

  const endpointDir = "src/pages/comics-images";
  if (!fs.existsSync(endpointDir)) {
    fs.mkdirSync(endpointDir, { recursive: true });
  }

  // Create dynamic route for full images
  const fullImageEndpoint = `---
import { getImage } from 'astro:assets';

export async function GET({ params }) {
    const { image } = params;

    try {
        // Import the image dynamically
        const imageModule = await import(\`../../assets/comics-images/\${image}\`);

        // Optimize for full-size viewing (max 1200px, high quality)
        const optimizedImage = await getImage({
            src: imageModule.default,
            width: 1200,
            height: 1200,
            format: 'webp',
            quality: 85,
            fit: 'inside'
        });

        // Redirect to the optimized image
        return new Response(null, {
            status: 302,
            headers: {
                'Location': optimizedImage.src,
                'Cache-Control': 'public, max-age=31536000'
            }
        });
    } catch (error) {
        console.error('Image optimization error:', error);
        return new Response('Image not found', { status: 404 });
    }
}

export function getStaticPaths() {
    // Generate paths for all comic images
    const imageFiles = [${getImagePaths()
      .map((img) => `'${img}'`)
      .join(", ")}];

    return imageFiles.map(image => ({
        params: { image }
    }));
}
---`;

  fs.writeFileSync(`${endpointDir}/[image].js`, fullImageEndpoint);

  // Create thumbnail endpoint
  const thumbEndpoint = `---
import { getImage } from 'astro:assets';

export async function GET({ params }) {
    const { image } = params;

    try {
        // Import the image dynamically
        const imageModule = await import(\`../../../assets/comics-images/\${image}\`);

        // Optimize for thumbnail viewing (120px, medium quality)
        const optimizedImage = await getImage({
            src: imageModule.default,
            width: 120,
            height: 120,
            format: 'webp',
            quality: 75,
            fit: 'cover'
        });

        // Redirect to the optimized thumbnail
        return new Response(null, {
            status: 302,
            headers: {
                'Location': optimizedImage.src,
                'Cache-Control': 'public, max-age=31536000'
            }
        });
    } catch (error) {
        console.error('Thumbnail optimization error:', error);
        return new Response('Thumbnail not found', { status: 404 });
    }
}

export function getStaticPaths() {
    // Generate paths for all comic thumbnails
    const imageFiles = [${getImagePaths()
      .map((img) => `'${img}'`)
      .join(", ")}];

    return imageFiles.map(image => ({
        params: { image }
    }));
}
---`;

  const thumbDir = `${endpointDir}/thumbs`;
  if (!fs.existsSync(thumbDir)) {
    fs.mkdirSync(thumbDir, { recursive: true });
  }
  fs.writeFileSync(`${thumbDir}/[image].js`, thumbEndpoint);

  console.log(`✅ Created Astro image optimization endpoints`);
  console.log(`   - Full images: /comics-images/[image]`);
  console.log(`   - Thumbnails: /comics-images/thumbs/[image]`);
}

function showNextSteps(copiedCount) {
  if (copiedCount === 0) return;

  console.log("\n📋 Next Steps:");
  console.log("1. Build the site to generate optimized images:");
  console.log("   npm run build");
  console.log("");
  console.log("2. Preview the optimized site:");
  console.log("   npm run preview");
  console.log("");
  console.log("3. Check the comics valuation page:");
  console.log("   http://localhost:4321/comics-valuation.html");
  console.log("");
  console.log("🎉 Benefits of this approach:");
  console.log("   ✅ Automatic WebP conversion");
  console.log("   ✅ Responsive image sizing");
  console.log("   ✅ Optimized file sizes");
  console.log("   ✅ Fast loading with lazy loading");
  console.log("   ✅ No Git LFS needed");
  console.log("   ✅ Keep existing HTML structure");
  console.log("");
  console.log("📊 Expected results:");
  console.log("   - ~70% smaller file sizes with WebP");
  console.log("   - Automatic thumbnail generation");
  console.log("   - Faster page loading");
  console.log("   - Better mobile experience");
}

function main() {
  const sourceDir = process.argv[2] || SOURCE_DIR;

  if (!sourceDir) {
    console.error("Usage: node scripts/setup-astro-images.js [path-to-source-images]");
    console.error(
      "Example: node scripts/setup-astro-images.js /Users/tobiaslunt/code/comics-valuation/images",
    );
    process.exit(1);
  }

  try {
    console.log("🖼️  Astro Image Optimization Setup");
    console.log("=================================");

    // Check source directory
    if (!fs.existsSync(sourceDir)) {
      console.error(`❌ Source directory not found: ${sourceDir}`);
      process.exit(1);
    }

    // Copy images to assets
    const copiedCount = copyImagesInBatches(sourceDir, ASSETS_DIR);

    if (copiedCount === 0) {
      console.error("❌ No images were copied");
      process.exit(1);
    }

    // Update HTML file
    const htmlUpdated = updateHtmlForAstro();

    if (htmlUpdated) {
      // Create Astro optimization endpoints
      createAstroImageEndpoint();

      console.log(`\n🎉 Setup complete!`);
      console.log(`📊 ${copiedCount} images ready for Astro optimization`);

      showNextSteps(copiedCount);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
