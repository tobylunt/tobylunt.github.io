#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Script to update image URLs in the comics valuation HTML report
 * Converts local file:// URLs to web-accessible URLs
 */

const HTML_FILE = 'public/comics-valuation.html';
const BASE_IMAGE_URL = '/comics-images/'; // Local path for Git LFS images

function extractImagePaths(htmlContent) {
    const imageRegex = /file:\/\/\/[^"]+\/images\/([^"]+)/g;
    const imagePaths = new Set();
    let match;

    while ((match = imageRegex.exec(htmlContent)) !== null) {
        imagePaths.add(match[1]); // Extract just the filename
    }

    return Array.from(imagePaths).sort();
}

function updateImageUrls(htmlContent, baseUrl) {
    // Replace file:// URLs with web URLs
    const updatedContent = htmlContent.replace(
        /file:\/\/\/[^"]+\/images\/([^"]+)/g,
        `${baseUrl}$1`
    );

    return updatedContent;
}

function generateImageList(imagePaths) {
    const listContent = imagePaths.map(path => `${BASE_IMAGE_URL}${path}`).join('\n');
    fs.writeFileSync('image-urls.txt', listContent);
    console.log(`✅ Generated image-urls.txt with ${imagePaths.length} image URLs`);
}

function main() {
    try {
        if (!fs.existsSync(HTML_FILE)) {
            console.error(`❌ File not found: ${HTML_FILE}`);
            process.exit(1);
        }

        const htmlContent = fs.readFileSync(HTML_FILE, 'utf8');
        console.log(`📖 Reading ${HTML_FILE}...`);

        // Extract all unique image paths
        const imagePaths = extractImagePaths(htmlContent);
        console.log(`🔍 Found ${imagePaths.length} unique images:`);
        imagePaths.forEach(path => console.log(`  - ${path}`));

        // Generate list of image URLs for upload reference
        generateImageList(imagePaths);

        // Ready to update with local path
        console.log(`\n📁 Using local image path: ${BASE_IMAGE_URL}`);

        // Only update if --update flag is provided
        if (process.argv.includes('--update')) {
            const updatedContent = updateImageUrls(htmlContent, BASE_IMAGE_URL);

            // Backup original file
            const backupFile = `${HTML_FILE}.backup`;
            fs.copyFileSync(HTML_FILE, backupFile);
            console.log(`📋 Created backup: ${backupFile}`);

            // Write updated content
            fs.writeFileSync(HTML_FILE, updatedContent);
            console.log(`✅ Updated ${HTML_FILE} with new image URLs`);
            console.log(`🔗 Base URL: ${BASE_IMAGE_URL}`);
        } else {
            console.log('\n💡 To update the HTML file, run: node scripts/update-image-urls.js --update');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
