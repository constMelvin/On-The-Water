/* ================= RENDER + NAVIGATION ================= */
function render(nav){
  const sc=SC[S.screen],old=$('#scr'),top=(!nav&&old)?old.scrollTop:0;
  const body=sc.k==='pub'?`<div class="scroller pubs" id="scr">${views[S.screen]()}</div>`:sc.k==='focus'?focusShell(sc):appShell(sc);
  app.innerHTML=body+sheetHtml()+lbHtml()+'<div id="toast" aria-live="polite"></div>';
  const n=$('#scr');if(n&&top)n.scrollTop=top;
  if(S.screen==='chat'){const l=$('#chatlog');if(l)l.scrollTop=l.scrollHeight}
  syncChrome();
}
function applySet(set){const o=typeof set==='function'?set():set;Object.entries(o||{}).forEach(([k,v])=>{S[k]=(k==='plan'&&v===null)?blankPlan():v})}
function go(key,set){
  S.sheet=null;S.lb=null;S.state='default';S.perr='';S.sd={};applySet(set);S.screen=key;
  if(S.jid!==null){const st=JR[S.jid].steps;let j=st.findIndex((s,i)=>i>=S.jstep&&s.s===key);if(j<0)j=st.findIndex(s=>s.s===key);if(j>=0)S.jstep=j}
  render(true);
}
function startJourney(i){S.jid=i;applySet(JR[i].pre);S.jstep=0;gotoStep(0)}
function gotoStep(i){const st=JR[S.jid].steps[i];S.jstep=i;go(st.s,st.set)}
function scrollToId(id){const sc=$('#scr'),el=document.getElementById(id);if(sc&&el)sc.scrollTo({top:el.offsetTop-4,behavior:'smooth'})}
function setState(st){
  S.state=st;render();
  if(st==='success'){toast(OKMSG[S.screen]||'Done. Nice.');burstMid()}
}

/* ================= SHEETS ================= */
const CF={
delPhoto:['Delete this photo?','It will be removed from the Gala Dump for everyone.','Delete photo'],
leave:['Leave this gala?','You can come back any time with the gala code and password.','Leave gala'],
reset:['Make a new gala code?','The old code stops working. People already in the gala stay in.','Make new code'],
remove:['Remove this member?','They lose access to the gala until you let them back in.','Remove'],
archive:['Archive this gala?','It moves to Gala History. Photos and expenses stay readable.','Archive gala'],
delete:['Delete this gala?',"Everyone loses the plan, expenses and photos. This can't be undone.",'Delete gala']};
function sheetHtml(){
  const k=S.sheet;if(!k)return '';
  const mem=SHARERS.map(n=>`<option>${n}</option>`).join('');
  const W=(t,b,f)=>`<div class="ovl" data-act="sheet-close"></div><section class="sheet" role="dialog" aria-modal="true" aria-label="${t}"><div class="grab"></div><header><h3>${t}</h3><button class="ibtn" data-act="sheet-close" aria-label="Close">${ic('x',22)}</button></header><div class="shb">${b}</div>${f?`<footer>${f}</footer>`:''}</section>`;
  const cancel=`<button class="btn ghost" data-act="sheet-close">Cancel</button>`;
  if(CF[k]){const c=CF[k];return W(c[0],`<p>${c[1]}</p>`,`${cancel}<button class="btn rosy" data-act="confirm-do" data-v="${k}">${c[2]}</button>`)}
  if(k==='share')return W('Share Gala',`<p class="fine">Send this to your GC. We never include the password.</p><div class="sharemsg">G tayo? Join our gala “${G.title}”.<br>Gala code: <b>${G.code}</b></div>`,`<button class="btn teal" data-act="copy" data-v="code">${ic('copy',18)} Copy code</button><button class="btn zest" data-act="noop" data-t="Your device's share sheet opens here.">${ic('share',18)} Share…</button>`);
  if(k==='account')return W('Want to keep your gala with you?',`<p>Create an account to save your galas, keep a personal calendar, view your gala history, and get reminders.</p><ul class="ticks">${['Saved galas, one tap away','Your galas on any device','Reminders when the day gets close'].map(x=>`<li>${ic('check',18)}${x}</li>`).join('')}</ul><p class="fine">Your current gala can still continue without an account.</p>`,`<button class="btn ghost" data-act="sheet-close">Maybe Later</button><button class="btn rosy" data-go="auth" data-set='{"authTab":"create","authCtx":true}'>Create an Account</button>`);
  if(k==='addStop')return W('Add a Stop',`<label class="fl">Place<input class="in" id="f-place" placeholder="Where are we going?"></label><div class="two-in"><label class="fl">Time<input class="in" id="f-time" type="time" value="16:00"></label><label class="fl">Type<select class="in" id="f-type"><option>Activity</option><option>Food</option><option>Meet-up</option></select></label></div><label class="fl">Notes (optional)<input class="in" id="f-note" placeholder="Anything people should know"></label>`,`${cancel}<button class="btn rosy" data-act="save-stop">Add a Stop</button>`);
  if(k==='addItem')return W('Add to Checklist',`<label class="fl">What are we bringing?<input class="in" id="f-item" placeholder="Power bank, umbrella, extra shirt…"></label><label class="fl">Assign to<select class="in" id="f-who"><option value="">Nobody yet</option>${mem}</select></label>`,`${cancel}<button class="btn rosy" data-act="save-item">Add to Checklist</button>`);
  if(k==='addExp')return W('Add an expense',`<label class="fl">What was it?<input class="in" id="f-en" placeholder="Jeepney, dinner, entrance fee…"></label><div class="two-in"><label class="fl">Amount<input class="in" id="f-ea" type="number" min="0" placeholder="₱0"></label><label class="fl">Paid by<select class="in" id="f-ew">${mem}</select></label></div><label class="fl">Category<select class="in" id="f-ec"><option>Food</option><option>Transportation</option><option>Stay</option><option>Activities</option><option>Other</option></select></label><p class="fine">Split equally between ${SHARERS.length} people.</p>`,`${cancel}<button class="btn rosy" data-act="save-exp">Add expense</button>`);
  if(k==='locPerm')return W('Share your location with the gala?',`<ul class="mini big"><li>${ic('users',20)}<span><b>Who can see it:</b> only people who joined this gala.</span></li><li>${ic('clock',20)}<span><b>How long:</b> only while sharing is on. It stops 3 hours after the gala ends.</span></li><li>${ic('x',20)}<span><b>Stopping:</b> one tap on this screen, any time.</span></li></ul><p class="fine">Your browser will ask for permission next.</p>`,`<button class="btn ghost" data-act="sheet-close">Not now</button><button class="btn rosy" data-act="loc-allow">Share my location</button>`);
  if(k==='upload')return W('Add Photos',`<div class="drop">${ic('upload',36)}<b>Drop photos here</b><span>or pick them from your ${S.device==='mobile'?'camera roll':'computer'}</span><button class="btn sm teal" data-act="up-run">Choose photos</button></div><ul class="uplist" id="uplist"></ul>`,`${cancel}<button class="btn rosy" id="updone" data-act="up-done" disabled>Done</button>`);
  if(k==='more'){const l=[['attendance',"Who's G?",'users'],['itinerary','The plan','route'],['budget','Gastos','calc'],['expenses','Ambagan','wallet'],['checklist','Checklist','checklist'],['dump','Gala Dump','image'],['couple','Couple Mode','heart'],['settings','Settings','sliders'],[S.acct?'mygalas':'notifs',S.acct?'My Galas':'Save gala','calendar']];
    return W('More',`<div class="morep">${l.map((x,i)=>`<button class="mo" data-go="${x[0]==='notifs'&&!S.acct?'auth':x[0]}" ${x[0]==='notifs'&&!S.acct?`data-set='{"authTab":"create","authCtx":true}'`:''}><span class="ico" style="${blob(i)}">${ic(x[2],24)}</span>${x[1]}</button>`).join('')}</div>`)}
  return '';
}
function runUpload(){
  const ul=$('#uplist');if(!ul)return;
  ul.innerHTML=['IMG_2041.jpg','IMG_2042.jpg','IMG_2043.jpg'].map((n,i)=>`<li class="uprow" data-i="${i}">${ic('image',20)}<span class="un">${n}</span><div class="ubar"><i></i></div><span class="us">Uploading…</span></li>`).join('');
  const check=()=>{const d=$('#updone');if(d&&$$('.uprow').every(r=>r.classList.contains('ok')))d.disabled=false};
  $$('.uprow',ul).forEach((r,i)=>{const bar=$('i',r),ms=i===1?1100:1500+i*300;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{bar.style.transition=`width ${ms}ms linear`;bar.style.width=i===1?'62%':'100%'}));
    setTimeout(()=>{if(!r.isConnected)return;if(i===1){r.classList.add('fail');$('.us',r).innerHTML=`Failed at 62% <button class="lnk" data-act="up-retry">Retry</button>`}else{r.classList.add('ok');$('.us',r).textContent='Done'}check()},ms+60)});
}

/* ================= ACTIONS ================= */
const A={
'plan-example':()=>{S.plan.title='Baguio Before Graduation';S.perr='';render()},
'plan-dest':t=>{S.plan.dest=t.dataset.v;S.perr='';render()},
'plan-back':()=>{S.perr='';if(S.pstep>0){S.pstep--;render(true)}else go('landing')},
'plan-next':t=>{
  const p=S.plan,i=S.pstep;let e='';
  if(i===0&&!p.title.trim())e='Give it a name first. Your GC needs something to search for.';
  if(i===1&&!p.date)e='Pick a date, even a tentative one. “Someday” isn\'t a date.';
  if(i===2&&!p.dest.trim())e='Saan tayo? Tell us where you\'re headed.';
  if(i===3&&p.pw.length<6)e='Make it at least 6 characters.';
  else if(i===3&&p.pw!==p.pw2)e='Hindi pa magkapareho. Check the password again.';
  if(e){S.perr=e;render();return}
  S.perr='';
  if(i<3){S.pstep++;render(true);return}
  S.busy=true;render();setTimeout(()=>{S.busy=false;go('created');burstMid()},700);
},
'pw-toggle':t=>{const inp=$('#'+(t.dataset.t||'pw1'));if(!inp)return;const show=inp.type==='password';inp.type=show?'text':'password';t.innerHTML=ic(show?'eyeoff':'eye',22)},
'pw-reveal':()=>{S.sd.pwShow=!S.sd.pwShow;render()},
'copy':(t)=>{try{navigator.clipboard&&navigator.clipboard.writeText(t.dataset.v==='pw'?(S.plan.pw||G.pw):G.code).catch(()=>{})}catch(e){}toast(t.dataset.v==='pw'?'Gala password copied.':'Gala code copied.');burstEl(t)},
'join-example':()=>{S.joinCode=G.code;S.joinErr='';render()},
'join-submit':()=>{if(S.joinCode.replace('-','')==='OTW7K2P'){S.joinErr='';S.joinStep=1;render(true)}else{S.joinErr='code';render()}},
'join-back':()=>{S.joinStep=0;render(true)},
'join-confirm':t=>{if(!S.joinName.trim()){S.joinErr='name';render();return}S.joinErr='';S.joinStep=2;S.role='member';render(true);burstMid()},
'enter-example':()=>{S.enterCode=G.code;S.enterPw=G.pw;S.enterErr='';render()},
'enter-submit':()=>{
  if(S.enterCode.replace('-','')!=='OTW7K2P'){S.enterErr='code';render();return}
  if(!S.enterPw||(S.enterPw!==G.pw&&S.enterPw!==S.plan.pw)){S.enterErr='pw';render();return}
  S.enterErr='';S.enterStep=1;render(true);
},
'enter-who':t=>{const n=t.dataset.n;S.role=n==='Merylle'?'leader':'member';go('dashboard');toast(`Welcome back, ${n}.`);burstMid()},
'auth-tab':t=>{S.authTab=t.dataset.v;render()},
'auth-submit':()=>{const c=S.authTab==='create',ctx=S.authCtx;S.acct=true;if(c&&ctx)S.savedNew=true;go('mygalas');toast(c?(ctx?`Saved. ${G.title} is now in My Galas.`:'Account created. Welcome.'):'Welcome back.');burstMid()},
'att':t=>{const k=t.dataset.v;S.att=k;const i=S.msgs.findIndex(m=>m.k==='new');S.msgs.push({k:'sys',x:`Merylle changed their status to ${ST[k].l}.`,tm:'Just now'});render();toast(k==='g'?"You're marked as G. The chat knows.":`Status updated: ${ST[k].l}.`);if(k==='g')burstMid()},
'nudge':t=>toast(`Nudged ${t.dataset.n}.`),
'stop-move':t=>{const i=+t.dataset.i,d=+t.dataset.d,j=i+d;if(j<0||j>=S.stops.length)return;[S.stops[i],S.stops[j]]=[S.stops[j],S.stops[i]];render();toast('Route updated.')},
'stop-del':t=>{S.stops.splice(+t.dataset.i,1);render();toast('Stop removed.')},
'save-stop':()=>{const p=$('#f-place').value.trim()||'New stop',tm=$('#f-time').value||'16:00',[h,m]=tm.split(':').map(Number);
  S.stops.push({p,a:$('#f-type').value,t:`${((h+11)%12)+1}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`,n:$('#f-note').value.trim(),w:'Merylle'});
  S.msgs.push({k:'card',w:'Merylle',x:'added a new itinerary stop',card:p,tm:'Just now'});S.sheet=null;render();toast('Stop added. Everyone can see it.');burstMid()},
'save-item':()=>{const t=$('#f-item').value.trim()||'New item';S.items.push({t,w:$('#f-who').value,d:0});S.sheet=null;render();toast('Item added to the checklist.')},
'save-exp':()=>{const a=Math.max(0,+$('#f-ea').value||0);if(!a){toast('Add an amount first.','err');return}
  S.exp.push({n:$('#f-en').value.trim()||'Expense',c:$('#f-ec').value,a,w:$('#f-ew').value,d:'Today',note:''});S.paid={};S.sheet=null;render();toast('Expense added and split.');burstMid()},
'chk':t=>{const it=S.items[+t.dataset.i];it.d=it.d?0:1;render();if(S.items.every(x=>x.d))burstMid()},
'chk-f':t=>{S.chkF=t.dataset.v;render()},
'chk-del':t=>{S.items.splice(+t.dataset.i,1);render();toast('Item removed.')},
'claim':t=>{S.items[+t.dataset.i].w='Merylle';render();toast("It's yours now.")},
'bud-n':t=>{S.bud.n=Math.max(1,Math.min(30,S.bud.n+ +t.dataset.d));updBud()},
'paid':t=>{S.paid[t.dataset.k]=1;render();toast('Marked as paid.');const {out}=calcDebts();if(out.every(d=>S.paid[debtKey(d)]))burstMid()},
'send':()=>{const i=$('#draft'),v=i&&i.value.trim();if(!v)return;S.msgs.push({k:'m',w:'Merylle',x:v,tm:'Just now'});render();const n=$('#draft');if(n)n.focus()},
'quick':t=>{S.msgs.push({k:'m',w:'Merylle',x:t.dataset.v,tm:'Just now'});render()},
'react':t=>{const m=S.msgs[+t.dataset.i];if(m.rm){m.r=(m.r||1)-1;m.rm=0}else{m.r=(m.r||0)+1;m.rm=1}render()},
'loc-status':t=>{S.locStatus=t.dataset.v;render();toast(`Status: ${LOC[S.locStatus].l}.`);if(S.locStatus==='there')burstMid()},
'loc-allow':()=>{S.sheet=null;S.locSharing=true;render();toast("You're sharing with 7 people.");burstMid()},
'loc-stop':()=>{S.locSharing=false;S.selPin=null;render();toast('Location sharing stopped.')},
'pin':t=>{S.selPin=t.dataset.n;render()},'pin-x':()=>{S.selPin=null;render()},
'photo':t=>{S.lb=+t.dataset.i;render()},'lb-close':()=>{S.lb=null;render()},'lb-prev':()=>{S.lb--;render()},'lb-next':()=>{S.lb++;render()},
'ph-f':t=>{S.phF=t.dataset.v;render()},
'up-run':()=>runUpload(),
'up-retry':t=>{const r=t.closest('.uprow'),bar=$('i',r);r.classList.remove('fail');$('.us',r).textContent='Uploading…';bar.style.transition='width 900ms linear';bar.style.width='100%';setTimeout(()=>{if(!r.isConnected)return;r.classList.add('ok');$('.us',r).textContent='Done';const d=$('#updone');if(d&&$$('.uprow').every(x=>x.classList.contains('ok')))d.disabled=false},960)},
'up-done':()=>{const cs=['zest','rosy','teal'],hs=[240,200,260];[0,1,2].forEach(i=>S.upl.unshift({done:1,p:{h:hs[i],c:cs[i],t:`IMG_204${i+1}`,w:'Merylle',d:'Just now'}}));S.sheet=null;render();toast('3 photos added.');burstMid()},
'retry':()=>{
  if(S.screen==='location'){S.state='default';S.sheet='locPerm';render();return}
  S.state='default';render();toast(S.screen==='dump'?'Photos uploaded.':'Back in business.');if(S.screen==='dump')burstMid();
},
'revive':t=>{const g=GALAS.find(x=>x.n===t.dataset.n);if(g)g.st='upcoming';render();toast('Plan revived. Pick a date when you\'re ready.')},
'couple-start':()=>{S.couple=true;render();toast('Couple Mode is on.');burstMid()},
'couple-tab':t=>{S.coupleTab=t.dataset.v;render()},
'idea':t=>{const i=t.dataset.i;S.ideas[i]=S.ideas[i]?0:1;render();if(S.ideas[i])toast('Saved to your plan.')},
'cal-view':t=>{S.calView=t.dataset.v;render()},
'cal-nav':t=>{const d=+t.dataset.d;if(S.calView==='week'){S.calWk+=d*7*864e5}else{S.calM+=d;if(S.calM<0){S.calM=11;S.calY--}if(S.calM>11){S.calM=0;S.calY++}}render()},
'notif-perm':()=>{S.notifPerm=true;render();toast('Reminders on.')},
'notif-sel':t=>{S.notifSel=t.dataset.k;render()},
'notif-tog':t=>{S.notif[t.dataset.k]=S.notif[t.dataset.k]?0:1;render()},
'tog':t=>{S.perm[t.dataset.k]=S.perm[t.dataset.k]?0:1;render()},
'signout':()=>{S.acct=false;go('landing');toast('Signed out. Your galas are still saved.')},
'dismiss-banner':()=>{S.banner=false;render()},
'sheet':t=>{S.sheet=t.dataset.v;S.sd={...t.dataset};render()},
'sheet-close':()=>{S.sheet=null;render()},
'noop':t=>toast(t.dataset.t||'Done.'),
'confirm-do':t=>{
  const k=t.dataset.v;S.sheet=null;
  if(k==='delPhoto'){const ph=getPhotos(),p=ph[+S.sd.i];const u=S.upl.findIndex(x=>x.p===p);if(u>=0)S.upl.splice(u,1);else S.delPh.push(p.t);render();toast('Photo deleted.');return}
  if(k==='leave'||k==='delete'){go('landing');toast(k==='leave'?'You left the gala.':'Gala deleted.');return}
  if(k==='archive'){render();toast('Gala archived. Find it in Gala History.');return}
  if(k==='reset'){render();toast('New gala code made: OTW-4M9Q.');return}
  if(k==='remove'){render();toast(`${S.sd.n||'Member'} removed.`)}
}};
S.delPh=[];

/* ---- delegated events ---- */
app.addEventListener('click',e=>{
  const t=e.target.closest('[data-go],[data-act],[data-scroll]');if(!t||!app.contains(t))return;
  if(t.dataset.scroll){scrollToId(t.dataset.scroll);return}
  if(t.dataset.go){go(t.dataset.go,t.dataset.set?jsonOr(t.dataset.set,{}):{});return}
  const f=A[t.dataset.act];if(f)f(t,e);
});
app.addEventListener('input',e=>{
  const el=e.target,m=el.dataset.model;
  if(m){
    if(m==='joinCode'||m==='enterCode'){let v=el.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,7);if(v.length>3)v=v.slice(0,3)+'-'+v.slice(3);el.value=v;S[m]=v}
    else if(m.startsWith('plan.')){S.plan[m.slice(5)]=el.value;if(m==='plan.pw'){const mt=$('#pwmeter');if(mt)mt.innerHTML=pwMeter(el.value)}}
    else S[m]=el.value;
    if(S.perr||S.joinErr||S.enterErr){S.perr=S.joinErr=S.enterErr='';el.classList.remove('bad');const fe=el.closest('.wform');const x=fe&&$('.ferr',fe);if(x)x.remove()}
  }
  if(el.dataset.bud){S.bud[el.dataset.bud]=Math.max(0,+el.value||0);updBud()}
  if(el.dataset.cbud){S.cb[el.dataset.cbud]=Math.max(0,+el.value||0);const t=S.cb.fo+S.cb.tr+S.cb.ac,a=$('#cb-tot'),b=$('#cb-pp');if(a)a.textContent=peso(t);if(b)b.textContent=peso(t/2)}
});
app.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.id==='draft'){e.preventDefault();A.send()}
  if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-act="pin"][role="button"]')){e.preventDefault();A.pin(e.target)}
});
document.addEventListener('keydown',e=>{
  if(!app.isConnected)return;
  if(S.lb!==null){if(e.key==='Escape')A['lb-close']();if(e.key==='ArrowLeft')A['lb-prev']();if(e.key==='ArrowRight')A['lb-next']();return}
  if(e.key==='Escape'&&S.sheet){S.sheet=null;render()}
});
let dragI=null;
app.addEventListener('dragstart',e=>{const s=e.target.closest&&e.target.closest('.stop');if(!s)return;dragI=+s.dataset.i;s.classList.add('drag');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(dragI))});
app.addEventListener('dragover',e=>{const s=e.target.closest&&e.target.closest('.stop');if(!s||dragI===null)return;e.preventDefault();$$('.stop.over').forEach(x=>x.classList.remove('over'));s.classList.add('over')});
app.addEventListener('drop',e=>{const s=e.target.closest&&e.target.closest('.stop');if(!s||dragI===null)return;e.preventDefault();const to=+s.dataset.i,from=dragI;dragI=null;if(to===from)return;const [m]=S.stops.splice(from,1);S.stops.splice(to,0,m);render();toast('Route updated.')});
app.addEventListener('dragend',()=>{dragI=null;$$('.stop.drag,.stop.over').forEach(x=>x.classList.remove('drag','over'))});
let tx=null;
app.addEventListener('touchstart',e=>{if(e.target.closest('.lb'))tx=e.touches[0].clientX},{passive:true});
app.addEventListener('touchend',e=>{if(tx===null)return;const dx=e.changedTouches[0].clientX-tx;tx=null;if(Math.abs(dx)>40){S.lb+=dx<0?1:-1;render()}},{passive:true});
