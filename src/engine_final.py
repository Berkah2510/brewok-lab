import random
PST={'P':'77777777AAAAAAAA99;==;99889<<988777;;777865775688993399877777777','N':'-/1111/-/377773/179::97118:;;:8117:;;:71189::981/378873/-/1111/-','B':'3555555357777775578998755889988557999975599999955877778535555553','R':'7777777789999998677777766777777667777776677777766777777677788777','Q':'3556655357777775578888756788887677888876588888755787777535566553','K':'1//--//11//--//11//--//11//--//1311//11353333335;;7777;;;=9779=;'}
KE='-111111-1177771115;==;5115=??=5115=??=5115;==;5113577531-/1331/-'
VAL = {'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 0}
KNIGHT = (-21, -19, -12, -8, 8, 12, 19, 21)
KING = (-11, -10, -9, -1, 1, 9, 10, 11)
BISHOP = (-11, -9, 9, 11)
ROOK = (-10, -1, 1, 10)
MATE = 100000
INF = 1000000
NODECAP = 60000
SQ = [10 * r + c for r in range(2, 10) for c in range(1, 9)]

_pw={}
_pb={}
for _p in 'PNBRQK':
    _a=[0]*120
    _b=[0]*120
    for _s in SQ:
        _i=(_s//10-2)*8+_s%10-1
        _a[_s]=VAL[_p]+ord(PST[_p][_i])*5-275
        _b[_s]=VAL[_p]+ord(PST[_p][_i^56])*5-275
    _pw[_p]=_a
    _pb[_p.lower()]=_b
KDW=[0]*120
KDB=[0]*120
for _s in SQ:
    _i=(_s//10-2)*8+_s%10-1
    KDW[_s]=ord(KE[_i])*5-275-_pw['K'][_s]
    KDB[_s]=ord(KE[_i^56])*5-275-_pb['k'][_s]

_rng = random.Random(20261120)
Z = {c: [_rng.getrandbits(64) for _ in range(120)] for c in 'PNBRQKpnbrqk'}
CASTLEHASH = [_rng.getrandbits(64) for _ in range(16)]
EPHASH = [_rng.getrandbits(64) for _ in range(121)]
ZS = _rng.getrandbits(64)
board = ['#'] * 120
turn = 'w'
castle = 0
ep = -1
half = 0
key = 0
kingpos = {}
ev = 0
wb = 0
bb = 0
npm = 0
rep = []
tt = {}
hh = {}
kill = []
class Abort(Exception):
    pass
def curkey():
    return key ^ CASTLEHASH[castle] ^ EPHASH[ep + 1]
def parse(fen):
    global board, turn, castle, ep, half, key, kingpos, ev, wb, bb, npm
    parts = fen.split()
    board = ['#'] * 120
    for sq in SQ:
        board[sq] = '.'
    for r, row in enumerate(parts[0].split('/')):
        c = 1
        for ch in row:
            if ch.isdigit():
                c += int(ch)
            else:
                board[(2+r)*10+c]=ch
                c+=1
    turn = parts[1] if len(parts) > 1 else 'w'
    cs = parts[2] if len(parts) > 2 else '-'
    castle = 0
    if 'K' in cs:
        castle |= 1
    if 'Q' in cs:
        castle |= 2
    if 'k' in cs:
        castle |= 4
    if 'q' in cs:
        castle |= 8
    ep = -1
    es = parts[3] if len(parts) > 3 else '-'
    if es != '-':
        ep = (10 - int(es[1])) * 10 + ord(es[0]) - 96
    half = int(parts[4]) if len(parts) > 4 else 0
    kingpos = {}
    key = 0
    ev = 0
    wb = bb = 0
    npm = 0
    for sq in SQ:
        p = board[sq]
        if p == '.':
            continue
        key ^= Z[p][sq]
        if p == 'K':
            kingpos['w'] = sq
        elif p == 'k':
            kingpos['b'] = sq
        elif p.upper() in 'NBRQ':
            npm += VAL[p.upper()]
            if p == 'B':
                wb += 1
            elif p == 'b':
                bb += 1
        if p.isupper():
            ev += _pw[p][sq]
        else:
            ev -= _pb[p][sq]
    if turn == 'b':
        key ^= ZS
    rep.clear()
    rep.append(curkey())
def attacked(sq, by):
    bd = board
    if by == 'w':
        if bd[sq + 9] == 'P' or bd[sq + 11] == 'P':
            return True
        np, kp, bp, rp = 'N', 'K', 'BQ', 'RQ'
    else:
        if bd[sq - 9] == 'p' or bd[sq - 11] == 'p':
            return True
        np, kp, bp, rp = 'n', 'k', 'bq', 'rq'
    for off in KNIGHT:
        if bd[sq + off] == np:
            return True
    for off in KING:
        if bd[sq + off] == kp:
            return True
    for off in ROOK:
        x = sq + off
        while True:
            q = bd[x]
            if q == '.':
                x += off
                continue
            if q != '#' and q in rp:
                return True
            break
    for off in BISHOP:
        x = sq + off
        while True:
            q = bd[x]
            if q == '.':
                x += off
                continue
            if q != '#' and q in bp:
                return True
            break
    return False
def gen_moves(caps=False):
    bd = board
    isw = turn == 'w'
    ml = []
    ap = ml.append
    for sq in SQ:
        p = bd[sq]
        if p == '.':
            continue
        if p.isupper()!=isw:
            continue
        if p == 'P' or p == 'p':
            d = -10 if isw else 10
            one = sq + d
            q = bd[one]
            if q == '.':
                if (21 <= one <= 28) if isw else (91 <= one <= 98):
                    ap((sq, one, 'q'))
                    ap((sq, one, 'r'))
                    ap((sq, one, 'b'))
                    ap((sq, one, 'n'))
                elif not caps:
                    ap((sq, one, ''))
                    if (81 <= sq <= 88) if isw else (31 <= sq <= 38):
                        if bd[sq + 2 * d] == '.':
                            ap((sq, sq + 2 * d, ''))
            for dc in (d - 1, d + 1):
                t = sq + dc
                q = bd[t]
                if q != '.' and q != '#':
                    if q.isupper()!=isw:
                        if (21 <= t <= 28) if isw else (91 <= t <= 98):
                            ap((sq, t, 'q'))
                            ap((sq, t, 'r'))
                            ap((sq, t, 'b'))
                            ap((sq, t, 'n'))
                        else:
                            ap((sq, t, ''))
                elif t == ep:
                    ap((sq, t, ''))
        elif p == 'N' or p == 'n':
            for off in KNIGHT:
                t = sq + off
                q = bd[t]
                if q != '#':
                    if q == '.':
                        if not caps:
                            ap((sq, t, ''))
                    elif q.isupper()!=isw:
                        ap((sq, t, ''))
        elif p == 'K' or p == 'k':
            for off in KING:
                t = sq + off
                q = bd[t]
                if q != '#':
                    if q == '.':
                        if not caps:
                            ap((sq, t, ''))
                    elif q.isupper()!=isw:
                        ap((sq, t, ''))
            if not caps:
                if isw:
                    if sq == 95:
                        if (castle & 1) and bd[96] == '.' and bd[97] == '.' and bd[98] == 'R':
                            if not attacked(95, 'b') and not attacked(96, 'b') and not attacked(97, 'b'):
                                ap((95, 97, ''))
                        if (castle & 2) and bd[94] == '.' and bd[93] == '.' and bd[92] == '.' and bd[91] == 'R':
                            if not attacked(95, 'b') and not attacked(94, 'b') and not attacked(93, 'b'):
                                ap((95, 93, ''))
                else:
                    if sq == 25:
                        if (castle & 4) and bd[26] == '.' and bd[27] == '.' and bd[28] == 'r':
                            if not attacked(25, 'w') and not attacked(26, 'w') and not attacked(27, 'w'):
                                ap((25, 27, ''))
                        if (castle & 8) and bd[24] == '.' and bd[23] == '.' and bd[22] == '.' and bd[21] == 'r':
                            if not attacked(25, 'w') and not attacked(24, 'w') and not attacked(23, 'w'):
                                ap((25, 23, ''))
        else:
            offs = BISHOP if p == 'B' or p == 'b' else ROOK if p == 'R' or p == 'r' else BISHOP + ROOK
            for off in offs:
                t = sq + off
                while True:
                    q = bd[t]
                    if q == '#':
                        break
                    if q == '.':
                        if not caps:
                            ap((sq, t, ''))
                    else:
                        if q.isupper()!=isw:
                            ap((sq, t, ''))
                        break
                    t += off
    return ml
def _put(p, sq):
    global ev, wb, bb, npm
    if p.isupper():
        ev += _pw[p][sq]
        if p == 'B':
            wb += 1
        if p in 'NBRQ':
            npm += VAL[p]
    else:
        ev -= _pb[p][sq]
        if p == 'b':
            bb += 1
        if p in 'nbrq':
            npm += VAL[p.upper()]
def _take(p, sq):
    global ev, wb, bb, npm
    if p.isupper():
        ev -= _pw[p][sq]
        if p == 'B':
            wb -= 1
        if p in 'NBRQ':
            npm -= VAL[p]
    else:
        ev += _pb[p][sq]
        if p == 'b':
            bb -= 1
        if p in 'nbrq':
            npm -= VAL[p.upper()]
def make(m):
    global turn, castle, ep, half, key
    f, t, pr = m
    bd = board
    pc = bd[f]
    ecap = (pc == 'P' or pc == 'p') and bd[t] == '.' and t == ep
    cap_sq = (t + 10 if pc == 'P' else t - 10) if ecap else t
    cap = bd[cap_sq]
    u = (pc, cap, cap_sq, castle, ep, half, key, kingpos['w'], kingpos['b'])
    _take(pc, f)
    bd[f] = '.'
    key ^= Z[pc][f]
    if ecap:
        bd[cap_sq] = '.'
    if cap != '.':
        key ^= Z[cap][cap_sq]
        _take(cap, cap_sq)
    npc = pr.upper() if pr and pc == 'P' else pr or pc
    bd[t] = npc
    _put(npc, t)
    key ^= Z[npc][t]
    if (pc == 'K' or pc == 'k') and abs(t - f) == 2:
        if t > f:
            rf, rt = f + 3, f + 1
        else:
            rf, rt = f - 4, f - 1
        rp = bd[rf]
        bd[rf] = '.'
        bd[rt] = rp
        _take(rp, rf)
        _put(rp, rt)
        key ^= Z[rp][rf] ^ Z[rp][rt]
    if pc == 'P' or pc == 'p' or cap != '.':
        half = 0
    else:
        half += 1
    if pc == 'P' and f - t == 20:
        ep = f - 10
    elif pc == 'p' and t - f == 20:
        ep = f + 10
    else:
        ep = -1
    if pc == 'K':
        castle &= ~3
        kingpos['w'] = t
    elif pc == 'k':
        castle &= ~12
        kingpos['b'] = t
    if f == 98 or t == 98:
        castle &= ~1
    if f == 91 or t == 91:
        castle &= ~2
    if f == 28 or t == 28:
        castle &= ~4
    if f == 21 or t == 21:
        castle &= ~8
    turn = 'b' if turn == 'w' else 'w'
    key ^= ZS
    rep.append(curkey())
    return u
def unmake(m, u):
    global turn, castle, ep, half, key
    f, t, pr = m
    pc, cap, cap_sq, castle, ep, half, key, okw, okb = u
    bd = board
    rep.pop()
    npc = pr.upper() if pr and pc == 'P' else pr or pc
    _take(npc, t)
    if cap != '.':
        _put(cap, cap_sq)
    if cap_sq == t:
        bd[t] = cap
    else:
        bd[t] = '.'
        bd[cap_sq] = cap
    if (pc == 'K' or pc == 'k') and abs(t - f) == 2:
        if t > f:
            rf, rt = f + 3, f + 1
        else:
            rf, rt = f - 4, f - 1
        rp = bd[rt]
        bd[rt] = '.'
        bd[rf] = rp
        _take(rp, rt)
        _put(rp, rf)
    bd[f] = pc
    _put(pc, f)
    kingpos['w'] = okw
    kingpos['b'] = okb
    turn = 'b' if turn == 'w' else 'w'
def evaluate():
    s = ev
    if wb >= 2:
        s += 30
    if bb >= 2:
        s -= 30
    if npm < 2400:
        s += KDW[kingpos['w']] - KDB[kingpos['b']]
    s += 10 if turn == 'w' else -10
    return s if turn == 'w' else -s
def order(ml, tm, ply):
    bd = board
    e = ep
    ks = kill[ply] if ply < len(kill) else ()
    hs = hh
    def sc(m):
        f, t, pr = m
        if m == tm:
            return 1000000000
        q = bd[t]
        if q == '.':
            v = 100 if (bd[f] == 'P' or bd[f] == 'p') and t == e else 0
        else:
            v = VAL[q.upper()]
        if pr:
            v += 900
        if v:
            return 1000000 + v * 10 - VAL[bd[f].upper()]
        if m in ks:
            return 900000
        return hs.get((f, t), 0)
    ml.sort(key=sc, reverse=True)
def legal_moves(caps=False):
    us = turn
    opp = 'b' if us == 'w' else 'w'
    ml = []
    for m in gen_moves(caps):
        u = make(m)
        if not attacked(kingpos[us], opp):
            ml.append(m)
        unmake(m, u)
    return ml
def qsearch(alpha, beta, ply):
    global nodes
    nodes += 1
    if nodes > NODECAP:
        raise Abort
    us = turn
    opp = 'b' if us == 'w' else 'w'
    incheck = attacked(kingpos[us], opp)
    bd = board
    if incheck:
        best = -MATE + ply
    else:
        best = evaluate()
        if best >= beta:
            return best
        if best > alpha:
            alpha = best
    ml = gen_moves(not incheck)
    order(ml, None, ply)
    found = False
    for m in ml:
        f, t, pr = m
        if not incheck:
            q = bd[t]
            v = VAL[q.upper()] if q != '.' else (100 if (bd[f] == 'P' or bd[f] == 'p') and t == ep else 0)
            if not pr and v and best + v + 60 <= alpha:
                continue
        u = make(m)
        if attacked(kingpos[us], opp):
            unmake(m, u)
            continue
        found = True
        s = -qsearch(-beta, -alpha, ply + 1)
        unmake(m, u)
        if s > best:
            best = s
        if best > alpha:
            alpha = best
        if alpha >= beta:
            break
    if incheck and not found:
        return -MATE + ply
    return best
def negamax(depth, alpha, beta, ply):
    global nodes
    nodes += 1
    if nodes > NODECAP:
        raise Abort
    kk = curkey()
    if half >= 100 or rep.count(kk) >= 2:
        return 0
    e = tt.get(kk)
    tm = e[3] if e else None
    if e and e[0] >= depth:
        d, fl, s, bm = e
        if fl == 0:
            return s
        if fl == 1 and s >= beta:
            return s
        if fl == 2 and s <= alpha:
            return s
    if depth <= 0:
        return qsearch(alpha, beta, ply)
    us = turn
    opp = 'b' if us == 'w' else 'w'
    incheck = attacked(kingpos[us], opp)
    if incheck:
        depth += 1
    ml = gen_moves()
    order(ml, tm, ply)
    oa = alpha
    best = -INF
    bm = None
    found = False
    first = True
    for m in ml:
        u = make(m)
        if attacked(kingpos[us], opp):
            unmake(m, u)
            continue
        found = True
        if first:
            s = -negamax(depth - 1, -beta, -alpha, ply + 1)
            first = False
        else:
            s = -negamax(depth - 1, -alpha - 1, -alpha, ply + 1)
            if alpha < s < beta:
                s = -negamax(depth - 1, -beta, -s, ply + 1)
        unmake(m, u)
        if s > best:
            best = s
            bm = m
        if best > alpha:
            alpha = best
        if alpha >= beta:
            if not (m[2] or u[1] != '.'):
                k = kill[ply]
                if m not in k:
                    k.insert(0, m)
                    del k[2:]
            hh[(m[0], m[1])] = hh.get((m[0], m[1]), 0) + depth * depth
            break
    if not found:
        return -MATE + ply if incheck else 0
    if best <= oa:
        fl = 2
    elif best >= beta:
        fl = 1
    else:
        fl = 0
    tt[kk] = (depth, fl, best, bm)
    return best
def root(depth, pv):
    ml = legal_moves()
    order(ml, pv, 0)
    alpha = -INF
    best = ml[0]
    for m in ml:
        u = make(m)
        s = -negamax(depth - 1, -INF, -alpha, 1)
        unmake(m, u)
        if s > alpha:
            alpha = s
            best = m
    return best, alpha
def pick(fen):
    global nodes
    parse(fen)
    tt.clear()
    hh.clear()
    kill[:]=[]
    for i in range(100):kill.append([])
    nodes = 0
    ml = legal_moves()
    if not ml:
        return 0,0,''
    best = ml[0]
    for d in range(1, 64):
        try:
            bm, sc = root(d, best)
        except Abort:
            break
        best = bm
        if sc > MATE - 1000:
            break
    return best
def uci(m):
    f, t, pr = m
    def q(s):return chr(96+s%10)+str(10-s//10)
    return q(f)+q(t)+pr
def main():
    import json
    import os
    from urllib.request import Request, urlopen
    url = os.environ.get('MAKEFUN_ENV_URL')
    if not url:
        host = os.environ.get('MAKEFUN_ENV_HOST', '127.0.0.1')
        port = os.environ.get('MAKEFUN_ENV_PORT', '9101')
        url = 'http://%s:%s' % (host, port)
    def post(path, obj):
        return json.load(urlopen(Request(url + path, data=json.dumps(obj).encode(), headers={'Content-Type': 'application/json'})))
    g = post('/game', {})
    while g.get('status') != 'done':
        while g.get('status') == 'your_move':
            m = pick(g['fen'])
            g = post('/move', {'game': g['game'], 'move': uci(m)})
        if g.get('status') != 'done':
            g = post('/game', {})
    return g
if __name__ == '__main__':
    main()
