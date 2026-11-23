# makefun-site drop-in rewrite — round 2

solve.js currently passes verify (ALL IDENTICAL) at ~115 ms CPU per case (baseline makefun-site: ~250 ms).
Round 2: cut allocation and GC pressure. Node --cpu-prof on 9 runs of the practice set shows:
  GC ~337 ms (largest single item), lex 64 ms, inline 51 ms, wordsOf 48 ms, escapeHtml 47+19 ms,
  lookup 28 ms, parseFrontMatter 20 ms.

Concrete tasks (keep output byte-identical, keep verify green):
1. wordsOf: drop text.match(/\S+/g) (allocates a large array); count runs of non-whitespace with a
   plain char loop (code units; \S means not /\s/ — space, tab, newline, and the other Unicode spaces
   must be handled exactly as /\s/ does; a char-code check for < 0x80 plus the Unicode whitespace set
   the regex would match is fine if identical).
2. escapeHtml: add a fast path that scans for & < > " ' first and returns the original string object
   when none are found (very common); use it everywhere, including inline().
3. lex: replace the per-line regex tests with first-char dispatch (checks on line[0]) where semantics
   are identical: blank, fence, heading (#), hr (---/***), quote (>), bullet (- / * +... careful: the
   reference BULLET is /^[-*] (.*)$/ only), ordered digit, else paragraph. Keep exact regex behavior
   for anything nontrivial (e.g. FENCE_OPEN language capture, ORDERED digits) — only dispatch cheaply,
   then still run the exact regex to extract.
4. lookup: memoize path->segments in a module Map (paths are template literals repeated thousands of
   times); avoid the scope-chain walk with hasOwn when the first name was found in the nearest scope
   last time — but ONLY if provably identical output; when unsure, keep the walk.
5. renderNodes: for the for-loop case, reuse a single loop-vars object per iteration is NOT safe
   (nested loops share parents) unless proven; prefer reducing other garbage.
6. parseFrontMatter: avoid the /^[ \t]*$/ regex per line (char loop), avoid KEYS.includes (switch).
7. Do NOT change main.ts. Do NOT change behavior for any input. After each change run:
     node /root/entries/sitespeed-tools/verify.mjs ./solve.js verify   (must print ALL IDENTICAL)
     node /root/entries/sitespeed-tools/flagtest.mjs                   (CPU ms for 27 runs; lower better)
   Commit progress only when identical. Report the final numbers.
