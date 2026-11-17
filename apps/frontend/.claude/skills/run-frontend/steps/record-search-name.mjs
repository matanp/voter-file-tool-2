// Steps for driver.mjs on /recordsearch: search a name, then open the first result's details.
// NAME env var overrides the search (default "John Smith").
export default async function (page, { snap }) {
  const [first, ...rest] = (process.env.NAME ?? 'John Smith').split(' ');
  await page.getByPlaceholder('Enter First Name(s)').fill(first);
  await page.getByPlaceholder('Enter Last Name(s)').fill(rest.join(' '));
  // Submit adds the typed text as chips and searches in one click.
  await page.getByRole('button', { name: /submit/i }).first().click();
  // The loading skeleton reuses #voter-record-table; wait for a real row's button instead.
  await page.getByText('See more details').first().waitFor({ timeout: 90000 });
  await page.locator('#voter-record-table').scrollIntoViewIfNeeded();
  await snap('recordsearch-results');
  const btn = page.locator('#voter-record-table tbody tr').first().getByRole('button');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForTimeout(800);
  await snap('recordsearch-details');
}
