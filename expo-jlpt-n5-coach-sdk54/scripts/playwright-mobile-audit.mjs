import { chromium } from 'playwright';

const APP_URL = process.env.APP_URL ?? 'http://localhost:8081/JLPT5';
const SCREENSHOT_PREFIX = process.env.SCREENSHOT_PREFIX ?? 'playwright-v2';

const NAV_GROUPS = [
  {
    name: 'learn',
    buttonLabel: 'Apprendre',
    entries: ['Kana', 'Kanji', 'Vocabulaire', 'Grammaire', 'Immersion', 'Dialogues', 'Journal'],
  },
  {
    name: 'quiz',
    buttonLabel: 'S’entraîner',
    entries: ['5 min', 'Quiz', 'Test JLPT'],
  },
  {
    name: 'path',
    buttonLabel: 'Parcours',
    entries: ['Aujourd’hui', 'Statistiques', 'Parcours guidé', 'Diagnostic', 'Rapport', 'Révisions', 'Mes erreurs'],
  },
];

const normalizeName = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function waitForHome(page) {
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText ?? '';
      return text.includes('Commencer ma session') || text.includes('ERREUR DÉTECTÉE');
    },
    null,
    { timeout: 70000 }
  );
}

async function snapshot(page, name, checkpoints) {
  const metrics = await page.evaluate(() => {
    const text = document.body.innerText.slice(0, 1400);
    const clippedButtons = [...document.querySelectorAll('[role="button"]')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0;
        return visible && (rect.left < -2 || rect.right > window.innerWidth + 2 || element.scrollWidth > element.clientWidth + 3);
      })
      .map((element) => element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 60) || 'bouton sans nom');
    return {
      text,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      clippedButtons,
    };
  });
  const text = metrics.text;
  checkpoints.push({
    name,
    hasErrorBoundary: /Error code|ErrorBoundary|Exception logicielle|Unhandled|Cannot read|TypeError|ReferenceError/i.test(text),
    hasContentDefect: name.endsWith('-5-min') && /page d'examen/i.test(text),
    bodyLength: text.length,
    horizontalOverflow: metrics.horizontalOverflow,
    clippedButtons: metrics.clippedButtons,
    text: text.replace(/\n/g, ' | ').slice(0, 700),
  });
  await page.screenshot({ path: `${SCREENSHOT_PREFIX}-${name}.png`, fullPage: false });
}

async function openBottomGroup(page, buttonLabel) {
  await page.getByText(buttonLabel, { exact: true }).last().click({ timeout: 8000 });
  await page.waitForTimeout(600);
}

async function tapMenuEntry(page, label) {
  await page.getByText(label, { exact: true }).last().click({ timeout: 8000 });
  await waitForScreenSettle(page);
}

async function closeDrawerIfOpen(page) {
  const closeButton = page.getByText('×', { exact: true }).last();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click({ timeout: 5000 });
    await page.waitForTimeout(400);
  }
}

async function waitForScreenSettle(page) {
  await page.waitForTimeout(700);
  await page
    .waitForFunction(() => !document.body.innerText.includes('Chargement de la base JLPT N5'), null, { timeout: 12000 })
    .catch(() => undefined);
  await page.waitForTimeout(300);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const logs = [];
  const checkpoints = [];
  const viewports = [
    { name: 'se', width: 375, height: 667 },
    { name: 'standard', width: 390, height: 844 },
    { name: 'large', width: 430, height: 932 },
  ];

  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: true,
      hasTouch: true,
    });
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) logs.push(`${viewport.name}:${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => logs.push(`${viewport.name}:pageerror: ${error.message}`));
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForHome(page);
    await snapshot(page, `${viewport.name}-today`, checkpoints);

    for (const group of NAV_GROUPS) {
      await closeDrawerIfOpen(page);
      await openBottomGroup(page, group.buttonLabel);
      await snapshot(page, `${viewport.name}-drawer-${group.name}`, checkpoints);
      for (const [index, entry] of group.entries.entries()) {
        await tapMenuEntry(page, entry);
        await snapshot(page, `${viewport.name}-${normalizeName(entry)}`, checkpoints);
        if (index < group.entries.length - 1) await openBottomGroup(page, group.buttonLabel);
      }
    }
    await page.close();
  }

  await browser.close();

  const failingCheckpoints = checkpoints.filter(
    (checkpoint) => checkpoint.hasErrorBoundary || checkpoint.hasContentDefect || checkpoint.bodyLength < 80 || checkpoint.horizontalOverflow || checkpoint.clippedButtons.length > 0
  );
  const result = { url: APP_URL, checkpoints, failingCheckpoints, logs };
  console.log(JSON.stringify(result, null, 2));
  if (failingCheckpoints.length > 0 || logs.some((log) => /:(?:error|pageerror):/.test(log))) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
