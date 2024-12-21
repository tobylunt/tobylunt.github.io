#!/usr/bin/env node

/**
 * Create a new blog post with images and videos
 * 
 * Usage:
 *   npm run new-post <post-name>
 * 
 * Example:
 *   npm run new-post deck-repair
 * 
 * Requirements:
 *   - Create a folder on your Desktop named "<post-name>-photos"
 *   - Add your images and videos to this folder before running the script
 *   - Supported image formats: .jpg, .jpeg, .png, .gif, .webp, .heic
 *   - Supported video formats: .mp4, .webm, .mov
 *   - HEIC files will be automatically converted to JPEG
 * 
 * The script will:
 *   1. Create a new post file in src/content/post/ (.mdx if videos present)
 *   2. Create an image directory in src/assets/img/
 *   3. Copy media from Desktop folder to appropriate locations
 *   4. Generate imports and components in the post
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const heicConvert = require('heic-convert');
const { promisify } = require('util');
const { spawnSync } = require('child_process');

// Add this function near the top of the file
function cleanFileName(fileName) {
    // Remove the file extension
    const name = path.parse(fileName).name;
    
    // Replace special characters and numbers with descriptive names
    return name
        // Ensure the name starts with a letter
        .replace(/^[^a-zA-Z]+/, 'img_')
        // Convert iPhone photo format to something readable
        .replace(/^\d+__/, 'photo_')
        // Replace special characters with underscores
        .replace(/[^a-zA-Z0-9]/g, '_')
        // Convert to lowercase
        .toLowerCase()
        // Remove consecutive underscores
        .replace(/_+/g, '_')
        // Remove leading/trailing underscores
        .replace(/^_+|_+$/g, '');
}

// Add a function to check if ffmpeg is installed
function checkFfmpeg() {
    try {
        spawnSync('ffmpeg', ['-version']);
        return true;
    } catch (error) {
        console.error('\n❌ Error: ffmpeg is not installed');
        console.log('\nPlease install ffmpeg to enable video conversion:');
        console.log('  brew install ffmpeg');
        return false;
    }
}

// Wrap the main logic in an async function
async function main() {
    try {
        // Create image directory
        fs.mkdirSync(imgDir, { recursive: true });
        console.log(`\n✅ Created image directory: ${imgDir}`);

        // Process files
        const files = fs.readdirSync(sourceDir);
        
        if (files.length === 0) {
            console.warn('\n⚠️  Warning: No files found in source directory');
            console.log(`Source directory is empty: ${sourceDir}\n`);
            process.exit(0);
        }

        // Separate images and videos
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'].includes(ext);
        });

        const videoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.mp4', '.webm', '.mov'].includes(ext);
        });

        // Determine file extension based on content
        const hasVideos = videoFiles.length > 0;
        const postPath = path.join('src', 'content', 'post', `${postName}.mdx`);

        // Create initial content with appropriate imports
        let initialContent = `---
title: "${postName.replace(/-/g, ' ')}"
description: "This is a placeholder description that meets the minimum length requirement. Please replace with actual content."
publishDate: "${postDate}"
tags: ["ariadne"]
draft: true
---
import { Image } from 'astro:assets';
import CaptionedImage from '../../components/CaptionedImage.astro';\n`;

        // Add BlogVideo import if needed
        if (hasVideos) {
            initialContent += `import BlogVideo from '../../components/BlogVideo.astro';\n`;
        }
        
        fs.writeFileSync(postPath, initialContent);
        console.log(`✅ Created ${hasVideos ? 'MDX' : 'MD'} post file: ${postPath}`);

        let importStatements = '';
        let mediaUsage = '';
        let imageCounter = 1;
        let videoCounter = 1;

        // Process images
        for (const file of imageFiles) {
            const ext = path.extname(file).toLowerCase();
            const cleanName = cleanFileName(file);
            const isHeic = ext === '.heic';
            
            // Determine target filename (convert HEIC to JPG)
            const targetFile = `${cleanName}${isHeic ? '.jpg' : ext}`;
            const targetPath = path.join(imgDir, targetFile);
            
            if (isHeic) {
                // Convert HEIC to JPEG
                console.log(`Converting ${file} to JPEG...`);
                const inputBuffer = fs.readFileSync(path.join(sourceDir, file));
                const outputBuffer = await heicConvert({
                    buffer: inputBuffer,
                    format: 'JPEG',
                    quality: 0.9
                });
                fs.writeFileSync(targetPath, outputBuffer);
            } else {
                // Copy non-HEIC files directly
                fs.copyFileSync(path.join(sourceDir, file), targetPath);
            }
            
            // Generate import and usage statements with proper formatting
            const varName = cleanName;
            importStatements += `import ${varName} from '@/assets/img/${postName}/${targetFile}';\n`;
            mediaUsage += `
<CaptionedImage
    src={${varName}}
    alt="Image ${imageCounter}"
    caption="Image ${imageCounter} - Description needed"
/>\n\n`;
            
            imageCounter++;
        }

        // Process videos
        if (hasVideos) {
            // Check for ffmpeg before processing videos
            if (!checkFfmpeg()) {
                process.exit(1);
            }

            // Create videos directory with post-specific subfolder
            const videosDir = path.join('public', 'assets', 'img', postName);  // Match BlogVideo.astro path
            fs.mkdirSync(videosDir, { recursive: true });

            for (const file of videoFiles) {
                const ext = path.extname(file).toLowerCase();
                const cleanName = cleanFileName(file);
                const isMovFile = ext === '.mov';
                
                // Determine target filename
                const targetFile = `${cleanName}${isMovFile ? '.mp4' : ext}`;
                const targetPath = path.join(videosDir, targetFile);

                if (isMovFile) {
                    // Convert MOV to MP4
                    console.log(`Converting ${file} to MP4...`);
                    const result = spawnSync('ffmpeg', [
                        '-i', path.join(sourceDir, file),  // Input file
                        '-c:v', 'libx264',                 // Video codec
                        '-c:a', 'aac',                     // Audio codec
                        '-strict', 'experimental',          // Allow experimental features
                        '-b:a', '192k',                    // Audio bitrate
                        '-movflags', '+faststart',         // Enable fast start for web playback
                        targetPath                         // Output file
                    ]);

                    if (result.error || result.status !== 0) {
                        console.error(`\n❌ Error converting ${file}`);
                        console.error(result.stderr?.toString());
                        continue;
                    }
                } else {
                    // Copy non-MOV files directly
                    fs.copyFileSync(path.join(sourceDir, file), targetPath);
                }
                
                // Update video component with sequential numbering
                mediaUsage += `
<BlogVideo 
    src="${postName}/${targetFile}" 
    comment="Video ${videoCounter} - Description needed" 
/>\n\n`;

                videoCounter++;
            }
        }

        // Append to post file
        fs.appendFileSync(postPath, '\n' + importStatements + mediaUsage);

        console.log(`✅ Copied ${imageFiles.length} images`);
        if (hasVideos) {
            console.log(`✅ Copied ${videoFiles.length} videos to public/videos/`);
        }
        console.log(`✅ Generated import statements and media components`);
        console.log('\n🎉 Post creation complete!');
        console.log('\nNext steps:');
        console.log('1. Add a description (50-160 chars) in the frontmatter');
        console.log('2. Add alt text for each image');
        console.log('3. Start writing your post content');
        console.log('\nYou can preview your post by running:');
        console.log('npm run dev\n');

    } catch (error) {
        console.error('\n❌ Error during post creation:');
        console.error(error.message);
        console.log('\nPlease fix the error and try again.\n');
        
        // Cleanup any partially created files
        try {
            if (fs.existsSync(imgDir)) fs.rmSync(imgDir, { recursive: true });
            if (fs.existsSync(postPath)) fs.unlinkSync(postPath);
            console.log('Cleaned up partial files.');
        } catch (cleanupError) {
            console.error('Failed to clean up partial files:', cleanupError.message);
        }
        
        process.exit(1);
    }
}

// Move all the validation code outside the main function
const postName = process.argv[2];
if (!postName) {
    console.error('\n❌ Error: Missing post name');
    console.log('\nUsage: npm run new-post <post-name>');
    console.log('Example: npm run new-post deck-repair\n');
    process.exit(1);
}

// Setup paths
const postDate = new Date().toISOString().split('T')[0];
const sourceDir = path.join(process.env.HOME, 'Desktop', `${postName}-photos`);
const imgDir = path.join('src', 'assets', 'img', postName);

// Validate source directory exists
if (!fs.existsSync(sourceDir)) {
    console.error('\n❌ Error: Image source directory not found');
    console.log(`\nExpected to find photos at: ${sourceDir}`);
    console.log('\nPlease create a folder on your Desktop named:');
    console.log(`"${postName}-photos"\n`);
    console.log('And add your images and videos there before running this command.\n');
    process.exit(1);
}

// Check if post already exists
if (fs.existsSync(imgDir)) {
    console.error('\n❌ Error: Post already exists');
    console.log(`\nFound existing post at: ${imgDir}`);
    console.log('Please choose a different post name or delete the existing post.\n');
    process.exit(1);
}

main();
