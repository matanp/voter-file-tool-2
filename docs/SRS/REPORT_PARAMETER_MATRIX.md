# Report Parameter Matrix

Consolidated reference for all report types (SRS 3.4).

| Report Type | Formats | Scope Options | Extra Params | Leader Access | Admin Access |
|-------------|---------|---------------|--------------|---------------|--------------|
| Committee Roster (`committeeRoster`) | PDF, XLSX | Jurisdiction, Countywide | Optional LD filter within city/town scope | Jurisdiction only | Both |
| Legacy Committee Report (`ldCommittees`) | PDF, XLSX | Countywide | Field selection, column order | No | Yes (admin-only legacy flow) |
| Voter List | XLSX | N/A (search-based) | Search query, field selection | No | Yes |
| Designated Petition | PDF | N/A (payload-based) | Candidates, party, appointments | No | Yes (admin-only) |
| Absentee Report | XLSX | N/A (CSV-based) | CSV file | No | Yes |
| Sign-In Sheet | PDF | Jurisdiction, Countywide | Meeting date (optional) | Jurisdiction only | Both |
| Designation Weight Summary | PDF, XLSX | Jurisdiction, Countywide | — | Jurisdiction only | Both |
| Vacancy Report | PDF, XLSX | Jurisdiction, Countywide | Vacancy filter | Jurisdiction only | Both |
| Changes Report | PDF, XLSX | Jurisdiction, Countywide | Date range (required) | Jurisdiction only; no petition won/lost rows or vote counts (a win shows as "Added") | Both |
| Petition Outcomes Report | PDF, XLSX | Jurisdiction, Countywide | — | No | Yes (admin-only) |
