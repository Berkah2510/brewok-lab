#!/usr/bin/env python3
# usage: python3 score.py <module_name_without_.py> [state_dir] [port]
# runs the 6-game mock trial and prints W/D/L + Elo.
import subprocess, sys, os, tempfile
anchors={'depth-2':855,'depth-3':1073,'depth-4':1199,'nodes-100k':1392,'nodes-250k':1497,'nodes-500k':1596}
mod=sys.argv[1]
state=sys.argv[2] if len(sys.argv)>2 else tempfile.mkdtemp(prefix='tcst')
port=sys.argv[3] if len(sys.argv)>3 else '9101'
r=subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)),'harness_run.py'), mod, state, port], capture_output=True, text=True)
out=r.stdout
print(out[-2500:])
pts=0.0; ops=[]; n=0
for line in out.splitlines():
    p=line.split()
    if len(p)>=7 and p[0]==mod and p[1].isdigit():
        n+=1; ops.append(p[2])
        if p[5]=='win': pts+=1
        elif p[5]=='draw': pts+=0.5
if n==0:
    print('NO GAMES PARSED'); print(out[-3000:]); print(r.stderr[-2000:]); sys.exit(1)
import math
def elo(R):
    e=sum(1/(1+10**((anchors[a]-R)/400)) for a in ops)
    return e-pts
lo,hi=0,2400
for _ in range(60):
    mid=(lo+hi)/2
    if elo(mid)>0: hi=mid
    else: lo=mid
E=round((lo+hi)/2)
print(f'{mod}: games={n} W/D/L pts={pts} Elo={E} {"PASS(>=1154)" if E>=1154 else "BELOW 1154"}')
