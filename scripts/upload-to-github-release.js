#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to upload comic images to GitHub Releases
 * This creates a release and uploads images in batches to avoid hitting API limits
 */

const GITHUB_OWNER = 'tobylunt';
const GITHUB_REPO = 'tobylunt.github.io';
const RELEASE_TAG = 'comics-images-v1.0';
const RELEASE_NAME = 'Comics Valuation Images';
const BATCH_SIZE = 20; // Upload 20 images per batch to avoid rate limits

// You'll need to set this as an environment variable: GITHUB_TOKEN
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
    console.error('❌ Please set GITHUB_TOKEN environment variable');
    console.error('   Create a token at: https://github.com/settings/tokens');
    console.error('   Grant "repo" permissions');
    console.error('   Then run: export GITHUB_TOKEN=your_token_here');
    process.exit(1);
}

async function githubApiCall(endpoint, options = {}) {
    const url = `https://api.github.com${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'comics-uploader',
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return response.json();
}

async function createRelease() {
    console.log('🚀 Creating GitHub release...');

    try {
        const release = await githubApiCall(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tag_name: RELEASE_TAG,
                name: RELEASE_NAME,
                body: `Images for the comics valuation report.\nContains JPEG images for comic book collection.\n\nTotal images: ${getImageCount()}\nGenerated: ${new Date().toISOString()}`,
                draft: false,
                prerelease: false
            })
        });

        console.log(`✅ Release created: ${release.html_url}`);
        return release;
    } catch (error) {
        if (error.message.includes('422')) {
            console.log('📋 Release already exists, fetching existing release...');
            const releases = await githubApiCall(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`);
            const existingRelease = releases.find(r => r.tag_name === RELEASE_TAG);
            if (existingRelease) {
                console.log(`✅ Using existing release: ${existingRelease.html_url}`);
                return existingRelease;
            }
        }
        throw error;
    }
}

async function uploadAsset(release, filePath, fileName) {
    const uploadUrl = release.upload_url.replace('{?name,label}', '');
    const fileBuffer = fs.readFileSync(filePath);

    console.log(`📤 Uploading ${fileName}...`);

    const response = await fetch(`${uploadUrl}?name=${fileName}`, {
        method: 'POST',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'image/jpeg',
            'Content-Length': fileBuffer.length.toString()
        },
        body: fileBuffer
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed for ${fileName}: ${response.status} ${error}`);
    }

    const asset = await response.json();
    console.log(`✅ Uploaded: ${asset.browser_download_url}`);
    return asset;
}

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

function getImageCount() {
    return getImagePaths().length;
}

function findImageFiles(imageDir) {
    if (!fs.existsSync(imageDir)) {
        console.error(`❌ Image directory not found: ${imageDir}`);
        console.error('   Please specify the correct path to your images folder');
        process.exit(1);
    }

    const imagePaths = getImagePaths();
    const foundImages = [];
    const missingImages = [];

    for (const imageName of imagePaths) {
        const fullPath = path.join(imageDir, imageName);
        if (fs.existsSync(fullPath)) {
            foundImages.push(fullPath);
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

    console.log(`📁 Found ${foundImages.length}/${imagePaths.length} images in ${imageDir}`);
    return foundImages;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadImages(release, imagePaths) {
    console.log(`📦 Uploading ${imagePaths.length} images in batches of ${BATCH_SIZE}...`);

    const batches = [];
    for (let i = 0; i < imagePaths.length; i += BATCH_SIZE) {
        batches.push(imagePaths.slice(i, i + BATCH_SIZE));
    }

    const uploadedAssets = [];
    let totalUploaded = 0;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`\n📦 Batch ${i + 1}/${batches.length} (${batch.length} images):`);

        for (const imagePath of batch) {
            const fileName = path.basename(imagePath);

            try {
                const asset = await uploadAsset(release, imagePath, fileName);
                uploadedAssets.push(asset);
                totalUploaded++;
            } catch (error) {
                console.error(`❌ Failed to upload ${fileName}: ${error.message}`);
            }

            // Rate limiting: wait between uploads
            await sleep(1000);
        }

        // Longer pause between batches
        if (i < batches.length - 1) {
            console.log('⏳ Waiting 10 seconds before next batch...');
            await sleep(10000);
        }
    }

    console.log(`\n🎉 Upload complete! ${totalUploaded}/${imagePaths.length} images uploaded`);
    return uploadedAssets;
}

function generateUpdatedScript(assets) {
    const baseUrl = assets[0].browser_download_url.replace(/\/[^\/]+$/, '/');

    const updatedScript = `
// Update BASE_IMAGE_URL in scripts/update-image-urls.js:
const BASE_IMAGE_URL = '${baseUrl}';

// Then run: node scripts/update-image-urls.js --update
`;

    fs.writeFileSync('github-release-urls.txt', updatedScript);
    console.log('📝 Next steps saved to: github-release-urls.txt');
}

async function main() {
    const imageDir = process.argv[2];

    if (!imageDir) {
        console.error('Usage: node scripts/upload-to-github-release.js <path-to-images-directory>');
        console.error('Example: node scripts/upload-to-github-release.js /Users/tobiaslunt/code/comics-valuation/images');
        process.exit(1);
    }

    try {
        console.log('🎯 GitHub Release Image Uploader');
        console.log('================================');

        // Find all image files
        const imagePaths = findImageFiles(imageDir);

        if (imagePaths.length === 0) {
            console.error('❌ No images found to upload');
            process.exit(1);
        }

        // Confirm before proceeding
        console.log(`\n⚠️  About to upload ${imagePaths.length} images to GitHub Release`);
        console.log(`   Repository: ${GITHUB_OWNER}/${GITHUB_REPO}`);
        console.log(`   Release tag: ${RELEASE_TAG}`);
        console.log('');

        if (!process.argv.includes('--confirm')) {
            console.log('💡 Add --confirm flag to proceed with upload');
            console.log('   Example: node scripts/upload-to-github-release.js /path/to/images --confirm');
            return;
        }

        // Create release
        const release = await createRelease();

        // Upload images
        const assets = await uploadImages(release, imagePaths);

        if (assets.length > 0) {
            generateUpdatedScript(assets);
            console.log(`\n🔗 Images available at: ${release.html_url}`);
            console.log('📋 Next: Update your HTML file with the new URLs');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();
