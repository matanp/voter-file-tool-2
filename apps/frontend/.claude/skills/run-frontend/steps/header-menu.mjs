// Steps for driver.mjs on any page: the header bar, then (below md) the hamburger menu opened.
export default async function (page, { width, snap }) {
  await page.locator('header, nav, [aria-label="Open menu"]').first().waitFor();
  await page.waitForTimeout(1000);
  await snap("header-closed");
  if (width < 768) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).waitFor();
    await page.waitForTimeout(700); // let the slide-in finish
    await snap("header-menu-open");
  }
}
