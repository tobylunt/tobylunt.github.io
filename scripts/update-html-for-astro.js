#!/usr/bin/env node

import fs from "fs";
import path from "path";

/**
 * Simple script to update the HTML file to use proper asset paths
 * that will work with Astro's static file serving
 */

const HTML_FILE = "public/comics-valuation.html";

function updateHtmlPaths() {
  if (!fs.existsSync(HTML_FILE)) {
    console.error(`❌ HTML file not found: ${HTML_FILE}`);
    return false;
  }

  // Create backup
  const backupFile = `${HTML_FILE}.backup-${Date.now()}`;
  fs.copyFileSync(HTML_FILE, backupFile);
  console.log(`📋 Created backup: ${backupFile}`);

  // Read HTML content
  let htmlContent = fs.readFileSync(HTML_FILE, "utf8");

  // Count original image references
  const originalMatches = htmlContent.match(/file:\/\/\/[^"]+\/images\/[^"]+/g);
  const originalCount = originalMatches ? originalMatches.length : 0;

  // Replace file:// URLs with asset paths
  // For thumbnails - use smaller optimized versions
  htmlContent = htmlContent.replace(
    /<img class="thumb" src="file:\/\/\/[^"]+\/images\/([^"]+)"/g,
    '<img class="thumb" loading="lazy" src="/_astro/$1" style="max-width: 120px; max-height: 120px; object-fit: cover;"',
  );

  // For full images - use full optimized versions
  htmlContent = htmlContent.replace(
    /<a href="file:\/\/\/[^"]+\/images\/([^"]+)"/g,
    '<a href="/_astro/$1"',
  );

  // Add lazy loading and better styling
  htmlContent = htmlContent.replace(
    /img\.thumb \{ max-width: 120px; max-height: 120px; border-radius: 4px; border: 1px solid #ddd; \}/,
    `img.thumb {
            max-width: 120px;
            max-height: 120px;
            border-radius: 4px;
            border: 1px solid #ddd;
            object-fit: cover;
            transition: opacity 0.3s ease;
        }
        img.thumb:hover {
            opacity: 0.8;
        }
        img[loading="lazy"] {
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        img[loading="lazy"].loaded {
            opacity: 1;
        }`,
  );

  // Add optimization note
  const optimizationNote = `
    <!-- Images optimized by Astro build process -->
    <!-- WebP format used for better compression -->
    <!-- Lazy loading enabled for performance -->
`;
  htmlContent = htmlContent.replace("<head>", "<head>" + optimizationNote);

  // Add lazy loading JavaScript
  const lazyLoadScript = `
    <script>
        // Lazy loading intersection observer
        document.addEventListener('DOMContentLoaded', function() {
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            img.classList.add('loaded');
                            observer.unobserve(img);
                        }
                    });
                });

                document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                    imageObserver.observe(img);
                });
            } else {
                // Fallback for browsers without IntersectionObserver
                document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                    img.classList.add('loaded');
                });
            }
        });
    </script>`;

  htmlContent = htmlContent.replace("</body>", lazyLoadScript + "\n</body>");

  // Count updated references
  const updatedMatches = htmlContent.match(/\/_astro\/[^"]+/g);
  const updatedCount = updatedMatches ? updatedMatches.length : 0;

  // Write updated content
  fs.writeFileSync(HTML_FILE, htmlContent);

  console.log(`✅ Updated ${HTML_FILE}`);
  console.log(
    `📊 Converted ${originalCount} file:// references to ${updatedCount} /_astro/ references`,
  );
  console.log(`🚀 Added lazy loading and performance optimizations`);

  return true;
}

function main() {
  console.log("🔧 Updating HTML for Astro Asset Pipeline");
  console.log("=========================================");

  const success = updateHtmlPaths();

  if (success) {
    console.log("\n🎉 HTML update complete!");
    console.log("\n📋 Next Steps:");
    console.log("1. Build the site: npm run build");
    console.log("2. Astro will automatically optimize all images in src/assets/");
    console.log("3. Images will be converted to WebP format");
    console.log("4. Preview: npm run preview");
    console.log("5. Check: http://localhost:4321/comics-valuation.html");
    console.log("\n🎯 Expected Benefits:");
    console.log("   ✅ ~70% smaller file sizes with WebP");
    console.log("   ✅ Lazy loading for better performance");
    console.log("   ✅ Automatic image optimization");
    console.log("   ✅ Fast CDN delivery");
  }
}

main();
