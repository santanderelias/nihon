// @ts-check
const { test, expect } = require('@playwright/test');

const baseURL = 'http://localhost:8080';

test.beforeEach(async ({ page }) => {
  await page.goto(baseURL);
});

test.describe('Comprehensive Smoke Test', () => {
  test('should load the homepage and display learning sections', async ({ page }) => {
    await expect(page.locator('h2')).toHaveText('Learning Sections');
    await expect(page.locator('.card')).toHaveCount(7);
  });

  test('should start a hiragana quiz and check for question', async ({ page }) => {
    await page.click('#quizHiragana');
    await expect(page.locator('#char-display')).toBeVisible();
    await expect(page.locator('#answer-input')).toBeVisible();
    await expect(page.locator('#check-button')).toBeVisible();
  });

  test('should go back to home from a quiz', async ({ page }) => {
    await page.click('#quizHiragana');
    await page.click('#home-button');
    await expect(page.locator('h2')).toHaveText('Learning Sections');
  });

  test('should start hiragana flashcards and flip a card', async ({ page }) => {
    await page.click('#flashcardHiragana');
    await expect(page.locator('.flashcard')).toBeVisible();
    await page.click('#flip-button');
    await expect(page.locator('.flashcard')).toHaveClass(/flipped/);
  });

  test('should open and close the stats modal', async ({ page }) => {
    await page.click('#stats-button');
    await expect(page.locator('#stats-modal')).toBeVisible();
    await expect(page.locator('#statsModalLabel')).toHaveText('Statistics');
    await page.locator('#stats-modal .btn-close').click();
    await expect(page.locator('#stats-modal')).not.toBeVisible();
  });

  test('should open and close the dictionary modal', async ({ page }) => {
    await page.click('#dictionary-button');
    await expect(page.locator('#dictionary-modal')).toBeVisible();
    await expect(page.locator('#dictionaryModalLabel')).toHaveText('Dictionary');
    await page.locator('#dictionary-modal .btn-close').click();
    await expect(page.locator('#dictionary-modal')).not.toBeVisible();
  });

  test('should open and close the grammar modal', async ({ page }) => {
    await page.click('#grammar-button');
    await expect(page.locator('#grammar-modal')).toBeVisible();
    await expect(page.locator('#grammarModalLabel')).toHaveText('Grammar');
    await page.locator('#grammar-modal .btn-close').click();
    await expect(page.locator('#grammar-modal')).not.toBeVisible();
  });

  test('should open and close the references modal', async ({ page }) => {
    await page.click('#references-button');
    await expect(page.locator('#references-modal')).toBeVisible();
    await expect(page.locator('#referencesModalLabel')).toHaveText('References');
    await page.locator('#references-modal .btn-close').click();
    await expect(page.locator('#references-modal')).not.toBeVisible();
  });
});

test.describe('Feature: Quiz', () => {
    test('should allow answering a question in hiragana quiz', async ({ page }) => {
        await page.click('#quizHiragana');
        const charToTest = await page.locator('#char-display').innerText();
        // This is a simple test, so we'll just type something and check.
        // A more robust test would need to know the correct answer.
        await page.fill('#answer-input', 'a');
        await page.click('#check-button');
        await expect(page.locator('#feedback-area')).toBeVisible();
    });

    test('should show a hint in the quiz', async ({ page }) => {
        await page.click('#quizKatakana');
        await page.click('#hint-button');
        await expect(page.locator('#hint-display')).toBeVisible();
        await expect(page.locator('#hint-display')).toContainText('Hint:');
    });
});

test.describe('Feature: Flashcards', () => {
    test('should allow marking a flashcard as true or false', async ({ page }) => {
        await page.click('#flashcardKatakana');
        await expect(page.locator('.flashcard')).toBeVisible();
        await page.click('#true-button');
        await expect(page.locator('#feedback-area')).toBeVisible();
        // Wait for the next card to load
        await page.waitForTimeout(1500);
        await page.click('#false-button');
        await expect(page.locator('#feedback-area')).toBeVisible();
    });
});

test.describe('Feature: Modals', () => {
    test('should be able to switch tabs in references modal', async ({ page }) => {
        await page.click('#references-button');
        await expect(page.locator('#references-modal')).toBeVisible();
        await page.click('#katakana-tab');
        await expect(page.locator('#katakana')).toHaveClass(/active/);
        await page.click('#kanji-tab');
        await expect(page.locator('#kanji')).toHaveClass(/active/);
        await page.click('#numbers-tab');
        await expect(page.locator('#numbers')).toHaveClass(/active/);
    });
});
