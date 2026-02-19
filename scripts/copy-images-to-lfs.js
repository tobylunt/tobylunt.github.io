#!/usr/bin/env node

import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to copy comic images to the Git LFS directory
 * Uses Sharp for reliable image processing - creates both compressed full-size and thumbnail versions
 */

const DEST_DIR = "public/comics-images";
const THUMBS_DIR = "public/comics-images/thumbs";
const BATCH_SIZE = 10; // Process in batches to avoid memory issues
const FULL_SIZE_QUALITY = 85; // JPEG compression quality for full images
const THUMB_SIZE = 200; // Thumbnail max dimension in pixels
const THUMB_QUALITY = 75; // Lower quality for thumbnails
const MAX_FULL_SIZE = 1920; // Max dimension for full-size images

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

function findSourceImages(sourceDir) {
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source directory not found: ${sourceDir}`);
    console.error("   Please specify the correct path to your images folder");
    process.exit(1);
  }

  const imagePaths = getImagePaths();
  const foundImages = [];
  const missingImages = [];

  for (const imageName of imagePaths) {
    const fullPath = path.join(sourceDir, imageName);
    if (fs.existsSync(fullPath)) {
      foundImages.push({ name: imageName, source: fullPath });
    } else {
      missingImages.push(imageName);
    }
  }

  if (missingImages.length > 0) {
    console.warn(`⚠️  Missing ${missingImages.length} images:`);
    missingImages.slice(0, 5).forEach((img) => console.warn(`   - ${img}`));
    if (missingImages.length > 5) {
      console.warn(`   ... and ${missingImages.length - 5} more`);
    }
  }

  console.log(`📁 Found ${foundImages.length}/${imagePaths.length} images in ${sourceDir}`);
  return foundImages;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function calculateTotalSize(images) {
  let totalSize = 0;
  for (const image of images) {
    const stats = fs.statSync(image.source);
    totalSize += stats.size;
  }
  return totalSize;
}

async function processImageWithSharp(sourcePath, outputPath, isThumb = false) {
  try {
    let sharpInstance = sharp(sourcePath);

    if (isThumb) {
      // Create thumbnail - fit within 200x200 while preserving aspect ratio
      sharpInstance = sharpInstance
        .resize(THUMB_SIZE, THUMB_SIZE, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: THUMB_QUALITY });
    } else {
      // Compress full-size image - limit max dimension to save space
      sharpInstance = sharpInstance
        .resize(MAX_FULL_SIZE, MAX_FULL_SIZE, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: FULL_SIZE_QUALITY });
    }

    await sharpInstance.toFile(outputPath);

    const stats = fs.statSync(outputPath);
    return stats.size;
  } catch (error) {
    throw new Error(`Failed to process ${path.basename(sourcePath)} with Sharp: ${error.message}`);
  }
}

async function processImagesInBatches(images, destDir) {
  console.log(`📦 Processing ${images.length} images to ${destDir}...`);
  console.log(
    `🖼️  Creating compressed full-size images (max ${MAX_FULL_SIZE}px) and thumbnails (${THUMB_SIZE}px)...`,
  );

  // Ensure destination directories exist
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`📁 Created directory: ${destDir}`);
  }

  if (!fs.existsSync(THUMBS_DIR)) {
    fs.mkdirSync(THUMBS_DIR, { recursive: true });
    console.log(`📁 Created thumbnails directory: ${THUMBS_DIR}`);
  }

  const batches = [];
  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    batches.push(images.slice(i, i + BATCH_SIZE));
  }

  let totalProcessed = 0;
  let totalBytes = 0;
  let originalBytes = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\n📦 Batch ${batchIndex + 1}/${batches.length} (${batch.length} images):`);

    for (const image of batch) {
      const fullPath = path.join(destDir, image.name);
      const thumbPath = path.join(THUMBS_DIR, image.name);
      const sourceStats = fs.statSync(image.source);
      originalBytes += sourceStats.size;

      // Check if both files exist
      const fullExists = fs.existsSync(fullPath);
      const thumbExists = fs.existsSync(thumbPath);

      if (fullExists && thumbExists) {
        console.log(`⏭️  Skipping ${image.name} (already processed)`);
        const fullStats = fs.statSync(fullPath);
        const thumbStats = fs.statSync(thumbPath);
        totalProcessed++;
        totalBytes += fullStats.size + thumbStats.size;
        continue;
      }

      try {
        let processedBytes = 0;

        // Process full-size image (compressed)
        if (!fullExists) {
          const fullSize = await processImageWithSharp(image.source, fullPath, false);
          processedBytes += fullSize;
        } else {
          processedBytes += fs.statSync(fullPath).size;
        }

        // Process thumbnail
        if (!thumbExists) {
          const thumbSize = await processImageWithSharp(image.source, thumbPath, true);
          processedBytes += thumbSize;
        } else {
          processedBytes += fs.statSync(thumbPath).size;
        }

        const compressionRatio = (
          ((sourceStats.size - processedBytes) / sourceStats.size) *
          100
        ).toFixed(1);
        console.log(
          `✅ ${image.name} (${formatBytes(processedBytes)} | -${compressionRatio}% compression)`,
        );
        totalProcessed++;
        totalBytes += processedBytes;
      } catch (error) {
        console.error(`❌ ${error.message}`);
      }
    }

    // Show progress
    const progress = (((batchIndex + 1) / batches.length) * 100).toFixed(1);
    const totalCompressionRatio =
      originalBytes > 0 ? (((originalBytes - totalBytes) / originalBytes) * 100).toFixed(1) : "0.0";
    console.log(
      `📊 Progress: ${progress}% (${totalProcessed} images, ${formatBytes(totalBytes)} | -${totalCompressionRatio}% total compression)`,
    );
  }

  console.log(`\n🎉 Processing complete! ${totalProcessed}/${images.length} images processed`);
  console.log(`📊 Original size: ${formatBytes(originalBytes)}`);
  console.log(
    `📊 Final size: ${formatBytes(totalBytes)} (saved ${formatBytes(originalBytes - totalBytes)})`,
  );
  console.log(
    `📊 Compression ratio: ${originalBytes > 0 ? (((originalBytes - totalBytes) / originalBytes) * 100).toFixed(1) : "0.0"}%`,
  );

  return totalProcessed;
}

function checkLFSSetup() {
  if (!fs.existsSync(".gitattributes")) {
    console.error("❌ .gitattributes not found. Git LFS not set up.");
    console.error('   Run: git lfs track "public/comics-images/*.jpeg"');
    process.exit(1);
  }

  const gitattributes = fs.readFileSync(".gitattributes", "utf8");
  if (!gitattributes.includes("public/comics-images/*.jpeg")) {
    console.error("❌ Git LFS not configured for comics images.");
    console.error('   Run: git lfs track "public/comics-images/*.jpeg"');
    process.exit(1);
  }

  console.log("✅ Git LFS is properly configured");
}

function showNextSteps(processedCount) {
  if (processedCount === 0) return;

  console.log("\n📋 Next Steps:");
  console.log("1. Set up Git LFS tracking for thumbnails:");
  console.log('   git lfs track "public/comics-images/thumbs/*.jpeg"');
  console.log("");
  console.log("2. Update HTML file with new image URLs:");
  console.log("   node scripts/update-image-urls.js --update");
  console.log("");
  console.log("3. Commit images to Git LFS:");
  console.log("   git add .gitattributes public/comics-images/");
  console.log('   git commit -m "Add compressed comics images and thumbnails with Git LFS"');
  console.log("");
  console.log("4. Push to GitHub:");
  console.log("   git push origin master");
  console.log("");
  console.log("⚠️  Note: This will use Git LFS bandwidth. Check your quotas at:");
  console.log("   https://github.com/settings/billing");
}

async function main() {
  const sourceDir = process.argv[2];

  if (!sourceDir) {
    console.error("Usage: node scripts/copy-images-to-lfs.js <path-to-source-images-directory>");
    console.error(
      "Example: node scripts/copy-images-to-lfs.js /Users/tobiaslunt/code/comics-valuation/images",
    );
    process.exit(1);
  }

  try {
    console.log("🖼️  Comics Images LFS Setup with Sharp");
    console.log("====================================");

    // Check Git LFS setup
    checkLFSSetup();

    // Find source images
    const images = findSourceImages(sourceDir);

    if (images.length === 0) {
      console.error("❌ No images found to process");
      process.exit(1);
    }

    // Calculate total size
    const totalSize = calculateTotalSize(images);
    console.log(`📊 Total size to process: ${formatBytes(totalSize)}`);

    if (totalSize > 1024 * 1024 * 1024) {
      // 1GB
      console.warn("⚠️  Warning: Images exceed 1GB - this will use your Git LFS quota");
    }

    // Confirm before proceeding
    if (!process.argv.includes("--confirm")) {
      console.log(
        `\n⚠️  About to process ${images.length} images (${formatBytes(totalSize)}) with Sharp`,
      );
      console.log("💡 Add --confirm flag to proceed");
      console.log(`   Example: node scripts/copy-images-to-lfs.js "${sourceDir}" --confirm`);
      return;
    }

    // Process images (compress and create thumbnails)
    const processedCount = await processImagesInBatches(images, DEST_DIR);

    // Show next steps
    showNextSteps(processedCount);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
