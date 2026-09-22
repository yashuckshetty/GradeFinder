const { chromium } = require('../frontend/node_modules/@playwright/test');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.join(__dirname, '..', 'docs', 'screenshots');
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

async function run() {
  console.log('Launching browser for comprehensive evidence capture...');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // ─────────────────────────────────────────────────────────────
  // 1. Error State: Malformed GPX Upload
  // ─────────────────────────────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');

    console.log('1. Testing Malformed GPX upload error...');
    const malformedPath = path.join(__dirname, '..', 'fixtures', 'malformed.gpx');
    await page.setInputFiles('input[type="file"]', malformedPath);

    const errorContainer = page.locator('.error-container');
    await errorContainer.waitFor({ state: 'visible', timeout: 8000 });
    const errorText = await errorContainer.innerText();
    console.log('Malformed Error Container Text:\n', errorText);

    const screenshotPath = path.join(screenshotsDir, 'malformed_upload_error.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Saved screenshot:', screenshotPath);
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Error State: Oversized File Upload (> 10MB)
  // ─────────────────────────────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');

    console.log('2. Testing Oversized GPX upload error...');
    const oversizedPath = path.join(__dirname, '..', 'fixtures', 'oversized.gpx');
    await page.setInputFiles('input[type="file"]', oversizedPath);

    const errorContainer = page.locator('.error-container');
    await errorContainer.waitFor({ state: 'visible', timeout: 8000 });
    const errorText = await errorContainer.innerText();
    console.log('Oversized Error Container Text:\n', errorText);

    const screenshotPath = path.join(screenshotsDir, 'oversized_upload_error.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Saved screenshot:', screenshotPath);
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Alternate Maxima: Tie Route UI Surfacing
  // ─────────────────────────────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');

    console.log('3. Testing Alternate Maxima tie detection via UI upload...');
    const tiePath = path.join(__dirname, '..', 'fixtures', 'tie-route.gpx');
    await page.setInputFiles('input[type="file"]', tiePath);

    // Wait for analysis page to load
    await page.waitForURL(/\/analyze\//, { timeout: 12000 });
    await page.waitForSelector('.card', { timeout: 8000 });

    const tieCard = page.locator('text=Alternate Maximum Detected');
    await tieCard.waitFor({ state: 'visible', timeout: 8000 });
    const tieCardContainer = page.locator('.card').filter({ hasText: 'Alternate Maximum Detected' });
    const tieCardText = await tieCardContainer.innerText();
    console.log('Alternate Maxima Card Text:\n', tieCardText);

    const screenshotPath = path.join(screenshotsDir, 'alternate_maxima_card.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Saved screenshot:', screenshotPath);
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Accessible Text Verification (Screen Reader Section)
  // ─────────────────────────────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto('http://127.0.0.1:5173/analyze/multi-climb');
    await page.waitForSelector('.card');

    console.log('4. Verifying Accessible Route Summary Section...');
    const accessibleSection = page.locator('section[aria-label="Accessible Route Climb and Recovery Summary"]');
    await accessibleSection.waitFor({ state: 'visible', timeout: 8000 });
    const a11yText = await accessibleSection.innerText();
    console.log('\n================ ACCESSIBLE TEXT DUMP ================');
    console.log(a11yText);
    console.log('======================================================\n');
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────
  // 5. 3D Terrain Features (Exaggeration Slider & Focus Button)
  // ─────────────────────────────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto('http://127.0.0.1:5173/analyze/multi-climb');
    await page.waitForSelector('.card');

    console.log('5. Switching to 3D Terrain tab...');
    await page.click('button:has-text("3D Terrain")');
    await page.waitForSelector('#exaggeration-slider');

    // Adjust exaggeration slider to 4.0x
    await page.evaluate(() => {
      const slider = document.querySelector('#exaggeration-slider');
      if (slider) {
        slider.value = '4';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Click focus on hardest section button
    console.log('Clicking Focus on Hardest Section button...');
    const focusBtn = page.locator('button:has-text("Focus on Hardest Section")');
    await focusBtn.click();
    await page.waitForTimeout(1000);

    const screenshotPath = path.join(screenshotsDir, '3d_terrain_controls.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Saved screenshot:', screenshotPath);
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Mobile / Low-Power Degradation Test (Width < 768px)
  // ─────────────────────────────────────────────────────────────
  {
    console.log('6. Testing Mobile/Low-Power Degradation fallback at 375x667 (iPhone SE)...');
    const page = await browser.newPage({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });
    await page.goto('http://127.0.0.1:5173/analyze/multi-climb');
    await page.waitForSelector('.card');

    // 1. Assert default view on mobile is 2D Profile
    const chart = page.locator('.recharts-responsive-container');
    await chart.waitFor({ state: 'visible', timeout: 5000 });
    console.log('Confirmed: Mobile viewport (<768px) defaults to 2D elevation profile per Section 12.');

    // 2. Switch to 3D Terrain tab on mobile
    await page.click('button:has-text("3D Terrain")');
    const fallbackBanner = page.locator('text=Low-Power / Mobile Mode Active');
    await fallbackBanner.waitFor({ state: 'visible', timeout: 5000 });
    const bannerText = await page.locator('.fallback-banner').innerText();
    console.log('Mobile Low-Power Banner Text:\n', bannerText);

    const screenshotPath = path.join(screenshotsDir, 'mobile_lowpower_degradation.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Saved screenshot:', screenshotPath);
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────
  // 7. Route Comparison with Custom Uploaded GPX vs Demo Route
  // ─────────────────────────────────────────────────────────────
  {
    console.log('7. Testing Route Comparison with uploaded custom GPX...');
    const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
    await page.goto('http://127.0.0.1:5173/compare');
    await page.waitForSelector('text=Route Head-to-Head Comparison');

    // Upload custom GPX for Route A
    const customGpxPath = path.join(__dirname, '..', 'fixtures', 'custom-route.gpx');
    await page.setInputFiles('#upload-file-a', customGpxPath);

    // Wait for Route A option to reflect uploaded route
    await page.waitForSelector('option:has-text("📁 custom-route")', { timeout: 10000 });

    // Wait for automatic comparison to complete
    const assessmentBanner = page.locator('.comparison-summary-banner');
    await assessmentBanner.waitFor({ state: 'visible', timeout: 10000 });
    const bannerText = await assessmentBanner.innerText();
    console.log('Comparison Banner Text:\n', bannerText);

    const screenshotPath = path.join(screenshotsDir, 'custom_upload_comparison.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Saved screenshot:', screenshotPath);
    await page.close();
  }

  // ─────────────────────────────────────────────────────────────
  // 8. General UI Screenshots for README: Landing Page & Analysis Page
  // ─────────────────────────────────────────────────────────────
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
    await page.goto('http://127.0.0.1:5173');
    await page.waitForSelector('.demo-grid');
    await page.screenshot({ path: path.join(screenshotsDir, 'landing_page.png') });

    await page.goto('http://127.0.0.1:5173/analyze/multi-climb');
    await page.waitForSelector('.recharts-responsive-container');
    await page.screenshot({ path: path.join(screenshotsDir, 'analysis_page_highlighted.png') });
    await page.close();
  }

  await browser.close();
  console.log('\nAll comprehensive evidence captured successfully!');
}

run().catch(e => {
  console.error('Evidence capture failed:', e);
  process.exit(1);
});
