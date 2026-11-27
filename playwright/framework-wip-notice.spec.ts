// @ts-check
// The "under construction" pop-up (with the crab) of Medsyntax Framework (framework/).
// playwright.config.js starts every test with the pop-up dismissed; these tests start with empty storage instead.
import { test, expect } from '@playwright/test';

const URL = 'http://localhost:8123/framework/';

test.use({ storageState: { cookies: [], origins: [] } });

test('the pop-up shows on the first visit, with the crab', async ({ page }) => {
    await page.goto(URL);
    const dialog = page.getByRole('dialog', { name: 'Under construction' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Medsyntax Framework is still under construction');
    await expect(dialog.locator('.wip-crab')).toHaveText('🦀');
    await expect(dialog.getByRole('button', { name: 'I understand' })).toBeFocused();
});

test('the pop-up asks to report bugs (or crustaceans) on GitHub', async ({ page }) => {
    await page.goto(URL);
    const dialog = page.getByRole('dialog', { name: 'Under construction' });
    await expect(dialog).toContainText('Spotted a bug or a crustacean? Let us know on GitHub.');
    const link = dialog.getByRole('link', { name: 'GitHub' });
    await expect(link).toHaveAttribute('href', 'https://github.com/mrgtverleg-lgtm/MedsyntaxQA/issues');
    await expect(link).toHaveAttribute('target', '_blank');
});

test('"I understand" closes the pop-up, and it opens again on the next visit', async ({ page }) => {
    await page.goto(URL);
    const dialog = page.getByRole('dialog', { name: 'Under construction' });
    await dialog.getByRole('button', { name: 'I understand' }).click();
    await expect(dialog).toBeHidden();
    // The page can be used again.
    await page.locator('.card[data-id="PICO"]').click();
    await expect(page.locator('#f-v0')).toBeVisible();
    await page.goto(URL);
    await expect(dialog).toBeVisible();
});

test('Escape also closes the pop-up', async ({ page }) => {
    await page.goto(URL);
    const dialog = page.getByRole('dialog', { name: 'Under construction' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
});

test('the pop-up also shows when the page opens from a shared link', async ({ page }) => {
    await page.goto(URL + '?s=invalid');
    await expect(page.getByRole('dialog', { name: 'Under construction' })).toBeVisible();
});
