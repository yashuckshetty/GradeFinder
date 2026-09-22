const { chromium } = require('../frontend/node_modules/@playwright/test');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.join(__dirname, '..', 'docs', 'screenshots');

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // 1. Custom Upload Comparison
  console.log('1. Capturing Custom Upload Comparison...');
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });
    await page.goto('http://127.0.0.1:5173/compare');
    await page.waitForSelector('text=Route Head-to-Head Comparison');

    // Upload custom GPX for Route A
    const customGpxPath = path.join(__dirname, '..', 'fixtures', 'custom-route.gpx');
    await page.setInputFiles('#upload-file-a', customGpxPath);

    // Wait for comparison assessment banner to render
    const banner = page.locator('.comparison-summary-banner');
    await banner.waitFor({ state: 'visible', timeout: 15000 });
    const bannerText = await banner.innerText();
    console.log('Comparison Banner Text:\n', bannerText);

    // Also wait for comparison table
    await page.waitForSelector('.comparison-table');

    const screenshotPath = path.join(screenshotsDir, 'custom_upload_comparison.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log('Saved screenshot:', screenshotPath);
    await page.close();
  }

  // 2. Landing Page & Analysis Page
  console.log('\n2. Capturing Landing Page and Analysis Page with highlights...');
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
    await page.goto('http://127.0.0.1:5173');
    await page.waitForSelector('.demo-grid');
    await page.screenshot({ path: path.join(screenshotsDir, 'landing_page.png') });

    await page.locator('.demo-card').filter({ hasText: 'Multi-Climb Technical' }).click();
    await page.waitForURL('**/analyze/multi-climb');
    await page.waitForSelector('.chart-container');
    await page.screenshot({ path: path.join(screenshotsDir, 'analysis_page_highlighted.png') });
    await page.close();
  }

  await browser.close();
  console.log('\nAll remaining evidence captured successfully!');
}

run().catch(e => {
  console.error('Failed:', e);
  process.exit(1);
});
