import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function completeScreening(page) {
  await page.getByRole('group', { name: 'Регулярна активність' }).getByRole('button', { name: 'Так' }).click();
  await page.getByRole('group', { name: 'Симптоми' }).getByRole('button', { name: 'Ні' }).click();
  await page.getByRole('group', { name: 'Відомі захворювання' }).getByRole('button', { name: 'Ні' }).click();
  await page.getByRole('group', { name: 'Запланована інтенсивність' }).getByRole('button', { name: 'Помірна' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('створює програму після завершення скринінгу', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Розкажи про себе' })).toBeVisible();
  await completeScreening(page);
  await page.getByRole('button', { name: 'Скласти програму' }).click();
  await expect(page.getByText('Тренувальний блок · висота стовпчика = обсяг тижня')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Прогрес з’явиться після завершення сесії/ })).toBeVisible();
});

test('режим здоров’я містить повний тижневий план і трекери', async ({ page }) => {
  await page.getByRole('button', { name: 'Здоров’я' }).click();
  await completeScreening(page);
  await page.getByRole('button', { name: 'Скласти програму' }).click();
  await expect(page.getByRole('heading', { name: 'Сила, аеробна активність, баланс і рухливість' })).toBeVisible();
  await expect(page.getByText('150–300 хв помірної або 75–150 хв високої інтенсивності')).toBeVisible();
  await expect(page.getByLabel('Помірна активність, хв')).toBeVisible();
});

test('зберігає завершену сесію та показує її в трендах', async ({ page }) => {
  await completeScreening(page);
  await page.getByRole('button', { name: 'Скласти програму' }).click();
  await page.getByLabel('повт.').first().fill('8');
  await page.getByRole('button', { name: 'Завершити та зберегти сесію' }).click();
  await expect(page.getByRole('heading', { name: '1 завершених тренувань' })).toBeVisible();
  await expect(page.getByText('Сесію додано до історії')).toBeVisible();
});

async function expectNoSeriousA11yIssues(page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact));
  expect(serious, serious.map((item) => item.id + ': ' + item.help).join('\n')).toEqual([]);
}

test('немає критичних або серйозних порушень доступності', async ({ page }) => {
  await completeScreening(page);
  await expectNoSeriousA11yIssues(page);
  await page.getByRole('button', { name: 'Скласти програму' }).click();
  await expectNoSeriousA11yIssues(page);
});

test('мобільний екран не має горизонтального переповнення', async ({ page }) => {
  await completeScreening(page);
  await page.getByRole('button', { name: 'Скласти програму' }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
