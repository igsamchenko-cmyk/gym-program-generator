import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function completeScreening(page, chooseDuration = true) {
  await page.getByRole('group', { name: 'Регулярна активність' }).getByRole('button', { name: 'Так' }).click();
  await page.getByRole('group', { name: 'Симптоми' }).getByRole('button', { name: 'Ні' }).click();
  await page.getByRole('group', { name: 'Відомі захворювання' }).getByRole('button', { name: 'Ні' }).click();
  await page.getByRole('group', { name: 'Запланована інтенсивність' }).getByRole('button', { name: 'Помірна' }).click();
  if (chooseDuration) await page.getByRole('group', { name: 'Тривалість сесії' }).getByRole('button', { name: '75 хв', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('вимагає обрати тривалість перед генерацією', async ({ page }) => {
  await completeScreening(page, false);
  await expect(page.getByRole('button', { name: 'Обери тривалість сесії' })).toBeDisabled();
  await page.getByRole('group', { name: 'Тривалість сесії' }).getByRole('button', { name: '60 хв', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Скласти програму' })).toBeEnabled();
});

test('створює програму після завершення скринінгу', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Параметри клієнта' })).toBeVisible();
  await completeScreening(page);
  await page.getByRole('button', { name: 'Скласти програму' }).click();
  await expect(page.getByText('Тренувальний блок · висота стовпчика = обсяг тижня')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Прогрес з’явиться після завершення сесії/ })).toBeHidden();
  await page.getByRole('button', { name: 'Відкрити журнал', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Прогрес з’явиться після завершення сесії/ })).toBeVisible();
});

test('режим здоров’я містить повний тижневий план і трекери', async ({ page }) => {
  await page.getByRole('button', { name: 'Здоров’я' }).click();
  await completeScreening(page);
  await page.getByRole('button', { name: 'Скласти програму' }).click();
  await expect(page.getByRole('heading', { name: 'Сила, аеробна активність, баланс і рухливість' })).toBeVisible();
  await expect(page.getByText('150–300 хв помірної або 75–150 хв високої інтенсивності')).toBeVisible();
  await expect(page.getByLabel('Помірна активність, хв')).toBeHidden();
  await page.getByRole('button', { name: 'Відкрити журнал', exact: true }).click();
  await expect(page.getByLabel('Помірна активність, хв')).toBeVisible();
});

test('зберігає завершену сесію та показує її в трендах', async ({ page }) => {
  await completeScreening(page);
  await page.getByRole('button', { name: 'Скласти програму' }).click();
  await page.getByRole('button', { name: 'Відкрити журнал', exact: true }).click();
  await page.getByLabel('повт.').first().fill('8');
  await page.getByRole('button', { name: 'Завершити та зберегти сесію' }).click();
  await expect(page.getByRole('heading', { name: '1 завершених тренувань' })).toBeVisible();
  await expect(page.getByText('Сесію додано до історії')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Сесію вже збережено' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: '1 завершених тренувань' })).toBeVisible();
});

test('прив’язує корекцію до фактично розпочатої сесії та скасовує з джерелом', async ({ page }) => {
  await completeScreening(page);
  await page.getByRole('button', { name: 'Скласти програму' }).click();
  await page.getByRole('button', { name: 'Відкрити журнал', exact: true }).click();
  await page.getByLabel('Готовність до сесії 1–5').fill('2');
  await page.getByLabel('повт.').first().fill('8');
  await page.getByRole('button', { name: 'Завершити та зберегти сесію' }).click();
  await page.getByText('Корекція навантаження за журналом', { exact: true }).click();
  await expect(page.getByText(/Очікує першої фактично розпочатої/)).toBeVisible();

  await page.locator('.tk-day').nth(1).click();
  await expect(page.getByText('Одноразова корекція цієї сесії')).toHaveCount(0);
  await page.getByLabel('повт.').first().fill('8');
  await expect(page.getByText('Одноразова корекція цієї сесії')).toBeVisible();

  await page.locator('.tk-history-list summary').click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Видалити помилковий запис' }).click();
  await expect(page.getByText('Одноразова корекція цієї сесії')).toHaveCount(0);
});

test('спільне посилання не обходить особистий скринінг', async ({ page }) => {
  const encoded = Buffer.from(JSON.stringify({ version: 5, profile: { age: 31 }, anchors: {}, swaps: {}, built: true })).toString('base64url');
  await page.goto('./#p=' + encoded);
  await page.reload();
  await expect(page.getByText('Імпортований план ще не допущено до виконання')).toBeVisible();
  await expect(page.getByText('Тренувальний блок · висота стовпчика = обсяг тижня')).toHaveCount(0);
  await completeScreening(page);
  await page.getByRole('button', { name: 'Скласти програму' }).click();
  await expect(page.getByText('Тренувальний блок · висота стовпчика = обсяг тижня')).toBeVisible();
});

test('тренер може додати власну вправу і редагувати призначення', async ({ page }) => {
  await completeScreening(page);
  await page.getByRole('button', { name: 'Скласти програму' }).click();
  await page.getByLabel('Ім’я або код клієнта').fill('Клієнт А');
  await page.getByRole('button', { name: 'Зберегти профіль клієнта' }).click();
  await expect(page.getByRole('button', { name: 'Клієнт А', exact: true })).toBeVisible();
  await page.getByText('Додати власну вправу', { exact: true }).click();
  await page.getByLabel('Назва').fill('Контрольна тяга тренера');
  await page.getByRole('button', { name: 'Додати до програми' }).click();
  await expect(page.locator('.tk-exname').filter({ hasText: 'Контрольна тяга тренера' })).toBeVisible();
  await page.getByRole('button', { name: 'Редагувати призначення' }).first().click();
  await expect(page.getByText('Скинути ручні правки')).toBeVisible();
  await expect(page.getByText('Фіксувати підходи в усі тижні')).toHaveCount(0);
  await page.getByLabel('Базові підходи').first().fill('4');
  await expect(page.getByText('Фіксувати підходи в усі тижні')).toBeVisible();
  await expect(page.getByLabel('Крок доступної ваги, кг').first()).toBeVisible();
  await page.getByText('Історія змін програми', { exact: true }).click();
  await expect(page.getByText(/Точна різниця/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Відновити цю версію' }).first()).toBeVisible();
});


test('зберігає стан у IndexedDB і відновлює після перезавантаження', async ({ page }) => {
  await completeScreening(page);
  await page.getByRole('button', { name: 'Скласти програму' }).click();
  await expect.poll(async () => page.evaluate(() => new Promise((resolve) => {
    const request = indexedDB.open('training-constructor');
    request.onsuccess = () => {
      const transaction = request.result.transaction('key-value', 'readonly');
      const read = transaction.objectStore('key-value').get('tk-state');
      read.onsuccess = () => resolve(typeof read.result === 'string' && read.result.includes('"version":8'));
      read.onerror = () => resolve(false);
    };
    request.onerror = () => resolve(false);
  }))).toBe(true);
  await page.reload();
  await expect(page.getByText('Тренувальний блок · висота стовпчика = обсяг тижня')).toBeVisible();
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

test('інструктор експортує програму без відкриття або заповнення журналу', async ({ page }, testInfo) => {
  await completeScreening(page);
  await page.getByRole('button', { name: 'Скласти програму', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Відкрити журнал', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.tk-exercise-log')).toHaveCount(0);
  const exerciseName = (await page.locator('.tk-exname').first().innerText()).trim();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Експорт у Excel', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  await download.saveAs(testInfo.outputPath('instructor-program.xlsx'));
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(testInfo.outputPath('instructor-program.xlsx'));
  const rows = [];
  workbook.worksheets.forEach((sheet) => sheet.eachRow((row) => rows.push(row.values)));
  expect(JSON.stringify(rows)).toContain(exerciseName);
  await expect(page.locator('.tk-exercise-log')).toHaveCount(0);
});
