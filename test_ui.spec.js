const { test, expect } = require('@playwright/test');

test('test local simulation', async ({ page }) => {
    await page.goto('http://localhost:8000/');

    // Check main title in event log
    const eventLogText = await page.innerText('#event-log');
    expect(eventLogText).toContain('Welcome to The Hive Sovereign');

    // Switch to World View
    await page.click('#btn-toggle-view');
    await page.waitForTimeout(100);
    const btnText = await page.innerText('#btn-toggle-view');
    expect(btnText).toContain('Hive View');

    // Switch back to Hive View
    await page.click('#btn-toggle-view');
    await page.waitForTimeout(100);
});
