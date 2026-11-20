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
