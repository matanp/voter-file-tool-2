// Steps for driver.mjs on /committees with the workspace on (serve.sh --workspace):
// open the first committee in the list (below md this switches list -> detail view).
export default async function (page, { snap }) {
  // Row text is like "Rochester ED 12/4 seats filled2 pending" (sr-only town + ED + count run together).
  await page.locator('button', { hasText: 'seats filled' }).first().click();
  await page.waitForTimeout(2500);
  await snap('committees-detail');
}
