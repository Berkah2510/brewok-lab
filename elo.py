import sys
# usage: python3 elo.py < run output lines (paste per-game lines)
anchors={'depth-2':855,'depth-3':1073,'depth-4':1199,'nodes-100k':1392,'nodes-250k':1497,'nodes-500k':1596,'nodes-1M':1667,'nodes-2M':1712}
pts=0.0; ops=[]
for line in sys.stdin:
    parts=line.split()
    if len(parts)>=5 and parts[0].endswith('.py') or True:
        # per-game line: mod game opponent colour result outcome reason
        for a in anchors:
            if a in line:
                ops.append(a)
                if ' win ' in ' '+line+' ' or ' outcome' == '': pass
        if ' win ' in line: pts+=1.0
        elif ' draw ' in line: pts+=0.5
import math
def elo(R):
    e=sum(1/(1+10**((anchors[a]-R)/400)) for a in ops)
    return e-pts
lo,hi=0,2400
for _ in range(60):
    mid=(lo+hi)/2
    if elo(mid)>0: hi=mid
    else: lo=mid
print('points',pts,'games',len(ops),'Elo',round((lo+hi)/2))
