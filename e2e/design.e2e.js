import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const theme of ['dark', 'light']) {
  test(theme + ': readable journal preserves individual sets and fits the viewport', async ({ page }, testInfo) => {
    await page.goto('./');
    if (await page.locator('.tk').getAttribute('data-theme') !== theme) {
      await page.locator('.tk-theme').click();
    }
    await expect(page.locator('.tk-import')).not.toHaveAttribute('open');
    await page.locator('.tk-import summary').click();
    await expect(page.getByRole('button', { name: 'Імпортувати резервну копію' })).toBeVisible();
    await page.locator('.tk-import summary').click();
    await page.screenshot({ path: testInfo.outputPath(theme + '-form.png'), fullPage: false });
    for (const [group, answer] of [
      ['Регулярна активність', 'Так'], ['Симптоми', 'Ні'],
      ['Відомі захворювання', 'Ні'], ['Запланована інтенсивність', 'Помірна'],
      ['Тривалість сесії', '75 хв'],
    ]) {
      await page.getByRole('group', { name: group, exact: true }).getByRole('button', { name: answer, exact: true }).click();
    }
    await page.getByRole('button', { name: 'Скласти програму', exact: true }).click();
    const exercise = page.locator('.tk-ex').first();
    await expect(page.getByRole('heading', { name: 'Програма тренувань', exact: true })).toBeVisible();
    await expect(page.getByLabel('Ім’я або код клієнта')).toBeVisible();
    await expect(exercise.locator('input:visible')).toHaveCount(0);
    await expect(page.locator('.tk-session-log')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Завершити та зберегти сесію', exact: true })).toBeHidden();
    await exercise.getByRole('button', { name: 'Редагувати призначення', exact: true }).click();
    await expect(exercise.getByLabel('Орієнтир ваги', { exact: true })).toBeHidden();
    await exercise.getByLabel('Базова вага, кг', { exact: true }).fill('40');
    await exercise.getByRole('button', { name: 'Закрити редактор', exact: true }).click();
    await expect(exercise.locator('.tk-planned-load')).toBeVisible();
    await expect(exercise.locator('input:visible')).toHaveCount(0);
    await exercise.screenshot({ path: testInfo.outputPath(theme + '-instructor.png') });
    await page.getByRole('button', { name: 'Відкрити журнал', exact: true }).click();
    const rows = exercise.locator('.tk-set-row');
    await expect(rows.nth(1)).toBeVisible();
    const first = rows.nth(0).locator('input');
    const second = rows.nth(1).locator('input');
    await first.nth(0).fill('32.5');
    await first.nth(1).fill('10');
    await first.nth(2).fill('0');
    await second.nth(0).fill('30');
    await second.nth(1).fill('8');
    await second.nth(2).fill('2');
    await exercise.getByLabel('Нотатка', { exact: true }).fill('Контроль техніки');
    await exercise.getByLabel('Вправу виконано').check();
    await expect(page.locator('.tk-journal-progress')).toContainText('1/');
    await page.getByRole('button', { name: 'Сховати журнал', exact: true }).click();
    await expect(rows).toHaveCount(0);
    await expect(exercise.locator('.tk-planned-load')).toBeVisible();
    await page.getByRole('button', { name: 'Відкрити журнал', exact: true }).click();
    await expect(first.nth(0)).toHaveValue('32.5');
    await expect(exercise.getByLabel('Нотатка', { exact: true })).toHaveValue('Контроль техніки');
    await expect.poll(() => page.evaluate(async () => {
      const db = await new Promise((resolve) => {
        const request = indexedDB.open('training-constructor');
        request.onsuccess = () => resolve(request.result);
      });
      return new Promise((resolve) => {
        const request = db.transaction('key-value').objectStore('key-value').get('tk-state');
        request.onsuccess = () => { db.close(); resolve(String(request.result).includes('Контроль техніки')); };
      });
    })).toBe(true);
    await page.reload();
    await expect(page.locator('.tk-exercise-log')).toHaveCount(0);
    await page.getByRole('button', { name: 'Відкрити журнал', exact: true }).click();
    await expect(first.nth(0)).toHaveValue('32.5');
    await expect(first.nth(2)).toHaveValue('0');
    await expect(second.nth(0)).toHaveValue('30');
    await expect(second.nth(1)).toHaveValue('8');
    await expect(exercise.getByLabel('Нотатка', { exact: true })).toHaveValue('Контроль техніки');
    await expect(exercise.getByLabel('Вправу виконано')).toBeChecked();
    const bounds = await rows.evaluateAll((items) => items.map((item) => {
      const { x, y, width, height } = item.getBoundingClientRect(); return { x, y, width, height };
    }));
    expect(bounds[1].y).toBeGreaterThanOrEqual(bounds[0].y + bounds[0].height - 1);
    expect(bounds[1].x).toBe(bounds[0].x);
    expect(bounds[1].width).toBe(bounds[0].width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const a11y = await new AxeBuilder({ page }).include('.tk-ex').analyze();
    expect(a11y.violations.filter((v) => ['critical', 'serious'].includes(v.impact))).toEqual([]);
    await exercise.screenshot({ path: testInfo.outputPath(theme + '-exercise.png') });
    if (testInfo.project.name === 'mobile') {
      await page.setViewportSize({ width: 320, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      expect((await first.nth(0).boundingBox()).width).toBeGreaterThanOrEqual(64);
      await exercise.screenshot({ path: testInfo.outputPath(theme + '-320.png') });
    }
  });
}

