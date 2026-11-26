// SLIDE FIGHT - browser version. Rows of results.csv = player sprite, columns = computer sprite.
const W=960,H=640,PH=90,HUD=70,LANES=3,LH=(H-HUD)/LANES;
const SPEED=70,CD=5,CI=5,IF=.85,MINI=1,LIVES=5,KB=50,KBT=.25,PN=3,BW=80,BH=60,BX=15,SPAWN=110;
const cv=document.getElementById('c'),g=cv.getContext('2d');cv.width=W;cv.height=H+PH;
const rnd=a=>a[Math.floor(Math.random()*a.length)], lc=l=>HUD+l*LH+LH/2;
const text=(t,x,y,s,c,a='left')=>{g.font=`bold ${s}px Arial,sans-serif`;g.fillStyle=c;g.textAlign=a;g.textBaseline='middle';g.fillText(t,x,y)};
const rr=(x,y,w,h,r,f,s,lw)=>{g.beginPath();g.roundRect(x,y,w,h,r);if(f){g.fillStyle=f;g.fill()}if(s){g.strokeStyle=s;g.lineWidth=lw||2;g.stroke()}};
const loadImg=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src});
const csv=t=>t.split(/\r?\n/).map(l=>l.split(',').map(c=>c.trim()));
const getText=async u=>{try{const r=await fetch(u);return r.ok?await r.text():''}catch(e){return ''}};
function flip(i){const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.translate(i.width,0);x.scale(-1,1);x.drawImage(i,0,0);return c}
function placeholder(n,face){const s=[[90,90],[85,85],[95,95]][(n-1)%3],cols=['#508cff','#fa963c','#5ac878','#c86ef0','#f0d246','#46d2dc'],c=document.createElement('canvas');c.width=s[0];c.height=s[1];const x=c.getContext('2d'),d=face=='right'?5:-5;
 x.fillStyle=cols[(n-1)%6];x.beginPath();x.roundRect(4,4,s[0]-8,s[1]-8,14);x.fill();x.lineWidth=3;x.strokeStyle='#fff';x.stroke();
 [-14,14].forEach(o=>{x.fillStyle='#fff';x.beginPath();x.arc(s[0]/2+o+d,s[1]/3,8,0,7);x.fill();x.fillStyle='#111';x.beginPath();x.arc(s[0]/2+o+2*d,s[1]/3,4,0,7);x.fill()});return c}

let sprites={},nums=[],results={},speeds={player:{},computer:{}},tracks=[],ti=0,fails=0,audio=new Audio();
let state='loading',level=1,interval=CI,timer=CI,pl=0,cl=0,fighters=[],puffs=[],cds=[0,0,0],queue=[];

async function init(){
 for(let n=1;;n++){const [r,l]=await Promise.all([loadImg(`sprites/sprite_${n}_right.png`),loadImg(`sprites/sprite_${n}_left.png`)]);
  if(!r&&!l)break;sprites[n]={right:r||flip(l),left:l||flip(r)};nums.push(n)}
 if(!nums.length)for(let n=1;n<=3;n++){sprites[n]={right:placeholder(n,'right'),left:placeholder(n,'left')};nums.push(n)}
 const rows=csv(await getText('results.csv')),cols=(rows[0]||[]).slice(1).map(c=>parseInt(c));
 rows.slice(1).forEach(r=>{const rn=parseInt(r[0]);if(isNaN(rn))return;r.slice(1).forEach((c,i)=>{c=c.toLowerCase();if(c&&'wlx-'.includes(c))results[rn+','+cols[i]]=c})});
 let sec;csv(await getText('speed.csv')).forEach(r=>{const f=(r[0]||'').toLowerCase(),v=parseFloat(r[1]);
  if(f.includes('player'))sec='player';else if(f.includes('computer'))sec='computer';else if(sec&&parseInt(f)&&v>0)speeds[sec][parseInt(f)]=v});
 try{tracks=JSON.parse(await getText('playlist.json')).tracks||[]}catch(e){}
 audio.volume=.5;audio.onplaying=()=>fails=0;audio.onended=nextTrack;audio.onerror=()=>{if(++fails<tracks.length)nextTrack()};
 start(1);state='ready';
}
function play(){if(tracks.length){audio.src=tracks[ti%tracks.length];audio.play().catch(()=>{})}}
function nextTrack(){ti=(ti+1)%tracks.length;play()}   // wraps to the first track after the last

function start(l){level=l;interval=Math.max(MINI,CI*IF**(l-1));timer=interval;fighters=[];puffs=[];cds=[0,0,0];pl=cl=LIVES;
 queue=Array.from({length:PN},()=>rnd(nums));state='play'}
function spawn(side,lane,n=rnd(nums)){const img=sprites[n][side=='player'?'right':'left'],s=Math.min(1,(LH-20)/img.height),w=img.width*s,h=img.height*s;
 fighters.push({side,lane,n,img,w,h,x:side=='player'?SPAWN:W,y:lc(lane)-h/2,dir:side=='player'?1:-1,speed:speeds[side][n]||SPEED,alive:true,sl:null})}
function press(l){if(state!='play'||cds[l]>0)return;cds[l]=CD;const n=queue.shift();queue.push(rnd(nums));spawn('player',l,n)}
const hit=(a,b)=>{const ax=a.x+a.w*.15,ay=a.y+a.h*.15,aw=a.w*.7,ah=a.h*.7,bx=b.x+b.w*.15,by=b.y+b.h*.15,bw=b.w*.7,bh=b.h*.7;return ax<bx+bw&&bx<ax+aw&&ay<by+bh&&by<ay+ah};

function fights(){
 const P=fighters.filter(f=>f.alive&&f.side=='player'),E=fighters.filter(f=>f.alive&&f.side=='computer');
 for(const p of P)for(const e of E){
  if(!p.alive||!e.alive||p.lane!=e.lane||!hit(p,e))continue;
  const c=results[p.n+','+e.n],o=c=='x'?'both':c=='w'?'player':c=='l'?'computer':Math.random()<.5?'player':'computer';   // no entry / '-' = 50/50
  (o=='player'?[e]:o=='computer'?[p]:[p,e]).forEach(f=>{f.alive=false;puffs.push({x:f.x+f.w/2,y:f.y+f.h/2,t:0,c:f.side=='player'?'#508cff':'#f05a5a'})});
  if(o=='computer')e.sl={t:0,x0:e.x,d:KB};   // player lost: winner slides back 50px in 0.25s
  if(!p.alive)break}
}
function update(dt){
 cds=cds.map(c=>Math.max(0,c-dt));
 if((timer-=dt)<=0){timer+=interval;spawn('computer',Math.floor(Math.random()*LANES))}
 fighters.forEach(f=>{if(f.sl){f.sl.t+=dt;const k=Math.min(1,f.sl.t/KBT);f.x=f.sl.x0+f.sl.d*(1-(1-k)**3);if(k>=1)f.sl=null}else f.x+=f.dir*f.speed*dt});
 fights();
 fighters.forEach(f=>{if(f.alive&&(f.side=='player'?f.x>=W:f.x+f.w<=0)){f.alive=false;f.side=='player'?cl--:pl--}});
 fighters=fighters.filter(f=>f.alive);puffs.forEach(p=>p.t+=dt);puffs=puffs.filter(p=>p.t<.4);
 if(pl<=0)state='lost';else if(cl<=0)state='won';
}

function draw(){
 g.fillStyle='#1c1e26';g.fillRect(0,0,W,H+PH);
 for(let i=0;i<LANES;i++){g.fillStyle=i%2?'#282d3a':'#2e3442';g.fillRect(0,HUD+i*LH,W,LH);g.fillStyle='#464e62';g.fillRect(0,HUD+i*LH,W,2)}
 fighters.forEach(f=>g.drawImage(f.img,f.x,f.y,f.w,f.h));
 puffs.forEach(p=>{const k=p.t/.4;g.beginPath();g.arc(p.x,p.y,15+45*k,0,7);g.lineWidth=Math.max(1,8*(1-k));g.strokeStyle=p.c;g.stroke()});
 for(let i=0;i<LANES;i++){const y=lc(i)-BH/2-8,ok=cds[i]<=0,by=y+BH+6,pr=1-cds[i]/CD;
  rr(BX,y,BW,BH,10,ok?'#46be6e':'#5f626e','#f0f0f5',3);text(ok?`SEND [${i+1}]`:'WAIT',BX+BW/2,y+BH/2,15,'#0f140f','center');
  rr(BX,by,BW,10,5,'#14161c');if(pr>0)rr(BX,by,BW*pr,10,5,ok?'#46be6e':'#fadc5a');rr(BX,by,BW,10,5,null,'#f0f0f5',2)}
 g.fillStyle='#121319';g.fillRect(0,0,W,HUD);
 text(`YOU  ♥ ${Math.max(0,pl)}`,20,HUD/2,28,'#508cff');text(`♥ ${Math.max(0,cl)}  COMPUTER`,W-20,HUD/2,28,'#f05a5a','right');
 text(`SLIDE FIGHT  -  LEVEL ${level}`,W/2,HUD/2,28,'#f0f0f5','center');
 g.fillStyle='#121319';g.fillRect(0,H,W,PH);g.fillStyle='#464e62';g.fillRect(0,H,W,2);   // preview bar
 const cy=H+PH/2;text('NEXT UP',20,cy,28,'#f0f0f5');let x=160;
 queue.forEach((n,i)=>{const box=i?50:68,im=sprites[n].right,s=Math.min(1,box/im.width,box/im.height),w=im.width*s,h=im.height*s;
  rr(x,cy-(box+12)/2,box+12,box+12,10,'#242834',i?'#5f626e':'#fadc5a',i?2:3);g.drawImage(im,x+(box+12-w)/2,cy-h/2,w,h);x+=box+28});
 text('Click a lane button or press 1 / 2 / 3',W-20,cy,16,'#5f626e','right');
 if(state!='play'){g.fillStyle='rgba(0,0,0,.65)';g.fillRect(0,0,W,H+PH);const wh='#f0f0f5',gr='#46be6e',
  L=state=='ready'?[['SLIDE FIGHT',72,gr],['Click to start',28,wh]]
  :state=='won'?[['LEVEL UP!',72,gr],[`You beat level ${level}. Welcome to level ${level+1}!`,28,wh],[`The computer will now release a fighter every ${Math.max(MINI,CI*IF**level).toFixed(1)} seconds.`,18,'#fadc5a'],['Click or press R to continue',28,wh]]
  :state=='lost'?[['GAME OVER',72,'#f05a5a'],[`You reached level ${level}.`,28,wh],['Click or press R to start again from level 1',28,wh]]:[['Loading...',40,wh]];
  L.forEach((l,i)=>text(l[0],W/2,H/2-70+i*58,l[1],l[2],'center'))}
}

function act(){if(state=='ready'){start(1);play()}else if(state=='won')start(level+1);else if(state=='lost')start(1)}
cv.onpointerdown=e=>{const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*cv.width/r.width,y=(e.clientY-r.top)*cv.height/r.height;
 if(state=='play'){for(let i=0;i<LANES;i++){const by=lc(i)-BH/2-8;if(x>=BX&&x<=BX+BW&&y>=by&&y<=by+BH)press(i)}}else act()};
addEventListener('keydown',e=>{if(['1','2','3'].includes(e.key))press(+e.key-1);if((e.key=='r'||e.key=='R')&&(state=='won'||state=='lost'))act()});
let last=0;function loop(t){const dt=Math.min(.05,(t-last)/1000||0);last=t;if(state=='play')update(dt);draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);init();
