// Steps for driver.mjs on /recordsearch with SYNTHETIC results that carry `activeCommittee` (ticket 08),
// for screenshots that may be published. /api/fetchFilteredData is fulfilled with 10 made-up voters, some
// of them ACTIVE committee members; any other /api call is logged so you can check it shows no real data.
// Sign in as a Developer, Admin or Leader to see the badge. ACT=ReadAccess (Developer session) sets the
// acting role first, to show the UI hiding the badge; the real server never sends it to ReadAccess.
const FIRSTS = ['ALEX', 'ALEXA', 'ALEXANDER', 'ALEXANDRA', 'ALEXIS'];
const STREETS = ['EXAMPLE ST', 'SAMPLE AVE', 'PLACEHOLDER RD'];
const COMMITTEES = {
  0: { committeeListId: 101, cityTown: 'EXAMPLETOWN', legDistrict: 17, electionDistrict: 4 },
  3: { committeeListId: 102, cityTown: 'SAMPLEVILLE', legDistrict: -1, electionDistrict: 12 },
  4: { committeeListId: 103, cityTown: 'EXAMPLETOWN', legDistrict: 18, electionDistrict: 9 },
  7: { committeeListId: 104, cityTown: 'PLACEHOLDER CITY', legDistrict: 22, electionDistrict: 101 },
};
const records = Array.from({ length: 10 }, (_, i) => ({
  VRCNUM: `TEST${String(i + 1).padStart(6, '0')}`,
  committeeId: null, addressForCommittee: null, latestRecordEntryYear: 2026, latestRecordEntryNumber: 1,
  lastName: i % 4 === 3 ? 'SAMPLES' : 'SAMPLE', firstName: FIRSTS[i % 5], middleInitial: 'QRSTU'[i % 5],
  suffixName: null, houseNum: 100 + i * 10, street: STREETS[i % 3],
  apartment: null, halfAddress: null, resAddrLine2: null, resAddrLine3: null,
  city: 'EXAMPLETOWN', state: 'NY', zipCode: '00000', zipSuffix: null,
  telephone: `(555)010-01${String(i).padStart(2, '0')}`, email: i % 3 === 0 ? `alex.sample${i}@example.com` : null,
  mailingAddress1: null, mailingAddress2: null, mailingAddress3: null, mailingAddress4: null,
  mailingCity: null, mailingState: null, mailingZip: null, mailingZipSuffix: null,
  party: ['DEM', 'REP', 'BLK', 'WOR'][i % 4], gender: i % 2 ? 'F' : 'M',
  DOB: new Date(Date.UTC(1950 + i * 3, i % 12, 1 + i, 12)).toISOString(), L_T: null,
  electionDistrict: 1 + (i % 9), countyLegDistrict: String(17 + (i % 3)), stateAssmblyDistrict: '136',
  stateSenateDistrict: '56', congressionalDistrict: '25', CC_WD_Village: null, townCode: null,
  lastUpdate: '2026-01-15T00:00:00.000Z', originalRegDate: new Date(Date.UTC(1990 + i, 5, 1)).toISOString(),
  statevid: `NY0000000000${String(i).padStart(4, '0')}`, hasDiscrepancy: false,
  ...(COMMITTEES[i] ? { activeCommittee: COMMITTEES[i] } : {}),
}));

export default async function (page, { width, snap }) {
  page.on('request', (r) => {
    if (r.url().includes('/api/') && !r.url().includes('/api/fetchFilteredData'))
      console.error(`[synthetic] unmocked API call: ${r.method()} ${r.url()}`);
  });
  await page.route('**/api/fetchFilteredData', (route) =>
    route.fulfill({ json: { data: records, totalRecords: records.length } }));

  if (process.env.ACT) {
    await page.evaluate((role) => localStorage.setItem('actingPermissions', role), process.env.ACT);
    await page.reload({ waitUntil: 'networkidle' });
  }

  // Keep the Next.js dev indicator out of the shots.
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });

  const first = page.getByLabel('First name', { exact: true });
  await first.waitFor({ timeout: 90000 });
  await first.fill('Alex');
  await page.getByLabel('Last name', { exact: true }).fill('Sample');
  await page.getByRole('button', { name: /^(search|submit)$/i }).first().click();

  if (width < 768) {
    const cards = page.getByRole('list', { name: 'Voter records' });
    const card = cards.getByRole('button').first();
    await card.waitFor({ timeout: 90000 });
    await cards.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await snap('recordsearch-badge-results');
    await card.click();
    await page.getByRole('dialog', { name: 'Voter details' }).waitFor();
  } else {
    await page.getByText('See more details').first().waitFor({ timeout: 90000 });
    await page.locator('#voter-record-table').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await snap('recordsearch-badge-results');
    const btn = page.locator('#voter-record-table tbody tr').first().getByRole('button');
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
  }
  await page.waitForTimeout(800);
  await snap('recordsearch-badge-details');
}
