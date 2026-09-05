/* profile.js — Netrunner profiles, boot UI, Matrix gate, BTM damage helpers */
const BODY_TYPES = [
  { id:'very_weak',  label:'Very Weak',  bt:2,  btm:0 },
  { id:'weak',       label:'Weak',       bt:3,  btm:-1 },
  { id:'average',    label:'Average',    bt:5,  btm:-2 },
  { id:'strong',     label:'Strong',     bt:8,  btm:-3 },
  { id:'very_strong',label:'Very Strong',bt:10, btm:-4 },
  { id:'superhuman', label:'Superhuman', bt:12, btm:-5 },
];
function btmFromBodyId(id){
  const t=BODY_TYPES.find(x=>x.id===id) || BODY_TYPES[2];
  return t.btm;
}
function bodyLabel(id){
  const t=BODY_TYPES.find(x=>x.id===id);
  return t?t.label:'Average';
}
function woundLevel(w){
  // CP2020 wound track: 4 boxes per band (Light / Serious / Critical / Mortal 0+)
  // Stun/Death save penalty from core book p.104
  if(w<=0)  return {name:'OK',       mod:0,  mortal:false, mortalLvl:null};
  if(w<=4)  return {name:'Light',    mod:0,  mortal:false, mortalLvl:null};
  if(w<=8)  return {name:'Serious',  mod:-1, mortal:false, mortalLvl:null};
  if(w<=12) return {name:'Critical', mod:-2, mortal:false, mortalLvl:null};
  // Mortal 0 starts at 13; each +4 boxes raises mortal level
  const m = Math.min(6, Math.floor((w-13)/4));
  return {name:'Mortal '+m, mod:-(3+m), mortal:true, mortalLvl:m};
}
/** Body Type STAT used for Stun/Death Saves (core book). */
function bodyTypeStat(){
  const id = (S.profile && S.profile.bodyType) || 'average';
  const t = (typeof BODY_TYPES!=='undefined' ? BODY_TYPES : []).find(x=>x.id===id);
  return t ? t.bt : 5;
}

const PROFILE_KEY = 'cp2020_netrun_profiles_v1';
const ACTIVE_KEY  = 'cp2020_netrun_active_profile';

function loadProfiles(){
  try{ return JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]'); }catch(_){ return []; }
}
function saveProfiles(list){
  localStorage.setItem(PROFILE_KEY, JSON.stringify(list));
}
function getActiveProfileId(){
  return localStorage.getItem(ACTIVE_KEY)||'';
}
function setActiveProfileId(id){
  if(id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

function makeProfile(data){
  return {
    id: 'p_'+Date.now().toString(36)+'_'+Math.floor(Math.random()*1e4).toString(36),
    created: new Date().toISOString(),
    handle: (data.handle||'Ghost').slice(0,24),
    realName: (data.realName||'Orest Rozalski').slice(0,40),
    int: clampStat(data.int,1,10,8),
    ref: clampStat(data.ref,1,10,7),
    cool: clampStat(data.cool,1,10,6),
    iface: clampStat(data.iface,0,10,6),
    bodyType: data.bodyType||'average',
    btm: typeof data.btm==='number' ? data.btm : btmFromBodyId(data.bodyType||'average'),
    deck: {
      name: (data.deck?.name||'Generic Deck').slice(0,32),
      cpu: clampStat(data.deck?.cpu,1,8,2),
      speed: clampStat(data.deck?.speed,0,5,2),
      dw: clampStat(data.deck?.dw,0,10,4),
      mu: clampStat(data.deck?.mu,1,40,20),
    },
    avatar: data.avatar || null,
  };
}
function clampStat(v,min,max,def){
  const n=Number(v);
  if(!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** Apply profile values to UI and lock all editable fields (post-login). */
function applyProfileToUI(p){
  if(!p) return;
  // Prefer profile object over DOM inputs from now on
  S.profile = p;
  S.btm = p.btm;

  // Display values in read-only fields
  const setText=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=String(val); };
  setText('nr-name-ro', p.handle);
  setText('nr-int-ro', p.int);
  setText('nr-ref-ro', p.ref);
  setText('nr-cool-ro', p.cool);
  setText('nr-iface-ro', p.iface);
  setText('nr-body-ro', bodyLabel(p.bodyType));
  setText('nr-btm', p.btm);
  setText('deck-name-ro', p.deck?.name || 'Generic Deck');
  setText('deck-cpu-ro', p.deck?.cpu ?? 2);
  setText('deck-spd-ro', p.deck?.speed ?? 2);
  setText('deck-dw-ro', p.deck?.dw ?? 4);
  setText('deck-mu-ro', p.deck?.mu ?? 20);

  // Keep hidden inputs in sync so nr()/deck() helpers still work
  const setVal=(id,val)=>{ const el=document.getElementById(id); if(el) el.value=val; };
  setVal('nr-name', p.handle);
  setVal('nr-int', p.int);
  setVal('nr-ref', p.ref);
  setVal('nr-cool', p.cool);
  setVal('nr-iface', p.iface);
  setVal('deck-spd', p.deck?.speed ?? 2);
  setVal('deck-dw', p.deck?.dw ?? 4);
  setVal('deck-mu', p.deck?.mu ?? 20);
  const bt=document.getElementById('nr-body');
  if(bt) bt.value=p.bodyType;

  const h=document.getElementById('dossier-handle');
  if(h) h.textContent=(p.handle||'GHOST').toUpperCase();
  const rn=document.querySelector('#dossier-meta .realname');
  if(rn) rn.textContent=p.realName||'Orest Rozalski';

  // Lock the dossier panel
  document.getElementById('left')?.classList.add('profile-locked');

  if(typeof updateRunnerBars==='function') updateRunnerBars();
  if(typeof drawDossierPhoto==='function') drawDossierPhoto();
  if(typeof setupDossierPhotoUpload==='function') setupDossierPhotoUpload();
  if(typeof updateNeuralMap==='function') updateNeuralMap();
}

function exportProfile(p){
  const blob=new Blob([JSON.stringify(p,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=(p.handle||'netrunner').replace(/\W+/g,'_')+'_profile.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importProfileFile(file){
  return file.text().then(txt=>{
    const data=JSON.parse(txt);
    if(!data||!data.handle) throw new Error('Invalid profile JSON');
    const p=makeProfile(data);
    // preserve id if valid export
    if(data.id) p.id=data.id;
    if(data.created) p.created=data.created;
    // ensure deck name/cpu from older profiles
    if(data.deck){
      p.deck.name = (data.deck.name||p.deck.name).slice(0,32);
      p.deck.cpu = clampStat(data.deck.cpu,1,8,p.deck.cpu);
    }
    const list=loadProfiles();
    const ix=list.findIndex(x=>x.id===p.id);
    if(ix>=0) list[ix]=p; else list.push(p);
    saveProfiles(list);
    return p;
  });
}

/* ========== Boot / profile screens ========== */

function markActiveProfileDead(){
  if(!S.profile || !S.profile.id) return;
  S.profile.dead = true;
  S.profile.deadAt = new Date().toISOString();
  try{
    const list = loadProfiles();
    const i = list.findIndex(p=>p.id===S.profile.id);
    if(i>=0){ list[i].dead=true; list[i].deadAt=S.profile.deadAt; saveProfiles(list); }
  }catch(_e){}
}
function triggerFlatlineSequence(){
  markActiveProfileDead();
  // clear fort state
  try{
    S.fort=null; S.grid=null; S.combatActive=false;
    S.activeDemons=[]; S.demonPlan=null;
    if(S.scene && S.scene.showPlaceholder) S.scene.showPlaceholder();
  }catch(_e){}
  const fl = document.getElementById('flatline-screen');
  if(fl){ fl.classList.add('on'); fl.style.display='flex'; }
  // after dramatic pause → auth screen, dead account locked
  setTimeout(()=>{
    if(fl){ fl.classList.remove('on'); fl.style.display='none'; }
    S.profile = null;
    setActiveProfileId('');
    document.getElementById('left')?.classList.remove('profile-locked');
    if(typeof showBootScreen==='function') showBootScreen();
    if(typeof renderProfileCards==='function') renderProfileCards();
    if(typeof log==='function') log('Account sealed — flatlined netrunner offline.','bad');
  }, 4200);
}
function flashTurnBanner(turn, custom){
  const el = document.getElementById('hud-flash');
  if(!el) return;
  el.textContent = custom || (`NET TURN ${turn}`);
  el.classList.add('show');
  clearTimeout(S._turnFlashTimer);
  S._turnFlashTimer = setTimeout(()=> el.classList.remove('show'), 1600);
  // briefly reveal TURN row
  const row = document.querySelector('.st-turn-row');
  const st = document.getElementById('st-turn');
  if(st && turn!=null) st.textContent = turn;
  if(row){
    row.style.display = 'flex';
    clearTimeout(S._turnRowTimer);
    S._turnRowTimer = setTimeout(()=>{ row.style.display='none'; }, 1800);
  }
}

function showBootScreen(){
  const boot=document.getElementById('boot-screen');
  const shell=document.getElementById('shell');
  if(shell) shell.style.visibility='hidden';
  if(boot){ boot.classList.add('on'); boot.style.display='flex'; }
}
function hideBootScreen(){
  const boot=document.getElementById('boot-screen');
  const shell=document.getElementById('shell');
  if(boot){ boot.classList.remove('on'); boot.style.display='none'; }
  if(shell) shell.style.visibility='visible';
}

function renderProfileCards(){
  const box=document.getElementById('profile-cards');
  if(!box) return;
  const list=loadProfiles();
  box.innerHTML='';
  if(!list.length){
    box.innerHTML='<div class="profile-empty">No registered netrunners.<br/>Create a profile or import one.</div>';
    return;
  }
  list.forEach(p=>{
    const card=document.createElement('div');
    card.className='profile-card'+(p.dead?' dead':'');
    const deckName = p.deck?.name || 'Deck';
    const cpu = p.deck?.cpu ?? '—';
    if(p.dead){
      card.innerHTML=`
      <div class="pc-handle" style="color:var(--r)">${escapeHtml(p.handle)}</div>
      <div class="pc-real">${escapeHtml(p.realName||'')}</div>
      <div class="pc-stats" style="color:var(--r)">◆ FLATLINED · ACCOUNT SEALED</div>
      <div class="pc-actions">
        <button class="red pc-del" data-id="${p.id}">×</button>
      </div>`;
    } else {
    card.innerHTML=`
      <div class="pc-handle">${escapeHtml(p.handle)}</div>
      <div class="pc-real">${escapeHtml(p.realName||'')}</div>
      <div class="pc-stats">INT ${p.int} · REF ${p.ref} · COOL ${p.cool} · IF ${p.iface}</div>
      <div class="pc-stats">BODY ${bodyLabel(p.bodyType)} · BTM ${p.btm}</div>
      <div class="pc-stats">DECK ${escapeHtml(deckName)} · CPU ${cpu} · MU ${p.deck?.mu??'—'}</div>
      <div class="pc-actions">
        <button class="cyan pc-enter" data-id="${p.id}">ENTER</button>
        <button class="amber pc-export" data-id="${p.id}">EXPORT</button>
        <button class="red pc-del" data-id="${p.id}">×</button>
      </div>`;
    }
    box.appendChild(card);
  });
  box.querySelectorAll('.pc-enter').forEach(b=>b.onclick=()=>selectProfile(b.dataset.id));
  box.querySelectorAll('.pc-export').forEach(b=>{
    b.onclick=()=>{ const p=loadProfiles().find(x=>x.id===b.dataset.id); if(p) exportProfile(p); };
  });
  box.querySelectorAll('.pc-del').forEach(b=>{
    b.onclick=()=>{
      if(!confirm('Delete this profile?')) return;
      const list=loadProfiles().filter(x=>x.id!==b.dataset.id);
      saveProfiles(list);
      if(getActiveProfileId()===b.dataset.id) setActiveProfileId('');
      renderProfileCards();
    };
  });
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function selectProfile(id){
  const p=loadProfiles().find(x=>x.id===id);
  if(!p) return;
  if(p.dead){
    if(typeof aiMsg==='function') aiMsg('SYS', `${p.handle} — FLATLINED. Account sealed.`);
    alert(`${p.handle} is flatlined.\nThis netrunner account is unavailable.`);
    return;
  }
  setActiveProfileId(id);
  applyProfileToUI(p);
  hideBootScreen();
  if(typeof log==='function') log(`Profile locked: ${p.handle} · ${bodyLabel(p.bodyType)} BTM ${p.btm} · ${p.deck?.name||'Deck'}`,'ok');
  if(typeof aiMsg==='function') aiMsg('SYS', `Welcome, ${p.handle}. Interface online.`);
}

function openCreateProfile(){
  document.getElementById('boot-select')?.classList.add('hidden');
  document.getElementById('boot-create')?.classList.remove('hidden');
  const sel=document.getElementById('pf-body');
  if(sel){ sel.value='average'; updateCreateBtm(); }
  bindSteppers(document.getElementById('boot-create'));
}
function backToSelect(){
  document.getElementById('boot-create')?.classList.add('hidden');
  document.getElementById('boot-select')?.classList.remove('hidden');
  renderProfileCards();
}
function updateCreateBtm(){
  const id=document.getElementById('pf-body')?.value||'average';
  const el=document.getElementById('pf-btm');
  if(el) el.textContent=String(btmFromBodyId(id));
}
function submitCreateProfile(){
  const p=makeProfile({
    handle: document.getElementById('pf-handle')?.value,
    realName: document.getElementById('pf-real')?.value,
    int: document.getElementById('pf-int')?.value,
    ref: document.getElementById('pf-ref')?.value,
    cool: document.getElementById('pf-cool')?.value,
    iface: document.getElementById('pf-iface')?.value,
    bodyType: document.getElementById('pf-body')?.value,
    deck:{
      name: document.getElementById('pf-deckname')?.value,
      cpu: document.getElementById('pf-cpu')?.value,
      speed: document.getElementById('pf-spd')?.value,
      dw: document.getElementById('pf-dw')?.value,
      mu: document.getElementById('pf-mu')?.value,
    }
  });
  const list=loadProfiles();
  list.push(p);
  saveProfiles(list);
  selectProfile(p.id);
}

/* ========== Matrix-style boot sequence ========== */
function runMatrixBoot(done){
  const el = document.getElementById('matrix-boot');
  if(!el){ if(typeof done==='function') done(); return; }
  el.classList.add('on');
  el.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.id = 'matrix-canvas';
  el.appendChild(canvas);
  const overlay = document.createElement('div');
  overlay.className = 'matrix-overlay';
  overlay.innerHTML = `
    <div class="mx-line" id="mx-l1"></div>
    <div class="mx-line author" id="mx-l2"></div>
    <div class="mx-line tagline" id="mx-l3"></div>
  `;
  el.appendChild(overlay);

  const ctx = canvas.getContext('2d');
  let W, H, cols, drops, fontSize=14;
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF$#@%&*<>/\\|';
  function resize(){
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    cols = Math.floor(W / fontSize);
    drops = Array.from({length:cols}, ()=> Math.random()* -40);
  }
  resize();
  window.addEventListener('resize', resize);

  let frame=0, running=true;
  function draw(){
    if(!running) return;
    ctx.fillStyle = 'rgba(0,8,2,0.08)';
    ctx.fillRect(0,0,W,H);
    ctx.font = fontSize+'px "Courier New", monospace';
    for(let i=0;i<drops.length;i++){
      const ch = chars[Math.floor(Math.random()*chars.length)];
      const x = i*fontSize;
      const y = drops[i]*fontSize;
      const bright = Math.random()>0.92;
      ctx.fillStyle = bright ? '#b8ffc8' : (Math.random()>0.6 ? '#33ff66' : '#1a8033');
      ctx.fillText(ch, x, y);
      if(y > H && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    frame++;
    requestAnimationFrame(draw);
  }
  draw();

  const lines = [
    {id:'mx-l1', text:'NETRUNNING WETWARE', delay:900},
    {id:'mx-l2', text:'by Bodhisattva Bartmossanga', delay:2200},
    {id:'mx-l3', text:'the ultimate netrunning experience', delay:3600},
  ];
  lines.forEach(({id,text,delay})=>{
    setTimeout(()=>{
      const node=document.getElementById(id);
      if(node){ node.textContent=text; node.classList.add('show'); }
    }, delay);
  });

  setTimeout(()=>{
    running=false;
    el.classList.add('fadeout');
    setTimeout(()=>{
      el.classList.remove('on','fadeout');
      el.innerHTML='';
      if(typeof done==='function') done();
    }, 700);
  }, 5200);
}


function bindSteppers(root){
  const scope = root || document;
  scope.querySelectorAll('.stepper').forEach(st=>{
    if(st.dataset.bound) return;
    st.dataset.bound = '1';
    const min = +st.dataset.min;
    const max = +st.dataset.max;
    const targetId = st.dataset.target;
    const hidden = document.getElementById(targetId);
    const valEl = st.querySelector('.step-val');
    const clamp = (n)=> Math.max(min, Math.min(max, n));
    const apply = (n)=>{
      n = clamp(n);
      if(hidden) hidden.value = String(n);
      if(valEl) valEl.textContent = String(n);
    };
    st.querySelector('.step-minus')?.addEventListener('click', ()=>{
      apply((+(hidden?.value||valEl?.textContent||0)) - 1);
    });
    st.querySelector('.step-plus')?.addEventListener('click', ()=>{
      apply((+(hidden?.value||valEl?.textContent||0)) + 1);
    });
  });
}

function setupBootUI(){
  document.getElementById('btn-boot-create')?.addEventListener('click', openCreateProfile);
  document.getElementById('btn-boot-back')?.addEventListener('click', backToSelect);
  document.getElementById('btn-boot-save')?.addEventListener('click', submitCreateProfile);
  document.getElementById('pf-body')?.addEventListener('change', updateCreateBtm);
  document.getElementById('btn-boot-import')?.addEventListener('click', ()=>{
    const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
    inp.onchange=async()=>{
      try{
        const p=await importProfileFile(inp.files[0]);
        renderProfileCards();
        if(typeof log==='function') log('Imported profile: '+p.handle,'ok');
      }catch(e){ alert('Import failed: '+e.message); }
    };
    inp.click();
  });

  // No live editing of stats after login — listeners intentionally omitted.

  bindSteppers(document.getElementById('boot-create'));
  renderProfileCards();
  // Matrix sequence first, then profile gate
  const boot=document.getElementById('boot-screen');
  if(boot) boot.style.display='none';
  runMatrixBoot(()=>{
    showBootScreen();
  });
}
function persistActiveProfile(){
  if(!S.profile) return;
  const list=loadProfiles();
  const ix=list.findIndex(x=>x.id===S.profile.id);
  if(ix>=0){ list[ix]=S.profile; saveProfiles(list); }
}

window.BODY_TYPES=BODY_TYPES;
window.btmFromBodyId=btmFromBodyId;
window.bodyLabel=bodyLabel;
window.woundLevel=woundLevel;
window.bodyTypeStat=bodyTypeStat;
window.loadProfiles=loadProfiles;
window.applyProfileToUI=applyProfileToUI;
window.triggerFlatlineSequence=triggerFlatlineSequence;
window.flashTurnBanner=flashTurnBanner;
window.markActiveProfileDead=markActiveProfileDead;
window.exportProfile=exportProfile;
window.setupBootUI=setupBootUI;
window.showBootScreen=showBootScreen;
window.hideBootScreen=hideBootScreen;
window.selectProfile=selectProfile;
window.runMatrixBoot=runMatrixBoot;
window.bindSteppers=bindSteppers;
