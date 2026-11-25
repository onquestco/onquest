import { deflateSync } from 'node:zlib';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

// Blogs end to end (blogs spec §11; issue #25). Run by hand against a Vercel preview with the
// Supabase preview project, never in CI (see playwright.config.ts). It needs:
// - E2E_BASE_URL: the preview URL.
// - E2E_STORAGE_STATE: a saved signed-in session (Playwright storageState JSON) of a preview user
//   who has blogs access (grant_feature_access on the preview project only) and one published
//   public Quest. Sign-in is Google only, so save it once by hand:
//   npx playwright codegen --save-storage=tests/e2e/.auth/writer.json $E2E_BASE_URL/login
// - E2E_QUEST_TITLE: that public Quest's title (UX test 1 links a public Quest, PRD change 6).
// - E2E_READER_STORAGE_STATE (optional): a second user, for the like after sign-in (step 4).
// - E2E_SHORT_BLOG_PATH, E2E_LONG_BLOG_PATH: two public blogs for read-end, one that fits on an
//   iPhone SE screen and one several screens long (desktop included).
// - E2E_BLOG_SLUG_QUEST_PATH (optional): an existing Quest whose slug is "blog" (spec §8).
// - The preview build must have NEXT_PUBLIC_POSTHOG_KEY set, or the browser sends no events.

const WRITER = process.env.E2E_STORAGE_STATE;
const READER = process.env.E2E_READER_STORAGE_STATE;
const QUEST_TITLE = process.env.E2E_QUEST_TITLE ?? '';
const PARAGRAPHS = [
  'We stayed in Anjuna for three nights, in a guesthouse two lanes from the beach.',
  'Scooters were 400 rupees a day. Rent one on the first morning and fill the tank at Mapusa.',
  'Skip the Saturday market if you hate crowds. Go to Chapora fort at sunset instead.',
];

test.skip(!process.env.E2E_BASE_URL, 'Set E2E_BASE_URL to a preview build (see the header).');

/** A plain PNG, so the composer's image worker has a real picture to re-encode. */
function png(width: number, height: number, rgb: [number, number, number]): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = (crcTable[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, Buffer.from(rgb))]);
  const pixels = deflateSync(Buffer.concat(Array.from({ length: height }, () => row)));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', pixels),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Every analytics event the page sends to /ingest (the beacon included), answered with 200. */
async function captureEvents(page: Page): Promise<{ event: string; properties: Record<string, unknown> }[]> {
  const events: { event: string; properties: Record<string, unknown> }[] = [];
  // Analytics skips automated browsers (isBot checks navigator.webdriver); this test is the
  // exception, so it looks like a person's browser.
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  await page.route('**/ingest/**', async (route) => {
    const body = route.request().postData();
    if (body) events.push(JSON.parse(body) as { event: string; properties: Record<string, unknown> });
    await route.fulfill({ status: 200, body: '{}' });
  });
  return events;
}

const readEnds = (events: { event: string }[]) => events.filter((sent) => sent.event === 'blog_read_end');

test.describe.serial('write, read and manage a blog (mobile)', () => {
  test.skip(({ isMobile }) => !isMobile, 'The writer flow runs at phone sizes.');
  test.skip(!WRITER || !QUEST_TITLE, 'Set E2E_STORAGE_STATE and E2E_QUEST_TITLE.');

  let writer: BrowserContext;
  let path = '';
  let blogKey = '';
  const title = `Goa on 15k ${Date.now().toString(36)}`;

  test.beforeAll(async ({ browser }) => {
    writer = await browser.newContext({ storageState: WRITER });
  });
  test.afterAll(async () => {
    await writer.close();
  });

  test('1. Create → Write a blog → photos, Quest → Preview → Post Public → share link', async () => {
    const page = await writer.newPage();
    await page.goto('/create');
    await page.getByRole('link', { name: /Write a blog/ }).click();
    await expect(page.getByLabel('Title')).toBeFocused();
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Text').fill(PARAGRAPHS.join('\n\n'));
    await page.locator('input[type="file"]').setInputFiles([
      { name: 'sea.png', mimeType: 'image/png', buffer: png(640, 480, [40, 120, 200]) },
      { name: 'sand.png', mimeType: 'image/png', buffer: png(480, 640, [230, 200, 140]) },
    ]);
    await expect(page.getByText('2 of 10')).toBeVisible();
    await page.getByRole('button', { name: 'Link a Quest' }).click();
    await page.getByRole('dialog').locator('label', { hasText: QUEST_TITLE }).click();
    await expect(page.getByRole('button', { name: `Linked Quest: ${QUEST_TITLE}. Change` })).toBeVisible();

    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(PARAGRAPHS[2] ?? '')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to edit' })).toBeVisible();

    // Post waits for both photos to upload (it's greyed out with a ring until then).
    await expect(page.getByRole('button', { name: 'Post', exact: true }).first()).toBeEnabled({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Post', exact: true }).first().click();
    const sheet = page.getByRole('dialog', { name: 'Who can see this blog?' });
    await sheet.locator('label', { hasText: 'Public' }).click();
    await sheet.getByRole('button', { name: 'Post' }).click();

    await expect(page.getByRole('heading', { name: 'Your blog is live!' })).toBeVisible();
    blogKey = new URL(page.url()).pathname.split('/')[2] ?? '';
    const shown = await page.getByText(/\/@[a-z0-9_]+\/blog\/[a-z0-9-]+/).first().textContent();
    path = (shown ?? '').slice((shown ?? '').indexOf('/@')).trim();
    expect(path).toMatch(/^\/@[a-z0-9_]+\/blog\/goa-on-15k-/);
    expect(blogKey).toMatch(/^[0-9a-f-]{36}$/);
    await page.close();
  });

  test('2. Close mid-text → Quests tab → Blogs → Continue editing, text intact', async () => {
    const page = await writer.newPage();
    const draftTitle = `Half written ${Date.now().toString(36)}`;
    await page.goto('/blogs/new?source=create');
    await page.getByLabel('Title').fill(draftTitle);
    await page.getByLabel('Text').fill(`${PARAGRAPHS[0]}\n\n${PARAGRAPHS[1]}`);
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Close' }).click();

    await page.goto('/quests');
    await page.locator('label', { hasText: /^Blogs$/ }).click();
    const row = page.getByRole('link', { name: new RegExp(draftTitle) });
    await expect(row).toContainText('Continue editing');
    await expect(row).toContainText('Draft');
    await row.click();
    await expect(page.getByLabel('Title')).toHaveValue(draftTitle);
    await expect(page.getByLabel('Text')).toHaveValue(`${PARAGRAPHS[0]}\n\n${PARAGRAPHS[1]}`);

    // Leave nothing behind: an emptied draft is discarded on Close.
    await page.getByLabel('Title').fill('');
    await page.getByLabel('Text').fill('');
    await page.getByRole('button', { name: 'Close' }).click();
    await page.close();
  });

  test('3. Signed out: text without a prompt, View Quest, Back keeps the place', async ({ browser }) => {
    const reader = await browser.newContext();
    const page = await reader.newPage();
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(PARAGRAPHS[1] ?? '')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    const viewQuest = page.getByRole('link', { name: /View Quest/ });
    await viewQuest.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    await viewQuest.click();
    await expect(page).not.toHaveURL(new RegExp(`${path}$`));
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeAttached();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before - 50);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThanOrEqual(50);

    // The blog shows on the writer's public profile, under Blogs.
    await page.goto(path.slice(0, path.indexOf('/blog/')));
    await page.locator('label', { hasText: /^Blogs$/ }).click();
    await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
    await reader.close();
  });

  test('4. Like signed out → sign-in popup → back on the blog, liked', async ({ browser }) => {
    const signedOut = await browser.newContext();
    const page = await signedOut.newPage();
    await page.goto(path);
    await page.getByRole('link', { name: 'Like this blog' }).click();
    await expect(page.getByRole('dialog', { name: 'Sign in to like' })).toBeVisible();
    await signedOut.close();

    // Google sign-in can't be automated: a saved reader session stands in for it, landing where
    // the sign-in return sends people (next + intent + ref), which finishes the like.
    test.skip(!READER, 'Set E2E_READER_STORAGE_STATE to finish the like after sign-in.');
    const reader = await browser.newContext({ storageState: READER });
    const back = await reader.newPage();
    await back.goto(`${path}?intent=like&ref=${blogKey}`);
    await expect(back.getByRole('button', { name: 'Unlike this blog' })).toBeVisible();
    await expect(back).toHaveURL(new RegExp(`${path}$`));
    await reader.close();
  });

  test('5. Owner: comments off, Unlisted, delete → "This blog was removed."', async ({ browser }) => {
    const page = await writer.newPage();
    await page.goto(path);
    const manage = page.getByRole('button', { name: 'Manage this blog' });
    await manage.click();
    const sheet = page.getByRole('dialog', { name: title });
    await sheet.getByRole('switch', { name: 'Comments' }).click();
    await expect(page.getByText('Comments are off for this blog.')).toBeVisible();
    await sheet.locator('label', { hasText: /^Unlisted$/ }).click();
    await expect(sheet.getByText('Only people with the link.')).toBeVisible();
    await sheet.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Delete blog' }).click();
    await expect(page).toHaveURL(/\/quests$/);

    const reader = await browser.newContext();
    const gone = await reader.newPage();
    await gone.goto(path);
    await expect(gone.getByText('This blog was removed.')).toBeVisible();
    await reader.close();
    await page.close();
  });

  test('6. Format: bold a word and a list → Post → signed out sees them; delete an unposted draft', async ({
    browser,
  }) => {
    // blogs-editor spec §11. The draft delete at the end needs BL-07 (#41).
    const page = await writer.newPage();
    const formattedTitle = `Formatted ${Date.now().toString(36)}`;
    await page.goto('/blogs/new?source=create');
    await page.getByLabel('Title').fill(formattedTitle);
    const text = page.getByLabel('Text');
    await text.fill('Pack light');

    // Select "light" and bold it from the toolbar.
    await text.evaluate((field: HTMLTextAreaElement) => {
      field.focus();
      field.setSelectionRange(5, 10);
    });
    const bold = page.getByRole('button', { name: /^Bold \(/ });
    await bold.click();
    await expect(text).toHaveValue('Pack **light**');
    await expect(bold).toHaveAttribute('aria-pressed', 'true');

    // A list: the button starts it, Enter continues it.
    await text.evaluate((field: HTMLTextAreaElement) => field.setSelectionRange(field.value.length, field.value.length));
    await text.press('Enter');
    await text.press('Enter');
    await page.getByRole('button', { name: 'Bulleted list' }).click();
    await text.pressSequentially('Sunscreen');
    await text.press('Enter');
    await text.pressSequentially('Hat');
    await expect(text).toHaveValue('Pack **light**\n\n- Sunscreen\n- Hat');

    // Undo takes the last typing back, redo brings it again.
    await page.getByRole('button', { name: /^Undo \(/ }).click();
    await expect(text).toHaveValue('Pack **light**\n\n- Sunscreen\n- ');
    await page.getByRole('button', { name: /^Redo \(/ }).click();
    await expect(text).toHaveValue('Pack **light**\n\n- Sunscreen\n- Hat');

    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.locator('article strong', { hasText: 'light' })).toBeVisible();
    await expect(page.getByRole('toolbar', { name: 'Formatting' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Post', exact: true }).first().click();
    const sheet = page.getByRole('dialog', { name: 'Who can see this blog?' });
    await sheet.locator('label', { hasText: 'Public' }).click();
    await sheet.getByRole('button', { name: 'Post' }).click();
    await expect(page.getByRole('heading', { name: 'Your blog is live!' })).toBeVisible();
    const shown = await page.getByText(/\/@[a-z0-9_]+\/blog\/[a-z0-9-]+/).first().textContent();
    const formattedPath = (shown ?? '').slice((shown ?? '').indexOf('/@')).trim();

    const reader = await browser.newContext();
    const readerPage = await reader.newPage();
    await readerPage.goto(formattedPath);
    await expect(readerPage.locator('article strong', { hasText: 'light' })).toBeVisible();
    await expect(readerPage.locator('article li')).toHaveText(['Sunscreen', 'Hat']);
    await expect(readerPage.locator('article')).not.toContainText('**');
    await reader.close();

    // A second draft, never posted: ⋯ on its row in the Quests tab → Delete draft.
    const draftTitle = `Unposted ${Date.now().toString(36)}`;
    await page.goto('/blogs/new?source=create');
    await page.getByLabel('Title').fill(draftTitle);
    await page.getByLabel('Text').fill(PARAGRAPHS[0] ?? '');
    await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Close' }).click();
    await page.goto('/quests');
    await page.locator('label', { hasText: /^Blogs$/ }).click();
    await page.getByRole('button', { name: `Manage ${draftTitle}` }).click();
    await page.getByRole('dialog', { name: draftTitle }).getByRole('button', { name: 'Delete draft' }).click();
    const confirm = page.getByRole('dialog', { name: 'Delete this draft?' });
    await expect(confirm).toContainText("It hasn't been posted, so no one else has seen it.");
    await confirm.getByRole('button', { name: 'Delete draft' }).click();
    await expect(page.getByText('Draft deleted.')).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(draftTitle) })).toHaveCount(0);
    await page.reload();
    await page.locator('label', { hasText: /^Blogs$/ }).click();
    await expect(page.getByRole('link', { name: new RegExp(draftTitle) })).toHaveCount(0);

    // Leave nothing behind: delete the formatted blog too.
    await page.goto(formattedPath);
    await page.getByRole('button', { name: 'Manage this blog' }).click();
    await page.getByRole('dialog', { name: formattedTitle }).getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Delete blog' }).click();
    await expect(page).toHaveURL(/\/quests$/);
    await page.close();
  });
});

test.describe('blog_read_end at every viewport (spec §3.8)', () => {
  test.skip(
    !process.env.E2E_SHORT_BLOG_PATH || !process.env.E2E_LONG_BLOG_PATH,
    'Set E2E_SHORT_BLOG_PATH and E2E_LONG_BLOG_PATH.',
  );

  test('a short blog counts once, only after 5 s of visible time', async ({ page }) => {
    const events = await captureEvents(page);
    await page.goto(process.env.E2E_SHORT_BLOG_PATH ?? '');
    await expect.poll(() => events.some((sent) => sent.event === 'blog_viewed')).toBe(true);
    await page.waitForTimeout(3_000);
    expect(readEnds(events)).toHaveLength(0);
    await expect.poll(() => readEnds(events).length, { timeout: 10_000 }).toBe(1);
    await page.waitForTimeout(3_000);
    expect(readEnds(events)).toHaveLength(1);
    const [viewed] = events.filter((sent) => sent.event === 'blog_viewed');
    const [readEnd] = readEnds(events);
    expect(readEnd?.properties.view_id).toBe(viewed?.properties.view_id);
    expect(Number(readEnd?.properties.seconds)).toBeGreaterThanOrEqual(5);
  });

  test('a long blog counts once, only when its end is on screen', async ({ page }) => {
    const events = await captureEvents(page);
    await page.goto(process.env.E2E_LONG_BLOG_PATH ?? '');
    await expect.poll(() => events.some((sent) => sent.event === 'blog_viewed')).toBe(true);
    await page.waitForTimeout(6_000);
    expect(readEnds(events)).toHaveLength(0);
    await page.locator('[data-read-end]').scrollIntoViewIfNeeded();
    await expect.poll(() => readEnds(events).length, { timeout: 5_000 }).toBe(1);
    await page.mouse.wheel(0, -2_000);
    await page.locator('[data-read-end]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(2_000);
    expect(readEnds(events)).toHaveLength(1);
  });
});

test('an existing Quest slugged "blog" still opens (spec §8)', async ({ page }) => {
  test.skip(!process.env.E2E_BLOG_SLUG_QUEST_PATH, 'Set E2E_BLOG_SLUG_QUEST_PATH.');
  const response = await page.goto(process.env.E2E_BLOG_SLUG_QUEST_PATH ?? '');
  expect(response?.status()).toBe(200);
});
