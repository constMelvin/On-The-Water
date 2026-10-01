/* ================= PROTOTYPE STATE ================= */
const app=$('#app');
const S={device:'desktop',screen:'landing',state:'default',phase:'planning',role:'leader',acct:false,
pstep:0,plan:blankPlan(),perr:'',busy:false,
joinStep:0,joinCode:'',joinName:'',joinErr:'',
enterStep:0,enterCode:'',enterPw:'',enterErr:'',
authTab:'login',authCtx:false,savedNew:false,
att:'g',stops:STOPS0.map(x=>({...x})),items:ITEMS0.map(x=>({...x})),chkF:'all',
bud:{tr:5600,st:6400,fo:4800,ac:2000,ot:800,n:8},
exp:EXP0.map(x=>({...x})),paid:{},msgs:MSG0.map(x=>({...x})),
locSharing:false,locStatus:'otw',selPin:null,
upl:[],phF:'all',lb:null,
couple:false,coupleTab:'ideas',ideas:{0:1},cb:{fo:1800,tr:900,ac:700},
calView:'upcoming',calY:2026,calM:10,
notif:{soon:1,join:1,att:0,chk:1,bud:0,eve:1,day:1},notifSel:'soon',notifPerm:false,
sheet:null,sd:{},banner:true,jid:null,jstep:0};

/* ================= HELPERS ================= */
const LOGO=(c='')=>`<span class="logo ${c}">${ic('pin',26)}<b>OTW</b></span>`;
const BLOBS=['46% 54% 38% 62% / 50% 42% 58% 50%','58% 42% 55% 45% / 44% 56% 44% 56%','40% 60% 48% 52% / 56% 40% 60% 44%','52% 48% 62% 38% / 46% 58% 42% 54%','44% 56% 40% 60% / 54% 46% 54% 46%','60% 40% 46% 54% / 42% 54% 46% 58%'];
const blob=i=>`border-radius:${BLOBS[i%BLOBS.length]}`;
const av=(n,s=36,on=false)=>{const m=byName(n);return `<span class="av c-${m.c}${on?' on':''}" style="width:${s}px;height:${s}px;font-size:${Math.round(s*.44)}px" title="${esc(n)}">${esc(n[0])}</span>`};
const stack=(names,s=32,max=5)=>`<span class="stack">${names.slice(0,max).map(n=>av(n,s)).join('')}${names.length>max?`<span class="av c-cream" style="width:${s}px;height:${s}px;font-size:${Math.round(s*.4)}px">+${names.length-max}</span>`:''}</span>`;
const tag=(t,c='',i='',s=14)=>`<span class="tag ${c}">${i?ic(i,s):''}${t}</span>`;
const stBadge=k=>`<span class="tag ${ST[k].cls}">${ic(ST[k].i,14)}${ST[k].b}</span>`;
const counts=()=>{const c={g:0,m:0,x:0};MEM.forEach(m=>{c[m.n==='Merylle'?S.att:m.s]++});return c};
const budTotal=()=>S.bud.tr+S.bud.st+S.bud.fo+S.bud.ac+S.bud.ot;
const spent=()=>S.exp.reduce((a,e)=>a+e.a,0);
const photoCount=()=>(S.phase==='planning'?0:S.phase==='day'?6:12)+S.upl.filter(u=>u.done).length;
const jsonOr=(s,d)=>{try{return JSON.parse(s)}catch(e){return d}};

function toast(msg,kind=''){
  const host=$('#toast');if(!host)return;
  const t=document.createElement('div');t.className='toast '+kind;t.innerHTML=(kind==='err'?ic('alert',18):ic('check',18))+`<span>${msg}</span>`;
  host.innerHTML='';host.appendChild(t);clearTimeout(toast._t);toast._t=setTimeout(()=>{host.innerHTML=''},2600);
}
function burst(x,y){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cols=['var(--zest)','var(--rosy)','var(--cream)','var(--teal)','var(--zest)','var(--rosy)','var(--cream)'];
  for(let i=0;i<7;i++){const s=document.createElement('span');s.className='spark';const a=Math.random()*Math.PI*2,d=44+Math.random()*52;
    s.style.cssText=`left:${x}px;top:${y}px;--tx:${(Math.cos(a)*d).toFixed(0)}px;--ty:${(Math.sin(a)*d).toFixed(0)}px;color:${cols[i]}`;
    s.innerHTML=ic('sparkle',16);document.body.appendChild(s);setTimeout(()=>s.remove(),760);}
}
function burstMid(){const v=$('.viewport');if(!v)return;const r=v.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height*.4)}

/* screen registry */
const SC={
landing:{g:'Public',t:'Landing',k:'pub',u:''},
plan:{g:'Public',t:'Plan a Gala',k:'focus',u:'plan',th:()=>['rosy','zest','teal','blossom'][S.pstep]},
created:{g:'Public',t:'Gala created',k:'focus',u:'plan/done',th:()=>'rosy'},
join:{g:'Public',t:'Join a Gala',k:'focus',u:'join',th:()=>['zest','blossom','rosy'][S.joinStep]},
enter:{g:'Public',t:'Enter a Gala',k:'focus',u:'enter',th:()=>S.enterStep?'blossom':'teal'},
auth:{g:'Public',t:'Log in / Create account',k:'focus',u:'login',th:()=>'blossom'},
dashboard:{g:'Gala',t:'Gala Dashboard',k:'gala',nav:'home',u:'gala/'+G.code},
attendance:{g:'Gala',t:'Attendance',k:'gala',nav:'att',tab:1,u:'gala/'+G.code+'/attendance'},
itinerary:{g:'Gala',t:'Itinerary',k:'gala',nav:'plan',tab:1,u:'gala/'+G.code+'/route',fab:'addStop'},
checklist:{g:'Gala',t:'Checklist',k:'gala',nav:'chk',tab:1,u:'gala/'+G.code+'/checklist',fab:'addItem'},
budget:{g:'Gala',t:'Budget estimator',k:'gala',nav:'bud',tab:1,u:'gala/'+G.code+'/budget'},
expenses:{g:'Gala',t:'Expense tracker',k:'gala',nav:'exp',tab:1,u:'gala/'+G.code+'/ambagan',fab:'addExp'},
chat:{g:'Gala',t:'Chat',k:'gala',nav:'chat',u:'gala/'+G.code+'/chat'},
location:{g:'Gala',t:'Live location',k:'gala',nav:'loc',u:'gala/'+G.code+'/map'},
dump:{g:'Gala',t:'The Gala Dump',k:'gala',nav:'dump',u:'gala/'+G.code+'/dump',fab:'upload'},
couple:{g:'Gala',t:'Couple Mode',k:'gala',nav:'couple',u:'gala/'+G.code+'/couple'},
settings:{g:'Gala',t:'Gala settings',k:'gala',nav:'set',u:'gala/'+G.code+'/settings'},
completed:{g:'Gala',t:'Gala completed',k:'gala',nav:'home',u:'gala/'+G.code+'/recap'},
system:{g:'Public',t:'Design system',k:'pub',u:'system'},
mygalas:{g:'Account',t:'My Galas + Calendar',k:'acct',nav:'my',u:'me/galas'},
history:{g:'Account',t:'Gala History',k:'acct',nav:'hist',u:'me/history'},
notifs:{g:'Account',t:'Notifications',k:'acct',nav:'not',u:'me/notifications'},
profile:{g:'Account',t:'Profile & settings',k:'acct',nav:'pro',u:'me/profile'}};
const views={};
const GNAV=[['home','Home','home','dashboard'],['att',"Who's G?",'users','attendance'],['plan','The plan','route','itinerary'],['bud','Gastos','calc','budget'],['exp','Ambagan','wallet','expenses'],['chk','Checklist','checklist','checklist'],['chat','Chismis','chat','chat'],['loc',"Who's OTW?",'nav','location'],['dump','Gala Dump','image','dump'],['couple','Couple Mode','heart','couple']];
const GBOT=[['home','Home','home','dashboard'],['chat','Chat','chat','chat'],['loc','Map','map','location']];
const ANAV=[['my','My Galas','calendar','mygalas'],['hist','Gala History','notepad','history'],['not','Notifications','bell','notifs'],['pro','Profile','user','profile']];
const ABOT=[['my','Home','home','mygalas'],['not','Notifications','bell','notifs'],['pro','Profile','user','profile']];
const PTABS=[['attendance',"Who's G?"],['itinerary','The plan'],['budget','Gastos'],['expenses','Ambagan'],['checklist','Checklist']];

/* ---- generic state blocks ---- */
const EMPTY={
dashboard:{i:'users',t:'Just you so far.',b:'Share the gala code and get your friends in.',c:'Share Gala',sheet:'share'},
attendance:{i:'users',t:'No responses yet.',b:'Ask the GC. Tap Share Gala to send the code again.',c:'Share Gala',sheet:'share'},
itinerary:{i:'pin',t:'No stops yet. Saan tayo?',b:'Add the places, activities, food stops, and everything in between.',c:'Add a Stop',sheet:'addStop'},
checklist:{i:'checklist',t:'Nothing here yet. Pack smart.',b:'Add the things someone always forgets, like the charger.',c:'Add to Checklist',sheet:'addItem'},
budget:{i:'calc',t:'No estimates yet.',b:'Start with transportation. Everything else follows.',c:'Add an estimate',sheet:'addStop',noop:1},
expenses:{i:'wallet',t:'No expenses yet. Walang nag-abono. Pa.',b:'When someone pays for something, log it here so nobody has to remember.',c:'Add an expense',sheet:'addExp'},
chat:{i:'chat',t:'Quiet in here. Say something.',b:'Start with a “G!” or ask who is bringing the speaker.',c:'Say hi',noop:1},
location:{i:'nav',t:"Nobody's sharing yet.",b:'When people start heading out, they can share live location here. Sharing is always opt-in.',c:'Share my location',sheet:'locPerm'},
dump:{i:'image',t:'No memories yet. Go make some.',b:'Photos from the gala land here for everyone.',c:'Add Photos',sheet:'upload'},
couple:{i:'heart',t:'No ideas saved yet.',b:'Pick a few date ideas to start your plan for two.',c:'Browse ideas',noop:1},
mygalas:{i:'calendar',t:'Nothing on the calendar yet.',b:'Sounds like a good time to plan something.',c:'Plan a Gala',go:'plan'},
history:{i:'notepad',t:"No past galas yet. Let's fix that.",b:'Finished galas show up here with their photos and expenses.',c:'Plan a Gala',go:'plan'},
notifs:{i:'bell',t:'All caught up.',b:'When there is something to know, it shows up here first.',c:'Back to My Galas',go:'mygalas'}};
const ERR={
dashboard:{t:"The dashboard didn't load.",b:'Your gala is safe. Give it another try.'},
attendance:{t:"Couldn't save your status.",b:'Nothing changed. Tap your choice again.'},
itinerary:{t:"The route didn't load.",b:'Your stops are safe. Try again.'},
checklist:{t:"Couldn't update the checklist.",b:'Nothing was lost. Try again in a moment.'},
budget:{t:"Couldn't save your estimate.",b:'Your numbers are still on this screen. Try saving again.'},
expenses:{t:"Couldn't load the expenses.",b:'Nothing was changed. Try again.'},
chat:{t:"Messages didn't load.",b:'Your chat is still there. Try again.'},
couple:{t:"Couldn't load your ideas.",b:'Try again in a moment.'},
settings:{t:"Couldn't save your changes.",b:'Nothing changed. Try again.'},
completed:{t:"The recap didn't load.",b:'Everything is still saved. Try again.'},
mygalas:{t:"Couldn't load your galas.",b:'They are still saved to your account. Try again.'},
history:{t:"History didn't load.",b:'Try again in a moment.'},
notifs:{t:'Notifications are blocked in your browser.',b:'Allow notifications for this site in your browser settings, then come back and try again.'},
profile:{t:"Couldn't save your profile.",b:'Nothing changed. Try again.'}};
const OKMSG={dashboard:'Status updated.',attendance:"You're marked as G. The chat knows.",itinerary:'Stop added. Everyone can see it.',checklist:'Item added to the checklist.',budget:'Budget updated.',expenses:'Expense added and split.',chat:'Message sent.',location:"You're sharing with 7 people.",dump:'3 photos added.',couple:'Saved to your plan.',settings:'Saved.',mygalas:'Saved to My Galas.',history:'Plan revived.',notifs:'Reminders on.',profile:'Profile saved.'};

const empty=(e)=>`<div class="empty"><div class="ico xl" style="${blob(2)}">${ic(e.i,44)}</div><h3>${e.t}</h3><p>${e.b}</p>${e.go?`<button class="btn rosy" data-go="${e.go}">${e.c}</button>`:e.noop?`<button class="btn rosy" data-act="noop" data-t="This opens the form.">${e.c}</button>`:`<button class="btn rosy" data-act="sheet" data-v="${e.sheet}">${e.c}</button>`}</div>`;
const errBlock=(e)=>`<div class="empty err"><div class="ico xl" style="${blob(3)};color:var(--rosy-dark)">${ic('alert',44)}</div><h3>${e.t}</h3><p>${e.b}</p><button class="btn rosy" data-act="retry">${ic('refresh',20)} Try again</button></div>`;
const offline=()=>`<div class="offl" role="status">${ic('wifioff',22)}<div><b>Connection's a bit shaky.</b> You're seeing the last saved version. Anything you change will sync when you're back online.</div></div>`;
const skeleton=(k)=>k==='dump'?`<div class="skl"><div class="sk" style="height:56px;width:60%"></div><div class="masonry">${[190,250,170,280,210,240,180,260].map(h=>`<div class="sk" style="height:${h}px"></div>`).join('')}</div></div>`
 :k==='chat'?`<div class="skl">${[70,90,60,80,64].map((h,i)=>`<div class="row" style="justify-content:${i%2?'flex-end':'flex-start'}"><div class="sk" style="height:${h}px;width:56%"></div></div>`).join('')}</div>`
 :`<div class="skl"><div class="sk" style="height:132px"></div><div class="g g3">${[1,2,3,4,5,6].map(()=>`<div class="sk" style="height:110px"></div>`).join('')}</div></div>`;
function gate(k,fn){
  const st=S.state;
  if(st==='loading')return skeleton(k);
  if(st==='empty'&&EMPTY[k])return empty(EMPTY[k]);
  if(st==='error'&&ERR[k])return errBlock(ERR[k]);
  return (st==='offline'?offline():'')+fn();
}
const head=(title,sub,tagHtml='')=>`<div class="phead">${tagHtml}<h2 class="h2">${title}</h2>${sub?`<p class="sub">${sub}</p>`:''}</div>`;

/* ================= SHELLS ================= */
function focusShell(sc){
  const th=sc.th();
  return `<div class="scroller focus bg-${th}" id="scr"><div class="ftop">${LOGO()}<button class="btn sm ghost iconbtn" data-go="landing" aria-label="Close">${ic('x',20)}</button></div><div class="fbody">${views[S.screen]()}</div></div>`;
}
function galaMini(){
  return `<div class="gmini"><b>${G.title}</b><span>${G.range}</span><button class="codepill" data-act="copy" data-v="code" aria-label="Copy gala code">${ic('copy',14)} ${G.code}</button></div>`;
}
function appShell(sc){
  const acct=sc.k==='acct',items=acct?ANAV:GNAV,bot=acct?ABOT:GBOT;
  const nav=items.map(([k,l,i,scr])=>`<button class="sn ${sc.nav===k?'on':''}" data-go="${scr}" title="${l}">${ic(i,22)}<span class="lbl">${l}</span>${k==='chat'&&S.screen!=='chat'?'<em class="badge">2</em>':''}</button>`).join('');
  const foot=acct?`<button class="btn sm zest fw" data-go="plan">${ic('plus',18)}<span class="lbl">Plan a Gala</span></button>`
    :`<button class="sn ${sc.nav==='set'?'on':''}" data-go="settings" title="Settings">${ic('sliders',22)}<span class="lbl">Settings</span></button>`+(S.acct?`<button class="sn" data-go="mygalas" title="My Galas">${ic('calendar',22)}<span class="lbl">My Galas</span></button>`:`<button class="savecard" data-act="sheet" data-v="account">${ic('sparkle',16)}<span class="lbl">Save this gala</span></button>`);
  const side=`<aside class="side">${LOGO('cr')}${acct?`<div class="gmini"><b>Hi, Merylle</b><span>${S.acct?'Signed in':'Not signed in'}</span></div>`:galaMini()}<nav class="snav">${nav}</nav><div class="sfoot">${foot}</div></aside>`;
  const tabs=sc.tab?`<div class="ptabs" role="tablist">${PTABS.map(([k,l])=>`<button role="tab" aria-selected="${S.screen===k}" class="${S.screen===k?'on':''}" data-go="${k}">${l}</button>`).join('')}</div>`:'';
  const role=S.role==='leader'?tag('Gala Leader','zest','crown',14):tag('Member','blossom','user',14);
  const top=acct?`<div class="topbar"><b class="tb-t">${sc.t}</b><div class="tb-r"><button class="ibtn" data-go="notifs" aria-label="Notifications">${ic('bell',22)}</button>${av('Merylle',36)}</div></div>`
    :`<div class="topbar"><div class="tb-l"><button class="ibtn only-m" data-act="sheet" data-v="more" aria-label="More">${ic('more',24)}</button><b class="tb-t">${G.title}</b><button class="codepill hide-m" data-act="copy" data-v="code">${ic('copy',14)} ${G.code}</button></div><div class="tb-r">${role}${stack(MEM.filter(m=>m.s==='g').map(m=>m.n),30,4)}</div></div>`;
  const bn=bot.map(([k,l,i,scr])=>`<button class="bn ${sc.nav===k||(k==='home'&&acct&&sc.nav==='hist')?'on':''}" data-go="${scr}" aria-label="${l}">${ic(i,26)}${k==='chat'&&S.screen!=='chat'?'<em class="badge">2</em>':''}</button>`).join('');
  const fab=sc.fab&&!(S.state==='empty')?`<button class="fab" data-act="sheet" data-v="${sc.fab}" aria-label="${sc.fab==='upload'?'Add Photos':sc.fab==='addStop'?'Add a Stop':'Add'}">${ic(sc.fab==='upload'?'camera':'plus',28)}</button>`:'';
  return `<div class="shell ${S.screen==='chat'?'is-chat':''}">${side}<div class="mw">${top}${tabs}<main class="main ${S.screen==='chat'?'chatmain':''}" id="scr">${views[S.screen]()}</main></div><nav class="bnav" aria-label="Main">${bn}</nav>${fab}</div>`;
}

/* ================= PUBLIC / FOCUS SCREENS ================= */
const mascot=(s=260)=>`<svg class="mascot" width="${s}" height="${Math.round(s*1.09)}" viewBox="0 0 220 240" role="img" aria-label="OTW mascot: a smiling location pin"><path d="M18 218q23-17 46 0t46 0 46 0 46 0" style="fill:none;stroke:var(--teal-dark);stroke-width:6;stroke-linecap:round"/><path d="M110 22C68 22 42 56 42 96c0 50 68 112 68 112s68-62 68-112c0-40-26-74-68-74z" style="fill:var(--blossom);stroke:var(--teal-dark);stroke-width:5;stroke-linejoin:round"/><circle cx="90" cy="92" r="12" style="fill:var(--cream)"/><circle cx="130" cy="92" r="12" style="fill:var(--cream)"/><circle cx="92" cy="94" r="5.5" style="fill:var(--teal-dark)"/><circle cx="132" cy="94" r="5.5" style="fill:var(--teal-dark)"/><path d="M92 122q18 18 36 0" style="fill:none;stroke:var(--teal-dark);stroke-width:6;stroke-linecap:round"/><circle cx="72" cy="114" r="8" style="fill:var(--rosy)"/><circle cx="148" cy="114" r="8" style="fill:var(--rosy)"/><g transform="translate(166 20) scale(1.1)" style="fill:var(--zest)"><path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10Z"/></g><g transform="translate(8 60) scale(.8)" style="fill:var(--zest)"><path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10Z"/></g><g transform="translate(184 150) scale(.7)" style="fill:var(--teal-dark)"><path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10Z"/></g></svg>`;
const ROUTE=['G tayo?','When are we going?',"Who's G?","What's the plan?",'How much?','What do we need?','Where is everyone?','OTW na.'];
const routeChips=(cls='')=>`<div class="rchips ${cls}">${ROUTE.map((r,i)=>`<span class="rc ${i===ROUTE.length-1?'last':''}">${r}</span>${i<ROUTE.length-1?ic('arrowr',16,'rc-a'):''}`).join('')}</div>`;

views.landing=()=>{
  const HW=[['calendar','Pick the date',"Let's turn “someday” into an actual date."],['users',"See who's G","I'm G, Maybe, or Can't make it. No more “seen.”"],['route','Build the plan','Places, food stops and timing, in order.'],['calc','Talk gastos','Estimate the budget before “magkano ba?” starts.'],['checklist','Pack smart','Because someone always forgets the charger.'],['nav','Watch everyone go OTW','Live location on gala day.']];
  const LF=[['route','Saan Tayo?','Build the gala route: every stop, time and food break in order.','Itinerary','zest'],['wallet','Ambagan','Track who paid what and who owes who. Walang may habol.','Expenses','rosy'],['nav',"Who's actually OTW?","Share live location and see who's 2 minutes away.",'Live location','zest'],['chat',"What's the chismis?",'A group chat that lives inside the plan.','Chat','rosy'],['image','The Gala Dump','Good shots, bad shots, random candids. One shared gallery.','Photos','zest'],['heart','Just the two of you?','Same OTW energy, smaller passenger count.','Couple Mode','rosy']];
  return `<section class="sec bg-rosy hero-sec"><header class="pnav">${LOGO()}<nav class="plinks"><button class="lnk" data-scroll="p-how">How it works</button><button class="lnk" data-scroll="p-feat">Features</button><button class="lnk" data-go="enter">Enter a Gala</button><button class="lnk" data-go="auth" data-set='{"authTab":"login","authCtx":false}'>Log in</button></nav><button class="btn sm zest" data-go="plan">Plan a Gala</button></header>
  <div class="hero"><div class="hero-l">${tag('For plans that actually happen','zest','sparkle',14)}<h1 class="h1">From “G tayo?” to “OTW na.”</h1><p class="lead">Finally, a place for all those gala plans na ilang buwan nang nasa group chat.</p><div class="ctas"><button class="btn zest" data-go="plan">Plan a Gala</button><button class="btn ghost" data-go="join">Join a Gala</button></div><p class="micro">And yes, we can tell if you're actually OTW.</p><p class="micro">Been here before? <button class="lnk" data-go="enter">Enter a Gala</button></p></div>
  <div class="heroviz">${mascot(230)}<span class="bub b1">G tayo?</span><span class="bub b2">G!</span><span class="bub b3">Sino may car?</span><span class="bub b4">2 mins away</span></div></div></section>
  <section class="sec bg-zest" id="p-how"><h2 class="h2 ctr">From group chat to gala day.</h2><p class="sub ctr">Six steps. No account needed for any of them.</p><div class="g g3 steps">${HW.map((s,i)=>`<div class="card blobcard" style="${blob(i)}"><span class="stepn">${i+1}</span><div class="ico" style="${blob(i+2)}">${ic(s[0],26)}</div><h3>${s[1]}</h3><p>${s[2]}</p></div>`).join('')}</div>${routeChips()}</section>
  <section class="sec bg-teal" id="p-feat"><h2 class="h2 ctr">Everything the GC never got to.</h2><p class="sub ctr">Plan it. Share it. Make it happen.</p><div class="g g3">${LF.map((f,i)=>`<div class="card c-blossom lift"><div class="ico" style="${blob(i)}">${ic(f[0],26)}</div><h3>${f[1]}</h3><p>${f[2]}</p>${tag(f[3],f[4])}</div>`).join('')}</div></section>
  <section class="sec bg-rosy"><h2 class="h2 ctr">Jump in. No sign-up.</h2><p class="sub ctr">Make an account later, only if you want to keep your galas with you.</p><div class="g g2 two"><div class="card"><h3>Right away, no account</h3><ul class="ticks">${['Plan a Gala or join with a code','Attendance, itinerary, checklist','Budget, expenses, chat','Live location on gala day','The Gala Dump for photos'].map(x=>`<li>${ic('check',18)}${x}</li>`).join('')}</ul></div><div class="card c-zest"><h3>Want to keep your galas with you?</h3><ul class="ticks">${['Saved galas, one tap away','A personal gala calendar','Gala history, plus Mga Drawing','Reminders, even when you\'re not in the gala','Your galas on any device'].map(x=>`<li>${ic('sparkle',14)}${x}</li>`).join('')}</ul><p class="fine">Totally optional.</p></div></div></section>
  <section class="sec bg-blossom cta-sec"><h2 class="h2 ctr">Okay, G na ba?</h2><p class="sub ctr">From “G tayo?” to “OTW na.”</p><div class="ctas ctr-row"><button class="btn rosy" data-go="plan">Plan a Gala</button><button class="btn ghost" data-go="join">Join a Gala</button></div></section>
  <footer class="sec bg-tdark foot">${LOGO()}<p>OTW: On The Water. And yes, On The Way too.</p><div class="flinks"><button class="lnk" data-go="plan">Plan a Gala</button><button class="lnk" data-go="join">Join a Gala</button><button class="lnk" data-go="enter">Enter a Gala</button><button class="lnk" data-go="auth" data-set='{"authTab":"login","authCtx":false}'>Log in</button><button class="lnk" data-go="system">Design system</button></div></footer>`;
};

const pwMeter=v=>{const n=(v.length>=6)+(v.length>=10)+(/[0-9]/.test(v)&&/[a-z]/i.test(v));return `<div class="meter" aria-label="Password strength"><i class="${n>0?'on':''}"></i><i class="${n>1?'on':''}"></i><i class="${n>2?'on':''}"></i><span>${['Add a few characters','Okay','Good','Solid'][n]}</span></div>`};
views.plan=()=>{
  const i=S.pstep,p=S.plan,th=['rosy','zest','teal','blossom'][i],pb=(th==='rosy'||th==='teal')?'zest':'rosy';
  const Q=[
  {q:'First things first. What are we calling this gala?',h:'Give your gala a name your GC will remember.',f:`<input class="in big" data-model="plan.title" value="${esc(p.title)}" placeholder="Baguio Before Graduation" aria-label="Gala title" autocomplete="off"><button class="chip" data-act="plan-example">${ic('sparkle',12)} Use example</button>`},
  {q:'When are we going?',h:'Let\'s turn “someday” into an actual date.',f:`<label class="fl">Date<input type="date" class="in" data-model="plan.date" value="${p.date}"></label><div class="two-in"><label class="fl">Start time (optional)<input type="time" class="in" data-model="plan.start" value="${p.start}"></label><label class="fl">End time (optional)<input type="time" class="in" data-model="plan.end" value="${p.end}"></label></div>`},
  {q:'Where are we headed?',tg:'Saan Tayo?',h:'Type a place or pick one. You can add exact stops later.',f:`<div class="inwrap">${ic('search',20)}<input class="in big ic-in" data-model="plan.dest" value="${esc(p.dest)}" placeholder="Search a city or place" aria-label="Destination" autocomplete="off"></div><div class="chips">${['Baguio City','Tagaytay','La Union','Batangas'].map(d=>`<button class="chip" data-act="plan-dest" data-v="${d}">${ic('pin',14)} ${d}</button>`).join('')}</div>${p.dest?`<div class="minimap">${mapSvg({flag:true,pins:[],small:1})}<span>${ic('pin',16)} ${esc(p.dest)}</span></div>`:''}`},
  {q:'Create a gala password',h:"You'll need this if you come back later.",f:`<label class="fl">Password<div class="inwrap"><input class="in big" type="password" id="pw1" data-model="plan.pw" value="${esc(p.pw)}" autocomplete="new-password"><button class="ibtn eye" data-act="pw-toggle" aria-label="Show or hide password">${ic('eye',22)}</button></div></label><div id="pwmeter">${pwMeter(p.pw)}</div><label class="fl">Confirm password<input class="in big" type="password" id="pw2" data-model="plan.pw2" value="${esc(p.pw2)}" autocomplete="new-password"></label><div class="explain"><div><span class="ico sm">${ic('sparkle',18)}</span><p><b>Gala Code</b> identifies your gala. Friends use it to join.</p></div><div><span class="ico sm">${ic('lock',18)}</span><p><b>Gala Password</b> is private. Use it with the code to come back later.</p></div></div>`}][i];
  return `<div class="wiz"><div class="wprog" role="progressbar" aria-valuenow="${i+1}" aria-valuemin="1" aria-valuemax="4">${[0,1,2,3].map(n=>`<i class="${n<=i?'on':''}"></i>`).join('')}<span>Step ${i+1} of 4</span></div>${Q.tg?tag(Q.tg,'cream','pin'):''}<h1 class="h1 wq">${Q.q}</h1><p class="sub">${Q.h}</p><div class="wform">${Q.f}${S.perr?`<p class="ferr">${ic('alert',18)}${S.perr}</p>`:''}</div></div><div class="fbar"><button class="btn ghost" data-act="plan-back">Back</button><button class="btn ${pb}" data-act="plan-next" ${S.busy?'disabled':''}>${S.busy?'Creating…':i===3?'Tara G!':'Next'}</button></div>`;
};

views.created=()=>{
  const shown=S.sd.pwShow?(S.plan.pw||G.pw):'••••••••••';
  return `<div class="cwrap"><div class="c-left"><span class="ico xl cel" style="${blob(0)}">${ic('burst',44)}</span><h1 class="h1">Okay, this is happening.</h1><p class="lead">Your gala is ready. Share the code with your friends so they can jump in.</p>
  <div class="ticket"><span class="tk-l">Gala Code</span><b class="tk-c">${G.code}</b><div class="tk-a"><button class="btn sm zest" data-act="copy" data-v="code">${ic('copy',18)} Copy Gala Code</button><button class="btn sm cream" data-act="sheet" data-v="share">${ic('share',18)} Share Gala</button></div></div></div>
  <div class="c-right"><div class="pwrow"><span class="ico sm">${ic('lock',20)}</span><div><b>Gala Password</b><code class="pwv">${shown}</code></div><button class="ibtn dark" data-act="pw-reveal" aria-label="${S.sd.pwShow?'Hide':'Show'} password">${ic(S.sd.pwShow?'eyeoff':'eye',20)}</button><button class="ibtn dark" data-act="copy" data-v="pw" aria-label="Copy password">${ic('copy',20)}</button></div>
  <p class="fine cream-t">Share the Gala Code with your friends. Keep the Gala Password somewhere safe so you can come back later.</p>
  <div class="card prompt"><h3>Want to keep your gala with you?</h3><p>Create an account to save your galas, keep a personal calendar, view your gala history, and get reminders.</p><div class="row wrapr"><button class="btn sm rosy" data-go="auth" data-set='{"authTab":"create","authCtx":true}'>Create an Account</button><button class="btn sm ghost" data-act="noop" data-t="No pressure. You can save it any time from the dashboard.">Maybe Later</button></div><p class="fine">Your current gala can still continue without an account.</p></div></div></div>
  <div class="fbar solo"><button class="btn zest" data-go="dashboard">Enter the Gala</button></div>`;
};

views.join=()=>{
  const st=S.joinStep,bad=S.joinErr||(st===0&&S.state==='error');
  if(st===0)return `<div class="wiz narrow"><h1 class="h1 wq">Got a code? Let's go.</h1><p class="sub">Enter the gala code from your friend and you're in.</p><div class="wform"><label class="fl">Enter gala code<input class="in big code ${bad?'bad':''}" data-model="joinCode" value="${esc(S.joinCode)}" placeholder="OTW-XXXX" maxlength="8" autocomplete="off" aria-invalid="${!!bad}"></label>${bad?`<p class="ferr">${ic('alert',18)}Hmm, hindi namin makita 'yan. Check the code and try again.</p>`:''}<button class="chip" data-act="join-example">${ic('sparkle',12)} Try ${G.code}</button></div></div><div class="fbar"><button class="btn ghost" data-go="landing">Back</button><button class="btn rosy" data-act="join-submit">Join the Gala</button></div>`;
  if(st===1){
    if(S.state==='loading')return `<div class="wiz narrow"><div class="sk" style="height:300px;border-radius:28px"></div></div>`;
    return `<div class="wiz narrow"><h1 class="h1 wq">Is this the one?</h1><div class="card previewc"><h2 class="h2s">${G.title}</h2><div class="pmeta">${tag(G.range,'blossom','calendar')}${tag(G.dest,'blossom','pin')}${tag('10 people','blossom','users')}</div><div class="pmem">${MEM.map(m=>`<span class="pm">${av(m.n,30)}${m.n}</span>`).join('')}</div></div><label class="fl">What should we call you?<input class="in big" data-model="joinName" value="${esc(S.joinName)}" placeholder="Your name or nickname" autocomplete="off"></label>${S.joinErr==='name'?`<p class="ferr">${ic('alert',18)}We need something to call you in the chat.</p>`:''}</div><div class="fbar"><button class="btn ghost" data-act="join-back">Back</button><button class="btn rosy" data-act="join-confirm">Join Gala</button></div>`;
  }
  return `<div class="wiz narrow ctr-t"><span class="ico xl cel" style="${blob(1)}">${ic('check',44)}</span><h1 class="h1 wq">You're in. See you at the gala.</h1><p class="lead">Welcome, ${esc(S.joinName||'friend')}. Set your status, check the plan, and say hi in the chat.</p><p class="fine cream-t">Coming back on another device? You'll need the gala code and the gala password. Ask your Gala Leader for it.</p></div><div class="fbar solo"><button class="btn zest" data-go="dashboard" data-set='{"role":"member"}'>Go to the dashboard</button></div>`;
};

views.enter=()=>{
  if(S.enterStep===1)return `<div class="wiz"><h1 class="h1 wq">Welcome back. Which one are you?</h1><p class="sub">Pick your name so the gala knows it's you.</p><div class="who">${MEM.map(m=>`<button class="whob" data-act="enter-who" data-n="${m.n}">${av(m.n,44)}<span>${m.n}${m.n==='Merylle'?tag('Leader','zest'):''}</span></button>`).join('')}</div></div>`;
  return `<div class="wiz narrow"><h1 class="h1 wq">Welcome back.</h1><p class="sub">Enter the gala code and password to jump back in. Works for leaders and members.</p><div class="wform"><label class="fl">Gala Code<input class="in big code ${S.enterErr==='code'||S.state==='error'?'bad':''}" data-model="enterCode" value="${esc(S.enterCode)}" placeholder="OTW-XXXX" maxlength="8" autocomplete="off"></label>${S.enterErr==='code'||S.state==='error'?`<p class="ferr">${ic('alert',18)}Hmm, hindi namin makita 'yan. Check the code and try again.</p>`:''}<label class="fl">Gala Password<div class="inwrap"><input class="in big ${S.enterErr==='pw'?'bad':''}" type="password" id="epw" data-model="enterPw" value="${esc(S.enterPw)}" autocomplete="current-password"><button class="ibtn eye" data-act="pw-toggle" data-t="epw" aria-label="Show or hide password">${ic('eye',22)}</button></div></label>${S.enterErr==='pw'?`<p class="ferr">${ic('alert',18)}Hindi tugma ang password. Try again, or ask your Gala Leader.</p>`:''}<button class="chip" data-act="enter-example">${ic('sparkle',12)} Demo: ${G.code} / ${G.pw}</button></div><p class="fine">Have an account? <button class="lnk" data-go="auth" data-set='{"authTab":"login","authCtx":false}'>Log in</button> and your saved galas will be waiting.</p></div><div class="fbar"><button class="btn ghost" data-go="landing">Back</button><button class="btn rosy" data-act="enter-submit">Enter Gala</button></div>`;
};

views.auth=()=>{
  const c=S.authTab==='create',bad=S.state==='error';
  return `<div class="authw"><div class="wiz narrow"><div class="seg" role="tablist"><button role="tab" aria-pressed="${!c}" data-act="auth-tab" data-v="login">Log in</button><button role="tab" aria-pressed="${c}" data-act="auth-tab" data-v="create">Create account</button></div>${S.authCtx&&c?`<div class="ctxbar">${ic('sparkle',18)}<span>Saving <b>${G.title}</b> to your account.</span></div>`:''}<h1 class="h1 wq">${c?'Want to keep your galas with you?':'Welcome back.'}</h1><p class="sub">${c?'An account is optional. It just keeps your galas with you.':'Log in to see your saved galas.'}</p><div class="wform">${c?`<label class="fl">Name<input class="in" placeholder="What should we call you?" value="Merylle"></label>`:''}<label class="fl">Email<input class="in" type="email" placeholder="you@email.com" value="merylle@email.com"></label><label class="fl">Password<input class="in" type="password" value="password123"></label>${bad&&!c?`<p class="ferr">${ic('alert',18)}That email and password don't match. Check them and try again.</p>`:''}</div><div class="row wrapr"><button class="btn rosy" data-act="auth-submit">${c?'Create an Account':'Log in'}</button><button class="lnk" data-go="${S.authCtx?'dashboard':'landing'}">Continue without an account</button></div></div><aside class="benefits card">${['Saved galas','Personal gala calendar','Gala history','Browser reminders','Access from any device'].map((b,i)=>`<div><span class="ico sm" style="${blob(i)}">${ic(['pin','calendar','notepad','bell','monitor'][i],20)}</span><b>${b}</b></div>`).join('')}<p class="fine">Everything you can do in a gala works without one.</p></aside></div>`;
};
