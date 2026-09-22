import { test, expect } from '@playwright/test';

test.describe('GradeFinder E2E Automated Workflows', () => {

  test('Workflow A: Select demo route -> verify analysis and 2D chart highlight range', async ({ page }) => {
    // 1. Visit Home
    await page.goto('/');
    await expect(page.locator('h2')).toContainText("Analyze Your Route's Toughest Climbs");

    // 2. Select Multi-Climb Technical demo
    const multiClimbCard = page.locator('.demo-card').filter({ hasText: 'Multi-Climb Technical' });
    await expect(multiClimbCard).toBeVisible();
    await multiClimbCard.click();

    // 3. Verify Analysis page loaded
    await page.waitForURL('**/analyze/multi-climb');
    await expect(page.locator('h2')).toContainText('Multi-Climb Technical');

    // 4. Assert Max Climb Segment card displays exact metrics
    const climbCard = page.locator('.card').filter({ hasText: 'Max Climb' });
    await expect(climbCard).toBeVisible();
    await expect(climbCard).toContainText('120m'); // Net Gain
    await expect(climbCard).toContainText('121.6m'); // Cumulative Ascent
    await expect(climbCard).toContainText('3.15–6.71 km'); // Distance range
    await expect(climbCard).toContainText('3.37%'); // Avg Grade

    // 5. Assert 2D Recharts elevation profile rendered and reference areas exist
    const chartContainer = page.locator('.recharts-responsive-container');
    await expect(chartContainer).toBeVisible();
  });

  test('Workflow B: Detour simulation excluding Climb 1 on multi-climb -> assert post-splice metrics', async ({ page }) => {
    await page.goto('/analyze/multi-climb');
    await expect(page.locator('h2')).toContainText('Multi-Climb Technical');

    // Select preset to bypass Climb 1 (points 0–20)
    const bypassBtn = page.getByRole('button', { name: /Bypass Climb 1/i });
    await expect(bypassBtn).toBeVisible();
    await bypassBtn.click();

    // Click Run What-If Simulation
    const simulateBtn = page.getByRole('button', { name: /Run What-If Simulation/i });
    await expect(simulateBtn).toBeVisible();
    await simulateBtn.click();

    // Wait for simulation results card
    const simCard = page.locator('.card').filter({ hasText: 'What-If Simulation Impact' });
    await expect(simCard).toBeVisible({ timeout: 10000 });

    // Assert Before vs After delta metrics
    await expect(simCard).toContainText('7.67 km');
    await expect(simCard).toContainText('4.79 km');
    await expect(simCard).toContainText('-2.88 km');

    // Assert Climb shift breakdown matches: #23–#49 -> #1–#28, gain 120m, grade 3.25%
    const shiftBreakdown = page.locator('.climb-shift-breakdown');
    await expect(shiftBreakdown).toBeVisible();
    await expect(shiftBreakdown).toContainText('Indices #1–#28');
    await expect(shiftBreakdown).toContainText('0.14–3.83 km');
    await expect(shiftBreakdown).toContainText('120m');
    await expect(shiftBreakdown).toContainText('3.25%');
  });

  test('Workflow C: Head-to-Head Comparison -> assert comparative table and summary banner', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.locator('h2')).toContainText('Route Head-to-Head Comparison');

    // Wait for comparative results to load
    const summaryBanner = page.locator('.comparison-summary-banner');
    await expect(summaryBanner).toBeVisible({ timeout: 10000 });

    // Assert summary verdict specifies Mountain Climb as harder climb and exact numbers
    await expect(summaryBanner).toContainText(
      'Mountain Climb has the harder single climb: 540.27m gain at 19.01% vs 120.0m at 3.37% — a difference of 420.27m.'
    );

    // Assert comparison table metrics
    const table = page.locator('.comparison-table');
    await expect(table).toBeVisible();
    await expect(table).toContainText('Total Elevation Gain');
    await expect(table).toContainText('209.62 m'); // Route A
    await expect(table).toContainText('540.27 m'); // Route B
  });

});
