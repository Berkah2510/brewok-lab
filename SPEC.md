# tiny-chess-01 rebuild — algorithm specification (IDEAS ONLY, write your own code)

## Hard rules
1. AUTHORSHIP: You must write every line of the engine yourself, from this spec.
   FORBIDDEN to read (they would poison authorship): anything under /root/chess/
   (especially /root/chess/program/*, /root/chess/myrepo*, /root/chess/myrepo_versions/*),
   any file named *compact*, *_packed*, v*.py, w*.py, x*.py, a*.py engine files,
   sunfish sources, or the kit's starter/. Do not read /home/agentuser/chess/* either.
   You MAY read: this directory, /root/chess/tiny-chess-01-kit/RULES.txt (rules only),
   and the kit's practice/trial-0/reference/gauntlet.json if useful.
2. Deliverable: a single readable Python file `src/engine_src.py` in THIS directory
   (your cwd). Standard library only, Python 3.13, no imports of other repo files,
   no network except the env HTTP calls, no model/API calls ever.
3. Iterate with the mock harness until the 6-game mock trial is >= 3 wins
   (Elo >= 1154) before you finish. Use score.py (below). You may run it as many
   times as needed; keep each change purposeful.
4. When you hit >= 3 wins, STOP tuning and finish: run the pack step (below).

## Interface (required)
The module must expose, at top level:
- `pick(fen)` -> a move for the side to move in that FEN (deterministic!)
- `uci(move)` -> UCI string like "e2e4" / "e7e8q" (castling = king move e1g1)
- a `main()` guarded by `if __name__ == '__main__':` that plays a full trial
  over HTTP (the packed main.py runs as a script):
  - env URL from env var MAKEFUN_ENV_URL (also honor MAKEFUN_ENV_PORT/HOST when
    URL is absent: http://<host>:<port>)
  - loop: POST /game {} -> while status == "your_move": POST /move
    {"game": n, "move": uci-string}; when a game ends, POST /game again; when
    status == "done", exit.
  - each answer has "fen", "game", "moves", "legal_moves", "move_limit_ms".
    Derive your move ONLY from fen (and optionally the moves list for repetition
    detection). No wall-clock in the search. Keep average move time ~<=3 s and
    every move <8 s (limit is 10 s per move, 1800 s per trial).

## Required algorithm pieces (all of these; tune constants yourself)
- Board: your choice (suggest a 120-cell mailbox or 0x88). Parse FEN: placement,
  side, castling rights, en-passant square, halfmove clock.
- Legal move generation: pseudo-legal generation + king-safety test via
  make/unmake (or attack check). Castling: king+rook not moved, squares empty,
  king not in/through/into check. En passant. Promotions (q, and consider r/b/n).
- Search: alpha-beta with a node cap (ABORT the search when the cap is hit and
  use the best move from the last fully completed depth; consider simple
  iterative deepening depth 1..cap). Suggested starting node budget ~26k; never
  exceed ~60k (larger budgets measured slower without winning on this gauntlet).
- Quiescence search at the leaves: captures and promotions only, plus every
  reply while in check. DELTA PRUNING in quiescence: skip a capture when
  stand-pat + victim value + margin <= alpha. START with margin 60 and tune
  (60 was the best known; 120/200 were worse).
- Move ordering: best move from a transposition table (Zobrist hashing or a
  cheap FEN/key hash) first, then MVV-LVA captures, then killers/history.
  Store depth, flag (exact/lower/upper), score, best move.
- Evaluation (from the mover's perspective):
  - material: pawn 100, knight 320, bishop 330, rook 500, queen 900
  - piece-square tables for all pieces (middlegame at least; you may interpolate
    a simple endgame term by material count)
  - small asymmetric terms are allowed and helped before: bishop pair, a tempo
    bonus for the side to move, king safety via pawn shelter (keep it cheap)
- Draw scores inside the search: repetition of the same position (same pieces,
  side, castling, ep) within the game history scores 0 (use a small history
  list of position keys, at least the last ~9 plies); halfmove clock >= 100
  scores 0. Stalemate = 0.
- Determinism: NO unseeded randomness, NO time.time()/perf_counter in the search.
  pick() called twice on the same position+history must give the same move.

## Known-good tuning facts (from earlier builds, use as priors, verify yourself)
- delta-pruning margin 60 >> 120 > 200 on this gauntlet.
- Node budgets above ~26k slowed moves without improving results.
- Late-move reduction and futility pruning measured as no-gain here; if you add
  them, verify each addition wins or keep the simpler version.
- A 3W/3L result on the 6-game mock ~= Elo 1279; 3W is the pass bar (Elo ~1154+).

## Testing (your loop)
- `python3 score.py <modname>` runs the official 6-game practice instance
  (same openings/colours as the real practice trial) and prints W/D/L + Elo.
  Takes ~4 minutes. It imports `<modname>.py` from the cwd (create a copy or
  symlink `score_mod.py -> src/engine_src.py`, or run
  `PYTHONPATH=src python3 score.py engine_src`).
- IMPORTANT: score.py/harness_run.py are test harnesses, do not modify them;
  do not copy code out of them into the engine.
- If a run fails to connect, pick a different 4-digit port.
- Per-move time warnings print "SLOW MOVE" — if you see them, reduce budget.

## Finish protocol (do these in order when Elo >= 1154)
1. Determinism check: clear any caches, call pick() twice on 3 different FENs
   from a real game; assert identical results, print the check.
2. Run `node /root/chess/tiny-chess-01-kit/cli/makefun.mjs compress src/engine_src.py --out main.py`
   from THIS directory (run it as its own command, NOT in the same command that
   last wrote the source). It prints the packed byte size: main.py must be
   <= 4096 bytes. If over, golf (shorter names, fewer spaces, same logic) and
   re-run score.py to confirm no regression, then compress again.
3. Print a final summary: mock W/D/L, Elo, main.py bytes, engine_src.py lines.
