/**
 * Regenerates the committed roster-parser fixtures.
 *
 * The fixtures reproduce the *shape* of the real delivered files — their header rows,
 * column order, delimiter, padding, cell types and every layout quirk the parsers have to
 * survive — while every person in them is invented. Real committee rosters are voter
 * records, so no name, address, phone, email, date of birth or VRCNUM here belongs to
 * anyone: names come from nowhere, phone numbers use the reserved 555-01xx range, emails
 * use example.com, and VRCNUMs are made up while keeping each file's digit-and-padding
 * shape. Town, district, party and election-type values are public geography and are kept
 * as delivered, because the parsers read them.
 *
 * Usage (from apps/frontend): pnpm exec tsx scripts/makeRosterFixtures.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as xlsx from "xlsx";

const FIXTURE_DIR = path.join("src", "__tests__", "fixtures", "rosterFormats");

/* ------------------------------------------------------------------ *
 * Board of Elections "Elected County Committee List" (delimited)
 * ------------------------------------------------------------------ */

/**
 * The delivered file's header row. It does not describe the data beneath it — that
 * mismatch is the reason the parser reads by position — so it is reproduced verbatim.
 */
const BOE_HEADER =
  "voter,id,name,res address1,res address2,res address3,res address4,res address5,res city,res state,res zip,res zipplus4,mail address1,mail address2,mail city,Phone,mail zip,mail zipplus4,office address1,office address2,office city,office state,office zip,office zipplus4,home phone,work phone,cell phone,fax phone,email,party,sex,Sworn In,expired,official type,office name,election,nameprefix,firstname,middlename,lastname,namesuffix,Local Office Address1,Local Office Address2,Local Office City,Local Office State,Local Office Zip,Local Office Zipplus4,Local Office Phone 1,Local Office Phone 2,Local Office Fax Phone,Office Email,Office Term";

/** The party field arrives space-padded to a fixed width. */
const BOE_PARTY = "Democratic" + " ".repeat(30);

const BOE_FIELD_COUNT = 52;

type BoeRow = {
  vrcnum: string;
  first: string;
  /** Empty where the delivered file carries no middle initial, which shifts the tail. */
  middle: string;
  last: string;
  address1: string;
  city: string;
  zip: string;
  zipPlus4: string;
  phone: string;
  email: string;
  sex: string;
  officeName: string;
  /** `[address1, city, state, zip, zipplus4]` for the one row with a mailing address. */
  mail?: [string, string, string, string, string];
};

// prettier-ignore
const BOE_ROWS: BoeRow[] = [
  { vrcnum: "4100011", first: "AVERY", middle: "C", last: "LINDHOLM", address1: "1 BRIARWOOD CIR", city: "FAIRPORT", zip: "14450", zipPlus4: "1445", phone: "555-0113", email: "", sex: "M", officeName: "PERINTON/058/014-CC-Democratic" },
  { vrcnum: "410022", first: "TOBIAS", middle: "M", last: "ANSELL", address1: "1 MERIDIAN LN", city: "PITTSFORD", zip: "14534", zipPlus4: "1453", phone: "(585) 555-0129", email: "TANSELL@EXAMPLE.COM", sex: "M", officeName: "PITTSFORD/059/024-CC-Democratic" },
  { vrcnum: "900012345", first: "GABRIEL", middle: "A", last: "NORQUIST", address1: "1 PLEASANT ST APT 501", city: "ROCHESTER", zip: "14604", zipPlus4: "1460", phone: "(704) 555-0147", email: "", sex: "M", officeName: "ROCHESTER/025/014-CC-Democratic" },
  { vrcnum: "900023456", first: "ADELINE", middle: "R", last: "VOSS", address1: "10 BRANDLEY HLS", city: "PITTSFORD", zip: "14534", zipPlus4: "1453", phone: "", email: "", sex: "F", officeName: "PITTSFORD/059/010-CC-Democratic" },
  { vrcnum: "41003479", first: "SPENCER", middle: "M", last: "VOSS", address1: "10 BRANDLEY HLS", city: "PITTSFORD", zip: "14534", zipPlus4: "1453", phone: "555-0152", email: "", sex: "M", officeName: "PITTSFORD/059/010-CC-Democratic" },
  { vrcnum: "42004104", first: "LENORA", middle: "J", last: "CALDWELL-RITTER", address1: "10 BAYSHORE GRN DR", city: "ROCHESTER", zip: "14624", zipPlus4: "1462", phone: "(585) 555-0161", email: "LCALDWELLRITTER@EXAMPLE.COM", sex: "F", officeName: "CHILI/046/007-CC-Democratic" },
  { vrcnum: "4300634", first: "MARCUS", middle: "L", last: "RITTER", address1: "10 BAYSHORE GRN DR", city: "ROCHESTER", zip: "14624", zipPlus4: "1462", phone: "(585) 555-0178", email: "MRITTER@EXAMPLE.COM", sex: "M", officeName: "CHILI/046/007-CC-Democratic" },
  { vrcnum: "491120", first: "MERIDITH", middle: "S", last: "CALLOWAY", address1: "10 BLOSSOMDALE CIR", city: "HAMLIN", zip: "14464", zipPlus4: "1446", phone: "", email: "", sex: "F", officeName: "HAMLIN/051/006-CC-Democratic" },
  { vrcnum: "41811244", first: "CHESTER", middle: "C", last: "ELLSWORTH", address1: "10 CHAPEL ST", city: "HONEOYE FALLS", zip: "14472", zipPlus4: "1206", phone: "555-0186", email: "", sex: "M", officeName: "MENDON/054/001-CC-Democratic" },
  { vrcnum: "41811245", first: "DELPHINE", middle: "", last: "ELLSWORTH-HAYES", address1: "10 CHAPEL ST", city: "HONEOYE FALLS", zip: "14472", zipPlus4: "1206", phone: "555-0186", email: "", sex: "F", officeName: "MENDON/054/008-CC-Democratic" },
  { vrcnum: "465916", first: "WILLARD", middle: "J", last: "CROMWELL", address1: "10 NAVARRO RD", city: "ROCHESTER", zip: "14621", zipPlus4: "1023", phone: "(585) 555-0194", email: "", sex: "M", officeName: "ROCHESTER/017/005-CC-DEMOCRATIC" },
  { vrcnum: "4606263", first: "MARISOL", middle: "M", last: "PENHALE", address1: "10 OAKSFIELD CIR", city: "PENFIELD", zip: "14526", zipPlus4: "1452", phone: "(585) 555-0203", email: "MPENHALE@EXAMPLE.COM", sex: "F", officeName: "PENFIELD/057/024-CC-Democratic" },
  { vrcnum: "4606264", first: "ROLAND", middle: "J", last: "PENHALE", address1: "10 OAKSFIELD CIR", city: "PENFIELD", zip: "14526", zipPlus4: "1452", phone: "(585) 555-0211", email: "RPENHALE@EXAMPLE.COM", sex: "M", officeName: "PENFIELD/057/024-CC-Democratic" },
  { vrcnum: "41167681", first: "TAMSIN", middle: "", last: "OKONKWO", address1: "10 OLDE ORCHARD LN", city: "FAIRPORT", zip: "14450", zipPlus4: "1445", phone: "555-0228", email: "", sex: "F", officeName: "PERINTON/058/007-CC-Democratic" },
  { vrcnum: "900034567", first: "ANIKA", middle: "G", last: "RAMSDELL", address1: "140 SANDERLING RD", city: "ROCHESTER", zip: "14610", zipPlus4: "3454", phone: "", email: "", sex: "F", officeName: "BRIGHTON/045/008-CC-Democratic" },
  { vrcnum: "46849", first: "RAVI", middle: "", last: "RAMSDELL", address1: "140 SANDERLING RD", city: "ROCHESTER", zip: "14610", zipPlus4: "1461", phone: "(585) 555-0236", email: "RRAMSDELL@EXAMPLE.COM", sex: "M", officeName: "BRIGHTON/045/008-CC-Democratic" },
  { vrcnum: "41886585", first: "BRETT", middle: "J", last: "WALLINGFORD", address1: "140 SOMERSET DR", city: "ROCHESTER", zip: "14617", zipPlus4: "5644", phone: "555-0244", email: "", sex: "M", officeName: "IRONDEQUOIT/053/021-CC-Democratic" },
  { vrcnum: "46017611", first: "KRISTA", middle: "K", last: "DANFORTH", address1: "1400 LONG MEADOW RD", city: "ROCHESTER", zip: "14626", zipPlus4: "3732", phone: "555-0251", email: "", sex: "F", officeName: "GREECE/050/061-CC-Democratic" },
  { vrcnum: "45052524", first: "LORETTA", middle: "A", last: "FENWICK", address1: "141 MILLBROOK LNDG", city: "ROCHESTER", zip: "14626", zipPlus4: "1462", phone: "(585) 555-0267", email: "lfenwick_2000@example.com", sex: "F", officeName: "GREECE/050/097-CC-Democratic" },
  { vrcnum: "45067656", first: "PHILIP", middle: "A", last: "FENWICK", address1: "141 MILLBROOK LNDG", city: "ROCHESTER", zip: "14626", zipPlus4: "1462", phone: "(585) 555-0267", email: "lfenwick_2000@example.com", sex: "M", officeName: "GREECE/050/097-CC-Democratic", mail: ["PO BOX 10101", "ROCHESTER", "NY", "14626", "1462"] },
];

/**
 * Lays one row out at the 1-based positions the delivered file uses, which are not the
 * ones its header row names.
 */
function boeLine(row: BoeRow): string {
  const fields = new Array<string>(BOE_FIELD_COUNT).fill("");
  const put = (position: number, value: string) => {
    fields[position - 1] = value;
  };

  put(1, row.vrcnum);
  // The name arrives with a trailing space, and a double space where no middle initial.
  put(2, `${row.first} ${row.middle} ${row.last} `);
  put(3, row.address1);
  put(5, row.city);
  put(6, "NY");
  put(7, row.zip);
  put(8, row.zipPlus4);
  row.mail?.forEach((value, index) => put(9 + index, value));
  put(16, row.phone);
  put(20, row.email);
  put(21, BOE_PARTY);
  put(22, row.sex);
  put(23, "7/1/2026");
  put(24, "6/30/2028");
  put(25, "ELECTED");
  put(26, row.officeName);
  put(27, "PRIMARY ELECTION 2026");

  // The name split follows; a missing middle initial shifts everything after it one left.
  const nameParts = row.middle
    ? [row.first, row.middle, row.last]
    : [row.first, row.last];
  nameParts.forEach((part, index) => put(28 + index, part));
  put(row.middle ? 41 : 40, "2");

  return fields.join(",");
}

/* ------------------------------------------------------------------ *
 * Committee export workbooks
 * ------------------------------------------------------------------ */

/** The 2026-04-16 export's columns: the 2025 set plus `dob` and the Serve breakout. */
// prettier-ignore
const XLSX_2026_HEADER = ["Committee","Serve LT","Serve ED","name","res address1","res city","res state","res zip","home phone","work phone","cell phone","email","party","sex","dob","voter id","Home LTWard","Home ED","election type","Serve LTED","Serve CD","Serve SD","Serve AD","Serve LD","Serve CC/Ward"];

/** `dob` arrives as an Excel date serial, so these stay numbers rather than strings. */
// prettier-ignore
const XLSX_2026_ROWS: (string | number)[][] = [
  ["LD 023","23","006","EMERSON T BRAITHWAITE","21 SUTTON TER","ROCHESTER","NY","14620","(631) 555-0164","","","EBRAITHWAITE@EXAMPLE.COM","Democratic","M",30655,"900110001","LD 023","018","Executive Committee Appointed 12/18/2025","23006","025","055","138","023","E"],
  ["LD 024","24","015","DANIELA F BRENNIGAN","316 WESTGROVE RD","ROCHESTER","NY","14607","(585) 555-0122","","","","Democratic","F",31959,"000910002","LD 023","003","Executive Committee Appointed 12/18/2025","24015","025","055","138","024","S"],
  ["Perinton","58","012","DELIA B FORSGREN","42 CLARKES XING","FAIRPORT","NY","14450","(585) 555-0136","","","","Democratic","F",20516,"018910003","Perinton","020","Executive Committee Appointed 4/16/2026","58012","025","055","135","011","00"],
  ["Gates","49","006","TERRANCE M ABERNATHY","889 HIDDEN MEADOW RD","ROCHESTER","NY","14624","(585) 555-0131","","","TABERNATHY@EXAMPLE.COM","Democratic","M",22246,"020910004","Gates","005","Executive Committee Appointed 4/16/2026","49006","025","056","137","027","00"],
  ["Pittsford","59","012","MAXIMILLIAN J GORLAND","3 E JEFFERSON CIR","PITTSFORD","NY","14534","(585) 555-0179","","","MGORLAND@EXAMPLE.COM","Democratic","M",34122,"900110005","Pittsford","001","Executive Committee Appointed 4/16/2026","59012","025","055","135","005","00"],
  ["Irondequoit","53","003","KIERA L BARLOWE","156 HOOVER RD","ROCHESTER","NY","14617","(315) 555-0148","","","KBARLOWE@EXAMPLE.COM","Democratic","F",30723,"000910006","Irondequoit","016","Executive Committee Appointed 4/16/2026","53003","025","055","136","016","00"],
  ["East Rochester","48","005","DAVID D CIESLAK","229 W IVY ST","EAST ROCHESTER","NY","14445","","","","","Democratic","M",27353,"900110007","East Rochester","004","Executive Committee Appointed 4/16/2026","48005","025","055","135","011","ER"],
  ["Rush","61","002","KELSEY JO EBERHART","332 KEYSTONE RD","HONEOYE FALLS","NY","14472","(585) 555-0159","","","KEBERHART@EXAMPLE.COM","Democratic","F",25737,"002910008","Rush","004","Executive Committee Appointed 4/16/2026","61002","025","054","133","005","00"],
  // A malformed phone cell, as delivered: the parser must not care.
  ["Brighton","45","034","JONATHAN E KYLER","63 KNOLLTOP DR","ROCHESTER","NY","14610","(585) -","","","","Democratic","M",29094,"000910009","Brighton","015","Executive Committee Appointed 4/16/2026","45034","025","056","136","014","00"],
  ["Riga","60","006","MARIA C KESSLING","7644 BUFFALO RD","BERGEN","NY","14416","(585) 555-0106","","","","Democratic","F",21540,"018910010","Riga","006","Executive Committee Appointed 10/17/2024","60006","025","054","138","012","00"],
  ["Wheatland","64","003","DANIEL A FALCONER","255 ROBERT QUINN DR APT 1","SCOTTSVILLE","NY","14546","(585) 555-0128","","","","Democratic","M",36599,"900110011","Wheatland","004","Executive Committee Appointed 2/20/2025","64003","025","054","139","012","SC"],
  ["Hamlin","51","002","SARAH E JOHNSGARD","4196 ROOSEVELT HWY","HOLLEY","NY","14470","","","","","Democratic","F",26087,"000910012","Hamlin","004","Executive Committee Appointed 2/20/2025","51002","025","062","139","002","00"],
  ["Sweden","62","010","JOANNA B SHARPE","4987 LAKE RD","BROCKPORT","NY","14420","(678) 555-0198","","","JSHARPE@EXAMPLE.COM","Democratic","F",24499,"900110013","Sweden","010","Executive Committee Appointed 2/20/2025","62010","025","062","139","020","00"],
  ["Greece","50","005","FRANCO FEMBRIDGE","45 WAYLAND DR","ROCHESTER","NY","14626","(585) 555-0175","","","","Democratic","M",34739,"900110014","Greece","039","Executive Committee Appointed 2/20/2025","50005","025","056","134","006","03"],
  ["Penfield","57","003","JONAH P GETTLER","5 CENTER COURT LN","PENFIELD","NY","14526","(585) 555-0191","","","jgettler@example.com","Democratic","M",24657,"002910015","Penfield","003","Executive Committee Appointed 5/15/2025","57003","025","055","135","009","00"],
  ["Clarkson","47","005","LINNEA A BENNETTE","2697 SWEDEN WALKER RD","BROCKPORT","NY","14420","(585) 555-0134","","","LBENNETTE@EXAMPLE.COM","Democratic","F",22590,"018910016","Clarkson","001","Executive Committee Appointed 12/19/2024","47005","025","062","139","002","00"],
  ["Mendon","54","007","RENATA A WILLOUGHBY","12 CHAMBORD DR","MENDON","NY","14506","(585) 555-0139","","","","Democratic","F",24323,"000910017","Mendon","009","Executive Committee Appointed 12/19/2024","54007","025","054","135","005","00"],
  ["Webster","63","022","NICOLAS E HUNTLEY","226 SAN REMO DR","WEBSTER","NY","14580","(585) 555-0175","","","","Democratic","M",32647,"000910018","Webster","022","Executive Committee Appointed 12/19/2024","63022","025","055","130","015","00"],
  ["Henrietta","52","025","LALITH K GUNAWARDENA","39 ESSEX DR","ROCHESTER","NY","14623","(585) 555-0198","","","","Democratic","M",25336,"900110019","Henrietta","017","Executive Committee Appointed 12/19/2024","52025","025","056","138","012","00"],
  ["LD 024","24","015","MATTHIAS J MCDERRY","864 S GOODWIN ST","ROCHESTER","NY","14620","555-0135","","","","Democratic","M",26516,"008910020","LD 024","012","Primary Election 2024","24015","025","055","138","024","S"],
];

// prettier-ignore
const XLSX_2025_HEADER = ["Committee","Serve LT","Serve ED","name","res address1","res city","res state","res zip","home phone","work phone","cell phone","email","party","sex","voter id","Home LTWard","Home ED","election type"];

// prettier-ignore
const XLSX_2025_ROWS: (string | number)[][] = [
  ["LD 017","17","001","JARED D KLINGSTROM","898 GARLAND AVE","ROCHESTER","NY","14609","(585) 555-0171","","","JKLINGSTROM@EXAMPLE.COM","Democratic","M","900110021","LD 017","001","Primary Election 2024"],
  ["LD 017","17","001","GARRETT R LEVANDER","54 QUEENSBURY ST","ROCHESTER","NY","14609","555-0124","","","","Democratic","M","018910022","LD 017","001","Primary Election 2024"],
  ["LD 017","17","006","STEPHEN F ROESSLER","252 NAVARRO RD","ROCHESTER","NY","14621","","","","","Democratic","M","900110023","LD 026","011","Executive Committee Appointed 10/17/2024"],
  ["Brighton","45","001","IRIS A BIERWALD","215 ROSEWOOD RD","ROCHESTER","NY","14618","(937) 555-0174","","","IBIERWALD@EXAMPLE.COM","Democratic","F","900110024","Brighton","001","Primary Election 2024"],
  ["Chili","46","005","DENTON A BRAMWELL","18 WHITE BIRCH CIR","ROCHESTER","NY","14624","","","","","Democratic","M","000910025","Chili","005","Primary Election 2024"],
  // A double-space name, as delivered.
  ["Clarkson","47","001","MARY ANN  GEOGHAN","90 LYNNGROVE DR","BROCKPORT","NY","14420","(585) 555-0112","","","MGEOGHAN@EXAMPLE.COM","Democratic","F","014910026","Clarkson","003","Primary Election 2024"],
  ["East Rochester","48","001","BRIAN J GRAVENOR","308 E ELM ST","E ROCHESTER","NY","14445","(216) 555-0180","","","BGRAVENOR@EXAMPLE.COM","Democratic","M","900110027","East Rochester","005","Executive Committee Appointed 10/17/2024"],
  ["Gates","49","002","TIMOTHY P GUILLERMO","13 AVANTI DR","ROCHESTER","NY","14606","(585) 555-0130","","","TGUILLERMO@EXAMPLE.COM","Democratic","M","900110028","Gates","002","Primary Election 2024"],
  ["Greece","50","001","LEILA H AMARI-ODEN","105 DOHRWOOD DR","ROCHESTER","NY","14612","555-0155","","","LAMARIODEN@EXAMPLE.COM","Democratic","F","000910029","Greece","035","Primary Election 2024"],
  ["Hamlin","51","001","NADINE A MARSTON","18 GREENRIDGE CRES","HAMLIN","NY","14464","(585) 555-0155","","","","Democratic","F","016910030","Hamlin","001","Primary Election 2024"],
  ["Henrietta","52","001","MATTHEW C TELFORD","56 SPARROW DR","W HENRIETTA","NY","14586","","","","","Democratic","M","900110031","Henrietta","010","Executive Committee Appointed 12/19/2024"],
  ["Irondequoit","53","001","LORRAINE S KNAPPE","726 LAURELTON RD","ROCHESTER","NY","14609","","","","","Democratic","F","014910032","Irondequoit","023","Primary Election 2024"],
  ["Mendon","54","001","MORRIS W BICKFORD","7 SIBLEYVILLE LN","HONEOYE FALLS","NY","14472","555-0124","","","","Democratic","M","018910033","Mendon","001","Primary Election 2024"],
  ["Ogden","55","001","AURORA V BRANNOCK-FROST","115 PARKHILL DR","SPENCERPORT","NY","14559","555-0126","","","ABRANNOCK@EXAMPLE.COM","Democratic","F","002910034","Ogden","001","Primary Election 2024"],
  ["Parma","56","001","PAULINE C CRANDALL","78 WAUTOMA BEACH RD","HILTON","NY","14468","(585) 555-0157","","","PCRANDALL@EXAMPLE.COM","Democratic","F","020910035","Parma","009","Executive Committee Appointed 10/17/2024"],
  ["Penfield","57","001","KEVIN D BERRIDGE","15 SAINT MARGARET WAY","ROCHESTER","NY","14625","(315) 555-0129","","","KBERRIDGE@EXAMPLE.COM","Democratic","M","900110036","Penfield","001","Primary Election 2024"],
  ["Perinton","58","003","JOANNE Y CORVINO","8 TREETOP DR","FAIRPORT","NY","14450","(315) 555-0124","","","JCORVINO@EXAMPLE.COM","Democratic","F","900110037","Perinton","003","Executive Committee Appointed 2/20/2025"],
  ["Pittsford","59","001","BERNARD T MCCULLOUGH","53 RANDALL PL","PITTSFORD","NY","14534","555-0113","","","","Democratic","M","013910038","Pittsford","001","Primary Election 2024"],
  ["Riga","60","001","JOHN M LOSEY","315 STEARNS RD","CHURCHVILLE","NY","14428","555-0151","","","","Democratic","M","015910039","Riga","004","Primary Election 2024"],
  ["Rush","61","001","SUSANNA I SWANBERG","14 MEADOWOOD","RUSH","NY","14543","(585) 555-0134","","","SSWANBERG@EXAMPLE.COM","Democratic","F","002910040","Rush","001","Primary Election 2024"],
];

/** Write a one-sheet workbook whose sheet name matches the delivered export's. */
function writeWorkbook(
  outputPath: string,
  sheetName: string,
  rows: (string | number)[][],
): void {
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet(rows), sheetName);
  xlsx.writeFile(book, outputPath);
  console.log(`${outputPath}: ${rows.length - 1} rows`);
}

fs.mkdirSync(FIXTURE_DIR, { recursive: true });

const boeOutput = path.join(
  FIXTURE_DIR,
  "boe-elected-list-2026-2028.excerpt.csv",
);
fs.writeFileSync(
  boeOutput,
  [BOE_HEADER, ...BOE_ROWS.map(boeLine)].join("\n") + "\n",
);
console.log(`${boeOutput}: ${BOE_ROWS.length} rows`);

writeWorkbook(
  path.join(FIXTURE_DIR, "committee-export-2026-04-16.excerpt.xlsx"),
  "Export Current Committee with S",
  [XLSX_2026_HEADER, ...XLSX_2026_ROWS],
);

writeWorkbook(
  path.join(FIXTURE_DIR, "committee-export-2025-05-15.excerpt.xlsx"),
  "Export Current Committee",
  [XLSX_2025_HEADER, ...XLSX_2025_ROWS],
);
