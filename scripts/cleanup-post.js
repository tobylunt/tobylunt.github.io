#!/usr/bin/env node

/**
 * Clean up unused images from a blog post's asset directory
 * 
 * Usage:
 *   npm run cleanup-post <post-name> [--dry-run]
 * 
 * Example:
 *   npm run cleanup-post deck-repair
 *   npm run cleanup-post deck-repair --dry-run
 * 
 * The script will:
 *   1. Find the post file (either .md or .mdx)
 *   2. Parse the file for image imports
 *   3. Compare with images in assets directory
 *   4. Delete unused images (or just list them in dry-run mode)
 */

import fs from 'fs';
import path from 'path';

// Parse command line arguments
const postName = process.argv[2];
const isDryRun = process.argv.includes('--dry-run');

if (!postName) {
    console.error('\n❌ Error: Missing post name');
    console.log('\nUsage: npm run cleanup-post <post-name> [--dry-run]');
    console.log('Example: npm run cleanup-post deck-repair --dry-run\n');
    process.exit(1);
}

// Setup paths
const contentDir = path.join('src', 'content', 'post');
const imgDir = path.join('src', 'assets', 'img', postName);

// Find the post file (.md or .mdx)
const mdPath = path.join(contentDir, `${postName}.md`);
const mdxPath = path.join(contentDir, `${postName}.mdx`);
const postPath = fs.existsSync(mdPath) ? mdPath : fs.existsSync(mdxPath) ? mdxPath : null;

if (!postPath) {
    console.error('\n❌ Error: Post not found');
    console.log(`\nCouldn't find post file for: ${postName}`);
    console.log('Looked for:');
    console.log(`- ${mdPath}`);
    console.log(`- ${mdxPath}\n`);
    process.exit(1);
}

if (!fs.existsSync(imgDir)) {
    console.error('\n❌ Error: Image directory not found');
    console.log(`\nCouldn't find image directory: ${imgDir}\n`);
    process.exit(1);
}

try {
    // Read post content
    const postContent = fs.readFileSync(postPath, 'utf8');

    // Find all image imports
    const importRegex = /import\s+(\w+)\s+from\s+['"]@\/assets\/img\/[^'"]+\/([^'"]+)['"]/g;
    const usedImages = new Set();
    let match;

    while ((match = importRegex.exec(postContent)) !== null) {
        usedImages.add(match[2]);
    }

    // Get all images in the directory
    const existingImages = fs.readdirSync(imgDir);
    
    // Find unused images
    const unusedImages = existingImages.filter(img => !usedImages.has(img));

    if (unusedImages.length === 0) {
        console.log('\n✅ No unused images found!\n');
        process.exit(0);
    }

    console.log(`\nFound ${unusedImages.length} unused image${unusedImages.length === 1 ? '' : 's'}:`);
    unusedImages.forEach(img => console.log(`- ${img}`));

    if (isDryRun) {
        console.log('\n📝 Dry run - no files were deleted');
        console.log('Run without --dry-run to delete these files\n');
    } else {
        console.log('\nDeleting unused images...');
        unusedImages.forEach(img => {
            const imgPath = path.join(imgDir, img);
            fs.unlinkSync(imgPath);
            console.log(`✅ Deleted: ${img}`);
        });
        console.log('\n🎉 Cleanup complete!\n');
    }

} catch (error) {
    console.error('\n❌ Error during cleanup:');
    console.error(error.message);
    console.log('\nPlease fix the error and try again.\n');
    process.exit(1);
}
