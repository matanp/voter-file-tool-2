import {
  CONTACT_EMAIL_MESSAGE,
  CONTACT_PHONE_MESSAGE,
  contactErrors,
  isValidContactPhone,
} from "~/lib/validations/contact";

describe("isValidContactPhone", () => {
  it.each([
    "585-555-0123",
    "(585) 555-0123",
    "585.555.0123",
    "5855550123",
    "+1 585 555 0123",
    "555-1234",
    "585-555-0123 x12",
    "585-555-0123 ext. 4",
  ])("accepts %s", (value) => {
    expect(isValidContactPhone(value)).toBe(true);
  });

  it.each(["abc", "12", "555-CALL-NOW", "123456", "1234567890123456", "585-555-0123 #1"])(
    "rejects %s",
    (value) => {
      expect(isValidContactPhone(value)).toBe(false);
    },
  );

  it("accepts a long but real number with an extension", () => {
    expect(isValidContactPhone("+1 (585) 555-0123 ext. 123456")).toBe(true);
  });

  it("rejects an over-long value without running the pattern on it", () => {
    // Without the length cap this input takes seconds to match.
    const huge = "1" + " ".repeat(100_000) + "!";
    const start = Date.now();
    expect(isValidContactPhone(huge)).toBe(false);
    expect(Date.now() - start).toBeLessThan(50);
  });
});

describe("contactErrors", () => {
  it("allows blank contact", () => {
    expect(contactErrors({ email: "", phone: "  " })).toEqual({});
  });

  it("names each invalid field", () => {
    expect(contactErrors({ email: "not-an-email", phone: "abc" })).toEqual({
      email: CONTACT_EMAIL_MESSAGE,
      phone: CONTACT_PHONE_MESSAGE,
    });
  });

  it("trims before checking", () => {
    expect(contactErrors({ email: " jane@example.com ", phone: " 585-555-0123 " })).toEqual({});
  });
});
