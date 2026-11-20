// Run every test in a Pacific time zone, set before Jest starts its workers
// (setting process.env.TZ inside a test file doesn't reach Node's ICU). CI runs
// in UTC, which hides date parsing that depends on the machine's zone; Pacific is
// the zone that stored ~2.5% of prod DOBs at 07:00/08:00 UTC.
module.exports = async () => {
  process.env.TZ = "America/Los_Angeles";
};
