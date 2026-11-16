// Steps for driver.mjs on /recordsearch with SYNTHETIC results, for screenshots that may be published
// (PR descriptions, docs). /api/fetchFilteredData is fulfilled with made-up voters; any other /api call
// made after the page loads is logged so you can check it does not show real data.
// Works on the quick name box UI and on the older criteria builder (no quick name box).
// NAME env var sets the typed search (default "Alex Sample"); the results are always the fake ones.
const FIRSTS = ['ALEX', 'ALEXA', 'ALEXANDER', 'ALEXANDRA', 'ALEXIS'];
const STREETS = ['EXAMPLE ST', 'SAMPLE AVE', 'PLACEHOLDER RD'];
const records = Array.from({ length: 15 }, (_, i) => ({
  VRCNUM: `TEST${String(i + 1).padStart(6, '0')}`,
  committeeId: null, addressForCommittee: null, latestRecordEntryYear: 2026, latestRecordEntryNumber: 1,
  lastName: i % 4 === 3 ? 'SAMPLES' : 'SAMPLE', firstName: FIRSTS[i % 5], middleInitial: 'QRSTU'[i % 5],
  suffixName: i === 6 ? 'JR' : null, houseNum: 100 + i * 10, street: STREETS[i % 3],
  apartment: i % 5 === 2 ? `APT ${i}` : null, halfAddress: null, resAddrLine2: null, resAddrLine3: null,
  city: 'EXAMPLETOWN', state: 'NY', zipCode: '00000', zipSuffix: null,
  telephone: `(555)010-01${String(i).padStart(2, '0')}`, email: i % 3 === 0 ? `alex.sample${i}@example.com` : null,
  mailingAddress1: null, mailingAddress2: null, mailingAddress3: null, mailingAddress4: null,
  mailingCity: null, mailingState: null, mailingZip: null, mailingZipSuffix: null,
  party: ['DEM', 'REP', 'BLK', 'WOR'][i % 4], gender: i % 2 ? 'F' : 'M',
  DOB: new Date(Date.UTC(1950 + i * 3, i % 12, 1 + i, 12)).toISOString() /* noon: no TZ day shift */, L_T: null,
  electionDistrict: 1 + (i % 9), countyLegDistrict: String(17 + (i % 3)), stateAssmblyDistrict: '136',
  stateSenateDistrict: '56', congressionalDistrict: '25', CC_WD_Village: null, townCode: null,
  lastUpdate: '2026-01-15T00:00:00.000Z', originalRegDate: new Date(Date.UTC(1990 + i, 5, 1)).toISOString(),
  statevid: `NY0000000000${String(i).padStart(4, '0')}`, hasDiscrepancy: false,
}));

export default async function (page, { width, snap }) {
  page.on('request', (r) => {
    if (r.url().includes('/api/') && !r.url().includes('/api/fetchFilteredData'))
      console.error(`[synthetic] unmocked API call: ${r.method()} ${r.url()}`);
  });
  await page.route('**/api/fetchFilteredData', (route) =>
    route.fulfill({ json: { data: records, totalRecords: records.length } }));

  const [first, ...rest] = (process.env.NAME ?? 'Alex Sample').split(' ');
  const quick = page.getByLabel('First name', { exact: true });
  if (await quick.count()) {
    await quick.fill(first);
    await page.getByLabel('Last name', { exact: true }).fill(rest.join(' '));
    await page.getByRole('button', { name: /submit/i }).first().click();
  } else {
    // Criteria builder: typed text becomes a chip on blur, so the first Submit click is eaten.
    await page.getByPlaceholder('Enter First Name(s)').fill(first);
    await page.getByPlaceholder('Enter Last Name(s)').fill(rest.join(' '));
    await page.getByRole('button', { name: /submit/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /submit/i }).first().click();
  }

  const cards = page.getByRole('list', { name: 'Voter records' });
  if (width < 768 && (await quick.count())) {
    // Phone cards + details sheet (quick name UI only).
    const card = cards.getByRole('button').first();
    await card.waitFor({ timeout: 90000 });
    await cards.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await snap('recordsearch-results');
    await card.click();
    await page.getByRole('dialog', { name: 'Voter details' }).waitFor();
  } else {
    // The loading skeleton reuses #voter-record-table; wait for a real row's button instead.
    await page.getByText('See more details').first().waitFor({ timeout: 90000 });
    // Put the table's top (header row) at the top of the viewport.
    await page.locator('#voter-record-table').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await snap('recordsearch-results');
    const btn = page.locator('#voter-record-table tbody tr').first().getByRole('button');
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
  }
  await page.waitForTimeout(800);
  await snap('recordsearch-details');
}
