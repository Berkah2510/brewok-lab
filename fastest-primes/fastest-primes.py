import sys
def main():
    n=int(sys.stdin.read())
    if n<2: print(0); return
    s=bytearray(b"\x01")*(n+1)
    s[0:2]=b"\x00\x00"
    i=2
    while i*i<=n:
        if s[i]: s[i*i::i]=b"\x00"*len(range(i*i,n+1,i))
        i+=1
    print(sum(s))
main()
