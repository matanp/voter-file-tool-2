// Run every test in a US time zone, set before Jest starts its workers (setting
// process.env.TZ inside a test file doesn't reach Node's ICU). CI runs in UTC,
// which hides calendar dates rendered a day early.
module.exports = async () => {
  process.env.TZ = "America/New_York";
};
