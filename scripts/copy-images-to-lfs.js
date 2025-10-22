#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to copy comic images to the Git LFS directory
 * This copies images from the original project to public/comics-images/
 */

const DEST_DIR = 'public/comics-images';
const BATCH_SIZE = 10; // Copy in small batches to avoid overwhelming the system

function getImagePaths() {
    const imageListFile = 'image-urls.txt';
    if (!fs.existsSync(imageListFile)) {
        console.error(`❌ ${imageListFile} not found. Run update-image-urls.js first.`);
        process.exit(1);
    }

    const content = fs.readFileSync(imageListFile, 'utf8');
    return content.split('\n')
        .filter(line => line.trim())
        .map(url => path.basename(url));
}

function findSourceImages(sourceDir) {
    if (!fs.existsSync(sourceDir)) {
        console.error(`❌ Source directory not found: ${sourceDir}`);
        console.error('   Please specify the correct path to your images folder');
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
        missingImages.slice(0, 5).forEach(img => console.warn(`   - ${img}`));
        if (missingImages.length > 5) {
            console.warn(`   ... and ${missingImages.length - 5} more`);
        }
    }

    console.log(`📁 Found ${foundImages.length}/${imagePaths.length} images in ${sourceDir}`);
    return foundImages;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function calculateTotalSize(images) {
    let totalSize = 0;
    for (const image of images) {
        const stats = fs.statSync(image.source);
        totalSize += stats.size;
    }
    return totalSize;
}

function copyImage(source, destination) {
    try {
        fs.copyFileSync(source, destination);
        const stats = fs.statSync(destination);
        return stats.size;
    } catch (error) {
        throw new Error(`Failed to copy ${path.basename(source)}: ${error.message}`);
    }
}

function copyImagesInBatches(images, destDir) {
    console.log(`📦 Copying ${images.length} images to ${destDir}...`);

    // Ensure destination directory exists
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        console.log(`📁 Created directory: ${destDir}`);
    }

    const batches = [];
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
        batches.push(images.slice(i, i + BATCH_SIZE));
    }

    let totalCopied = 0;
    let totalBytes = 0;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`\n📦 Batch ${i + 1}/${batches.length} (${batch.length} images):`);

        for (const image of batch) {
            const destPath = path.join(destDir, image.name);

            // Skip if already exists and same size
            if (fs.existsSync(destPath)) {
                const sourceStats = fs.statSync(image.source);
                const destStats = fs.statSync(destPath);
                if (sourceStats.size === destStats.size) {
                    console.log(`⏭️  Skipping ${image.name} (already exists)`);
                    totalCopied++;
                    totalBytes += destStats.size;
                    continue;
                }
            }

            try {
                const copiedBytes = copyImage(image.source, destPath);
                console.log(`✅ Copied ${image.name} (${formatBytes(copiedBytes)})`);
                totalCopied++;
                totalBytes += copiedBytes;
            } catch (error) {
                console.error(`❌ ${error.message}`);
            }
        }

        // Show progress
        const progress = ((i + 1) / batches.length * 100).toFixed(1);
        console.log(`📊 Progress: ${progress}% (${totalCopied} files, ${formatBytes(totalBytes)})`);
    }

    console.log(`\n🎉 Copy complete! ${totalCopied}/${images.length} images copied`);
    console.log(`📊 Total size: ${formatBytes(totalBytes)}`);

    return totalCopied;
}

function checkLFSSetup() {
    if (!fs.existsSync('.gitattributes')) {
        console.error('❌ .gitattributes not found. Git LFS not set up.');
        console.error('   Run: git lfs track "public/comics-images/*.jpeg"');
        process.exit(1);
    }

    const gitattributes = fs.readFileSync('.gitattributes', 'utf8');
    if (!gitattributes.includes('public/comics-images/*.jpeg')) {
        console.error('❌ Git LFS not configured for comics images.');
        console.error('   Run: git lfs track "public/comics-images/*.jpeg"');
        process.exit(1);
    }

    console.log('✅ Git LFS is properly configured');
}

function showNextSteps(copiedCount) {
    if (copiedCount === 0) return;

    console.log('\n📋 Next Steps:');
    console.log('1. Update HTML file with new image URLs:');
    console.log('   node scripts/update-image-urls.js --update');
    console.log('');
    console.log('2. Commit images to Git LFS:');
    console.log('   git add .gitattributes public/comics-images/');
    console.log('   git commit -m "Add comics images with Git LFS"');
    console.log('');
    console.log('3. Push to GitHub:');
    console.log('   git push origin main');
    console.log('');
    console.log('⚠️  Note: This will use Git LFS bandwidth. Check your quotas at:');
    console.log('   https://github.com/settings/billing');
}

function main() {
    const sourceDir = process.argv[2];

    if (!sourceDir) {
        console.error('Usage: node scripts/copy-images-to-lfs.js <path-to-source-images-directory>');
        console.error('Example: node scripts/copy-images-to-lfs.js /Users/tobiaslunt/code/comics-valuation/images');
        process.exit(1);
    }

    try {
        console.log('🖼️  Comics Images LFS Setup');
        console.log('===========================');

        // Check Git LFS setup
        checkLFSSetup();

        // Find source images
        const images = findSourceImages(sourceDir);

        if (images.length === 0) {
            console.error('❌ No images found to copy');
            process.exit(1);
        }

        // Calculate total size
        const totalSize = calculateTotalSize(images);
        console.log(`📊 Total size to copy: ${formatBytes(totalSize)}`);

        if (totalSize > 1024 * 1024 * 1024) { // 1GB
            console.warn('⚠️  Warning: Images exceed 1GB - this will use your Git LFS quota');
        }

        // Confirm before proceeding
        if (!process.argv.includes('--confirm')) {
            console.log(`\n⚠️  About to copy ${images.length} images (${formatBytes(totalSize)}) to Git LFS`);
            console.log('💡 Add --confirm flag to proceed');
            console.log(`   Example: node scripts/copy-images-to-lfs.js "${sourceDir}" --confirm`);
            return;
        }

        // Copy images
        const copiedCount = copyImagesInBatches(images, DEST_DIR);

        // Show next steps
        showNextSteps(copiedCount);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
