// main.ts is mend, the CLI SPEC.md specifies, and this is the kit's starting point for it (MIT). It does sections 1 to 4, 9 and 10 of SPEC.md: the command line, the output and
// exit codes, safe paths, format detection, JSON edits and the all-or-nothing write. The other three formats are
// detected and then read as holding no edit, so they answer `error: parse 1`: reading unified diffs (section 6),
// SEARCH/REPLACE blocks (section 7) and V4A patches (section 8), and matching lines at three tiers (section 5), are
// yours to write. Node 22, the standard library alone; run it as `node main.ts [options] [PATCH]`.
//
// In a trial the grader runs `node /bot/main.ts` with MAKEFUN_ENV_URL set, and then this file hands over to runner.ts
// (the last lines below): keep that hand-over and runner.ts as they are, and write the CLI.

import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { dirname } from 'node:path';

const FORMATS = ['auto', 'unified', 'search-replace', 'v4a', 'json'];

class Exit2 {
  readonly line: string;
  constructor(line: string) {
    this.line = line;
  }
}
class Fail {
  readonly code: string;
  readonly path: string;
  constructor(code: string, path: string) {
    this.code = code;
    this.path = path;
  }
}

const blank = (s: string): boolean => s.trim() === '';

function patchLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split('\n');
  if (text.endsWith('\n')) lines.pop();
  return lines.map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
}

function safe(p: string): boolean {
  return p !== '' && !p.startsWith('/') && !p.includes('\\') && p.split('/').every((s) => s !== '' && s !== '.' && s !== '..');
}

/** The tree as the edits leave it: changed paths in `now` (null: deleted), the rest read from disk. */
class Tree {
  private readonly orig = new Map<string, string | null>();
  readonly now = new Map<string, string | null>();
  readonly moves: { old: string; new: string }[] = [];
  original(p: string): string | null {
    if (!this.orig.has(p)) {
      let v: string | null = null;
      try {
        if (statSync(p).isFile()) v = readFileSync(p, 'utf8');
      } catch {
        v = null;
      }
      this.orig.set(p, v);
    }
    return this.orig.get(p)!;
  }
  get(p: string): string | null {
    return this.now.has(p) ? this.now.get(p)! : this.original(p);
  }
}

type Edit = (tree: Tree) => void;

function detect(lines: string[]): string | null {
  const first = lines.findIndex((l) => !blank(l));
  if (first < 0) return null;
  if (lines[first]!.trim() === '*** Begin Patch') return 'v4a';
  const c = lines[first]!.trimStart()[0];
  if (c === '[' || c === '{') return 'json';
  if (lines.some((l) => l.trimEnd() === '<<<<<<< SEARCH')) return 'search-replace';
  if (lines.some((l, i) => l.startsWith('diff --git ') || (l.startsWith('--- ') && (lines[i + 1] ?? '').startsWith('+++ ')))) return 'unified';
  return null;
}

/** One JSON edit object (SPEC.md section 9), or null when it is not one. */
function jsonEdit(v: unknown): Edit | null {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const p = o.path;
  if (typeof p !== 'string') return null;
  const exists = (tree: Tree): string => {
    if (!safe(p)) throw new Fail('unsafe', p);
    const t = tree.get(p);
    if (t === null) throw new Fail('missing', p);
    return t;
  };
  if (o.command === 'create' && typeof o.file_text === 'string') {
    const text = o.file_text;
    return (tree) => {
      if (!safe(p)) throw new Fail('unsafe', p);
      if (tree.get(p) !== null) throw new Fail('exists', p);
      tree.now.set(p, text);
    };
  }
  if (o.command === 'str_replace' && typeof o.old_str === 'string' && o.old_str !== '' && (o.new_str === undefined || typeof o.new_str === 'string')) {
    const oldStr = o.old_str;
    const newStr = (o.new_str as string | undefined) ?? '';
    return (tree) => {
      const before = exists(tree);
      const nl = before.indexOf('\n');
      const crlf = nl > 0 && before[nl - 1] === '\r';
      const lf = (s: string): string => (crlf ? s.replaceAll('\r\n', '\n') : s);
      const t = lf(before);
      const old = lf(oldStr);
      let count = 0;
      for (let k = t.indexOf(old); k >= 0; k = t.indexOf(old, k + 1)) count += 1;
      if (count === 0) throw new Fail('no-match', p);
      if (count > 1) throw new Fail('ambiguous', p);
      const at = t.indexOf(old);
      const out = t.slice(0, at) + lf(newStr) + t.slice(at + old.length);
      tree.now.set(p, crlf ? out.replaceAll('\n', '\r\n') : out);
    };
  }
  if (o.command === 'insert' && typeof o.insert_line === 'number' && Number.isInteger(o.insert_line) && typeof o.new_str === 'string') {
    const line = o.insert_line;
    const add = patchLines(o.new_str);
    return (tree) => {
      const before = exists(tree);
      const nl = before.indexOf('\n');
      const br = nl > 0 && before[nl - 1] === '\r' ? '\r\n' : '\n';
      const lines = before === '' ? [] : before.split(br);
      const final = before !== '' && before.endsWith(br);
      if (final) lines.pop();
      if (line < 0 || line > lines.length) throw new Fail('no-match', p);
      lines.splice(line, 0, ...add);
      tree.now.set(p, lines.length === 0 ? '' : lines.join(br) + (final ? br : ''));
    };
  }
  return null;
}

function jsonEdits(text: string, lines: string[]): Edit[] {
  const first = lines.findIndex((l) => !blank(l));
  if (first < 0) throw new Exit2('error: parse 1');
  const edits: Edit[] = [];
  if (lines[first]!.trimStart().startsWith('[')) {
    let v: unknown;
    try {
      v = JSON.parse(text);
    } catch {
      throw new Exit2(`error: parse ${first + 1}`);
    }
    if (!Array.isArray(v)) throw new Exit2(`error: parse ${first + 1}`);
    for (const x of v) {
      const e = jsonEdit(x);
      if (e === null) throw new Exit2(`error: parse ${first + 1}`);
      edits.push(e);
    }
    return edits;
  }
  lines.forEach((l, i) => {
    if (blank(l)) return;
    let e: Edit | null = null;
    try {
      e = jsonEdit(JSON.parse(l));
    } catch {
      e = null;
    }
    if (e === null) throw new Exit2(`error: parse ${i + 1}`);
    edits.push(e);
  });
  return edits;
}

interface FileLines {
  lines: string[];
  br: string;
  final: boolean;
}

function splitFile(text: string): FileLines {
  const nl = text.indexOf('\n');
  const br = nl > 0 && text[nl - 1] === '\r' ? '\r\n' : '\n';
  if (text === '') return { lines: [], br, final: false };
  const final = text.endsWith(br);
  const lines = text.split(br);
  if (final) lines.pop();
  return { lines, br, final };
}

function joinFile(lines: string[], br: string, final: boolean): string {
  if (lines.length === 0) return '';
  return lines.join(br) + (final ? br : '');
}

const trailWs = (s: string): string => s.replace(/[ \t]+$/, '');
const leadWs = (s: string): string => s.replace(/^[ \t]+/, '');
const bothWs = (s: string): string => s.replace(/^[ \t]+|[ \t]+$/g, '');

function findTier(lines: string[], o: string[], strict: boolean): { tier: number; pos: number[] } | null {
  if (o.length === 0) return { tier: 0, pos: Array.from({ length: lines.length + 1 }, (_, k) => k) };
  const norm = [trailWs, bothWs];
  const tiers = strict ? 1 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const f = tier === 0 ? (s: string): string => s : norm[tier - 1]!;
    const pos: number[] = [];
    for (let i = 0; i + o.length <= lines.length; i++) {
      let ok = true;
      for (let j = 0; j < o.length; j++) {
        if (f(lines[i + j]!) !== f(o[j]!)) {
          ok = false;
          break;
        }
      }
      if (ok) pos.push(i);
    }
    if (pos.length > 0) return { tier, pos };
  }
  return null;
}

function replaceN(n: string[], marks: number[], o: string[], lines: string[], i: number, tier: number): string[] {
  const ind = (s: string): string => /^[ \t]*/.exec(s)![0];
  const f = ind(lines[i] ?? '');
  const p = ind(o[0] ?? '');
  return n.map((l, j) => {
    const m = marks[j] ?? -1;
    if (m >= 0) return lines[i + m] ?? l;
    if (tier !== 2 || l.trim() === '') return l;
    return l.startsWith(p) ? f + l.slice(p.length) : l;
  });
}

interface UHunk {
  a: number;
  o: string[];
  n: string[];
  marks: number[];
  noEol: boolean;
  plus: string[];
  plusNoEol: boolean;
}

interface USection {
  pairOld: string | null | undefined;
  pairNew: string | null | undefined;
  renameOld: string | undefined;
  renameNew: string | undefined;
  gitOld: string | undefined;
  gitNew: string | undefined;
  create: boolean;
  delete: boolean;
  hunks: UHunk[];
}

const stripAB = (p: string): string => (p.startsWith('a/') || p.startsWith('b/') ? p.slice(2) : p);

function headerPath(s: string): string | null {
  const p = s.split('\t')[0]!.trim();
  return p === '/dev/null' ? null : stripAB(p);
}

function newSection(): USection {
  return {
    pairOld: undefined,
    pairNew: undefined,
    renameOld: undefined,
    renameNew: undefined,
    gitOld: undefined,
    gitNew: undefined,
    create: false,
    delete: false,
    hunks: [],
  };
}

function parseHeader(sec: USection, lines: string[], i: number): number {
  while (i < lines.length) {
    const l = lines[i]!;
    if (l.startsWith('diff --git') || l.startsWith('@@')) break;
    if (l.startsWith('--- ')) {
      const nx = lines[i + 1] ?? '';
      if (!nx.startsWith('+++ ')) throw new Exit2(`error: parse ${i + 2}`);
      sec.pairOld = headerPath(l.slice(4));
      sec.pairNew = headerPath(nx.slice(4));
      i += 2;
      continue;
    }
    if (l.startsWith('rename from ')) {
      sec.renameOld = l.slice(12).trim();
      i++;
      continue;
    }
    if (l.startsWith('rename to ')) {
      sec.renameNew = l.slice(10).trim();
      i++;
      continue;
    }
    if (l.startsWith('new file mode')) {
      sec.create = true;
      i++;
      continue;
    }
    if (l.startsWith('deleted file mode')) {
      sec.delete = true;
      i++;
      continue;
    }
    i++;
  }
  return i;
}

interface BodyItem {
  ch: string;
  text: string;
  empty: boolean;
}

function parseHunks(sec: USection, lines: string[], i: number): number {
  while (i < lines.length) {
    const l = lines[i]!;
    if (l.startsWith('diff --git')) break;
    if (l.startsWith('--- ') && (lines[i + 1] ?? '').startsWith('+++ ')) break;
    if (l.startsWith('@@')) {
      const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(l);
      if (!m) throw new Exit2(`error: parse ${i + 1}`);
      const a = Number(m[1]);
      i++;
      const items: BodyItem[] = [];
      while (i < lines.length) {
        const b = lines[i]!;
        if (b.startsWith('diff --git')) break;
        if (b.startsWith('--- ') && (lines[i + 1] ?? '').startsWith('+++ ')) break;
        if (b === '') {
          items.push({ ch: ' ', text: '', empty: true });
          i++;
          continue;
        }
        const c = b[0]!;
        if (c === ' ' || c === '-' || c === '+' || c === '\\') {
          items.push({ ch: c, text: b.slice(1), empty: false });
          i++;
          continue;
        }
        break;
      }
      while (items.length > 0 && items[items.length - 1]!.empty) items.pop();
      const o: string[] = [];
      const n: string[] = [];
      const marks: number[] = [];
      const plus: string[] = [];
      for (const it of items) {
        if (it.ch === ' ' || it.ch === '-') o.push(it.text);
        if (it.ch === ' ' || it.ch === '+') {
          marks.push(it.ch === ' ' ? o.length - 1 : -1);
          n.push(it.text);
        }
        if (it.ch === '+') plus.push(it.text);
      }
      let lastN = -1;
      let lastP = -1;
      items.forEach((it, k) => {
        if (it.ch === ' ' || it.ch === '+') lastN = k;
        if (it.ch === '+') lastP = k;
      });
      const noEol = lastN >= 0 && items[lastN + 1]?.ch === '\\';
      const plusNoEol = lastP >= 0 && items[lastP + 1]?.ch === '\\';
      sec.hunks.push({ a, o, n, marks, noEol, plus, plusNoEol });
      continue;
    }
    i++;
  }
  return i;
}

function applyHunks(lines: string[], final: boolean, hunks: UHunk[], strict: boolean, path: string): { lines: string[]; final: boolean } {
  let cur = lines.slice();
  let fin = final;
  let d = 0;
  for (const h of hunks) {
    if (h.o.length === 0) {
      const at = Math.min(h.a + d, cur.length);
      const atEnd = at === cur.length;
      const nLines = replaceN(h.n, h.marks, h.o, cur, at, 0);
      cur = [...cur.slice(0, at), ...nLines, ...cur.slice(at)];
      if (atEnd) fin = !h.noEol;
      d += h.n.length;
      continue;
    }
    const found = findTier(cur, h.o, strict);
    if (found === null) throw new Fail('no-match', path);
    const target = h.a - 1 + d;
    let best = found.pos[0]!;
    for (const p of found.pos) if (Math.abs(p - target) < Math.abs(best - target)) best = p;
    const atEnd = best + h.o.length === cur.length;
    const nLines = replaceN(h.n, h.marks, h.o, cur, best, found.tier);
    cur = [...cur.slice(0, best), ...nLines, ...cur.slice(best + h.o.length)];
    if (atEnd) fin = !h.noEol;
    d += h.n.length - h.o.length;
  }
  return { lines: cur, final: fin };
}

function unifiedEdit(sec: USection, strict: boolean): Edit {
  const oldPath = sec.pairOld !== undefined ? sec.pairOld : sec.renameOld ?? sec.gitOld ?? null;
  const newPath = sec.pairNew !== undefined ? sec.pairNew : sec.renameNew ?? sec.gitNew ?? null;
  return (tree) => {
    if (oldPath !== null && !safe(oldPath)) throw new Fail('unsafe', oldPath);
    if (newPath !== null && !safe(newPath)) throw new Fail('unsafe', newPath);
    const isCreate = sec.create || oldPath === null;
    const isDelete = sec.delete || newPath === null;
    if (isCreate) {
      const np = newPath!;
      if (tree.get(np) !== null) throw new Fail('exists', np);
      const plus: string[] = [];
      let noEol = false;
      for (const h of sec.hunks) {
        if (h.plus.length > 0) {
          plus.push(...h.plus);
          noEol = h.plusNoEol;
        }
      }
      tree.now.set(np, joinFile(plus, '\n', plus.length > 0 && !noEol));
      return;
    }
    const op = oldPath!;
    const before = tree.get(op);
    if (before === null) throw new Fail('missing', op);
    if (isDelete) {
      tree.now.set(op, null);
      return;
    }
    const isMove = newPath !== null && newPath !== op;
    if (isMove && tree.get(newPath!) !== null) throw new Fail('exists', newPath!);
    const f = splitFile(before);
    const res = applyHunks(f.lines, f.final, sec.hunks, strict, op);
    const dest = isMove ? newPath! : op;
    tree.now.set(dest, joinFile(res.lines, f.br, res.final));
    if (isMove) {
      tree.now.set(op, null);
      tree.moves.push({ old: op, new: dest });
    }
  };
}

function findTierFrom(lines: string[], o: string[], strict: boolean, from: number, eofOnly: boolean): { tier: number; pos: number[] } | null {
  if (o.length === 0) return null;
  const norm = [trailWs, bothWs];
  const tiers = strict ? 1 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const f = tier === 0 ? (s: string): string => s : norm[tier - 1]!;
    const pos: number[] = [];
    for (let i = Math.max(0, from); i + o.length <= lines.length; i++) {
      if (eofOnly && i + o.length !== lines.length) continue;
      let ok = true;
      for (let j = 0; j < o.length; j++) {
        if (f(lines[i + j]!) !== f(o[j]!)) {
          ok = false;
          break;
        }
      }
      if (ok) pos.push(i);
    }
    if (pos.length > 0) return { tier, pos };
  }
  return null;
}

function findAnchor(lines: string[], anchor: string, strict: boolean, from: number): number | null {
  const norm = [trailWs, bothWs];
  const tiers = strict ? 1 : 3;
  for (let tier = 0; tier < tiers; tier++) {
    const f = tier === 0 ? (s: string): string => s : norm[tier - 1]!;
    for (let i = Math.max(0, from); i < lines.length; i++) if (f(lines[i]!) === f(anchor)) return i;
  }
  return null;
}

function srEdit(path: string, oldLines: string[], newLines: string[], strict: boolean): Edit {
  return (tree) => {
    if (!safe(path)) throw new Fail('unsafe', path);
    if (oldLines.length === 0) {
      if (tree.get(path) !== null) throw new Fail('exists', path);
      tree.now.set(path, joinFile(newLines, '\n', newLines.length > 0));
      return;
    }
    const before = tree.get(path);
    if (before === null) throw new Fail('missing', path);
    const f = splitFile(before);
    const found = findTier(f.lines, oldLines, strict);
    if (found === null) throw new Fail('no-match', path);
    if (found.pos.length > 1) throw new Fail('ambiguous', path);
    const at = found.pos[0]!;
    const nLines = replaceN(newLines, newLines.map(() => -1), oldLines, f.lines, at, found.tier);
    const out = [...f.lines.slice(0, at), ...nLines, ...f.lines.slice(at + oldLines.length)];
    tree.now.set(path, joinFile(out, f.br, f.final));
  };
}

function parseSearchReplace(lines: string[], strict = false): Edit[] {
  const edits: Edit[] = [];
  let prevEnd = 0;
  let prevPath: string | null = null;
  let i = 0;
  while (i < lines.length) {
    if (trailWs(lines[i]!) !== '<<<<<<< SEARCH') {
      i++;
      continue;
    }
    const searchIdx = i;
    let eq = -1;
    for (let k = i + 1; k < lines.length; k++) {
      if (trailWs(lines[k]!) === '=======') {
        eq = k;
        break;
      }
    }
    if (eq < 0) throw new Exit2(`error: parse ${searchIdx + 1}`);
    let end = -1;
    for (let k = eq + 1; k < lines.length; k++) {
      if (trailWs(lines[k]!) === '>>>>>>> REPLACE') {
        end = k;
        break;
      }
    }
    if (end < 0) throw new Exit2(`error: parse ${searchIdx + 1}`);
    let path: string | null = null;
    for (let k = searchIdx - 1; k >= prevEnd; k--) {
      const l = lines[k]!;
      if (blank(l)) continue;
      if (l.trim().startsWith('```')) continue;
      path = l.trim();
      break;
    }
    if (path === null) path = prevPath;
    if (path === null) throw new Exit2(`error: parse ${searchIdx + 1}`);
    edits.push(srEdit(path, lines.slice(searchIdx + 1, eq), lines.slice(eq + 1, end), strict));
    prevPath = path;
    prevEnd = end + 1;
    i = end + 1;
  }
  return edits;
}

interface VChunk {
  anchor: string | null;
  eof: boolean;
  o: string[];
  n: string[];
  marks: number[];
}

interface VSection {
  kind: 'add' | 'delete' | 'update';
  path: string;
  lineNo: number;
  moveTo?: string;
  addLines?: string[];
  chunks?: VChunk[];
}

function v4aEdit(sec: VSection, strict: boolean): Edit {
  const path = sec.path;
  return (tree) => {
    if (!safe(path)) throw new Fail('unsafe', path);
    if (sec.kind === 'add') {
      if (tree.get(path) !== null) throw new Fail('exists', path);
      const add = sec.addLines!;
      tree.now.set(path, joinFile(add, '\n', add.length > 0));
      return;
    }
    if (sec.kind === 'delete') {
      if (tree.get(path) === null) throw new Fail('missing', path);
      tree.now.set(path, null);
      return;
    }
    if (sec.moveTo !== undefined && !safe(sec.moveTo)) throw new Fail('unsafe', sec.moveTo);
    const before = tree.get(path);
    if (before === null) throw new Fail('missing', path);
    let dest = path;
    if (sec.moveTo !== undefined) {
      if (tree.get(sec.moveTo) !== null) throw new Fail('exists', sec.moveTo);
      dest = sec.moveTo;
    }
    const f = splitFile(before);
    let cur = f.lines.slice();
    let cursor = 0;
    for (const ch of sec.chunks!) {
      if (ch.anchor !== null) {
        const at = findAnchor(cur, ch.anchor, strict, cursor);
        if (at === null) throw new Fail('no-match', path);
        cursor = at + 1;
      }
      if (ch.o.length === 0) {
        const at = ch.eof ? cur.length : Math.min(cursor, cur.length);
        const nLines = replaceN(ch.n, ch.marks, ch.o, cur, at, 0);
        cur = [...cur.slice(0, at), ...nLines, ...cur.slice(at)];
        cursor = at + nLines.length;
        continue;
      }
      const found = findTierFrom(cur, ch.o, strict, cursor, ch.eof);
      if (found === null) throw new Fail('no-match', path);
      const at = found.pos[0]!;
      const nLines = replaceN(ch.n, ch.marks, ch.o, cur, at, found.tier);
      cur = [...cur.slice(0, at), ...nLines, ...cur.slice(at + ch.o.length)];
      cursor = at + nLines.length;
    }
    tree.now.set(dest, joinFile(cur, f.br, f.final));
    if (dest !== path) {
      tree.now.set(path, null);
      tree.moves.push({ old: path, new: dest });
    }
  };
}

function parseV4a(lines: string[], strict = false): Edit[] {
  const firstNb = lines.findIndex((l) => !blank(l));
  if (firstNb < 0 || lines[firstNb]!.trim() !== '*** Begin Patch') throw new Exit2(`error: parse ${firstNb < 0 ? 1 : firstNb + 1}`);
  let lastNb = -1;
  for (let k = lines.length - 1; k >= 0; k--) {
    if (!blank(lines[k]!)) {
      lastNb = k;
      break;
    }
  }
  if (lastNb < 0 || lines[lastNb]!.trim() !== '*** End Patch') throw new Exit2(`error: parse ${lines.length + 1}`);
  const isMarker = (s: string): boolean => s.startsWith('*** Add File: ') || s.startsWith('*** Delete File: ') || s.startsWith('*** Update File: ');
  const sections: VSection[] = [];
  let i = firstNb + 1;
  while (i < lastNb) {
    const l = lines[i]!;
    if (blank(l)) {
      i++;
      continue;
    }
    let kind: 'add' | 'delete' | 'update';
    let path: string;
    if (l.startsWith('*** Add File: ')) {
      kind = 'add';
      path = l.slice(14).trim();
    } else if (l.startsWith('*** Delete File: ')) {
      kind = 'delete';
      path = l.slice(17).trim();
    } else if (l.startsWith('*** Update File: ')) {
      kind = 'update';
      path = l.slice(17).trim();
    } else throw new Exit2(`error: parse ${i + 1}`);
    const lineNo = i + 1;
    const body: { text: string; no: number }[] = [];
    let j = i + 1;
    while (j < lastNb) {
      if (isMarker(lines[j]!)) break;
      body.push({ text: lines[j]!, no: j + 1 });
      j++;
    }
    while (body.length > 0 && blank(body[body.length - 1]!.text)) body.pop();
    const sec: VSection = { kind, path, lineNo };
    if (kind === 'add') {
      const add: string[] = [];
      for (const b of body) {
        if (b.text === '') add.push('');
        else if (b.text.startsWith('+')) add.push(b.text.slice(1));
        else throw new Exit2(`error: parse ${b.no}`);
      }
      sec.addLines = add;
    } else if (kind === 'delete') {
      if (body.length > 0) throw new Exit2(`error: parse ${body[0]!.no}`);
    } else {
      let k = 0;
      if (body.length > 0 && body[0]!.text.startsWith('*** Move to: ')) {
        sec.moveTo = body[0]!.text.slice(13).trim();
        k = 1;
      }
      const chunks: VChunk[] = [];
      while (k < body.length) {
        let anchor: string | null = null;
        let eof = false;
        if (body[k]!.text.startsWith('@@')) {
          const a = body[k]!.text.slice(2).trim();
          anchor = a === '' ? null : a;
          k++;
        }
        const items: { ch: string; text: string }[] = [];
        while (k < body.length) {
          const t = body[k]!.text;
          if (t.startsWith('@@')) break;
          if (t.trim() === '*** End of File') {
            eof = true;
            k++;
            break;
          }
          if (t === '') {
            items.push({ ch: ' ', text: '' });
            k++;
            continue;
          }
          const c = t[0]!;
          if (c === ' ' || c === '-' || c === '+') {
            items.push({ ch: c, text: t.slice(1) });
            k++;
            continue;
          }
          throw new Exit2(`error: parse ${body[k]!.no}`);
        }
        const o: string[] = [];
        const n: string[] = [];
        const marks: number[] = [];
        for (const it of items) {
          if (it.ch === ' ' || it.ch === '-') o.push(it.text);
          if (it.ch === ' ' || it.ch === '+') {
            marks.push(it.ch === ' ' ? o.length - 1 : -1);
            n.push(it.text);
          }
        }
        chunks.push({ anchor, eof, o, n, marks });
      }
      if (chunks.length === 0 && sec.moveTo === undefined) throw new Exit2(`error: parse ${lineNo}`);
      sec.chunks = chunks;
    }
    sections.push(sec);
    i = j;
  }
  return sections.map((s) => v4aEdit(s, strict));
}

function parseUnified(lines: string[], strict = false): Edit[] {
  const sections: USection[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i]!;
    if (l.startsWith('diff --git')) {
      const m = /^diff --git a\/(.*) b\/(.*)$/.exec(l);
      if (!m) throw new Exit2(`error: parse ${i + 1}`);
      const sec = newSection();
      sec.gitOld = stripAB(m[1]!);
      sec.gitNew = stripAB(m[2]!);
      i++;
      i = parseHeader(sec, lines, i);
      i = parseHunks(sec, lines, i);
      sections.push(sec);
      continue;
    }
    if (l.startsWith('@@')) throw new Exit2(`error: parse ${i + 1}`);
    if (l.startsWith('--- ') && (lines[i + 1] ?? '').startsWith('+++ ')) {
      const sec = newSection();
      i = parseHeader(sec, lines, i);
      i = parseHunks(sec, lines, i);
      sections.push(sec);
      continue;
    }
    i++;
  }
  return sections.map((s) => unifiedEdit(s, strict));
}

function run(args: string[]): { code: number; out: string[] } {
  let format: string | null = null;
  let check = false;
  let strict = false;
  const pos: string[] = [];
  let ended = false;
  for (const a of args) {
    if (!ended && a === '--') ended = true;
    else if (!ended && a.startsWith('-') && a !== '-') {
      if (a.startsWith('--format=') && format === null && FORMATS.includes(a.slice(9))) format = a.slice(9);
      else if (a === '--check' && !check) check = true;
      else if (a === '--strict' && !strict) strict = true;
      else return { code: 2, out: ['error: usage'] };
    } else pos.push(a);
  }
  if (pos.length > 1) return { code: 2, out: ['error: usage'] };
  const file = pos.length === 0 || pos[0] === '-' ? null : pos[0]!;
  let text = '';
  try {
    text = readFileSync(file ?? 0, 'utf8');
  } catch {
    if (file !== null) return { code: 2, out: ['error: no-patch'] };
  }
  const lines = patchLines(text);
  const kind = format === null || format === 'auto' ? detect(lines) : format;
  if (kind === null) return { code: 2, out: ['error: format'] };
  let edits: Edit[];
  try {
    edits =
      kind === 'json'
        ? jsonEdits(text, lines)
        : kind === 'unified'
          ? parseUnified(lines, strict)
          : kind === 'search-replace'
            ? parseSearchReplace(lines, strict)
            : kind === 'v4a'
              ? parseV4a(lines, strict)
              : [];
    if (edits.length === 0) throw new Exit2('error: parse 1');
  } catch (e) {
    if (e instanceof Exit2) return { code: 2, out: [e.line] };
    throw e;
  }
  const tree = new Tree();
  const fails: Fail[] = [];
  for (const edit of edits) {
    const before = new Map(tree.now);
    try {
      edit(tree);
    } catch (e) {
      if (!(e instanceof Fail)) throw e;
      tree.now.clear();
      for (const [k, v] of before) tree.now.set(k, v);
      fails.push(e);
    }
  }
  if (fails.length > 0) return { code: 1, out: [...fails.map((f) => `error: ${f.code} ${f.path}`), `failed: ${fails.length} of ${edits.length} edits`] };
  const rows: { key: string; line: string }[] = [];
  const moveOld = new Set<string>();
  const moveNew = new Set<string>();
  const moves: { old: string; new: string }[] = [];
  for (const mv of tree.moves) {
    if (tree.original(mv.old) !== null && tree.now.get(mv.old) === null && tree.original(mv.new) === null && tree.now.get(mv.new) !== null) {
      moveOld.add(mv.old);
      moveNew.add(mv.new);
      moves.push(mv);
      rows.push({ key: mv.new, line: `R ${mv.old} -> ${mv.new}` });
    }
  }
  const writes: { path: string; text: string | null }[] = [];
  for (const p of tree.now.keys()) {
    const was = tree.original(p);
    const now = tree.now.get(p)!;
    if (was === now) continue;
    if (now === null && moveOld.has(p)) continue;
    if (was === null && moveNew.has(p)) continue;
    rows.push({ key: p, line: `${was === null ? 'A' : now === null ? 'D' : 'M'} ${p}` });
    writes.push({ path: p, text: now });
  }
  for (const mv of moves) {
    writes.push({ path: mv.old, text: null });
    writes.push({ path: mv.new, text: tree.now.get(mv.new)! });
  }
  if (!check) {
    for (const w of writes) {
      if (w.text === null) rmSync(w.path, { force: true });
      else {
        mkdirSync(dirname(w.path), { recursive: true });
        writeFileSync(w.path, w.text);
      }
    }
  }
  rows.sort((a, b) => Buffer.compare(Buffer.from(a.key), Buffer.from(b.key)));
  return { code: 0, out: [...rows.map((r) => r.line), `ok: ${rows.length} ${rows.length === 1 ? 'file' : 'files'}`] };
}


const trialEnv = process.env.MAKEFUN_ENV_URL;
if (trialEnv !== undefined && trialEnv !== '') {
  // A trial: the kit's runner reads the checks from the env and runs this file on each one, without this variable.
  const { runTrial } = await import('./runner.ts');
  await runTrial(trialEnv);
} else {
  const r = run(process.argv.slice(2));
  writeSync(1, r.out.map((l) => `${l}\n`).join(''));
  process.exitCode = r.code;
}
