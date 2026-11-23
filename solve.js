// Optimized dependency-free reimplementation of makefun-site 1.0.0's build(input).

const REPORT_FILE = 'build-report.txt';

const byCodeUnits = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const escapeCache = new Map();

function escapeHtml(text) {
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === 38 || c === 60 || c === 62 || c === 34 || c === 39) break;
    i++;
  }
  if (i === n) return text;
  if (n <= 96) {
    const cached = escapeCache.get(text);
    if (cached !== undefined) return cached;
  }
  let out = text.slice(0, i);
  let start = i;
  for (; i < n; i++) {
    const c = text.charCodeAt(i);
    let rep;
    if (c === 38) rep = '&amp;';
    else if (c === 60) rep = '&lt;';
    else if (c === 62) rep = '&gt;';
    else if (c === 34) rep = '&quot;';
    else if (c === 39) rep = '&#39;';
    else continue;
    if (i > start) out += text.slice(start, i);
    out += rep;
    start = i + 1;
  }
  if (start < n) out += text.slice(start);
  if (n <= 96 && escapeCache.size < 65536) escapeCache.set(text, out);
  return out;
}

const SLUG_MAX = 64;
const slugCache = new Map();

function slugify(text) {
  const cached = slugCache.get(text);
  if (cached !== undefined) return cached;
  const plain = text.normalize('NFKD').replace(/\p{M}/gu, '');
  let out = '';
  let gap = false;
  const n = plain.length;
  for (let i = 0; i < n; i++) {
    const c = plain.charCodeAt(i);
    let keep = null;
    if (c >= 65 && c <= 90) keep = plain[i].toLowerCase();
    else if ((c >= 97 && c <= 122) || (c >= 48 && c <= 57)) keep = plain[i];
    if (keep === null) {
      gap = out.length > 0;
      continue;
    }
    if (gap) out += '-';
    gap = false;
    out += keep;
  }
  if (out.length > SLUG_MAX) out = out.slice(0, SLUG_MAX);
  while (out.length > 0 && out.charCodeAt(out.length - 1) === 45) out = out.slice(0, -1);
  const result = out === '' ? 'untitled' : out;
  slugCache.set(text, result);
  return result;
}

function uniqueSlug(slug, taken) {
  let out = slug;
  for (let n = 2; taken.has(out); n++) out = `${slug}-${n}`;
  taken.add(out);
  return out;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dateCache = new Map();

function longDate(date) {
  const cached = dateCache.get(date);
  if (cached !== undefined) return cached;
  const d1 = date.indexOf('-');
  const d2 = date.indexOf('-', d1 + 1);
  const y = date.slice(0, d1);
  const m = Number(date.slice(d1 + 1, d2));
  const d = Number(date.slice(d2 + 1));
  const result = `${d} ${MONTHS[m - 1]} ${y}`;
  dateCache.set(date, result);
  return result;
}

const WS_ASCII = new Uint8Array(128);
WS_ASCII[9] = WS_ASCII[10] = WS_ASCII[11] = WS_ASCII[12] = WS_ASCII[13] = WS_ASCII[32] = 1;

function isWsUnicode(c) {
  return c === 160 || c === 5760 || (c >= 8192 && c <= 8202) || c === 8232 || c === 8233 || c === 8239 || c === 8287 || c === 12288 || c === 65279;
}

function wordsOf(text) {
  let count = 0;
  let inWord = false;
  const n = text.length;
  for (let i = 0; i < n; i++) {
    const c = text.charCodeAt(i);
    if (c < 128) {
      if (WS_ASCII[c] === 1) inWord = false;
      else if (!inWord) {
        inWord = true;
        count++;
      }
    } else if (isWsUnicode(c)) inWord = false;
    else if (!inWord) {
      inWord = true;
      count++;
    }
  }
  return count;
}

function resolvePath(dir, rel) {
  const parts = dir === '' ? [] : dir.split('/');
  const segs = rel.split('/');
  for (let k = 0; k < segs.length; k++) {
    const seg = segs[k];
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (parts.length === 0) return null;
      parts.pop();
    } else parts.push(seg);
  }
  return parts.join('/');
}

const dirOf = (path) => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');

function normalizeNewlines(s) {
  let r = s.indexOf('\r');
  if (r === -1) return s;
  let out = '';
  let start = 0;
  const n = s.length;
  for (let i = r; i < n; i++) {
    if (s.charCodeAt(i) === 13) {
      out += s.slice(start, i) + '\n';
      if (i + 1 < n && s.charCodeAt(i + 1) === 10) i++;
      start = i + 1;
    }
  }
  return out + s.slice(start);
}

const KEY_SET = new Set(['title', 'date', 'tags', 'draft', 'layout', 'slug', 'summary']);

function isKey(key) {
  switch (key) {
    case 'title':
    case 'date':
    case 'tags':
    case 'draft':
    case 'layout':
    case 'slug':
    case 'summary':
      return true;
    default:
      return false;
  }
}

function daysIn(y, m) {
  if (m === 2) return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28;
  return m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31;
}

const QUOTED_ESCAPE_ERR = 'a quoted string holds an escape other than \\" or \\\\';

function stringOf(raw) {
  if (raw.charCodeAt(0) === 34) {
    const len = raw.length;
    if (len < 2 || raw.charCodeAt(len - 1) !== 34) return { error: 'a quoted string is not closed' };
    let out = '';
    for (let i = 1; i < len - 1; i++) {
      const c = raw.charCodeAt(i);
      if (c === 92) {
        const nx = raw.charCodeAt(i + 1);
        if ((nx !== 34 && nx !== 92) || i + 1 === len - 1) return { error: QUOTED_ESCAPE_ERR };
        out += raw[i + 1];
        i++;
      } else if (c === 34) return { error: 'a quoted string holds a stray quote' };
      else out += raw[i];
    }
    return { value: out };
  }
  if (raw.charCodeAt(0) === 91) return { error: 'a bare string opens on [' };
  return { value: raw };
}

function isTagName(t) {
  const n = t.length;
  if (n === 0) return false;
  for (let i = 0; i < n; i++) {
    const c = t.charCodeAt(i);
    if (c === 34 || c === 91 || c === 93) return false;
  }
  return true;
}

function isLayoutName(raw) {
  const n = raw.length;
  if (n === 0) return false;
  for (let i = 0; i < n; i++) {
    const c = raw.charCodeAt(i);
    if (!((c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 45)) return false;
  }
  return true;
}

function isSlug(raw) {
  const n = raw.length;
  if (n === 0 || n > SLUG_MAX) return false;
  let groups = 0;
  for (let i = 0; i < n; i++) {
    const c = raw.charCodeAt(i);
    if ((c >= 97 && c <= 122) || (c >= 48 && c <= 57)) groups++;
    else if (c === 45) {
      if (groups === 0) return false;
      groups = 0;
    } else return false;
  }
  return groups > 0;
}

const DATE_ERR = 'key "date": not a date from 1970-01-01 to 2099-12-31 (YYYY-MM-DD)';

function valueOf(key, raw) {
  switch (key) {
    case 'title':
    case 'summary': {
      const s = stringOf(raw);
      return 'error' in s ? { error: `key "${key}": ${s.error}` } : s;
    }
    case 'date': {
      const len = raw.length;
      if (len !== 10 || raw.charCodeAt(4) !== 45 || raw.charCodeAt(7) !== 45) return { error: DATE_ERR };
      for (let i = 0; i < 10; i++) {
        if (i === 4 || i === 7) continue;
        const c = raw.charCodeAt(i);
        if (c < 48 || c > 57) return { error: DATE_ERR };
      }
      const y = (raw.charCodeAt(0) - 48) * 1000 + (raw.charCodeAt(1) - 48) * 100 + (raw.charCodeAt(2) - 48) * 10 + (raw.charCodeAt(3) - 48);
      const mo = (raw.charCodeAt(5) - 48) * 10 + (raw.charCodeAt(6) - 48);
      const d = (raw.charCodeAt(8) - 48) * 10 + (raw.charCodeAt(9) - 48);
      if (y < 1970 || y > 2099 || mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return { error: DATE_ERR };
      return { value: raw };
    }
    case 'tags': {
      const len = raw.length;
      if (raw.charCodeAt(0) !== 91 || raw.charCodeAt(len - 1) !== 93) return { error: 'key "tags": not a list [a, b]' };
      const inner = raw.slice(1, -1);
      if (inner.trim() === '') return { value: [] };
      const parts = inner.split(',');
      const tags = [];
      for (let k = 0; k < parts.length; k++) {
        const t = parts[k].trim();
        if (t === '' || !isTagName(t)) return { error: 'key "tags": an empty tag, or one holding " [ or ]' };
        tags.push(t);
      }
      return { value: tags };
    }
    case 'draft':
      return raw === 'true' ? { value: true } : raw === 'false' ? { value: false } : { error: 'key "draft": true or false' };
    case 'layout':
      return isLayoutName(raw) ? { value: raw } : { error: 'key "layout": not a template name' };
    case 'slug':
      return isSlug(raw) ? { value: raw } : { error: 'key "slug": not a slug' };
    default:
      return { error: `unknown key "${key}"` };
  }
}

function onlySpaceTab(s) {
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const c = s.charCodeAt(i);
    if (c !== 32 && c !== 9) return false;
  }
  return true;
}

function keyLine(line) {
  const n = line.length;
  if (n === 0) return null;
  let i = 0;
  while (i < n) {
    const c = line.charCodeAt(i);
    if ((c >= 97 && c <= 122) || c === 95) i++;
    else break;
  }
  if (i === 0 || i >= n) return null;
  if (line.charCodeAt(i) !== 58) return null;
  const after = i + 1;
  let raw;
  if (after < n) {
    if (line.charCodeAt(after) !== 32) return null;
    raw = line.slice(after + 1);
  } else raw = '';
  let e = raw.length;
  while (e > 0) {
    const c = raw.charCodeAt(e - 1);
    if (c === 32 || c === 9) e--;
    else break;
  }
  return { key: line.slice(0, i), raw: e === raw.length ? raw : raw.slice(0, e) };
}

function parseFrontMatter(text) {
  const n = text.length;
  if (text !== '---' && !text.startsWith('---\n')) return { error: 'no front matter' };
  const fmLines = [];
  let pos = 4;
  let closePos = -1;
  while (pos <= n) {
    let end = text.indexOf('\n', pos);
    if (end === -1) end = n;
    const line = text.slice(pos, end);
    if (line === '---') {
      closePos = pos;
      break;
    }
    fmLines.push(line);
    pos = end + 1;
  }
  if (closePos === -1) return { error: 'the front matter is not closed' };
  const data = {};
  const nFm = fmLines.length;
  for (let i = 0; i < nFm; i++) {
    const line = fmLines[i];
    if (line.length === 0 || onlySpaceTab(line)) continue;
    if (line.charCodeAt(0) === 35) continue;
    const kv = keyLine(line);
    if (kv === null) return { error: `line ${i + 2} is not "key: value"` };
    const key = kv.key;
    const raw = kv.raw;
    if (!isKey(key)) return { error: `unknown key "${key}"` };
    if (Object.hasOwn(data, key)) return { error: `key "${key}" is given twice` };
    if (raw === '') return { error: `key "${key}" has no value` };
    const v = valueOf(key, raw);
    if ('error' in v) return v;
    data[key] = v.value;
  }
  if (!Object.hasOwn(data, 'title')) return { error: 'no title' };
  const bodyStart = closePos + 4;
  const body = bodyStart > n ? '' : text.slice(bodyStart);
  return { data, body };
}

function isBlank(line) {
  const n = line.length;
  for (let i = 0; i < n; i++) {
    const c = line.charCodeAt(i);
    if (c !== 32 && c !== 9) return false;
  }
  return true;
}

const FENCE_LANG_CH = new Uint8Array(128);
for (const ch of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_+-') FENCE_LANG_CH[ch.charCodeAt(0)] = 1;

function fenceLang(line) {
  const n = line.length;
  if (n < 3) return null;
  if (line.charCodeAt(0) !== 96 || line.charCodeAt(1) !== 96 || line.charCodeAt(2) !== 96) return null;
  let i = 3;
  while (i < n) {
    const c = line.charCodeAt(i);
    if (c < 128 && FENCE_LANG_CH[c] === 1) i++;
    else break;
  }
  const lang = line.slice(3, i);
  for (; i < n; i++) {
    const c = line.charCodeAt(i);
    if (c !== 32 && c !== 9) return null;
  }
  return lang;
}

function isFenceClose(line) {
  const n = line.length;
  if (n < 3 || line.charCodeAt(0) !== 96 || line.charCodeAt(1) !== 96 || line.charCodeAt(2) !== 96) return false;
  for (let i = 3; i < n; i++) {
    const c = line.charCodeAt(i);
    if (c !== 32 && c !== 9) return false;
  }
  return true;
}

function headingInfo(line) {
  const n = line.length;
  let i = 0;
  while (i < n && line.charCodeAt(i) === 35) i++;
  if (i === 0 || i > 6 || i >= n) return null;
  let c = line.charCodeAt(i);
  if (c !== 32 && c !== 9) return null;
  const depth = i;
  while (i < n) {
    c = line.charCodeAt(i);
    if (c === 32 || c === 9) i++;
    else break;
  }
  const start = i;
  let end = n;
  while (end > start) {
    c = line.charCodeAt(end - 1);
    if (c === 32 || c === 9) end--;
    else break;
  }
  if (end === start) return null;
  return { depth, text: line.slice(start, end) };
}

function isHr(line) {
  const n = line.length;
  if (n < 3) return false;
  const a = line.charCodeAt(0);
  if (a === 45) {
    if (line.charCodeAt(1) !== 45 || line.charCodeAt(2) !== 45) return false;
  } else if (a === 42) {
    if (line.charCodeAt(1) !== 42 || line.charCodeAt(2) !== 42) return false;
  } else return false;
  for (let i = 3; i < n; i++) {
    const c = line.charCodeAt(i);
    if (c !== 32 && c !== 9) return false;
  }
  return true;
}

function trimLine(line) {
  let s = 0;
  let e = line.length;
  while (s < e) {
    const c = line.charCodeAt(s);
    if (c === 32 || c === 9) s++;
    else break;
  }
  while (e > s) {
    const c = line.charCodeAt(e - 1);
    if (c === 32 || c === 9) e--;
    else break;
  }
  if (s === 0 && e === line.length) return line;
  return line.slice(s, e);
}

function bulletOf(line) {
  const n = line.length;
  if (n < 2) return null;
  const c = line.charCodeAt(0);
  if (c !== 45 && c !== 42) return null;
  if (line.charCodeAt(1) !== 32) return null;
  return line.slice(2);
}

function orderedOf(line) {
  const n = line.length;
  let i = 0;
  while (i < n && i < 10) {
    const c = line.charCodeAt(i);
    if (c >= 48 && c <= 57) i++;
    else break;
  }
  if (i === 0 || i > 9) return null;
  if (i + 1 >= n) return null;
  if (line.charCodeAt(i) !== 46 || line.charCodeAt(i + 1) !== 32) return null;
  return { num: line.slice(0, i), text: line.slice(i + 2) };
}

const WS_RE = /\s/;

function isContinued(line) {
  const n = line.length;
  if (n < 3) return false;
  if (line.charCodeAt(0) !== 32 || line.charCodeAt(1) !== 32) return false;
  let i = 2;
  while (i < n && line.charCodeAt(i) === 32) i++;
  if (i >= n) return false;
  return !WS_RE.test(line[i]);
}

function endsParagraph(line) {
  const n = line.length;
  if (n === 0) return true;
  const c = line.charCodeAt(0);
  if (c === 32 || c === 9) return isBlank(line);
  if (c === 96) return fenceLang(line) !== null;
  if (c === 35) return headingInfo(line) !== null;
  if (c === 45 || c === 42) return isHr(line);
  return false;
}

function scanList(lines, nLines, start, isOrdered, num) {
  const items = [];
  let i = start;
  while (i < nLines) {
    const cur = lines[i];
    if (isOrdered) {
      const m = orderedOf(cur);
      if (m !== null) {
        items.push([trimLine(m.text)]);
        i++;
      } else if (isContinued(cur)) {
        items[items.length - 1].push(trimLine(cur));
        i++;
      } else break;
    } else {
      const m = bulletOf(cur);
      if (m !== null) {
        items.push([trimLine(m)]);
        i++;
      } else if (isContinued(cur)) {
        items[items.length - 1].push(trimLine(cur));
        i++;
      } else break;
    }
  }
  const joined = [];
  for (let k = 0; k < items.length; k++) joined.push(items[k].join('\n'));
  return [{ type: 'list', ordered: isOrdered, start: isOrdered ? num : 1, items: joined }, i];
}

function lex(src) {
  const lines = src.split('\n');
  const tokens = [];
  const nLines = lines.length;
  let i = 0;
  while (i < nLines) {
    const line = lines[i];
    const n = line.length;
    if (n > 0) {
      const c0 = line.charCodeAt(0);
      if (c0 === 32 || c0 === 9) {
        if (isBlank(line)) {
          i++;
          continue;
        }
      } else if (c0 === 96) {
        const lang = fenceLang(line);
        if (lang !== null) {
          const body = [];
          i++;
          while (i < nLines && !isFenceClose(lines[i])) body.push(lines[i++]);
          i++;
          tokens.push({ type: 'code', lang, lines: body });
          continue;
        }
      } else if (c0 === 35) {
        const heading = headingInfo(line);
        if (heading !== null) {
          tokens.push({ type: 'heading', depth: heading.depth, text: heading.text });
          i++;
          continue;
        }
      } else if (c0 === 45 || c0 === 42) {
        if (isHr(line)) {
          tokens.push({ type: 'hr' });
          i++;
          continue;
        }
        const bullet = bulletOf(line);
        if (bullet !== null) {
          const r = scanList(lines, nLines, i, false, 1);
          tokens.push(r[0]);
          i = r[1];
          continue;
        }
      } else if (c0 === 62) {
        const out = [];
        while (i < nLines && lines[i].charCodeAt(0) === 62) {
          const l = lines[i++];
          const b = l.charCodeAt(1) === 32 ? l.slice(2) : l.slice(1);
          const t = trimLine(b);
          if (t !== '') out.push(t);
        }
        tokens.push({ type: 'blockquote', lines: out });
        continue;
      } else if (c0 >= 48 && c0 <= 57) {
        const ordered = orderedOf(line);
        if (ordered !== null) {
          const r = scanList(lines, nLines, i, true, Number(ordered.num));
          tokens.push(r[0]);
          i = r[1];
          continue;
        }
      }
    } else {
      i++;
      continue;
    }
    const body = [trimLine(line)];
    i++;
    while (i < nLines && !endsParagraph(lines[i])) body.push(trimLine(lines[i++]));
    tokens.push({ type: 'paragraph', text: body.join('\n') });
  }
  return tokens;
}

const ESC_CHAR = new Uint8Array(128);
for (const ch of '\\`*_[]()#+-.!>') ESC_CHAR[ch.charCodeAt(0)] = 1;

function isEscapableAt(s, i) {
  const c = s.charCodeAt(i);
  return c < 128 && ESC_CHAR[c] === 1;
}

function findUnescaped2(s, from) {
  const n = s.length;
  for (let j = from; j <= n - 2; j++) {
    const c = s.charCodeAt(j);
    if (c === 92 && j + 1 < n && isEscapableAt(s, j + 1)) {
      j++;
      continue;
    }
    if (c === 42 && s.charCodeAt(j + 1) === 42) return j;
  }
  return -1;
}

function findUnescaped1(s, what, from) {
  const n = s.length;
  const w = what.charCodeAt(0);
  for (let j = from; j < n; j++) {
    const c = s.charCodeAt(j);
    if (c === 92 && j + 1 < n && isEscapableAt(s, j + 1)) {
      j++;
      continue;
    }
    if (c === w) return j;
  }
  return -1;
}

function findSingleStar(s, from) {
  const n = s.length;
  for (let j = from; j < n; j++) {
    const c = s.charCodeAt(j);
    if (c === 92 && j + 1 < n && isEscapableAt(s, j + 1)) {
      j++;
      continue;
    }
    if (c !== 42) continue;
    if (s.charCodeAt(j + 1) === 42) {
      j++;
      continue;
    }
    return j;
  }
  return -1;
}

const INLINE_SPECIAL = new Uint8Array(128);
for (const ch of '\\`*[&<>"\'') INLINE_SPECIAL[ch.charCodeAt(0)] = 1;

function findSpecial(s, from) {
  const n = s.length;
  for (let j = from; j < n; j++) {
    const c = s.charCodeAt(j);
    if (c < 128 && INLINE_SPECIAL[c] === 1) return j;
  }
  return -1;
}

function escChar(c) {
  if (c === 38) return '&amp;';
  if (c === 60) return '&lt;';
  if (c === 62) return '&gt;';
  if (c === 34) return '&quot;';
  return '&#39;';
}

function inline(s, env) {
  const n = s.length;
  let out = '';
  let i = 0;
  while (i < n) {
    const j = findSpecial(s, i);
    if (j === -1) {
      out += s.slice(i);
      break;
    }
    if (j > i) out += s.slice(i, j);
    const c = s.charCodeAt(j);
    if (c === 38 || c === 60 || c === 62 || c === 34 || c === 39) {
      out += escChar(c);
      i = j + 1;
      continue;
    }
    if (c === 92) {
      if (j + 1 < n && isEscapableAt(s, j + 1)) {
        out += s[j + 1];
        i = j + 2;
      } else {
        out += '\\';
        i = j + 1;
      }
      continue;
    }
    if (c === 96) {
      const k = s.indexOf('`', j + 1);
      if (k > j + 1) {
        out += '<code>' + escapeHtml(s.slice(j + 1, k)) + '</code>';
        i = k + 1;
      } else {
        out += '`';
        i = j + 1;
      }
      continue;
    }
    if (c === 42) {
      if (j + 1 < n && s.charCodeAt(j + 1) === 42) {
        const k = findUnescaped2(s, j + 2);
        if (k > j + 2) {
          out += '<strong>' + inline(s.slice(j + 2, k), env) + '</strong>';
          i = k + 2;
        } else {
          out += '**';
          i = j + 2;
        }
      } else {
        const k = findSingleStar(s, j + 1);
        if (k > j + 1) {
          out += '<em>' + inline(s.slice(j + 1, k), env) + '</em>';
          i = k + 1;
        } else {
          out += '*';
          i = j + 1;
        }
      }
      continue;
    }
    if (c === 91) {
      const k = findUnescaped1(s, ']', j + 1);
      const mm = k !== -1 && n > k + 1 && s.charCodeAt(k + 1) === 40 ? s.indexOf(')', k + 2) : -1;
      if (mm !== -1) {
        const target = s.slice(k + 2, mm);
        if (target !== '' && !WS_RE.test(target)) {
          out += '<a href="' + escapeHtml(env.link(target)) + '">' + inline(s.slice(j + 1, k), env) + '</a>';
          i = mm + 1;
          continue;
        }
      }
      out += '[';
      i = j + 1;
      continue;
    }
    out += escChar(c);
    i = j + 1;
  }
  return out;
}

function renderMarkdown(src, env) {
  const ids = new Set();
  const blocks = [];
  const toc = [];
  let excerpt = null;
  const toks = lex(src);
  for (let t = 0; t < toks.length; t++) {
    const tok = toks[t];
    switch (tok.type) {
      case 'heading': {
        const id = uniqueSlug(slugify(tok.text), ids);
        const html = inline(tok.text, env);
        const d = tok.depth;
        blocks.push(`<h${d} id="${id}">${html}</h${d}>`);
        if (d === 2 || d === 3) toc.push({ level: d, id, html });
        break;
      }
      case 'code': {
        const cls = tok.lang === '' ? '' : ` class="language-${escapeHtml(tok.lang)}"`;
        const ls = tok.lines;
        let inner = '';
        for (let k = 0; k < ls.length; k++) inner += escapeHtml(ls[k]) + '\n';
        blocks.push(`<pre><code${cls}>${inner}</code></pre>`);
        break;
      }
      case 'hr':
        blocks.push('<hr>');
        break;
      case 'blockquote':
        blocks.push(tok.lines.length === 0 ? '<blockquote>\n</blockquote>' : `<blockquote>\n<p>${inline(tok.lines.join('\n'), env)}</p>\n</blockquote>`);
        break;
      case 'list': {
        const tag = tok.ordered ? 'ol' : 'ul';
        const open = tok.ordered && tok.start !== 1 ? `<ol start="${tok.start}">` : `<${tag}>`;
        const its = tok.items;
        let li = '';
        for (let k = 0; k < its.length; k++) li += `<li>${inline(its[k], env)}</li>\n`;
        blocks.push(`${open}\n${li}</${tag}>`);
        break;
      }
      case 'paragraph': {
        const html = inline(tok.text, env);
        if (excerpt === null) excerpt = html;
        blocks.push(`<p>${html}</p>`);
        break;
      }
    }
  }
  let html = '';
  for (let k = 0; k < blocks.length; k++) html += blocks[k] + '\n';
  return { html, toc, excerpt: excerpt ?? '' };
}

const INCLUDE_DEPTH = 8;

const PATH_RE = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const FOR_RE = /^for ([A-Za-z_][A-Za-z0-9_]*) in (\S+)$/;
const IF_RE = /^if (not )?(\S+)$/;
const INCLUDE_RE = /^include "([a-z0-9-]+)"$/;

class TemplateError extends Error {}

function pathArr(name, text) {
  if (!PATH_RE.test(text)) throw new TemplateError(`template "${name}": ${JSON.stringify(text)} is not a path`);
  return text.split('.');
}

function tokenize(name, src) {
  const tokens = [];
  let text = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const open = src.indexOf('{', i);
    if (open === -1 || open === n - 1) {
      text += src.slice(i);
      break;
    }
    const next = src.charCodeAt(open + 1);
    if (next !== 123 && next !== 37) {
      text += src.slice(i, open + 1);
      i = open + 1;
      continue;
    }
    text += src.slice(i, open);
    if (next === 123) {
      const raw = src.charCodeAt(open + 2) === 123;
      const close = src.indexOf(raw ? '}}}' : '}}', open + (raw ? 3 : 2));
      if (close === -1) throw new TemplateError(`template "${name}": a ${raw ? '{{{' : '{{'} is not closed`);
      if (text !== '') tokens.push({ t: 'text', text });
      text = '';
      tokens.push({ t: raw ? 'raw' : 'var', path: pathArr(name, src.slice(open + (raw ? 3 : 2), close).trim()) });
      i = close + (raw ? 3 : 2);
      continue;
    }
    const close = src.indexOf('%}', open + 2);
    if (close === -1) throw new TemplateError(`template "${name}": a {% is not closed`);
    const end = close + 2;
    const lineStart = src.lastIndexOf('\n', open - 1) + 1;
    const nl = src.indexOf('\n', end);
    const lineEnd = nl === -1 ? n : nl;
    const standalone = onlySpaceTab(src.slice(lineStart, open)) && onlySpaceTab(src.slice(end, lineEnd));
    if (standalone) text = text.slice(0, text.length - (open - lineStart));
    if (text !== '') tokens.push({ t: 'text', text });
    text = '';
    tokens.push({ t: 'tag', tag: src.slice(open + 2, close).trim() });
    i = standalone ? (nl === -1 ? n : nl + 1) : end;
  }
  if (text !== '') tokens.push({ t: 'text', text });
  return tokens;
}

function parseTemplate(name, src) {
  const root = { kind: 'root', body: [] };
  const stack = [root];
  let body = root.body;
  const toks = tokenize(name, src);
  for (let ti = 0; ti < toks.length; ti++) {
    const tok = toks[ti];
    if (tok.t === 'text') body.push({ kind: 'text', text: tok.text });
    else if (tok.t === 'var' || tok.t === 'raw') body.push({ kind: tok.t, path: tok.path });
    else {
      const tag = tok.tag;
      const top = stack[stack.length - 1];
      let m;
      if ((m = FOR_RE.exec(tag)) !== null) {
        const node = { kind: 'for', name: m[1], path: pathArr(name, m[2]), body: [] };
        body.push(node);
        stack.push(node);
        body = node.body;
      } else if ((m = IF_RE.exec(tag)) !== null) {
        const node = { kind: 'if', not: m[1] !== undefined, path: pathArr(name, m[2]), then: [], else: null };
        body.push(node);
        stack.push(node);
        body = node.then;
      } else if (tag === 'else') {
        if (top.kind !== 'if' || top.else !== null) throw new TemplateError(`template "${name}": an else outside an if`);
        top.else = [];
        body = top.else;
      } else if (tag === 'endfor' || tag === 'endif') {
        if (top.kind !== (tag === 'endfor' ? 'for' : 'if')) throw new TemplateError(`template "${name}": an ${tag} with no open ${tag.slice(3)}`);
        stack.pop();
        const parent = stack[stack.length - 1];
        body = parent.kind === 'root' ? parent.body : parent.kind === 'for' ? parent.body : parent.else ?? parent.then;
      } else if ((m = INCLUDE_RE.exec(tag)) !== null) body.push({ kind: 'include', name: m[1] });
      else throw new TemplateError(`template "${name}": {% ${tag} %} is not a tag`);
    }
  }
  if (stack.length > 1) throw new TemplateError(`template "${name}": a ${stack[stack.length - 1].kind} is not closed`);
  return root.body;
}

function lookup(scope, path) {
  let s = scope;
  while (s !== null && !Object.hasOwn(s.vars, path[0])) s = s.parent;
  if (s === null) return undefined;
  let v = s.vars[path[0]];
  for (let k = 1; k < path.length; k++) {
    if (v === null || typeof v !== 'object' || !Object.hasOwn(v, path[k])) return undefined;
    v = v[path[k]];
  }
  return v;
}

function textOf(v) {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return v.map(textOf).join(', ');
  return '';
}

function truthy(v) {
  if (Array.isArray(v)) return v.length > 0;
  return v !== undefined && v !== null && v !== false && v !== '' && v !== 0;
}

function compileTemplates(templates) {
  const renderers = new Map();
  for (const [name, nodes] of templates) renderers.set(name, compileNodes(nodes, templates));
  return renderers;
}

function compileNodes(nodes, templates) {
  const paths = [];
  const st = { n: 0, includes: [] };
  const body = genBody(nodes, paths, st, 'S');
  const src = `return function render(S,ctx,depth){let out="";${body}return out;}`;
  return new Function('LK', 'T', 'TR', 'E', 'P', src)(lookup, textOf, truthy, escapeHtml, paths);
}

function genBody(nodes, paths, st, S) {
  let code = '';
  for (let ni = 0; ni < nodes.length; ni++) {
    const n = nodes[ni];
    switch (n.kind) {
      case 'text':
        code += `out+=${JSON.stringify(n.text)};`;
        break;
      case 'var': {
        const pi = paths.push(n.path) - 1;
        code += `out+=E(T(LK(${S},P[${pi}])));`;
        break;
      }
      case 'raw': {
        const pi = paths.push(n.path) - 1;
        code += `out+=T(LK(${S},P[${pi}]));`;
        break;
      }
      case 'if': {
        const pi = paths.push(n.path) - 1;
        const cond = `TR(LK(${S},P[${pi}]))!==${n.not ? 'true' : 'false'}`;
        code += `if(${cond}){${genBody(n.then, paths, st, S)}}`;
        if (n.else !== null) code += `else{${genBody(n.else, paths, st, S)}}`;
        break;
      }
      case 'for': {
        const pi = paths.push(n.path) - 1;
        const k = ++st.n;
        const S2 = 'S' + k;
        const inner = genBody(n.body, paths, st, S2);
        code += `{const xs${k}=LK(${S},P[${pi}]);if(Array.isArray(xs${k})){const len${k}=xs${k}.length;if(len${k}>0){const vs${k}={${JSON.stringify(n.name)}:xs${k}[0]};const lp${k}={index:1,first:true,last:len${k}===1,length:len${k}};vs${k}.loop=lp${k};const ${S2}={vars:vs${k},parent:${S}};for(let k${k}=0;k${k}<len${k};k${k}++){if(k${k}>0){vs${k}[${JSON.stringify(n.name)}]=xs${k}[k${k}];lp${k}.index=k${k}+1;lp${k}.first=false;lp${k}.last=k${k}===len${k}-1;}${inner}}}}}`;
        break;
      }
      case 'include': {
        code += `{const I=ctx.R.get(${JSON.stringify(n.name)});if(I!==undefined&&depth<8)out+=I(${S},ctx,depth+1);}`;
        break;
      }
    }
  }
  return code;
}

const RESERVED = Object.freeze(['posts', 'tags', 'page']);

function readSources(b) {
  const files = b.input.files.slice().sort((x, y) => byCodeUnits(x.path, y.path));
  for (let k = 0; k < files.length; k++) {
    const f = files[k];
    if (f.path.endsWith('.md')) b.sources.push({ path: f.path, text: normalizeNewlines(f.content) });
    else b.statics.push({ path: f.path, content: f.content });
  }
}

function frontMatter(b) {
  const kept = [];
  const sources = b.sources;
  for (let k = 0; k < sources.length; k++) {
    const s = sources[k];
    const fm = parseFrontMatter(s.text);
    if ('error' in fm) {
      b.report.push(`refused ${s.path}: ${fm.error}`);
      continue;
    }
    s.data = fm.data;
    s.body = fm.body;
    s.post = s.path.startsWith('posts/');
    let own;
    if (s.path.startsWith('tags/')) own = 'tags';
    else if (s.path.startsWith('page/')) own = 'page';
    if (own !== undefined) {
      b.report.push(`refused ${s.path}: ${own}/ is the generator's own`);
      continue;
    }
    if (s.post && !Object.hasOwn(s.data, 'date')) {
      b.report.push(`refused ${s.path}: a post needs a date`);
      continue;
    }
    const layout = s.data.layout !== undefined ? s.data.layout : (s.post ? 'post' : 'page');
    if (!b.templates.has(layout)) {
      b.report.push(`refused ${s.path}: layout "${layout}" is no template that parses`);
      continue;
    }
    s.layout = layout;
    if (s.data.draft === true) {
      b.report.push(`draft ${s.path}`);
      continue;
    }
    kept.push(s);
  }
  b.sources = kept;
}

function permalinks(b) {
  const taken = new Map();
  const takenIn = (dir) => {
    let set = taken.get(dir);
    if (set === undefined) {
      set = new Set(dir === '' ? RESERVED : []);
      taken.set(dir, set);
    }
    return set;
  };
  for (let k = 0; k < b.sources.length; k++) {
    const s = b.sources[k];
    const dir = s.post ? 'posts' : dirOf(s.path);
    const title = s.data.slug !== undefined ? s.data.slug : slugify(s.data.title);
    const slug = uniqueSlug(title, takenIn(dir));
    s.slug = slug;
    s.outDir = dir === '' ? slug : `${dir}/${slug}`;
    s.url = `${b.base}/${s.outDir}/`;
    b.bySource.set(s.path, s);
  }
}

const SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*:/;

function makeEnv(b, s) {
  const dir = dirOf(s.path);
  const base = b.base;
  return {
    link(target) {
      if (SCHEME_RE.test(target) || target.charCodeAt(0) === 47 || target.charCodeAt(0) === 35) return target;
      const hash = target.indexOf('#');
      const rel = hash === -1 ? target : target.slice(0, hash);
      const frag = hash === -1 ? '' : target.slice(hash);
      const path = rel === '' ? null : resolvePath(dir, rel);
      if (path !== null && b.bySource.has(path)) return `${b.bySource.get(path).url}${frag}`;
      if (path !== null && b.staticPaths.has(path)) return `${base}/${path}${frag}`;
      b.broken.add(`broken-link ${s.path} -> ${target}`);
      return target;
    },
  };
}

function markdown(b) {
  b.staticPaths = new Set(b.statics.map((f) => f.path));
  for (let k = 0; k < b.sources.length; k++) {
    const s = b.sources[k];
    const md = renderMarkdown(s.body, makeEnv(b, s));
    s.html = md.html;
    s.toc = md.toc;
    s.excerpt = md.excerpt;
  }
}

function collections(b) {
  const posts = b.sources.filter((s) => s.post);
  posts.sort((x, y) => byCodeUnits(y.data.date, x.data.date) || byCodeUnits(x.slug, y.slug));
  b.posts = posts;
  for (let k = 0; k < posts.length; k++) {
    const p = posts[k];
    p.newer = k === 0 ? null : posts[k - 1];
    p.older = k === posts.length - 1 ? null : posts[k + 1];
  }
}

function tags(b) {
  const bySlug = new Map();
  const ownTags = (s) => {
    const raw = s.data.tags;
    if (raw === undefined) return [];
    const seen = new Set();
    const out = [];
    for (let k = 0; k < raw.length; k++) {
      const name = raw[k];
      const sl = slugify(name);
      if (!seen.has(sl)) {
        seen.add(sl);
        out.push(name);
      }
    }
    return out;
  };
  for (let k = 0; k < b.posts.length; k++) {
    const p = b.posts[k];
    const names = ownTags(p);
    p.tagRefs = [];
    for (let t = 0; t < names.length; t++) {
      const name = names[t];
      const slug = slugify(name);
      let tag = bySlug.get(slug);
      if (tag === undefined) {
        tag = { name, slug, url: `${b.base}/tags/${slug}/`, posts: [] };
        bySlug.set(slug, tag);
      }
      tag.posts.push(p);
      p.tagRefs.push(tag);
    }
  }
  for (let k = 0; k < b.sources.length; k++) {
    const s = b.sources[k];
    if (s.post) continue;
    const names = ownTags(s);
    const refs = [];
    for (let t = 0; t < names.length; t++) {
      const name = names[t];
      const slug = slugify(name);
      const found = bySlug.get(slug);
      refs.push(found !== undefined ? found : { name, slug, url: '', posts: [] });
    }
    s.tagRefs = refs;
  }
  b.tags = [...bySlug.values()].sort((x, y) => y.posts.length - x.posts.length || byCodeUnits(x.slug, y.slug));
}

function linkOf(s) {
  if (s === null) return null;
  return {
    title: s.data.title,
    url: s.url,
    date: s.data.date !== undefined ? s.data.date : '',
    date_long: s.data.date === undefined ? '' : longDate(s.data.date),
  };
}

function tagOf(b, t) {
  const posts = [];
  for (let k = 0; k < t.posts.length; k++) posts.push(b.cards.get(t.posts[k]));
  return { name: t.name, slug: t.slug, url: t.url, count: t.posts.length, posts };
}

function cardOf(s) {
  const tags = [];
  for (let k = 0; k < s.tagRefs.length; k++) {
    const t = s.tagRefs[k];
    tags.push({ name: t.name, slug: t.slug, url: t.url });
  }
  const w = wordsOf(s.body);
  return {
    title: s.data.title,
    url: s.url,
    date: s.data.date !== undefined ? s.data.date : '',
    date_long: s.data.date === undefined ? '' : longDate(s.data.date),
    summary: s.data.summary !== undefined ? s.data.summary : '',
    excerpt: s.excerpt,
    reading_minutes: Math.max(1, Math.ceil(w / 200)),
    tags,
  };
}

function pageOf(s, card) {
  if (card === undefined) card = cardOf(s);
  const toc = [];
  for (let k = 0; k < s.toc.length; k++) {
    const h = s.toc[k];
    toc.push({ level: h.level, id: h.id, html: h.html });
  }
  return {
    title: card.title,
    url: card.url,
    date: card.date,
    date_long: card.date_long,
    summary: card.summary,
    excerpt: card.excerpt,
    reading_minutes: card.reading_minutes,
    tags: card.tags,
    slug: s.slug,
    content: s.html,
    toc,
    newer: linkOf(s.newer !== undefined ? s.newer : null),
    older: linkOf(s.older !== undefined ? s.older : null),
    is_post: s.post,
  };
}

function layouts(b) {
  b.cards = new Map();
  for (let k = 0; k < b.posts.length; k++) b.cards.set(b.posts[k], cardOf(b.posts[k]));
  const site = { title: b.input.site.title, base_url: b.base };
  const allTags = [];
  for (let k = 0; k < b.tags.length; k++) {
    const t = b.tags[k];
    allTags.push({ name: t.name, slug: t.slug, url: t.url, count: t.posts.length });
  }
  const recent = [];
  const recentN = Math.min(b.input.site.recent, b.posts.length);
  for (let k = 0; k < recentN; k++) recent.push(b.cards.get(b.posts[k]));
  const renderers = compileTemplates(b.templates);
  const ctx = { R: renderers, escape: escapeHtml };
  const render = (name, vars) => {
    const fn = renderers.get(name);
    if (fn === undefined) return null;
    const scopeVars = { site, tags: allTags, recent };
    if (vars !== null) {
      const keys = Object.keys(vars);
      for (let k = 0; k < keys.length; k++) scopeVars[keys[k]] = vars[keys[k]];
    }
    return fn({ vars: scopeVars, parent: null }, ctx, 0);
  };
  for (let k = 0; k < b.sources.length; k++) {
    const s = b.sources[k];
    const card = s.post ? b.cards.get(s) : undefined;
    b.output[`${s.outDir}/index.html`] = render(s.layout, { page: pageOf(s, card) });
  }
  const per = b.input.site.per_page;
  const nPosts = b.posts.length;
  const pages = Math.max(1, Math.ceil(nPosts / per));
  const indexUrl = (k) => (k === 1 ? `${b.base}/` : `${b.base}/page/${k}/`);
  for (let k = 1; k <= pages; k++) {
    const cardsSlice = [];
    const from = (k - 1) * per;
    const to = Math.min(k * per, nPosts);
    for (let q = from; q < to; q++) cardsSlice.push(b.cards.get(b.posts[q]));
    const html = render('index', {
      posts: cardsSlice,
      pager: { number: k, total: pages, url: indexUrl(k), newer_url: k === 1 ? '' : indexUrl(k - 1), older_url: k === pages ? '' : indexUrl(k + 1) },
    });
    if (html !== null) b.output[k === 1 ? 'index.html' : `page/${k}/index.html`] = html;
  }
  for (let k = 0; k < b.tags.length; k++) {
    const t = b.tags[k];
    const html = render('tag', { tag: tagOf(b, t) });
    if (html !== null) b.output[`tags/${t.slug}/index.html`] = html;
  }
  const tagsHtml = render('tags', null);
  if (tagsHtml !== null) b.output['tags/index.html'] = tagsHtml;
  for (let k = 0; k < b.statics.length; k++) {
    const f = b.statics[k];
    if (Object.hasOwn(b.output, f.path)) b.report.push(`shadowed ${f.path}: a built page has its path`);
    else b.output[f.path] = f.content;
  }
}

function report(b) {
  const lines = [...b.report, ...b.broken].sort(byCodeUnits);
  let pages = 0;
  for (let k = 0; k < b.sources.length; k++) if (!b.sources[k].post) pages++;
  lines.push(`built ${pages} pages, ${b.posts.length} posts, ${b.tags.length} tags and ${b.statics.length} static files`);
  b.output[REPORT_FILE] = `${lines.join('\n')}\n`;
}

export function run(input) {
  const templates = new Map();
  const reportArr = [];
  const templateNames = Object.keys(input.templates).sort(byCodeUnits);
  for (let k = 0; k < templateNames.length; k++) {
    const name = templateNames[k];
    try {
      templates.set(name, parseTemplate(name, input.templates[name]));
    } catch (err) {
      if (!(err instanceof TemplateError)) throw err;
      reportArr.push(err.message);
    }
  }
  const b = {
    input,
    base: input.site.base_url.replace(/\/+$/, ''),
    templates,
    sources: [],
    statics: [],
    bySource: new Map(),
    broken: new Set(),
    report: reportArr,
    posts: [],
    tags: [],
    cards: new Map(),
    output: {},
    staticPaths: null,
  };
  readSources(b);
  frontMatter(b);
  permalinks(b);
  markdown(b);
  collections(b);
  tags(b);
  layouts(b);
  report(b);
  return b.output;
}
