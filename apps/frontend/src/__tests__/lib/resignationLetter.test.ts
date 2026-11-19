import {
  declaredLetterType,
  letterDisposition,
  letterSummaryOf,
  sniffLetterContentType,
  stagedLetterSchema,
} from "~/lib/resignationLetter";

const bytes = (...values: Array<number | string>) =>
  new Uint8Array(
    values.flatMap((v) =>
      typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v],
    ),
  );

describe("sniffLetterContentType", () => {
  it("should recognise PDF, JPEG, PNG and HEIC by their first bytes", () => {
    expect(sniffLetterContentType(bytes("%PDF-1.7\n"))).toBe("application/pdf");
    expect(sniffLetterContentType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(
      sniffLetterContentType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0)),
    ).toBe("image/png");
    expect(sniffLetterContentType(bytes(0, 0, 0, 0x18, "ftypheic", 0, 0))).toBe(
      "image/heic",
    );
    // A generic HEIF major brand with HEIC among the compatible brands.
    expect(
      sniffLetterContentType(bytes(0, 0, 0, 0x18, "ftypmif1", 0, 0, 0, 0, "mif1heic")),
    ).toBe("image/heic");
  });

  it("should refuse HEIF files that aren't HEIC, such as AVIF", () => {
    expect(
      sniffLetterContentType(bytes(0, 0, 0, 0x1c, "ftypavif", 0, 0, 0, 0, "avifmif1miaf")),
    ).toBeNull();
    expect(
      sniffLetterContentType(bytes(0, 0, 0, 0x1c, "ftypmif1", 0, 0, 0, 0, "mif1avifmiaf")),
    ).toBeNull();
    // A HEIC brand past the end of the ftyp box doesn't count.
    expect(
      sniffLetterContentType(bytes(0, 0, 0, 0x14, "ftypmif1", 0, 0, 0, 0, "mif1heic")),
    ).toBeNull();
  });

  it("should refuse other files, including ones named or typed as letters", () => {
    expect(sniffLetterContentType(bytes("PK", 3, 4, "word/"))).toBeNull(); // .docx
    expect(sniffLetterContentType(bytes("<html><body>"))).toBeNull();
    expect(sniffLetterContentType(bytes(0, 0, 0, 0x18, "ftypisom"))).toBeNull(); // MP4
    expect(sniffLetterContentType(bytes("%PD"))).toBeNull();
    expect(sniffLetterContentType(new Uint8Array())).toBeNull();
  });
});

describe("declaredLetterType", () => {
  it("should use the browser's type when it is accepted", () => {
    expect(declaredLetterType({ name: "x.bin", type: "application/pdf" })).toBe(
      "application/pdf",
    );
  });

  it("should infer HEIC from the extension when the browser gives no type", () => {
    expect(declaredLetterType({ name: "IMG_1.HEIC", type: "" })).toBe("image/heic");
    expect(declaredLetterType({ name: "scan.heif", type: "image/heif" })).toBe(
      "image/heic",
    );
  });

  it("should refuse Word documents and unknown files", () => {
    expect(
      declaredLetterType({
        name: "letter.docx",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ).toBeNull();
    expect(declaredLetterType({ name: "letter.pdf", type: "text/html" })).toBeNull();
    expect(declaredLetterType({ name: "letter", type: "" })).toBeNull();
  });
});

describe("letter keys and serving", () => {
  it("should download HEIC and open the other types inline", () => {
    expect(letterDisposition("image/heic")).toBe("attachment");
    expect(letterDisposition("application/pdf")).toBe("inline");
    expect(letterDisposition("image/png")).toBe("inline");
  });

  it("should accept only staging keys from a submit", () => {
    const base = { fileName: "a.pdf" };
    expect(
      stagedLetterSchema.safeParse({
        ...base,
        stagingKey: "resignation-letters/staging/m1/abc",
      }).success,
    ).toBe(true);
    expect(
      stagedLetterSchema.safeParse({
        ...base,
        stagingKey: "resignation-letters/m1/abc.pdf",
      }).success,
    ).toBe(false);
  });

  it("should summarise a row's letter without its key", () => {
    expect(
      letterSummaryOf({
        resignationLetterKey: "resignation-letters/m1/a.pdf",
        resignationLetterContentType: "application/pdf",
        resignationLetterFileName: "a.pdf",
      }),
    ).toEqual({ fileName: "a.pdf", contentType: "application/pdf" });
    expect(
      letterSummaryOf({
        resignationLetterKey: null,
        resignationLetterContentType: null,
        resignationLetterFileName: null,
      }),
    ).toBeNull();
  });
});
