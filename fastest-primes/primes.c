#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int main(){
    char buf[16]; size_t n=0; int c;
    while((c=getchar_unlocked())!=EOF && c!='\n' && n<15){ if(c>='0'&&c<='9') buf[n++]=c; }
    buf[n]=0;
    long N=atol(buf);
    if(N<2){ puts("0"); return 0; }
    char *sieve=calloc(N+1,1);
    long count=0;
    for(long i=2;i<=N;i++){
        if(!sieve[i]){ count++; for(long j=i*i;j<=N;j+=i) sieve[j]=1; }
    }
    printf("%ld\n", count);
    return 0;
}
