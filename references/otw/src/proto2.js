/* ================= MAP ================= */
const PINS=[{n:'Alex',x:82,y:86,st:'home',eta:'Still at home'},{n:'CJ',x:172,y:292,st:'otw',eta:'About 18 min away'},{n:'Jamie',x:262,y:334,st:'otw',eta:'About 26 min away'},{n:'Sam',x:392,y:176,st:'almost',eta:'2 minutes away'},{n:'Bea',x:448,y:150,st:'there',eta:'Already there'}];
const MEPOS={home:[60,318],otw:[292,238],almost:[420,160],there:[492,122]};
function myPin(){const [x,y]=MEPOS[S.locStatus];return {n:'Merylle',x,y,st:S.locStatus,eta:LOC[S.locStatus].l,me:1}}
function mapSvg(o={}){
  const pins=o.pins||[];
  const pinG=p=>{const m=byName(p.n);return `<g class="pin ${LOC[p.st].cls} ${S.selPin===p.n?'sel':''}" data-act="pin" data-n="${p.n}" tabindex="0" role="button" aria-label="${p.n}: ${p.eta}" transform="translate(${p.x} ${p.y})">${p.st==='otw'||p.st==='almost'?'<circle class="pulse" r="18"/>':''}<circle class="ring" r="24"/><circle class="pf pf-${m.c}" r="18"/><text class="pt pt-${m.c}" y="6" text-anchor="middle">${p.n[0]}</text>${p.me?'<circle class="you" cx="16" cy="-16" r="8"/><text class="you-t" x="16" y="-13" text-anchor="middle">You</text>':''}</g>`};
  return `<svg class="map" viewBox="0 0 600 380" preserveAspectRatio="${o.small?'xMidYMid slice':'xMidYMid meet'}" role="img" aria-label="Map of the gala route"><rect width="600" height="380" class="m-bg"/><path d="M330 312q40-64 112-42t92 74q-74 40-204-32z" class="m-water"/><g class="m-blocks"><rect x="40" y="150" width="70" height="60" rx="14"/><rect x="230" y="40" width="90" height="70" rx="14"/><rect x="330" y="200" width="70" height="60" rx="14"/><rect x="500" y="220" width="70" height="80" rx="14"/><rect x="120" y="230" width="60" height="50" rx="14"/><rect x="420" y="20" width="80" height="50" rx="14"/></g><g class="m-roads"><path d="M0 300Q150 250 260 200T600 96"/><path d="M118 0Q160 160 204 380"/><path d="M40 130L600 210"/><path d="M340 0Q360 160 330 380"/></g>${o.route?'<path class="m-route" d="M78 88Q200 130 260 204T468 116"/>':''}${o.flag?`<g transform="translate(474 112)"><circle r="20" class="m-flag"/><path d="M-5 9V-9M-5-8h11l-2.4 4.5L6 1H-5" class="m-flag-i"/></g>`:''}${pins.map(pinG).join('')}</svg>`;
}
const locAll=()=>[...PINS,...(S.locSharing?[myPin()]:[])];

/* ================= DASHBOARD ================= */
const cdown=()=>`<div class="cdown" aria-label="Countdown"><div><b>${NOW_TO_GALA.d}</b><span>days</span></div><div><b>${NOW_TO_GALA.h}</b><span>hours</span></div><div><b>${NOW_TO_GALA.m}</b><span>mins</span></div></div>`;
const seg3=()=>`<div class="seg sm3" role="group" aria-label="Your status">${['g','m','x'].map(k=>`<button aria-pressed="${S.att===k}" data-act="att" data-v="${k}">${ST[k].l}</button>`).join('')}</div>`;
function routeStrip(){
  const done=S.phase==='planning'?5:S.phase==='day'?6:8;
  const R=[['G tayo?','sparkle','dashboard'],['When','calendar','settings'],["Who's G?",'users','attendance'],['Plan','route','itinerary'],['How much','calc','budget'],['What we need','checklist','checklist'],['Where is everyone','pin','location'],['OTW na.','nav','location']];
  return `<div class="routewrap"><ol class="route">${R.map((r,i)=>`<li class="rs ${i<done?'done':i===done?'cur':'lock'}"><button data-go="${r[2]}"><span class="dot">${ic(i<done?'check':r[1],18)}</span><span class="rl">${r[0]}</span></button></li>`).join('')}</ol></div>`;
}
views.dashboard=()=>gate('dashboard',()=>{
  const c=counts(),tot=budTotal(),pp=tot/S.bud.n,pk=S.items.filter(i=>i.d).length;
  const F=[['attendance',"Who's G?",`${c.g} going · ${c.m} maybe`,'users','blossom','Attendance'],['itinerary',"What's the plan?",`${S.stops.length} stops on the route`,'route','zest','Itinerary'],['budget','How much?',`${peso(pp)} per person`,'calc','cream','Budget'],['expenses','Who paid?',`${peso(spent())} spent so far`,'wallet','teal','Ambagan'],['checklist','What are we bringing?',`${pk} of ${S.items.length} packed`,'checklist','blossom','Checklist'],['location','Where is everyone?',S.phase==='planning'?'Opens on gala day':S.locSharing?'You are sharing':'Tap to see who\'s OTW','nav','rosy','Live location'],['chat',"What's the chismis?",'2 new messages','chat','zest','Chat'],['dump','What did we get?',photoCount()?`${photoCount()} photos so far`:'No memories yet','image','cream','Gala Dump'],['couple','Just the two of you?','Same OTW energy.','heart','blossom','Couple Mode']];
  let hero;
  if(S.phase==='done')hero=`<section class="dhero bg-rosy"><div><h1 class="h1s">You made it happen.</h1><p class="lead2">From “G tayo?” to an actual day on the calendar.</p><button class="btn zest" data-go="completed">See the recap</button></div></section>`;
  else if(S.phase==='day')hero=`<section class="dhero bg-rosy"><div><h1 class="h1s">Today's the day.</h1><p class="lead2">${G.title} · ${G.dest}</p><div class="pmeta">${tag('1 already there','cream','check')}${tag('1 almost there','zest','nav')}${tag('2 on the way','cream','clock')}</div></div><div class="dright"><button class="btn zest" data-go="location">${ic('map',20)} Open the map</button>${seg3()}</div></section>`;
  else hero=`<section class="dhero bg-rosy"><div><h1 class="h1s">Let's get this gala together.</h1><h2 class="gt">${G.title}</h2><div class="pmeta">${tag(G.range,'cream','calendar')}${tag(G.dest,'cream','pin')}${tag(`${MEM.length} people`,'cream','users')}</div></div><div class="dright">${cdown()}<div class="mystat"><span>Your status</span>${seg3()}</div></div></section>`;
  const banner=!S.acct&&S.banner?`<div class="banner"><span class="ico sm">${ic('sparkle',18)}</span><div><b>Want to keep your gala with you?</b><span>Save your galas, calendar, history and reminders. This gala works fine without an account.</span></div><button class="btn sm rosy" data-act="sheet" data-v="account">Create an Account</button><button class="ibtn" data-act="dismiss-banner" aria-label="Dismiss">${ic('x',20)}</button></div>`:'';
  const rail=`<aside class="rail"><div class="card"><div class="rh"><h3>Who's in</h3>${tag(`${c.g} going`,'st-g','check')}</div><ul class="mlist">${MEM.slice(0,6).map(m=>`<li>${av(m.n,34,m.on)}<span>${m.n}${m.n==='Merylle'?' (you)':''}</span>${stBadge(m.n==='Merylle'?S.att:m.s)}</li>`).join('')}</ul><button class="lnk" data-go="attendance">See everyone</button></div><div class="card c-zest"><h3>Gala Code</h3><button class="codebig" data-act="copy" data-v="code">${G.code}${ic('copy',20)}</button><p class="fine">Friends join with this code.</p></div>${S.role==='leader'?`<div class="card"><h3>Gala Leader</h3><p class="fine">Edit details, manage members and access.</p><button class="btn sm teal" data-go="settings">${ic('sliders',18)} Manage gala</button></div>`:''}</aside>`;
  return `${hero}${banner}${S.phase==='done'?'':routeStrip()}<div class="dgrid"><div class="fgrid">${F.map((f,i)=>`<button class="fcard c-${f[4]} lift" data-go="${f[0]}"><span class="ico" style="${blob(i)}">${ic(f[3],26)}</span><h3>${f[1]}</h3><p>${f[2]}</p>${tag(f[5],f[4]==='zest'?'cream':'zest')}</button>`).join('')}</div>${rail}</div>`;
});

/* ================= ATTENDANCE ================= */
views.attendance=()=>gate('attendance',()=>{
  const c=counts();
  const grp=k=>MEM.filter(m=>(m.n==='Merylle'?S.att:m.s)===k);
  return `${head("So... who's G?",'Change your status any time. Everyone sees it right away.')}<div class="choice" role="group" aria-label="Your status">${['g','m','x'].map(k=>`<button class="ch c-${k==='g'?'teal':k==='m'?'zest':'blossom'}" aria-pressed="${S.att===k}" data-act="att" data-v="${k}">${ic(ST[k].i,26)}<b>${ST[k].l}</b></button>`).join('')}</div>
  <div class="tiles">${[['g','going','teal'],['m','maybe','zest'],['x',"can't make it",'blossom']].map(([k,l,bg],i)=>`<div class="tile c-${bg}" style="${blob(i+1)}"><b>${c[k]}</b><span>${l}</span></div>`).join('')}</div>
  <div class="g g3 grp">${['g','m','x'].map(k=>`<div class="card"><div class="rh"><h3>${ST[k].b}</h3>${stBadge(k)}</div><ul class="mlist">${grp(k).map(m=>`<li>${av(m.n,34,m.on)}<span>${m.n}${m.n==='Merylle'?' (you)':''}</span>${k==='m'&&S.role==='leader'?`<button class="btn sm ghost" data-act="nudge" data-n="${m.n}">Nudge</button>`:''}</li>`).join('')||'<li class="fine">Nobody here yet.</li>'}</ul></div>`).join('')}</div>`;
});

/* ================= ITINERARY ================= */
const TT={'Meet-up':'teal','Activity':'zest','Food':'blossom'};
views.itinerary=()=>gate('itinerary',()=>{
  const list=S.stops.map((s,i)=>`<li class="stop" draggable="true" data-i="${i}"><span class="stn" style="${blob(i)}">${i+1}</span><div class="card stopc"><span class="grip" aria-hidden="true">${ic('drag',20)}</span><div class="sbody"><div class="srow1"><b>${esc(s.p)}</b>${tag(esc(s.a),TT[s.a]||'cream')}</div><span class="stime">${ic('clock',14)}${esc(s.t)}</span>${s.n?`<p>${esc(s.n)}</p>`:''}<span class="addby">Added by ${av(s.w,20)}${esc(s.w)}</span></div><div class="sact"><button class="ibtn" data-act="stop-move" data-i="${i}" data-d="-1" aria-label="Move up" ${i===0?'disabled':''}>${ic('chevu',20)}</button><button class="ibtn" data-act="stop-move" data-i="${i}" data-d="1" aria-label="Move down" ${i===S.stops.length-1?'disabled':''}>${ic('chevd',20)}</button><button class="ibtn" data-act="stop-del" data-i="${i}" aria-label="Remove stop">${ic('trash',20)}</button></div></div></li>`).join('');
  return `<div class="phead row between"><div>${tag('The Gala Route','zest','route')}<h2 class="h2">Okay, what's the plan?</h2><p class="sub">Add the places, activities, food stops, and everything in between.</p></div><button class="btn rosy hide-m" data-act="sheet" data-v="addStop">${ic('plus',20)} Add a Stop</button></div><div class="two-col"><ol class="stops" id="stops">${list}</ol><aside class="mapcard card hide-m">${mapSvg({flag:true,route:true,pins:[]})}<div class="mapnote">${ic('pin',16)} ${S.stops.length} stops · Manila to Baguio</div></aside></div><p class="fine hint only-m-block">Use the arrows to reorder. Drag works on desktop.</p>`;
});

/* ================= CHECKLIST ================= */
views.checklist=()=>gate('checklist',()=>{
  const it=S.items.map((x,i)=>({...x,i})),f=S.chkF,shown=it.filter(x=>f==='all'||(f==='mine'&&x.w==='Merylle')||(f==='done'&&x.d));
  const pk=it.filter(x=>x.d).length,pct=it.length?Math.round(pk/it.length*100):0;
  return `${head("Don't forget the important stuff.",'Because someone always forgets the charger.')}<div class="card prog"><div class="rh"><b>${pk} of ${it.length} packed</b><span>${pct}%</span></div><div class="bar"><i style="width:${pct}%"></i></div>${pk===it.length&&it.length?`<p class="fine">All packed. Walang naiwan.</p>`:''}</div>
  <div class="row between wrapr"><div class="seg" role="group">${[['all','All'],['mine','Mine'],['done','Done']].map(([k,l])=>`<button aria-pressed="${f===k}" data-act="chk-f" data-v="${k}">${l}</button>`).join('')}</div><button class="btn rosy hide-m" data-act="sheet" data-v="addItem">${ic('plus',20)} Add to Checklist</button></div>
  <ul class="clist">${shown.map(x=>`<li class="crow ${x.d?'done':''}"><button class="cbox" role="checkbox" aria-checked="${!!x.d}" data-act="chk" data-i="${x.i}" aria-label="${esc(x.t)}">${x.d?ic('check',18):''}</button><span class="ct">${esc(x.t)}</span>${x.w?`<span class="asg">${av(x.w,24)}${esc(x.w)}</span>`:`<button class="btn sm zest" data-act="claim" data-i="${x.i}">Claim</button>`}<button class="ibtn" data-act="chk-del" data-i="${x.i}" aria-label="Delete ${esc(x.t)}">${ic('trash',18)}</button></li>`).join('')||`<li class="fine">Nothing in this view.</li>`}</ul>`;
});

/* ================= BUDGET ================= */
const BC=[['tr','Transportation','bus'],['st','Stay','home'],['fo','Food','food'],['ac','Activities','flag'],['ot','Other','more']];
const BCOL=['teal','rosy','zest','blossom','teal-dark'];
views.budget=()=>gate('budget',()=>{
  const tot=budTotal();
  return `${head("Let's talk gastos.",'Estimate the budget before anyone starts saying, “Magkano ba kailangan?”',tag('Before the gala','zest','calc'))}<div class="two-col bud"><div class="card"><h3>Estimated costs</h3><div class="brows">${BC.map(([k,l,i])=>`<label class="brow"><span class="ico sm">${ic(i,20)}</span><span class="bl">${l}</span><span class="peso"><i>₱</i><input class="in num" type="number" min="0" step="100" inputmode="numeric" data-bud="${k}" value="${S.bud[k]}" aria-label="${l} estimate"></span></label>`).join('')}</div><div class="brow ppl"><span class="ico sm">${ic('users',20)}</span><span class="bl">How many people?</span><div class="stepper"><button class="ibtn" data-act="bud-n" data-d="-1" aria-label="Fewer people">${ic('chevl',18)}</button><b id="bn">${S.bud.n}</b><button class="ibtn" data-act="bud-n" data-d="1" aria-label="More people">${ic('chevr',18)}</button></div></div></div>
  <div class="bres"><div class="card c-zest big"><span>Estimated total</span><b id="bt-total">${peso(tot)}</b></div><div class="card c-rosy big"><span>Estimated per person</span><b id="bt-pp">${peso(tot/S.bud.n)}</b></div><div class="card"><div class="splitbar" id="bsplit">${BC.map(([k],i)=>`<i class="sb-${BCOL[i]}" style="width:${tot?S.bud[k]/tot*100:0}%"></i>`).join('')}</div><ul class="legend">${BC.map(([k,l],i)=>`<li><i class="sb-${BCOL[i]}"></i>${l}<b id="bl-${k}">${peso(S.bud[k])}</b></li>`).join('')}</ul></div><button class="lnk" data-go="expenses">Ready to track real spending? Go to Ambagan</button></div></div>`;
});
function updBud(){
  const tot=budTotal();
  const a=$('#bt-total');if(a)a.textContent=peso(tot);
  const b=$('#bt-pp');if(b)b.textContent=peso(tot/S.bud.n);
  const n=$('#bn');if(n)n.textContent=S.bud.n;
  BC.forEach(([k],i)=>{const l=$('#bl-'+k);if(l)l.textContent=peso(S.bud[k]);const seg=$$('#bsplit i')[i];if(seg)seg.style.width=(tot?S.bud[k]/tot*100:0)+'%'});
}

/* ================= EXPENSES ================= */
function calcDebts(){
  const total=spent(),share=total/SHARERS.length,net={};
  SHARERS.forEach(n=>net[n]=-share);S.exp.forEach(e=>{net[e.w]=(net[e.w]||0)+e.a});
  const cr=Object.entries(net).filter(([,v])=>v>.5).map(([n,v])=>({n,v})).sort((a,b)=>b.v-a.v);
  const db=Object.entries(net).filter(([,v])=>v<-.5).map(([n,v])=>({n,v:-v})).sort((a,b)=>b.v-a.v);
  const out=[];let ci=0;
  db.forEach(d=>{let rem=d.v;while(rem>.5&&ci<cr.length){const c=cr[ci],x=Math.min(rem,c.v);out.push({f:d.n,t:c.n,a:Math.round(x)});rem-=x;c.v-=x;if(c.v<.5)ci++}});
  return {out,share};
}
const debtKey=d=>d.f+'>'+d.t;
views.expenses=()=>gate('expenses',()=>{
  const {out,share}=calcDebts(),unpaid=out.filter(d=>!S.paid[debtKey(d)]);
  const paidBy=S.exp.filter(e=>e.w==='Merylle').reduce((a,e)=>a+e.a,0);
  const owed=unpaid.filter(d=>d.t==='Merylle').reduce((a,d)=>a+d.a,0)-unpaid.filter(d=>d.f==='Merylle').reduce((a,d)=>a+d.a,0);
  const rem=owed>0?peso(owed):owed<0?peso(-owed):peso(0);
  const row=d=>{const done=S.paid[debtKey(d)];return `<li class="drow ${done?'paid':''}">${av(d.f,30)}<span class="dt">${d.f==='Merylle'?'You owe':`${d.f} owes`} <b>${d.t==='Merylle'?'you':d.t}</b></span><b class="da">${peso(d.a)}</b>${done?tag('Paid','st-g','check'):`<button class="btn sm teal" data-act="paid" data-k="${debtKey(d)}">Mark paid</button>`}</li>`};
  const mine=out.filter(d=>d.t==='Merylle'||d.f==='Merylle'),others=out.filter(d=>!(d.t==='Merylle'||d.f==='Merylle'));
  const settled=out.length&&!unpaid.length;
  return `${head('Okay, sino nag-abono?','Track what was actually spent and who still owes whom.',tag('Ambagan','zest','wallet'))}<div class="tiles t4"><div class="tile c-cream"><b>${peso(spent())}</b><span>Total spent</span></div><div class="tile c-blossom"><b>${peso(share)}</b><span>Your share</span></div><div class="tile c-zest"><b>${peso(paidBy)}</b><span>You've paid</span></div><div class="tile c-teal"><b>${rem}</b><span>Remaining · ${owed>0?"you're owed":owed<0?'you owe':'all clear'}</span></div></div>
  <div class="two-col exp"><div class="card"><div class="rh"><h3>Expenses</h3><button class="btn sm rosy hide-m" data-act="sheet" data-v="addExp">${ic('plus',18)} Add expense</button></div><ul class="elist">${S.exp.map(e=>`<li class="erow">${av(e.w,34)}<div class="eb"><b>${esc(e.n)}</b><span>${tag(esc(e.c),'blossom')} Paid by ${esc(e.w)} · ${esc(e.d)} · split ${SHARERS.length} ways</span></div><b class="ea">${peso(e.a)}</b></li>`).join('')}</ul></div>
  <div class="card owes"><div class="rh"><h3>Who owes whom</h3></div>${settled?`<div class="settled"><span class="ico xl cel" style="${blob(4)}">${ic('burst',40)}</span><h3>All settled. Walang may habol.</h3></div>`:''}<h4 class="sh">With you</h4><ul class="dl">${mine.map(row).join('')||'<li class="fine">Nothing between you and anyone.</li>'}</ul>${others.length?`<h4 class="sh">Everyone else</h4><ul class="dl">${others.map(row).join('')}</ul>`:''}</div></div>`;
});

/* ================= CHAT ================= */
views.chat=()=>gate('chat',()=>{
  const msgs=S.msgs.map((m,i)=>{
    if(m.k==='sys')return `<div class="msys">${ic('sparkle',12)}<span>${esc(m.x)}</span><i>${m.tm}</i></div>`;
    if(m.k==='new')return `<div class="mnew"><span>2 new</span></div>`;
    if(m.k==='card')return `<div class="mcard"><span class="ico sm">${ic('route',20)}</span><div><b>${esc(m.w)} ${esc(m.x)}</b><span>${esc(m.card)}</span></div><button class="lnk" data-go="itinerary">View</button></div>`;
    const me=m.w==='Merylle',mm=byName(m.w);
    return `<div class="msg ${me?'me':''}">${me?'':av(m.w,32,mm.on)}<div class="mb"><span class="mn">${me?'You':esc(m.w)}<i>${m.tm}</i></span><p>${esc(m.x)}</p><button class="react ${m.rm?'on':''}" data-act="react" data-i="${i}" aria-label="React with a heart">${ic('heart',14)}${m.r||''}</button></div></div>`;
  }).join('');
  return `<div class="chatwrap"><div class="chatcol"><div class="pinned"><span class="ico sm">${ic('flag',18)}</span><div><b>Locked in: ${G.range}</b><span>${G.dest} · ${S.stops.length} stops · ${peso(budTotal()/S.bud.n)} each</span></div><button class="lnk" data-go="itinerary">View plan</button></div><div class="chatlog" id="chatlog">${msgs}</div><div class="quick">${['G!','OTW na','Saan na?','Sino may car?'].map(q=>`<button class="chip" data-act="quick" data-v="${q}">${q}</button>`).join('')}</div><div class="composer"><input class="in" id="draft" placeholder="Say something to the gala…" aria-label="Message" autocomplete="off"><button class="btn sm rosy" data-act="send">${ic('send',18)}<span class="hide-m">Send</span></button></div></div>
  <aside class="chatside"><div class="card"><h3>Locked in</h3><p class="fine">${G.title}</p><ul class="mini"><li>${ic('calendar',16)}${G.range}</li><li>${ic('pin',16)}${G.dest}</li><li>${ic('route',16)}${S.stops.length} stops</li></ul></div><div class="card"><h3>Online now</h3><ul class="mlist">${MEM.filter(m=>m.on).map(m=>`<li>${av(m.n,30,1)}<span>${m.n}${m.n==='Merylle'?' (you)':''}</span></li>`).join('')}</ul></div></aside></div>`;
});

/* ================= LOCATION ================= */
views.location=()=>gate('location',()=>{
  const denied=S.state==='error',pins=locAll(),sel=pins.find(p=>p.n===S.selPin);
  const arrived=pins.filter(p=>p.st==='there').length,almost=pins.filter(p=>p.st==='almost').length,otw=pins.filter(p=>p.st==='otw').length;
  const banner=denied?`<div class="lbar deny">${ic('alert',24)}<div><b>Location is blocked for OTW.</b><span>Turn it on in your browser's site settings: open the lock icon by the address bar, set Location to Allow, then try again. You can still set your status by hand below.</span></div><button class="btn sm rosy" data-act="retry">${ic('refresh',18)} Try again</button></div>`
   :S.locSharing?`<div class="lbar on"><i class="live"></i><div><b>You're sharing your location.</b><span>Visible to the 7 people in this gala, only while sharing is on.</span></div><button class="btn sm cream" data-act="loc-stop">Stop sharing</button></div>`
   :`<div class="lbar"><span class="ico sm">${ic('lock',20)}</span><div><b>Your location is private.</b><span>Nobody sees where you are until you choose to share.</span></div><button class="btn sm rosy" data-act="sheet" data-v="locPerm">Share my location</button></div>`;
  const list=[...PINS,myPin()].sort((a,b)=>['there','almost','otw','home'].indexOf(a.st)-['there','almost','otw','home'].indexOf(b.st));
  return `${head("Who's actually OTW?",'Less “Nasaan ka na?” More “2 minutes away.”',tag('OTW na ba talaga? Now you can actually see.','zest','nav'))}${banner}
  <div class="locgrid"><div class="mapcard card">${mapSvg({flag:true,pins:S.state==='empty'?[]:pins,route:!!sel})}<div class="mapstat">${tag(`${arrived} arrived`,'l-there','check')}${tag(`${almost} almost there`,'l-almost','nav')}${tag(`${otw} on the way`,'l-otw','clock')}</div>${sel?`<div class="callout">${av(sel.n,36)}<div><b>${sel.n}${sel.me?' (you)':''}</b><span>${sel.eta}</span></div><button class="ibtn" data-act="pin-x" aria-label="Close">${ic('x',18)}</button></div>`:''}</div>
  <div class="locside"><div class="card"><h3>Your status</h3><p class="fine">Works with or without GPS. Friends see it either way.</p><div class="seg wrapseg" role="group">${Object.entries(LOC).map(([k,v])=>`<button aria-pressed="${S.locStatus===k}" data-act="loc-status" data-v="${k}">${v.l}</button>`).join('')}</div></div>
  <div class="card"><h3>Everyone</h3><ul class="mlist">${list.map(p=>`<li data-act="pin" data-n="${p.n}" class="clickrow">${av(p.n,32)}<span>${p.n}${p.me?' (you)':''}<i class="eta">${p.eta}</i></span>${tag(LOC[p.st].l,LOC[p.st].cls)}</li>`).join('')}<li>${av('Josh',32)}<span>Josh<i class="eta">Not sharing</i></span></li></ul></div>
  <div class="card priv"><h3>Privacy</h3><ul class="mini"><li>${ic('users',16)}<span><b>Who can see:</b> only people who joined this gala.</span></li><li>${ic('clock',16)}<span><b>When:</b> only while sharing is on. It stops 3 hours after the gala ends.</span></li><li>${ic('x',16)}<span><b>Stop:</b> one tap, any time, from this screen.</span></li></ul></div></div></div>`;
});

/* ================= DUMP ================= */
const getPhotos=()=>[...S.upl.filter(u=>u.done).map(u=>u.p),...PH.slice(0,S.phase==='planning'?0:S.phase==='day'?6:12).filter(p=>!S.delPh.includes(p.t))];
views.dump=()=>gate('dump',()=>{
  let ph=getPhotos().map((p,i)=>({...p,i}));if(S.phF==='mine')ph=ph.filter(p=>p.w==='Merylle');
  const fail=S.state==='error';
  if(!ph.length&&!fail)return empty(EMPTY.dump);
  const tile=p=>`<div class="phw" style="height:${p.h}px"><button class="ph c-${p.c}" data-act="photo" data-i="${p.i}" aria-label="Open photo: ${esc(p.t)}">${ic('image',32,'ph-i')}<span class="ph-cap"><b>${esc(p.t)}</b><i>${p.w} · ${p.d}</i></span></button>${p.w==='Merylle'?`<button class="ibtn ph-del" data-act="sheet" data-v="delPhoto" data-i="${p.i}" aria-label="Delete photo">${ic('trash',18)}</button>`:''}</div>`;
  const failed=fail?[0,1].map(n=>`<div class="phw" style="height:170px"><div class="ph failed">${ic('alert',28)}<b>Didn't upload</b><button class="btn sm rosy" data-act="retry">${ic('refresh',16)} Retry</button></div></div>`).join(''):'';
  return `<div class="phead row between"><div><h2 class="h2">The Gala Dump</h2><p class="sub">All the good shots, bad shots, random candids, and “send mo nga” moments in one place.</p></div><div class="row wrapr hide-m"><button class="btn rosy" data-act="sheet" data-v="upload">${ic('upload',20)} Add Photos</button><button class="btn ghost" data-act="photo" data-i="0">View Photos</button></div></div>${fail?`<div class="lbar deny">${ic('alert',24)}<div><b>2 photos didn't upload.</b><span>Check your connection and try again. Nothing else was lost.</span></div><button class="btn sm rosy" data-act="retry">Retry all</button></div>`:''}<div class="row between wrapr"><div class="seg" role="group">${[['all','Everyone'],['mine','Mine']].map(([k,l])=>`<button aria-pressed="${S.phF===k}" data-act="ph-f" data-v="${k}">${l}</button>`).join('')}</div><span class="fine">${ph.length} photos</span></div><div class="masonry">${failed}${ph.map(tile).join('')}</div>`;
});
function lbHtml(){
  if(S.lb===null)return '';
  const ph=getPhotos(),n=ph.length;if(!n)return '';
  const i=((S.lb%n)+n)%n,p=ph[i];
  return `<div class="lb" role="dialog" aria-modal="true" aria-label="Photo viewer"><button class="ibtn lb-x" data-act="lb-close" aria-label="Close">${ic('x',26)}</button><div class="lb-stage"><button class="ibtn lb-n" data-act="lb-prev" aria-label="Previous photo">${ic('chevl',30)}</button><div class="lb-img c-${p.c}">${ic('image',72)}</div><button class="ibtn lb-n" data-act="lb-next" aria-label="Next photo">${ic('chevr',30)}</button></div><div class="lb-cap"><b>${esc(p.t)}</b><span>${p.w} · ${p.d}</span><span class="lb-c">${i+1} / ${n}</span><span class="fine only-m-block">Swipe to browse</span></div></div>`;
}

/* ================= COUPLE ================= */
const IDEAS=[['Sunset at the park','Free · 2 hrs'],['Coffee crawl','₱600 · 3 hrs'],['Picnic with a playlist','₱400 · 2 hrs'],['Night market food trip','₱800 · 3 hrs'],['Museum, then merienda','₱700 · 4 hrs'],['Movie night at home','₱250 · 3 hrs']];
views.couple=()=>gate('couple',()=>{
  if(!S.couple)return `<div class="cintro"><span class="ico xl cel" style="${blob(1)}">${ic('heart',44)}</span><h2 class="h2">Just the two of you?</h2><p class="sub">Same OTW energy. Smaller passenger count.</p><div class="g g4 cprev">${[['sparkle','Date Ideas'],['pin','Places to Go'],['calc','Budget for Two'],['image','Our Photos']].map((c,i)=>`<div class="card c-blossom"><div class="ico sm" style="${blob(i)}">${ic(c[0],20)}</div><b>${c[1]}</b></div>`).join('')}</div><button class="btn rosy" data-act="couple-start">Start Couple Mode</button><p class="fine">It's still OTW: your own code, your own plan, and it shows up in My Galas.</p></div>`;
  const tabs=[['ideas','Date Ideas'],['places','Places to Go'],['budget','Budget for Two'],['photos','Our Photos']];
  const tot=S.cb.fo+S.cb.tr+S.cb.ac;
  let body='';
  if(S.coupleTab==='ideas')body=`<div class="g g2 ideas">${IDEAS.map((d,i)=>`<div class="card idea"><div><b>${d[0]}</b><span>${d[1]}</span></div><button class="ibtn heart ${S.ideas[i]?'on':''}" data-act="idea" data-i="${i}" aria-pressed="${!!S.ideas[i]}" aria-label="Save idea">${ic('heart',24)}</button></div>`).join('')}</div><p class="fine">${Object.values(S.ideas).filter(Boolean).length} saved to your plan.</p>`;
  else if(S.coupleTab==='places')body=`<ul class="mlist plc">${[['Burnham Park','Sunset walk'],['Session Road','Coffee stop'],['Night market','Dinner']].map((p,i)=>`<li><span class="stn" style="${blob(i)}">${i+1}</span><span><b>${p[0]}</b><i class="eta">${p[1]}</i></span></li>`).join('')}</ul><button class="btn sm rosy" data-act="noop" data-t="This opens the Add a Place sheet.">${ic('plus',18)} Add a place</button>`;
  else if(S.coupleTab==='budget')body=`<div class="two-col bud"><div class="card"><div class="brows">${[['fo','Food','food'],['tr','Transportation','bus'],['ac','Activities','flag']].map(([k,l,i])=>`<label class="brow"><span class="ico sm">${ic(i,20)}</span><span class="bl">${l}</span><span class="peso"><i>₱</i><input class="in num" type="number" min="0" step="100" data-cbud="${k}" value="${S.cb[k]}" aria-label="${l}"></span></label>`).join('')}</div></div><div class="bres"><div class="card c-zest big"><span>Total for two</span><b id="cb-tot">${peso(tot)}</b></div><div class="card c-rosy big"><span>Each</span><b id="cb-pp">${peso(tot/2)}</b></div></div></div>`;
  else body=`<div class="masonry m2">${PH.slice(0,4).map((p,i)=>`<div class="phw" style="height:${p.h-30}px"><div class="ph c-${p.c}">${ic('image',30,'ph-i')}<span class="ph-cap"><b>${['Us at the park','Coffee stop','Dinner date','Random candid'][i]}</b><i>You · Nov 14</i></span></div></div>`).join('')}</div>`;
  return `<div class="chero bg-blossom"><div class="cpair">${av('Merylle',52)}<span class="heartb">${ic('heart',22)}</span>${av('Tin',52)}</div><div><h2 class="h2">Us, Baguio</h2><span class="fine">Couple gala · code OTW-2R9X · ${tag('2 people','cream','users')}</span></div></div><div class="ctabs" role="tablist">${tabs.map(([k,l])=>`<button role="tab" aria-selected="${S.coupleTab===k}" class="${S.coupleTab===k?'on':''}" data-act="couple-tab" data-v="${k}">${l}</button>`).join('')}</div>${body}`;
});

/* ================= SETTINGS ================= */
S.perm={edit:1,photos:1,own:1,loc:1};
const sw=(k)=>`<button class="sw ${S.perm[k]?'on':''}" role="switch" aria-checked="${!!S.perm[k]}" data-act="tog" data-k="${k}"><i></i></button>`;
views.settings=()=>gate('settings',()=>{
  if(S.role!=='leader')return `${head('Your settings',`You're a member of ${G.title}.`,tag('Member','blossom','user'))}<div class="two-col set"><div class="card"><h3>You in this gala</h3><label class="fl">Your name<input class="in" value="Merylle"></label><div class="srow2"><div><b>Share location on gala day</b><span class="fine">Only people in this gala can see it.</span></div>${sw('loc')}</div></div><div class="card"><h3>Coming back later</h3><p class="fine">You'll need the gala code and the gala password. Ask your Gala Leader if you don't have it.</p><button class="btn sm ghost" data-act="sheet" data-v="leave">Leave gala</button></div></div>`;
  return `${head('Gala settings','You lead this gala, so these controls are yours.',tag('Gala Leader','zest','crown'))}<div class="two-col set"><div class="col"><div class="card"><h3>Gala details</h3><label class="fl">Title<input class="in" value="${G.title}"></label><label class="fl">Date<input class="in" value="${G.range}"></label><label class="fl">Destination<input class="in" value="${G.dest}"></label><button class="btn sm rosy" data-act="noop" data-t="Saved.">Save changes</button></div><div class="card"><h3>Access</h3><div class="srow2"><div><b>Gala Code</b><span class="fine">${G.code}</span></div><button class="btn sm teal" data-act="copy" data-v="code">${ic('copy',16)} Copy</button></div><div class="srow2"><div><b>Gala Password</b><span class="fine">••••••••••</span></div><button class="btn sm ghost" data-act="noop" data-t="Password change opens here.">Change</button></div><button class="lnk" data-act="sheet" data-v="reset">Make a new gala code</button></div></div>
  <div class="col"><div class="card"><h3>Members</h3><ul class="mlist">${MEM.slice(0,5).map(m=>`<li>${av(m.n,30)}<span>${m.n}${m.n==='Merylle'?' (you)':''}</span>${m.n==='Merylle'?tag('Leader','zest','crown'):`<button class="ibtn" data-act="sheet" data-v="remove" data-n="${m.n}" aria-label="Remove ${m.n}">${ic('x',18)}</button>`}</li>`).join('')}</ul></div><div class="card"><h3>What members can do</h3><div class="srow2"><b>Edit the plan</b>${sw('edit')}</div><div class="srow2"><b>Add photos</b>${sw('photos')}</div><div class="srow2"><b>Delete only their own photos</b>${sw('own')}</div><div class="srow2"><b>Share live location</b>${sw('loc')}</div></div><div class="card danger"><h3>Danger zone</h3><div class="row wrapr"><button class="btn sm ghost" data-act="sheet" data-v="archive">Archive gala</button><button class="btn sm rosy" data-act="sheet" data-v="delete">Delete gala</button></div></div></div></div>`;
});

/* ================= COMPLETED ================= */
views.completed=()=>gate('completed',()=>`<section class="dhero bg-rosy done"><div><span class="ico xl cel" style="${blob(0)}">${ic('burst',44)}</span><h1 class="h1s">You made it happen.</h1><p class="lead2">From “G tayo?” to an actual day on the calendar.</p></div></section><div class="tiles t4"><div class="tile c-teal"><b>7</b><span>people went</span></div><div class="tile c-zest"><b>${S.stops.length}</b><span>stops on the route</span></div><div class="tile c-blossom"><b>${peso(spent())}</b><span>spent · all settled</span></div><div class="tile c-cream"><b>48</b><span>photos in the Dump</span></div></div><div class="g g4 acts"><button class="btn teal" data-go="dump">View Gala Dump</button><button class="btn zest" data-go="expenses">View Expenses</button><button class="btn cream" data-go="itinerary">View Itinerary</button><button class="btn rosy" data-go="plan" data-set='{"pstep":0,"plan":null}'>Plan Another Gala</button></div>${routeChips('all')}<p class="closing">Until the next “G tayo?”</p>`);

/* ================= ACCOUNT ================= */
const fd=s=>new Date(s+'T00:00:00');
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STAT={ongoing:['Ongoing','l-there','burst'],upcoming:['Upcoming','st-m','calendar'],done:['Completed','st-g','check'],draw:['Mga Drawing','cream','notepad']};
const gcard=g=>{const d=g.d?fd(g.d):null,[sl,sc,si]=STAT[g.st];return `<article class="gcard card ${g.cur&&S.savedNew?'fresh':''}"><span class="gdate">${d?`${d.getDate()}<i>${MON[d.getMonth()]}</i>`:`<i>TBD</i>`}</span><div class="gcb"><h3>${g.n}</h3><p>${ic('pin',14)}${g.dest} ${ic('users',14)}${g.m} people</p><div class="row wrapr">${tag(sl,sc,si)}${tag(g.role,g.role==='Leader'?'zest':'blossom',g.role==='Leader'?'crown':'user')}${g.cur&&S.savedNew?tag('Just saved','rosy','sparkle'):''}</div></div>${g.st==='draw'?`<button class="btn sm teal" data-act="revive" data-n="${g.n}">Revive it</button>`:g.st==='done'?`<button class="btn sm cream" data-go="completed" data-set='{"phase":"done"}'>Recap</button>`:`<button class="btn sm teal" data-go="dashboard" data-set='{"role":"${g.role.toLowerCase()}"}'>Open</button>`}</article>`};
function monthGrid(y,m){
  const first=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate(),cells=[];
  for(let i=0;i<first;i++)cells.push('<div class="dc empty"></div>');
  for(let d=1;d<=dim;d++){const ev=GALAS.filter(g=>g.d&&fd(g.d)<=new Date(y,m,d)&&fd(g.e)>=new Date(y,m,d));const today=y===2026&&m===8&&d===29;cells.push(`<div class="dc ${today?'today':''} ${ev.length?'has':''}"><b>${d}</b>${ev.slice(0,2).map(e=>`<span class="ev e-${e.st}">${esc(e.n)}</span>`).join('')}</div>`)}
  return `<div class="cal"><div class="cal-h"><button class="ibtn" data-act="cal-nav" data-d="-1" aria-label="Previous month">${ic('chevl',22)}</button><h3>${new Date(y,m,1).toLocaleString('en-US',{month:'long',year:'numeric'})}</h3><button class="ibtn" data-act="cal-nav" data-d="1" aria-label="Next month">${ic('chevr',22)}</button></div><div class="cal-w">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<span>${d}</span>`).join('')}</div><div class="cal-g">${cells.join('')}</div></div>`;
}
function weekGrid(){
  const st=new Date(S.calWk),days=[...Array(7)].map((_,i)=>new Date(st.getFullYear(),st.getMonth(),st.getDate()+i));
  return `<div class="cal"><div class="cal-h"><button class="ibtn" data-act="cal-nav" data-d="-1" aria-label="Previous week">${ic('chevl',22)}</button><h3>${MON[days[0].getMonth()]} ${days[0].getDate()}–${MON[days[6].getMonth()]} ${days[6].getDate()}</h3><button class="ibtn" data-act="cal-nav" data-d="1" aria-label="Next week">${ic('chevr',22)}</button></div><div class="week">${days.map(d=>{const ev=GALAS.filter(g=>g.d&&fd(g.d)<=d&&fd(g.e)>=d);return `<div class="wd ${ev.length?'has':''}"><span>${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}</span><b>${d.getDate()}</b>${ev.map(e=>`<span class="ev e-${e.st}">${esc(e.n)}</span>`).join('')||'<i class="fine">Free</i>'}</div>`}).join('')}</div></div>`;
}
S.calWk=+new Date(2026,10,8);
views.mygalas=()=>{
  if(!S.acct)return `<div class="gate"><span class="ico xl cel" style="${blob(2)}">${ic('calendar',44)}</span><h2 class="h2">Save this gala for later?</h2><p class="sub">Create an account to keep your galas, calendar and history in one place. You can keep using OTW without one.</p><div class="row wrapr ctr-row"><button class="btn rosy" data-go="auth" data-set='{"authTab":"create","authCtx":true}'>Create an Account</button><button class="btn ghost" data-go="auth" data-set='{"authTab":"login","authCtx":false}'>Log in</button></div></div>`;
  return gate('mygalas',()=>{
    const v=S.calView,grp=(k,t)=>{const l=GALAS.filter(g=>g.st===k);return l.length?`<h3 class="gh">${t}</h3><div class="gl">${l.map(gcard).join('')}</div>`:''};
    return `${head('Your Gala Calendar',"Keep track of what's coming up, what's being planned, and what's already happened.")}<div class="row between wrapr"><div class="seg" role="group">${[['upcoming','Upcoming'],['month','Month'],['week','Week']].map(([k,l])=>`<button aria-pressed="${v===k}" data-act="cal-view" data-v="${k}">${l}</button>`).join('')}</div><button class="btn sm rosy" data-go="plan">${ic('plus',18)} Plan a Gala</button></div>${v==='month'?monthGrid(S.calY,S.calM):v==='week'?weekGrid():grp('ongoing','Ongoing now')+grp('upcoming','Coming up')+grp('done','Completed')}`;
  });
};
views.history=()=>gate('history',()=>`${head('Gala History','Everything you made happen, plus the plans still in the drawer.')}<div class="tiles t3"><div class="tile c-zest"><b>1</b><span>made it happen</span></div><div class="tile c-blossom"><b>8</b><span>people</span></div><div class="tile c-teal"><b>2</b><span>in Mga Drawing</span></div></div><h3 class="gh">Completed</h3><div class="gl">${GALAS.filter(g=>g.st==='done').map(gcard).join('')}</div><h3 class="gh">Mga Drawing</h3><p class="fine">Plans that got shelved. No judgment, and you can revive any of them.</p><div class="gl">${GALAS.filter(g=>g.st==='draw').map(gcard).join('')}</div>`);
views.notifs=()=>gate('notifs',()=>{
  const sel=NT.find(n=>n.k===S.notifSel)||NT[0];
  return `${head('Notifications','Choose which reminders you get, even when you are not inside a gala.')}<div class="card permb ${S.notifPerm?'on':''}"><span class="ico sm">${ic('bell',20)}</span><div><b>${S.notifPerm?'Browser notifications are on.':'Turn on browser notifications'}</b><span class="fine">${S.notifPerm?'You can change this in your browser settings.':'Your browser will ask you to allow them.'}</span></div>${S.notifPerm?'':`<button class="btn sm rosy" data-act="notif-perm">Turn on notifications</button>`}</div><div class="two-col set"><div class="card"><ul class="nlist">${NT.map(n=>`<li class="${n.k===sel.k?'sel':''}"><button class="nsel" data-act="notif-sel" data-k="${n.k}"><span class="ico sm">${ic(n.i,18)}</span><span>${n.l}</span></button><button class="sw ${S.notif[n.k]?'on':''}" role="switch" aria-checked="${!!S.notif[n.k]}" data-act="notif-tog" data-k="${n.k}" aria-label="${n.l}"><i></i></button></li>`).join('')}</ul></div><div class="col"><h4 class="sh">Preview</h4><div class="push"><span class="ico sm">${ic(sel.i,20)}</span><div><b>${sel.t}</b><p>${sel.b}</p><i>OTW · now</i></div></div></div></div>`;
});
views.profile=()=>gate('profile',()=>`${head('Profile & settings','Basic details. That is all we keep.')}<div class="two-col set"><div class="card"><div class="row" style="gap:14px">${av('Merylle',64)}<div><h3>Merylle</h3><span class="fine">merylle@email.com</span></div></div><label class="fl">Display name<input class="in" value="Merylle"></label><label class="fl">Email<input class="in" value="merylle@email.com"></label><button class="btn sm rosy" data-act="noop" data-t="Profile saved.">Save profile</button></div><div class="card"><h3>On other devices</h3><p class="fine">Log in anywhere and your saved galas are there. Signing out never deletes a gala.</p><button class="btn sm ghost" data-act="signout">Sign out</button></div></div>`);
