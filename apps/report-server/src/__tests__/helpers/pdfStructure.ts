import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFRef,
  PDFString,
} from 'pdf-lib';

/**
 * A tagged PDF's structure tree in a form that doesn't depend on object numbers or element ID
 * strings, so a merged PDF can be compared with the one Chrome prints in one pass:
 * - `nodes`: every structure element in reading order, with its role, attributes, and children.
 *   A child is another element (by path, e.g. `0.3.1`) or marked content (page index, MCID).
 *   A table cell's /Headers are written as the paths of the header cells they resolve to.
 * - `errors`: internal inconsistencies a reader would trip on: /StructParents keys reused,
 *   ParentTree entries that don't point back at the element owning that marked content,
 *   IDs or /Headers that don't resolve, /P links that don't point at the parent.
 */
export type PdfStructure = {
  pages: number;
  catalog: Record<string, string | undefined>;
  nodes: string[];
  markedContent: number;
  headerRefs: number;
  errors: string[];
};

const name = (s: string) => PDFName.of(s);
const str = (o: PDFObject | undefined) =>
  o instanceof PDFString || o instanceof PDFHexString ? o.decodeText() : undefined;

export async function readPdfStructure(bytes: Uint8Array): Promise<PdfStructure> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const ctx = doc.context;
  const errors: string[] = [];
  const pageIndex = new Map(doc.getPages().map((p, i) => [p.ref.toString(), i]));
  const rootRef = doc.catalog.get(name('StructTreeRoot'));
  const catalog = Object.fromEntries(
    ['MarkInfo', 'Lang', 'ViewerPreferences'].map((k) => [
      k,
      ctx.lookup(doc.catalog.get(name(k)))?.toString().replace(/\s+/g, ' '),
    ]),
  );
  if (!(rootRef instanceof PDFRef)) {
    return { pages: doc.getPageCount(), catalog, nodes: [], markedContent: 0, headerRefs: 0, errors: ['no StructTreeRoot'] };
  }
  const root = ctx.lookup(rootRef, PDFDict);

  const ids = new Map<string, string>();
  const walkNames = (node: PDFDict) => {
    const names = node.lookupMaybe(name('Names'), PDFArray);
    if (names) for (let i = 0; i < names.size(); i += 2) ids.set(str(names.lookup(i))!, names.get(i + 1).toString());
    const kids = node.lookupMaybe(name('Kids'), PDFArray);
    if (kids) for (let i = 0; i < kids.size(); i++) walkNames(kids.lookup(i, PDFDict));
  };
  const idTree = root.lookupMaybe(name('IDTree'), PDFDict);
  if (idTree) walkNames(idTree);

  const parentTree = new Map<number, PDFObject>();
  const walkNums = (node: PDFDict) => {
    const nums = node.lookupMaybe(name('Nums'), PDFArray);
    if (nums) {
      for (let i = 0; i < nums.size(); i += 2) {
        const key = nums.lookup(i, PDFNumber).asNumber();
        if (parentTree.has(key)) errors.push(`ParentTree key ${key} appears twice`);
        parentTree.set(key, nums.lookup(i + 1)!);
      }
    }
    const kids = node.lookupMaybe(name('Kids'), PDFArray);
    if (kids) for (let i = 0; i < kids.size(); i++) walkNums(kids.lookup(i, PDFDict));
  };
  walkNums(root.lookup(name('ParentTree'), PDFDict));

  const seenKeys = new Set<number>();
  const pageKeys = doc.getPages().map((p, i) => {
    const key = p.node.get(name('StructParents'));
    const n = key instanceof PDFNumber ? key.asNumber() : -1;
    if (seenKeys.has(n)) errors.push(`page ${i} reuses /StructParents ${n}`);
    seenKeys.add(n);
    return n;
  });
  const nextKey = root.lookupMaybe(name('ParentTreeNextKey'), PDFNumber)?.asNumber();
  if (nextKey !== undefined && Math.max(...pageKeys) >= nextKey) errors.push('ParentTreeNextKey is not past every key');

  const pathOf = new Map<string, string>();
  const owner = new Map<string, string>();
  const order: { node: Record<string, unknown> }[] = [];
  let headerRefs = 0;
  const visit = (ref: PDFObject, path: string, page: number | undefined, parent: string) => {
    const elem = ctx.lookup(ref, PDFDict);
    const self = ref.toString();
    pathOf.set(self, path);
    if (elem.get(name('P'))?.toString() !== parent) errors.push(`${path}: /P does not point at its parent`);
    const pg = elem.get(name('Pg'));
    if (pg) page = pageIndex.get(pg.toString());
    const node: Record<string, unknown> = { S: elem.get(name('S'))?.toString(), kids: [] };
    for (const k of ['Lang', 'Alt', 'ActualText', 'T', 'E']) {
      const v = elem.lookup(name(k));
      if (v !== undefined) node[k] = str(v) ?? v.toString();
    }
    const id = str(elem.lookup(name('ID')));
    if (id !== undefined && ids.get(id) !== self) errors.push(`${path}: /ID ${id} is not in the IDTree`);
    const attrs = elem.lookup(name('A'));
    if (attrs) {
      node.A = (attrs instanceof PDFArray ? attrs.asArray().map((a) => ctx.lookup(a)) : [attrs]).map((a) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of (a as PDFDict).entries()) {
          if (k === name('Headers')) {
            out.Headers = ctx.lookup(v, PDFArray).asArray().map((h) => {
              headerRefs++;
              const target = ids.get(str(ctx.lookup(h))!);
              if (!target) errors.push(`${path}: /Headers ${str(ctx.lookup(h))} does not resolve`);
              return { ref: target };
            });
          } else out[k.toString()] = v.toString();
        }
        return out;
      });
    }
    order.push({ node });
    const k = elem.get(name('K'));
    const kids = k === undefined ? [] : ctx.lookup(k) instanceof PDFArray ? (ctx.lookup(k) as PDFArray).asArray() : [k];
    kids.forEach((kid, i) => {
      const kidsOut = node.kids as unknown[];
      if (kid instanceof PDFNumber) {
        kidsOut.push(['mc', page, kid.asNumber()]);
        owner.set(`${page}:${kid.asNumber()}`, self);
        return;
      }
      const d = ctx.lookup(kid);
      if (d instanceof PDFDict && d.get(name('Type')) === name('MCR')) {
        const p = d.get(name('Pg')) ? pageIndex.get(d.get(name('Pg'))!.toString()) : page;
        const mcid = d.lookup(name('MCID'), PDFNumber).asNumber();
        kidsOut.push(['mc', p, mcid]);
        owner.set(`${p}:${mcid}`, self);
        return;
      }
      if (d instanceof PDFDict && d.get(name('Type')) === name('OBJR')) {
        kidsOut.push(['objr']);
        return;
      }
      kidsOut.push(['el', `${path}.${i}`]);
      visit(kid, `${path}.${i}`, page, self);
    });
  };
  const top = root.get(name('K'))!;
  const topKids = ctx.lookup(top) instanceof PDFArray ? (ctx.lookup(top) as PDFArray).asArray() : [top];
  topKids.forEach((kid, i) => visit(kid, String(i), undefined, rootRef.toString()));

  let covered = 0;
  pageKeys.forEach((key, page) => {
    const entry = parentTree.get(key);
    if (!(entry instanceof PDFArray)) {
      errors.push(`page ${page}: no ParentTree entry for /StructParents ${key}`);
      return;
    }
    for (let mcid = 0; mcid < entry.size(); mcid++) {
      const elem = entry.get(mcid);
      if (!(elem instanceof PDFRef)) continue;
      covered++;
      if (owner.get(`${page}:${mcid}`) !== elem.toString()) {
        errors.push(`page ${page} MCID ${mcid}: the ParentTree points at an element that doesn't own it`);
      }
    }
  });
  if (covered !== owner.size) errors.push(`the ParentTree covers ${covered} marked-content items; the tree has ${owner.size}`);

  const nodes = order.map(({ node }) => JSON.stringify(node, (k, v) => (k === 'ref' ? pathOf.get(v) : v)));
  return { pages: doc.getPageCount(), catalog, nodes, markedContent: owner.size, headerRefs, errors };
}

/** Every element ID in the IDTree, as written. */
export async function elementIds(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const root = doc.context.lookup(doc.catalog.get(name('StructTreeRoot')), PDFDict);
  const out: string[] = [];
  const walk = (node: PDFDict) => {
    const names = node.lookupMaybe(name('Names'), PDFArray);
    if (names) for (let i = 0; i < names.size(); i += 2) out.push(str(names.lookup(i))!);
    const kids = node.lookupMaybe(name('Kids'), PDFArray);
    if (kids) for (let i = 0; i < kids.size(); i++) walk(kids.lookup(i, PDFDict));
  };
  const idTree = root.lookupMaybe(name('IDTree'), PDFDict);
  if (idTree) walk(idTree);
  return out;
}
