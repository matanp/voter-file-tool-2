import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFPage,
  PDFRef,
  PDFString,
} from 'pdf-lib';
// Not re-exported from the package root. One copier per source document keeps every reference
// it copies (pages, struct elements, the ParentTree's entries) pointing at the same new objects.
import PDFObjectCopier from 'pdf-lib/cjs/core/PDFObjectCopier';

/**
 * Merges tagged PDFs that Chrome printed from consecutive slices of one report into one tagged
 * PDF whose structure tree is the one Chrome would have written for the whole report: one
 * Document element holding every slice's elements in order, a single ParentTree, and element
 * IDs that stay unique.
 *
 * pdf-lib's copyPages drops the structure tree, so this copies it explicitly:
 * - Pages keep their marked-content IDs (they are per page). Each page's /StructParents key,
 *   and the ParentTree entry it names, move up by the keys of the slices before it.
 * - Chrome names elements after DOM nodes (`node00000017`), and every browser counts from the
 *   same start, so two slices reuse the same IDs. Each slice's IDs, and the table-cell
 *   /Headers that refer to them, get a per-slice prefix. Without that, a cell's header could
 *   resolve to another slice's header cell.
 *
 * It refuses (throws) shapes it doesn't handle rather than writing a wrong tree: a slice
 * without a structure tree, a root that isn't a single Document element, or an object-level
 * /StructParent (links, form fields). Chrome writes none of those for the committee reports.
 *
 * It also assumes, without checking, more of what Chrome writes today: each element's attribute
 * dicts are its own (a shared one would get its /Headers prefixed twice); element IDs are plain
 * ASCII (the prefixed strings are written unescaped); the Document element's /Lang is a direct
 * value; and every slice has /ParentTreeNextKey. After a Chrome upgrade, regenerate the test
 * fixtures so pdfMerge.test.ts compares the merge with what the new Chrome writes.
 */
export async function mergeTaggedPdfs(pdfs: Uint8Array[]): Promise<Uint8Array> {
  if (pdfs.length === 0) throw new Error('mergeTaggedPdfs: no PDFs to merge');
  const dest = await PDFDocument.create({ updateMetadata: false });
  const ctx = dest.context;
  const destRootRef = ctx.nextRef();
  const destDocRef = ctx.nextRef();
  const docKids = ctx.obj([]);
  const parentTreeNums = ctx.obj([]);
  const idNames = ctx.obj([]);
  let keyOffset = 0;
  let lang: PDFObject | undefined;

  for (let slice = 0; slice < pdfs.length; slice++) {
    const src = await PDFDocument.load(pdfs[slice], { updateMetadata: false });
    const where = `mergeTaggedPdfs: slice ${slice}`;
    const prefix = `s${String(slice).padStart(4, '0')}-`;

    const rootRef = src.catalog.get(N.StructTreeRoot);
    if (!(rootRef instanceof PDFRef)) throw new Error(`${where} has no structure tree`);
    const root = src.context.lookup(rootRef, PDFDict);
    const docRef = root.get(N.K);
    const docElem = docRef instanceof PDFRef ? src.context.lookup(docRef) : undefined;
    if (!(docRef instanceof PDFRef) || !(docElem instanceof PDFDict) || docElem.get(N.S) !== N.Document) {
      throw new Error(`${where}: the structure root is not a single Document element`);
    }
    lang ??= docElem.get(N.Lang);

    namespaceIds(src, prefix, where);

    const copier = PDFObjectCopier.for(src.context, ctx);
    // Elements point up with /P. Mapping the slice's root and Document element onto the merged
    // ones re-parents them, and keeps the slice's own root (and its trees) from being copied.
    premap(copier, rootRef, destRootRef);
    premap(copier, docRef, destDocRef);

    for (const page of src.getPages()) {
      const pageRef = copier.copy(page.ref) as PDFRef;
      const node = ctx.lookup(pageRef, PDFDict);
      const key = node.get(N.StructParents);
      if (key instanceof PDFNumber) node.set(N.StructParents, PDFNumber.of(key.asNumber() + keyOffset));
      dest.addPage(PDFPage.of(node as never, pageRef, dest));
    }

    const kids = docElem.get(N.K);
    const kidList = kids === undefined ? [] : asList(src.context.lookup(kids), kids);
    for (const kid of kidList) docKids.push(copier.copy(kid));

    for (const [key, value] of numberTreeEntries(root.lookup(N.ParentTree, PDFDict))) {
      parentTreeNums.push(PDFNumber.of(key + keyOffset));
      parentTreeNums.push(copier.copy(value));
    }
    const idTree = root.lookupMaybe(N.IDTree, PDFDict);
    if (idTree) {
      for (const [name, value] of nameTreeEntries(idTree)) {
        idNames.push(PDFString.of(prefix + text(name, where)));
        idNames.push(copier.copy(value));
      }
    }

    const nextKey = root.lookupMaybe(N.ParentTreeNextKey, PDFNumber);
    keyOffset += nextKey ? nextKey.asNumber() : src.getPageCount();

    if (slice === 0) {
      for (const key of [N.MarkInfo, N.Lang, N.ViewerPreferences]) {
        const value = src.catalog.get(key);
        if (value) dest.catalog.set(key, copier.copy(value));
      }
      const info = src.context.trailerInfo.Info;
      if (info) ctx.trailerInfo.Info = copier.copy(info);
    }
  }

  const docElem = ctx.obj({ Type: 'StructElem', S: 'Document', P: destRootRef, K: docKids });
  if (lang) docElem.set(N.Lang, lang);
  ctx.assign(destDocRef, docElem);
  const root = ctx.obj({
    Type: 'StructTreeRoot',
    K: destDocRef,
    ParentTree: ctx.register(ctx.obj({ Nums: parentTreeNums })),
    ParentTreeNextKey: keyOffset,
  });
  // Name-tree keys must be sorted. Each slice's are, and the fixed-width prefixes keep the
  // slices in order.
  if (idNames.size() > 0) root.set(N.IDTree, ctx.register(ctx.obj({ Names: idNames })));
  ctx.assign(destRootRef, root);
  dest.catalog.set(N.StructTreeRoot, destRootRef);
  return dest.save();
}

const N = {
  A: PDFName.of('A'),
  Document: PDFName.of('Document'),
  Headers: PDFName.of('Headers'),
  ID: PDFName.of('ID'),
  IDTree: PDFName.of('IDTree'),
  K: PDFName.of('K'),
  Kids: PDFName.of('Kids'),
  Lang: PDFName.of('Lang'),
  MarkInfo: PDFName.of('MarkInfo'),
  Names: PDFName.of('Names'),
  Nums: PDFName.of('Nums'),
  ParentTree: PDFName.of('ParentTree'),
  ParentTreeNextKey: PDFName.of('ParentTreeNextKey'),
  S: PDFName.of('S'),
  StructElem: PDFName.of('StructElem'),
  StructParent: PDFName.of('StructParent'),
  StructParents: PDFName.of('StructParents'),
  StructTreeRoot: PDFName.of('StructTreeRoot'),
  Type: PDFName.of('Type'),
  ViewerPreferences: PDFName.of('ViewerPreferences'),
};

/**
 * Tells the copier that `from` is already copied as `to`. It reads its private memo map
 * (`traversedObjects`), so pdf-lib is pinned to an exact version in package.json; the merge
 * tests fail if a different version moves it.
 */
function premap(copier: PDFObjectCopier, from: PDFRef, to: PDFRef): void {
  const memo = (copier as unknown as { traversedObjects?: Map<PDFObject, PDFObject> }).traversedObjects;
  if (!(memo instanceof Map)) throw new Error('mergeTaggedPdfs: this pdf-lib version has no PDFObjectCopier.traversedObjects');
  memo.set(from, to);
}

function asList(resolved: PDFObject | undefined, raw: PDFObject): PDFObject[] {
  return resolved instanceof PDFArray ? resolved.asArray() : [raw];
}

function text(value: PDFObject | undefined, where: string): string {
  if (value instanceof PDFString || value instanceof PDFHexString) return value.decodeText();
  throw new Error(`${where}: expected a string, got ${value}`);
}

/** Prefixes the slice's element IDs and the /Headers that name them, in place. */
function namespaceIds(src: PDFDocument, prefix: string, where: string): void {
  for (const [, object] of src.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFDict)) continue;
    if (object.get(N.StructParent) !== undefined) {
      throw new Error(`${where}: object-level /StructParent (links, annotations) is not supported`);
    }
    if (object.get(N.Type) !== N.StructElem) continue;
    const id = object.lookup(N.ID);
    if (id !== undefined) object.set(N.ID, PDFString.of(prefix + text(id, where)));
    const attrs = object.lookup(N.A);
    if (attrs === undefined) continue;
    for (const attr of asList(attrs, attrs)) {
      const dict = src.context.lookup(attr);
      if (!(dict instanceof PDFDict)) continue;
      const headers = dict.lookupMaybe(N.Headers, PDFArray);
      if (!headers) continue;
      for (let i = 0; i < headers.size(); i++) {
        headers.set(i, PDFString.of(prefix + text(headers.lookup(i), where)));
      }
    }
  }
}

function numberTreeEntries(node: PDFDict, out: [number, PDFObject][] = []): [number, PDFObject][] {
  const nums = node.lookupMaybe(N.Nums, PDFArray);
  if (nums) for (let i = 0; i < nums.size(); i += 2) out.push([nums.lookup(i, PDFNumber).asNumber(), nums.get(i + 1)]);
  const kids = node.lookupMaybe(N.Kids, PDFArray);
  if (kids) for (let i = 0; i < kids.size(); i++) numberTreeEntries(kids.lookup(i, PDFDict), out);
  return out;
}

function nameTreeEntries(node: PDFDict, out: [PDFObject, PDFObject][] = []): [PDFObject, PDFObject][] {
  const names = node.lookupMaybe(N.Names, PDFArray);
  if (names) for (let i = 0; i < names.size(); i += 2) out.push([names.get(i), names.get(i + 1)]);
  const kids = node.lookupMaybe(N.Kids, PDFArray);
  if (kids) for (let i = 0; i < kids.size(); i++) nameTreeEntries(kids.lookup(i, PDFDict), out);
  return out;
}
