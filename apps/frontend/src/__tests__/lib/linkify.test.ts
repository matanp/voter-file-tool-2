import { linkifyText } from "~/lib/linkify";

describe("linkifyText", () => {
  it("links emails and URLs and keeps the text around them", () => {
    expect(
      linkifyText(
        "Send the letter to stephen@example.org or see https://mcdc.example.org/resign.",
      ),
    ).toEqual([
      { kind: "text", text: "Send the letter to " },
      { kind: "link", text: "stephen@example.org", href: "mailto:stephen@example.org" },
      { kind: "text", text: " or see " },
      {
        kind: "link",
        text: "https://mcdc.example.org/resign",
        href: "https://mcdc.example.org/resign",
      },
      { kind: "text", text: "." },
    ]);
  });

  it("gives www. links an https href", () => {
    expect(linkifyText("www.example.org")).toEqual([
      { kind: "link", text: "www.example.org", href: "https://www.example.org" },
    ]);
  });

  it("returns plain text, including markup, untouched", () => {
    const text = "No links here.\n<a href=\"javascript:alert(1)\">x</a> **bold**";
    const parts = linkifyText(text);
    expect(parts.every((p) => p.kind === "text")).toBe(true);
    expect(parts.map((p) => p.text).join("")).toBe(text);
  });

  it("never produces an href other than mailto: or http(s):", () => {
    const parts = linkifyText(
      "javascript:alert(1) data:text/html,x a@b.co http://ok.example ftp://nope.example",
    );
    for (const part of parts) {
      if (part.kind === "link") expect(part.href).toMatch(/^(mailto:|https?:\/\/)/);
    }
  });

  it("returns nothing for empty text", () => {
    expect(linkifyText("")).toEqual([]);
  });
});
