#!/usr/bin/env node

/**
 * Create or update a blog post with images and videos
 *
 * Usage:
 *   pnpm post <folder-name>
 *
 * Examples:
 *   pnpm post cockpit-joinery        # uses ~/Desktop/cockpit-joinery/
 *   pnpm post cherry-bench-photos     # uses ~/Desktop/cherry-bench-photos/, slug = cherry-bench
 *   pnpm post cherry-bench            # tries ~/Desktop/cherry-bench/, falls back to ~/Desktop/cherry-bench-photos/
 *
 * Create mode (post doesn't exist):
 *   - Creates .mdx post file in src/content/post/
 *   - Creates image directory in src/assets/img/
 *   - Copies/converts all media from Desktop folder
 *   - Generates imports and CaptionedImage/BlogVideo components
 *
 * Update mode (post already exists):
 *   - Identifies new images not yet in src/assets/img/{slug}/
 *   - Copies/converts only new media
 *   - Appends new imports and components to end of existing post
 *
 * Supported formats:
 *   Images: .jpg, .jpeg, .png, .gif, .webp, .heic (HEIC auto-converted to JPEG)
 *   Videos: .mp4, .webm, .mov (MOV auto-converted to MP4 via ffmpeg)
 */

import fs from "fs";
import path from "path";
import heicConvert from "heic-convert";
import { spawnSync } from "child_process";

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"];
const VIDEO_EXTS = [".mp4", ".webm", ".mov"];

function cleanFileName(fileName) {
  const name = path.parse(fileName).name;
  return name
    .replace(/^[^a-zA-Z]+/, "img_")
    .replace(/^\d+__/, "photo_")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase()
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function checkFfmpeg() {
  const result = spawnSync("ffmpeg", ["-version"]);
  if (result.error) {
    console.error("\n❌ Error: ffmpeg is not installed");
    console.log("\nPlease install ffmpeg to enable video conversion:");
    console.log("  brew install ffmpeg");
    return false;
  }
  return true;
}

/**
 * Derive the post slug from a folder name.
 * Strips "-photos" suffix if present.
 */
function deriveSlug(folderName) {
  return folderName.replace(/-photos$/, "");
}

/**
 * Resolve the Desktop source folder.
 * Tries exact name first, then with "-photos" suffix.
 */
function resolveSourceDir(folderName) {
  const desktop = path.join(process.env.HOME, "Desktop");
  const exact = path.join(desktop, folderName);
  if (fs.existsSync(exact) && fs.statSync(exact).isDirectory()) {
    return exact;
  }
  const withSuffix = path.join(desktop, `${folderName}-photos`);
  if (fs.existsSync(withSuffix) && fs.statSync(withSuffix).isDirectory()) {
    return withSuffix;
  }
  return null;
}

/**
 * Find the existing post file (.mdx or .md).
 * Returns the path if found, null otherwise.
 */
function findExistingPost(slug) {
  const postDir = path.join("src", "content", "post");
  for (const ext of [".mdx", ".md"]) {
    const p = path.join(postDir, `${slug}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Get set of filenames already in the image directory.
 */
function getExistingImages(imgDir) {
  if (!fs.existsSync(imgDir)) return new Set();
  return new Set(fs.readdirSync(imgDir));
}

/**
 * Get the highest image/video counter from an existing post file
 * by counting CaptionedImage and BlogVideo occurrences.
 */
function getExistingCounts(postPath) {
  const content = fs.readFileSync(postPath, "utf-8");
  const imageCount = (content.match(/<CaptionedImage/g) || []).length;
  const videoCount = (content.match(/<BlogVideo/g) || []).length;
  return { imageCount, videoCount };
}

async function processImages(files, sourceDir, imgDir, slug, startCounter) {
  let importStatements = "";
  let mediaUsage = "";
  let counter = startCounter;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const cleanName = cleanFileName(file);
    const isHeic = ext === ".heic";
    const targetFile = `${cleanName}${isHeic ? ".jpg" : ext}`;
    const targetPath = path.join(imgDir, targetFile);

    if (isHeic) {
      console.log(`  Converting ${file} to JPEG...`);
      const inputBuffer = fs.readFileSync(path.join(sourceDir, file));
      const outputBuffer = await heicConvert({
        buffer: inputBuffer,
        format: "JPEG",
        quality: 0.9,
      });
      fs.writeFileSync(targetPath, outputBuffer);
    } else {
      fs.copyFileSync(path.join(sourceDir, file), targetPath);
    }

    importStatements += `import ${cleanName} from '@/assets/img/${slug}/${targetFile}';\n`;
    mediaUsage += `
<CaptionedImage
    src={${cleanName}}
    alt="Image ${counter}"
    caption="Image ${counter} - Description needed"
/>\n\n`;
    counter++;
  }

  return { importStatements, mediaUsage, count: files.length };
}

function processVideos(files, sourceDir, slug, startCounter) {
  let mediaUsage = "";
  let counter = startCounter;
  const videosDir = path.join("public", "assets", "img", slug);
  fs.mkdirSync(videosDir, { recursive: true });

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const cleanName = cleanFileName(file);
    const isMovFile = ext === ".mov";
    const targetFile = `${cleanName}${isMovFile ? ".mp4" : ext}`;
    const targetPath = path.join(videosDir, targetFile);

    if (isMovFile) {
      console.log(`  Converting ${file} to MP4...`);
      const result = spawnSync("ffmpeg", [
        "-i", path.join(sourceDir, file),
        "-c:v", "libx264",
        "-c:a", "aac",
        "-strict", "experimental",
        "-b:a", "192k",
        "-movflags", "+faststart",
        targetPath,
      ]);
      if (result.error || result.status !== 0) {
        console.error(`  ❌ Error converting ${file}`);
        console.error(result.stderr?.toString());
        continue;
      }
    } else {
      fs.copyFileSync(path.join(sourceDir, file), targetPath);
    }

    mediaUsage += `
<BlogVideo
    src="${slug}/${targetFile}"
    comment="Video ${counter} - Description needed"
/>\n\n`;
    counter++;
  }

  return { mediaUsage, count: counter - startCounter };
}

async function createPost(slug, sourceDir, imgDir) {
  console.log(`\n📝 Creating new post: ${slug}`);

  fs.mkdirSync(imgDir, { recursive: true });
  console.log(`  Created image directory: ${imgDir}`);

  const allFiles = fs.readdirSync(sourceDir);
  const imageFiles = allFiles.filter((f) => IMAGE_EXTS.includes(path.extname(f).toLowerCase())).sort();
  const videoFiles = allFiles.filter((f) => VIDEO_EXTS.includes(path.extname(f).toLowerCase())).sort();

  if (imageFiles.length === 0 && videoFiles.length === 0) {
    console.warn("\n⚠️  No image or video files found in source directory");
    console.log(`  Source: ${sourceDir}\n`);
    process.exit(0);
  }

  const hasVideos = videoFiles.length > 0;
  const postPath = path.join("src", "content", "post", `${slug}.mdx`);
  const postDate = new Date().toISOString().split("T")[0];

  try {
    let content = `---
title: "${slug.replace(/-/g, " ")}"
description: "This is a placeholder description that meets the minimum length requirement. Please replace with actual content."
publishDate: "${postDate}"
tags: ["ariadne"]
draft: true
---
import CaptionedImage from '@/components/CaptionedImage.astro';\n`;

    if (hasVideos) {
      content += `import BlogVideo from '@/components/BlogVideo.astro';\n`;
    }

    // Process images
    const imgResult = await processImages(imageFiles, sourceDir, imgDir, slug, 1);
    content += "\n" + imgResult.importStatements + imgResult.mediaUsage;

    // Process videos
    if (hasVideos) {
      if (!checkFfmpeg()) process.exit(1);
      const vidResult = processVideos(videoFiles, sourceDir, slug, 1);
      content += vidResult.mediaUsage;
      console.log(`  ✅ Processed ${vidResult.count} videos`);
    }

    fs.writeFileSync(postPath, content);
    console.log(`  ✅ Created post: ${postPath}`);
    console.log(`  ✅ Processed ${imgResult.count} images`);
    console.log("\n🎉 Post created!");
    console.log("\nNext steps:");
    console.log("  1. Update the description (50-160 chars)");
    console.log("  2. Add alt text for each image");
    console.log("  3. Write your post content");
    console.log("  4. Preview with: pnpm dev\n");
  } catch (err) {
    // Clean up partially-created artifacts
    if (fs.existsSync(postPath)) fs.rmSync(postPath);
    if (fs.existsSync(imgDir)) fs.rmSync(imgDir, { recursive: true });
    throw err;
  }
}

async function updatePost(slug, sourceDir, imgDir, existingPostPath) {
  console.log(`\n🔄 Updating existing post: ${slug}`);

  fs.mkdirSync(imgDir, { recursive: true });

  const existingFiles = getExistingImages(imgDir);
  const allFiles = fs.readdirSync(sourceDir);

  // Filter to supported media, then filter out already-imported files
  const imageFiles = allFiles.filter((f) => {
    if (!IMAGE_EXTS.includes(path.extname(f).toLowerCase())) return false;
    const cleanName = cleanFileName(f);
    const ext = path.extname(f).toLowerCase();
    const targetFile = `${cleanName}${ext === ".heic" ? ".jpg" : ext}`;
    return !existingFiles.has(targetFile);
  }).sort();

  const videoFiles = allFiles.filter((f) => {
    if (!VIDEO_EXTS.includes(path.extname(f).toLowerCase())) return false;
    const videosDir = path.join("public", "assets", "img", slug);
    const cleanName = cleanFileName(f);
    const ext = path.extname(f).toLowerCase();
    const targetFile = `${cleanName}${ext === ".mov" ? ".mp4" : ext}`;
    const targetPath = path.join(videosDir, targetFile);
    return !fs.existsSync(targetPath);
  }).sort();

  if (imageFiles.length === 0 && videoFiles.length === 0) {
    console.log("\n✅ No new files to add. Post is up to date.");
    process.exit(0);
  }

  console.log(`  Found ${imageFiles.length} new image(s) and ${videoFiles.length} new video(s)`);

  const { imageCount, videoCount } = getExistingCounts(existingPostPath);
  let newImportStatements = "";
  let componentUsage = "";

  // Process new images
  if (imageFiles.length > 0) {
    const imgResult = await processImages(imageFiles, sourceDir, imgDir, slug, imageCount + 1);
    newImportStatements += imgResult.importStatements;
    componentUsage += imgResult.mediaUsage;
    console.log(`  ✅ Added ${imgResult.count} new images`);
  }

  // Process new videos
  if (videoFiles.length > 0) {
    if (!checkFfmpeg()) process.exit(1);

    // Ensure BlogVideo import exists in post
    const postContent = fs.readFileSync(existingPostPath, "utf-8");
    if (!postContent.includes("BlogVideo")) {
      newImportStatements += `import BlogVideo from '@/components/BlogVideo.astro';\n`;
    }

    const vidResult = processVideos(videoFiles, sourceDir, slug, videoCount + 1);
    componentUsage += vidResult.mediaUsage;
    console.log(`  ✅ Added ${vidResult.count} new videos`);
  }

  // Insert new imports at the import block (not end of file)
  const postContent = fs.readFileSync(existingPostPath, "utf-8");
  const lines = postContent.split("\n");

  // Find the last import line index
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("import ")) {
      lastImportIndex = i;
    }
  }

  // Insert new imports after the last import
  if (lastImportIndex >= 0 && newImportStatements) {
    lines.splice(lastImportIndex + 1, 0, ...newImportStatements.trimEnd().split("\n"));
  }

  // Write the modified content back + append component usage at end
  fs.writeFileSync(existingPostPath, lines.join("\n"));
  if (componentUsage) {
    fs.appendFileSync(existingPostPath, "\n" + componentUsage);
  }

  console.log("\n🎉 Post updated!");
  console.log("  New imports inserted at import block, component usage appended to end of file.");
  console.log("  You may want to rearrange the new images within the post.\n");
}

// --- CLI Entry Point ---

const folderName = process.argv[2];
if (!folderName) {
  console.error("\n❌ Missing folder name");
  console.log("\nUsage: pnpm post <folder-name>");
  console.log("\nExamples:");
  console.log("  pnpm post cockpit-joinery");
  console.log("  pnpm post cherry-bench-photos");
  console.log("\nThe folder should exist on ~/Desktop/");
  process.exit(1);
}

const slug = deriveSlug(folderName);
const sourceDir = resolveSourceDir(folderName);

if (!sourceDir) {
  console.error("\n❌ Folder not found on Desktop");
  console.log(`\nLooked for:`);
  console.log(`  ~/Desktop/${folderName}/`);
  if (!folderName.endsWith('-photos')) {
    console.log(`  ~/Desktop/${folderName}-photos/`);
  }
  console.log("\nPlease check the folder name and try again.\n");
  process.exit(1);
}

console.log(`  Source: ${sourceDir}`);
console.log(`  Slug:   ${slug}`);

const imgDir = path.join("src", "assets", "img", slug);
const existingPost = findExistingPost(slug);

const run = existingPost
  ? updatePost(slug, sourceDir, imgDir, existingPost)
  : createPost(slug, sourceDir, imgDir);

run.catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
