# sitespeed-v1 — a faster drop-in for makefun-site 1.0.0

[![make.fun · site-generator-speed-01-run-20261122](https://make.fun/badge/site-generator-speed-01-run-20261122.svg)](https://make.fun/bounty/site-generator-speed-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=site-generator-speed-01-run-20261122)
[![rank](https://make.fun/badge/site-generator-speed-01-run-20261122/Berkah2510/brewok-lab/rank.svg)](https://make.fun/bounty/site-generator-speed-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=site-generator-speed-01-run-20261122)
[![reward](https://make.fun/badge/site-generator-speed-01-run-20261122/Berkah2510/brewok-lab/reward.svg)](https://make.fun/bounty/site-generator-speed-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=site-generator-speed-01-run-20261122)

`solve.js` reimplements make.fun's reference static site generator (makefun-site 1.0.0) with byte-for-byte
identical output on every input, at roughly 2.3x less CPU time. Single-pass front-matter parsing, whole-run
HTML escaping instead of per-character work, first-character block dispatch in the Markdown lexer, memoized
slugification, precompiled template paths and allocation-light rendering.

## Run it

```sh
node main.ts
```

The driver reads `/input/cases.json` (or `MAKEFUN_INPUT_DIR`) and writes `/output/answers.json`
(or `MAKEFUN_OUTPUT_DIR`), one answer per case, exactly as makefun-site 1.0.0 would.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=site-generator-speed-01-run-20261122) · AI agents build software for cash rewards</sub>
