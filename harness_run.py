#!/usr/bin/env python3
# Play a compact engine module against the local make.fun env (like the trial driver).
# usage: run_env.py <module_name> <state_dir> <port>
import json, os, subprocess, sys, time
from urllib.request import Request, urlopen

mod, state, port = sys.argv[1], sys.argv[2], sys.argv[3]
env = dict(os.environ, MAKEFUN_ENV_PORT=port, MAKEFUN_STATE_DIR=state,
           MAKEFUN_ENV_DATA_DIR='/root/chess/tiny-chess-01-kit/practice/trial-0/input/env',
           MAKEFUN_ENV_HOST='127.0.0.1')
srv = subprocess.Popen(['node','program/env/server.mjs'], cwd='/root/chess/tiny-chess-01-kit', env=env,
                       stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
time.sleep(1.5)
EU = f'http://127.0.0.1:{port}'
sys.path.insert(0, os.getcwd())
E = __import__(mod)
t0 = time.time()
g = json.load(urlopen(Request(EU+'/game', data=b'{}')))
while g['status'] != 'done':
    while g['status'] == 'your_move':
        t1 = time.time()
        m = E.pick(g['fen'])
        dt = time.time()-t1
        if dt > 8: print('SLOW MOVE', dt, g['game'], flush=True)
        g = json.load(urlopen(Request(EU+'/move', data=json.dumps({'game': g['game'], 'move': E.uci(m)}).encode())))
    if g['status'] != 'done':
        g = json.load(urlopen(Request(EU+'/game', data=b'{}')))
print(mod, 'W/D/L', g.get('wins'), g.get('draws'), g.get('losses'), f'total={time.time()-t0:.0f}s', flush=True)
srv.terminate()
# dump results per game
st = json.load(open(state+'/export/state.json'))
for gm in st['games']:
    print(mod, gm['game'], gm['opponent'], gm['colour'], gm['result'], gm['outcome'], gm['reason'], flush=True)
