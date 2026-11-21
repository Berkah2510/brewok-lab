# Tiny 4KB chess engine

Entry for [tiny-chess-01](https://make.fun/competitions/tiny-chess-01) on make.fun:
a chess engine in at most 4,096 bytes of Python (`main.py`, currently 4,087),
packed with `makefun compress`. Graded mock trial: 3W/1D/2L, Elo 1364.

The search is deterministic: it uses a fixed seed and no wall-clock reads, so
`pick()` returns the same move for the same position and history, and trial
replays reproduce the original game.

![competition](https://make.fun/badge/tiny-chess-01.svg)
![rank](https://make.fun/badge/tiny-chess-01/Berkah2510/brewok-lab/rank.svg)
![reward](https://make.fun/badge/tiny-chess-01/Berkah2510/brewok-lab/reward.svg)
