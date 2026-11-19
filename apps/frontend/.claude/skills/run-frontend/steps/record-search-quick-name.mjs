// Steps for driver.mjs on /recordsearch: search with the quick name box, then open the first
// result's details. Phones (< 768) get result cards and a sheet; md and up get the table and popover.
// NAME env var overrides the search (default "John Smith").
export default async function (page, { width, snap }) {
  const [first, ...rest] = (process.env.NAME ?? 'John Smith').split(' ');
  await page.getByLabel('First name', { exact: true }).fill(first);
  await page.getByLabel('Last name', { exact: true }).fill(rest.join(' '));
  // The quick name box's button is "Search (Ctrl+Enter)"; the criteria builder's is "Submit …".
  await page.getByRole('button', { name: /^search\b/i }).first().click();
  if (width < 768) {
    const card = page.getByRole('list', { name: 'Voter records' }).getByRole('button').first();
    await card.waitFor({ timeout: 90000 });
    await card.scrollIntoViewIfNeeded();
    await snap('recordsearch-results');
    await card.click();
    await page.getByRole('dialog', { name: 'Voter details' }).waitFor();
  } else {
    // The loading skeleton reuses #voter-record-table; wait for a real row's button instead.
    await page.getByText('See more details').first().waitFor({ timeout: 90000 });
    await page.locator('#voter-record-table').scrollIntoViewIfNeeded();
    await snap('recordsearch-results');
    const btn = page.locator('#voter-record-table tbody tr').first().getByRole('button');
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
  }
  await page.waitForTimeout(800);
  await snap('recordsearch-details');
}
