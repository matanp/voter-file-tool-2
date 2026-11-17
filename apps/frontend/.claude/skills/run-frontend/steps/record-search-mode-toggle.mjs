// Steps for driver.mjs on /recordsearch: the simple/advanced toggle, with SYNTHETIC results so the
// screenshots can be published. Clears the saved mode first, so the page opens in simple mode.
// Shots: simple (empty), simple with fake results, advanced (name carried over), advanced after reload.
import synthetic from './record-search-synthetic.mjs';

// Waits until the search submit button is enabled, once the session has loaded.
const searchReady = (page) =>
  page.waitForFunction(() => {
    const btn = document.querySelector('form[role="search"] button[type="submit"]');
    return btn && !btn.disabled;
  });

export default async function (page, ctx) {
  const { snap } = ctx;
  await page.evaluate(() => localStorage.removeItem('recordSearch.mode'));
  await page.reload();
  await page.getByRole('button', { name: 'Advanced search →' }).waitFor();
  await searchReady(page);
  await snap('mode-simple');

  // Fills the name box, searches (fake results) and snaps the results and details.
  await synthetic(page, ctx);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await snap('mode-simple-results');

  await page.getByRole('button', { name: 'Advanced search →' }).click();
  await page.getByRole('button', { name: '← Simple search' }).waitFor();
  await snap('mode-advanced');

  // The choice is remembered on reload.
  await page.reload();
  await page.getByRole('button', { name: '← Simple search' }).waitFor();
  await searchReady(page);
  await snap('mode-advanced-after-reload');
}
