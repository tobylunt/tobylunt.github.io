# Unified Post Script Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `new-post.js` with a unified `post.js` that creates new blog posts OR updates existing ones with new images from a Desktop folder.

**Architecture:** Single Node.js CLI script (`scripts/post.js`) that resolves a Desktop folder, determines post slug, detects create vs update mode, processes images/videos, and generates/appends MDX content. Reuses all existing conversion logic (HEIC→JPEG, MOV→MP4, filename cleaning).

**Tech Stack:** Node.js (ESM), heic-convert, ffmpeg (external), fs/path stdlib

---

### Task 1: Create `scripts/post.js` with folder resolution and mode detection

**Files:**
- Create: `scripts/post.js`

**Step 1: Write the script with CLI parsing, folder resolution, and mode detection**

The script should:
- Accept `<folder-name>` as argv[2]
- Derive post slug by stripping `-photos` suffix if present
- Resolve Desktop folder: try exact name first, then `{name}-photos` fallback
- Detect create vs update mode by checking if post file exists
- Print clear status messages

```js
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
import { fileURLToPath } from "url";
import heicConvert from "heic-convert";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);

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
  try {
    spawnSync("ffmpeg", ["-version"]);
    return true;
  } catch (error) {
    console.error("\n❌ Error: ffmpeg is not installed");
    console.log("\nPlease install ffmpeg to enable video conversion:");
    console.log("  brew install ffmpeg");
    return false;
  }
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
 * Get set of cleaned filenames already in the image directory.
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

    const varName = cleanName;
    importStatements += `import ${varName} from '@/assets/img/${slug}/${targetFile}';\n`;
    mediaUsage += `
<CaptionedImage
    src={${varName}}
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

  return { mediaUsage, count: files.length };
}

async function createPost(slug, sourceDir, imgDir) {
  console.log(`\n📝 Creating new post: ${slug}`);

  fs.mkdirSync(imgDir, { recursive: true });
  console.log(`  Created image directory: ${imgDir}`);

  const allFiles = fs.readdirSync(sourceDir);
  const imageFiles = allFiles.filter((f) => IMAGE_EXTS.includes(path.extname(f).toLowerCase()));
  const videoFiles = allFiles.filter((f) => VIDEO_EXTS.includes(path.extname(f).toLowerCase()));

  if (imageFiles.length === 0 && videoFiles.length === 0) {
    console.warn("\n⚠️  No image or video files found in source directory");
    console.log(`  Source: ${sourceDir}\n`);
    process.exit(0);
  }

  const hasVideos = videoFiles.length > 0;
  const postPath = path.join("src", "content", "post", `${slug}.mdx`);
  const postDate = new Date().toISOString().split("T")[0];

  let content = `---
title: "${slug.replace(/-/g, " ")}"
description: "This is a placeholder description that meets the minimum length requirement. Please replace with actual content."
publishDate: "${postDate}"
tags: ["ariadne"]
draft: true
---
import { Image } from 'astro:assets';
import CaptionedImage from '../../components/CaptionedImage.astro';\n`;

  if (hasVideos) {
    content += `import BlogVideo from '../../components/BlogVideo.astro';\n`;
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
  });

  const videoFiles = allFiles.filter((f) => {
    if (!VIDEO_EXTS.includes(path.extname(f).toLowerCase())) return false;
    // Check public video dir for existing videos
    const videosDir = path.join("public", "assets", "img", slug);
    const cleanName = cleanFileName(f);
    const ext = path.extname(f).toLowerCase();
    const targetFile = `${cleanName}${ext === ".mov" ? ".mp4" : ext}`;
    const targetPath = path.join(videosDir, targetFile);
    return !fs.existsSync(targetPath);
  });

  if (imageFiles.length === 0 && videoFiles.length === 0) {
    console.log("\n✅ No new files to add. Post is up to date.");
    process.exit(0);
  }

  console.log(`  Found ${imageFiles.length} new image(s) and ${videoFiles.length} new video(s)`);

  const { imageCount, videoCount } = getExistingCounts(existingPostPath);
  let appendContent = "";

  // Process new images
  if (imageFiles.length > 0) {
    const imgResult = await processImages(imageFiles, sourceDir, imgDir, slug, imageCount + 1);
    appendContent += "\n" + imgResult.importStatements + imgResult.mediaUsage;
    console.log(`  ✅ Added ${imgResult.count} new images`);
  }

  // Process new videos
  if (videoFiles.length > 0) {
    if (!checkFfmpeg()) process.exit(1);

    // Ensure BlogVideo import exists in post
    const postContent = fs.readFileSync(existingPostPath, "utf-8");
    if (!postContent.includes("BlogVideo")) {
      // Insert BlogVideo import after CaptionedImage import
      const captionedImportLine = "import CaptionedImage from '../../components/CaptionedImage.astro';";
      const blogVideoImport = `\nimport BlogVideo from '../../components/BlogVideo.astro';`;
      const updatedContent = postContent.replace(
        captionedImportLine,
        captionedImportLine + blogVideoImport
      );
      fs.writeFileSync(existingPostPath, updatedContent);
    }

    const vidResult = processVideos(videoFiles, sourceDir, slug, videoCount + 1);
    appendContent += vidResult.mediaUsage;
    console.log(`  ✅ Added ${vidResult.count} new videos`);
  }

  fs.appendFileSync(existingPostPath, appendContent);
  console.log("\n🎉 Post updated!");
  console.log("  New content appended to end of file.");
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
  if (folderName !== `${folderName}-photos`) {
    console.log(`  ~/Desktop/${folderName}-photos/`);
  }
  console.log("\nPlease check the folder name and try again.\n");
  process.exit(1);
}

console.log(`  Source: ${sourceDir}`);
console.log(`  Slug:   ${slug}`);

const imgDir = path.join("src", "assets", "img", slug);
const existingPost = findExistingPost(slug);

if (existingPost) {
  updatePost(slug, sourceDir, imgDir, existingPost);
} else {
  createPost(slug, sourceDir, imgDir);
}
```

**Step 2: Verify script parses correctly**

Run: `node --check scripts/post.js`
Expected: No output (clean parse)

**Step 3: Commit**

```bash
git add scripts/post.js
git commit -m "feat: add unified post.js script for creating and updating blog posts"
```

---

### Task 2: Register the script in package.json

**Files:**
- Modify: `package.json:13` (scripts section)

**Step 1: Add the `post` script**

Add `"post": "node scripts/post.js"` to the scripts object in `package.json`, after the existing `new-post` entry.

**Step 2: Verify scripts are recognized**

Run: `pnpm post --help 2>&1 || true`
Expected: Shows the "Missing folder name" error with usage info (confirms the script is wired up)

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add 'pnpm post' script alias"
```

---

### Task 3: Test create mode with a real Desktop folder

**Step 1: Pick a Desktop folder that doesn't have an existing post**

Run: `ls ~/Desktop/ | head -20` and pick one that isn't already in `src/content/post/`.

**Step 2: Run create mode**

Run: `pnpm post <chosen-folder>`
Expected:
- Creates `src/content/post/{slug}.mdx` with frontmatter, imports, CaptionedImage components
- Creates `src/assets/img/{slug}/` with copied/converted images
- Prints success message

**Step 3: Verify the generated post**

- Check that the MDX file has valid frontmatter
- Check that all images from the Desktop folder are present in the asset directory
- Run `pnpm dev` briefly to confirm no build errors

**Step 4: Commit the new post**

```bash
git add src/content/post/{slug}.mdx src/assets/img/{slug}/
git commit -m "content: add draft post {slug}"
```

---

### Task 4: Test update mode

**Step 1: Verify update mode detects no new files**

Run: `pnpm post <same-folder-from-task-3>`
Expected: "No new files to add. Post is up to date."

**Step 2: Add a test image to the Desktop folder**

Copy any image into `~/Desktop/<folder>/` to simulate adding a new photo.

**Step 3: Run update mode with a new image**

Run: `pnpm post <same-folder>`
Expected:
- Reports 1 new image found
- Copies only the new image
- Appends import + CaptionedImage to end of MDX
- Existing content is untouched

**Step 4: Verify the update**

- Check that the new image is in `src/assets/img/{slug}/`
- Check that the MDX has the new import appended at the end
- Check that existing imports/content are unchanged

**Step 5: Commit**

```bash
git add -A
git commit -m "test: verify update mode works correctly"
```

---

### Task 5: Create remaining draft posts from Desktop folders

**Step 1: Identify all Desktop folders that should become posts**

Compare Desktop folders against existing posts in `src/content/post/` to find ones that need creation.

**Step 2: Run `pnpm post` for each new folder**

Process each folder, verifying output as you go.

**Step 3: Commit all new posts**

```bash
git add src/content/post/ src/assets/img/ public/assets/img/
git commit -m "content: add draft posts from Desktop folders"
```
