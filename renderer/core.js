/* core.js — global state, seeded RNG, logging, runner/deck helpers */
const S = {
  fort:null, grid:null, runner:{x:0,y:0},
  turn:0, moveLeft:5, actionLeft:1,
  programs:[], selectedProg:0,
  wallStr:{}, openGates:new Set(), deadIce:new Set(), iceStr:{},
  alarm:0, wounds:0, intDmg:0,
  buffs:{shield:0,invis:0,stealth:0,armor:0,worm:null},
  jackLocked:0, combatActive:false, loot:[],
  game:null, scene:null,
  // NetMap
  netLoc:'hongkong',
  traceTotal:0,
  netMoveLeft:5,
  pathTrace:[], // LDL ids visited this run
  mode:'subgrid',
  mapRot:0, // 0..3 * 90deg CW view rotation
  netTime: { y:2032, m:8, d:1, h:0, mi:0, s:0 },
  _autoTimer:null,
  _fxPulse:0,
  // Debug / settings
  debug:false,
  seed:null,
  _rngState:0,
  crtEnabled:true,
  btm:-2, profile:null, stunned:false, stabilized:false, flatlined:false,
  logLevel:'info', // debug|info|warn|error
  _netmapCache:null,
};
window.S = S;


/* ========== Seeded RNG (mulberry32) ========== */
function setSeed(s){
  S.seed = (s>>>0) || (Date.now()>>>0);
  S._rngState = S.seed;
  log(`RNG seed → ${S.seed}`,'sys');
}
function rng(){
  let t = S._rngState += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function d10(){ return 1 + Math.floor(rng()*10); }
function d6(){ return 1 + Math.floor(rng()*6); }

/** RAW net combat (core p.156): Program STR + INT + Interface + 1d10 */
function netAttackRoll(progStr){
  const n=nr();
  const roll=d10();
  const total=(+progStr||0)+n.int+n.iface+roll;
  return {total, roll, detail:`STR${progStr}+INT${n.int}+IF${n.iface}+d10=${roll} → ${total}`};
}
function netDefendRoll(progStr, asSystem){
  // system/ICE: use fortress INT as Interface substitute when defending as system
  const fort=S.fort;
  const sysInt=fort?fort.int:5;
  const roll=d10();
  if(asSystem){
    const total=(+progStr||0)+sysInt+roll;
    return {total, roll, detail:`STR${progStr}+SYS.INT${sysInt}+d10=${roll} → ${total}`};
  }
  const n=nr();
  const total=(+progStr||0)+n.int+n.iface+roll;
  return {total, roll, detail:`STR${progStr}+INT${n.int}+IF${n.iface}+d10=${roll} → ${total}`};
}

function key(x,y){return x+','+y}
function log(msg,cls=''){
  const levels={debug:0,info:1,warn:2,error:3,sys:1,ok:1,bad:2,turn:1};
  const msgLevel = levels[cls] !== undefined ? levels[cls] : 1;
  const cur = levels[S.logLevel] !== undefined ? levels[S.logLevel] : 1;
  if(msgLevel < cur && cls !== 'sys' && cls !== 'bad' && cls !== 'error' && cls !== 'ok' && cls !== 'turn') return;
  const el=document.getElementById('log');
  if(!el) return;
  const line=document.createElement('div');
  line.className='log-line'+(cls?' '+cls:'');
  const now=new Date();
  const ts=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')+':'+String(now.getSeconds()).padStart(2,'0');
  const tsEl=document.createElement('span'); tsEl.className='log-ts'; tsEl.textContent=ts;
  const msgEl=document.createElement('span'); msgEl.className='log-msg'; msgEl.textContent=String(msg);
  line.appendChild(tsEl); line.appendChild(msgEl);
  const nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 56;
  el.appendChild(line);
  while(el.children.length > 500) el.removeChild(el.firstChild);
  if(nearBottom) el.scrollTop = el.scrollHeight;
}
function clearNetLog(){
  const el=document.getElementById('log');
  if(el) el.innerHTML='';
  log('Log cleared.','sys');
}
function copyNetLog(){
  const el=document.getElementById('log');
  if(!el) return;
  const text=[...el.querySelectorAll('.log-line')].map(l=>{
    const ts=l.querySelector('.log-ts')?.textContent||'';
    const msg=l.querySelector('.log-msg')?.textContent||'';
    return ts+'  '+msg;
  }).join('\n');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>log('Log copied to clipboard.','ok')).catch(()=>log('Copy failed.','bad'));
  } else log('Clipboard unavailable.','bad');
}
function nr(){return{
  name:document.getElementById('nr-name').value||'Runner',
  int:+document.getElementById('nr-int').value||5,
  ref:+document.getElementById('nr-ref').value||5,
  cool:+document.getElementById('nr-cool').value||5,
  iface:+document.getElementById('nr-iface').value||4,
}}
function deck(){return{
  speed:+document.getElementById('deck-spd').value||0,
  dw:+document.getElementById('deck-dw').value||2,
  mu:+document.getElementById('deck-mu').value||10,
}}
function muUsed(){return S.programs.reduce((s,p)=>s+(+p.mu||0),0)}
function updateMu(){
  if(typeof updateDeckSpeedPenalty==='function') updateDeckSpeedPenalty();
  const d=deck(),u=muUsed();
  const el=document.getElementById('mu-used');
  el.textContent=u+' / '+d.mu;
  el.style.color=u>d.mu?'var(--r)':'var(--g)';
}
function updateRunnerBars(){
  const wEl=document.getElementById('nr-wounds');
  if(wEl){
    let txt = String(S.wounds|0);
    if(S.wounds>0 && typeof woundLevel==='function'){
      const L=woundLevel(S.wounds);
      if(L && L.name) txt += ' · '+L.name;
    }
    wEl.textContent = txt;
    wEl.style.color = S.wounds>=9 ? 'var(--r)' : (S.wounds>=5 ? 'var(--a)' : (S.wounds>0 ? 'var(--a)' : 'var(--g)'));
  }
  
  const stEl=document.getElementById('nr-status');
  if(stEl){
    if(S.flatlined){ stEl.textContent='FLATLINED'; stEl.style.color='var(--r)'; }
    else if(S.stunned){ stEl.textContent='STUNNED'; stEl.style.color='var(--a)'; }
    else if(S.stabilized){ stEl.textContent='STABILIZED'; stEl.style.color='var(--c)'; }
    else { stEl.textContent='OK'; stEl.style.color='var(--g)'; }
  }

  const iEl=document.getElementById('nr-intdmg');
  if(iEl){ iEl.textContent=S.intDmg; iEl.style.color=S.intDmg>0?'var(--r)':'var(--g)'; }
  const b=[];
  if(S.buffs.shield) b.push('Shield×'+S.buffs.shield);
  if(S.buffs.armor) b.push('Armor×'+S.buffs.armor);
  if(S.buffs.invis) b.push('Invis×'+S.buffs.invis);
  if(S.buffs.stealth) b.push('Stealth×'+S.buffs.stealth);
  if(S.buffs.worm) b.push('Worm…');
  const bf=document.getElementById('nr-buffs');
  if(bf) bf.textContent=b.length?b.join(', '):'—';
  if(typeof updateNeuralMap==='function') updateNeuralMap();
}

/** Visual feedback for body wounds + INT trauma on the neural schematic. */
function updateNeuralMap(){
  const w = S.wounds|0;
  const intD = S.intDmg|0;
  const maxInt = (typeof nr==='function' ? nr().int : 8) || 8;
  const status = document.getElementById('nm-status');
  if(status){
    if(intD >= maxInt) status.textContent = 'FOREBRAIN FRIED';
    else if(w >= 13) status.textContent = 'MORTAL';
    else if(w >= 9) status.textContent = 'CRITICAL';
    else if(w >= 5) status.textContent = 'SERIOUS';
    else if(w > 0 || intD > 0) status.textContent = 'COMPROMISED';
    else status.textContent = 'NOMINAL';
    status.style.color = (w>=9 || intD>=maxInt) ? 'var(--r)' : (w>=5 || intD>0) ? 'var(--a)' : 'var(--m)';
  }
  function setRegion(id, severity){
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.remove('light','serious','critical','mortal','int-dmg','int-fried');
    if(severity) el.classList.add(severity);
  }
  let sev = null;
  if(w >= 13) sev = 'mortal';
  else if(w >= 9) sev = 'critical';
  else if(w >= 5) sev = 'serious';
  else if(w > 0) sev = 'light';

  setRegion('nm-frontal',    w > 0  ? sev : null);
  setRegion('nm-temporal',   w >= 5 ? sev : null);
  setRegion('nm-parietal',   w >= 5 ? sev : null);
  setRegion('nm-occipital',  w >= 9 ? sev : null);
  setRegion('nm-cerebellum', w >= 9 ? sev : null);
  setRegion('nm-brainstem',  w >= 13? sev : null);

  // INT trauma on frontal
  const frontal = document.getElementById('nm-frontal');
  if(frontal && intD > 0){
    if(intD >= maxInt){
      frontal.classList.remove('light','serious','critical','mortal');
      frontal.classList.add('int-fried');
    } else {
      frontal.classList.add('int-dmg');
    }
  }
}

function progClassMeta(cls){
  const c=(cls||'').toLowerCase();
  if(c.includes('intrusion')) return {glyph:'⛏', tag:'cls-intrusion'};
  if(c.includes('decrypt')) return {glyph:'🔑', tag:'cls-decrypt'};
  if(c.includes('detection')) return {glyph:'👁', tag:'cls-detect'};
  if(c.includes('anti-ic')||c.includes('antiprogram')) return {glyph:'⚔', tag:'cls-antiic'};
  if(c.includes('anti-personnel')) return {glyph:'☠', tag:'cls-antip'};
  if(c.includes('protection')) return {glyph:'🛡', tag:'cls-prot'};
  if(c.includes('evasion')||c.includes('stealth')) return {glyph:'👻', tag:'cls-evasion'};
  if(c.includes('demon')) return {glyph:'◈', tag:'cls-demon'};
  if(c.includes('utility')) return {glyph:'⚙', tag:'cls-util'};
  if(c.includes('controller')) return {glyph:'🎛', tag:'cls-ctrl'};
  if(c.includes('multi')) return {glyph:'✦', tag:'cls-multi'};
  if(c.includes('anti-system')) return {glyph:'💥', tag:'cls-antisys'};
  return {glyph:'▪', tag:'cls-other'};
}
function renderPrograms(){
  const box=document.getElementById('prog-list');
  box.innerHTML='';
  S.programs.forEach((p,i)=>{
    ensureDemonSlots(p);
    const div=document.createElement('div');
    const cm=progClassMeta(p.cls);
    div.className='prog '+cm.tag+(i===S.selectedProg?' sel':'');
    div.dataset.cls=p.cls||'';
    let meta=`${p.cls} · STR ${p.str} · MU ${p.mu}`;
    if(isDemon(p)) meta+=` · slots ${p.slots.length}/${demonSlotMax(p)}`;
    if(typeof isOneUseProgram==='function' && isOneUseProgram(p)) meta+=' · ONE-USE';
    let slotHtml='';
    if(isDemon(p)){
      ensureDemonSlots(p);
      const cur=demonCurrentStr(p);
      meta += ` · STR ${cur}/${p.baseStr}`;
      if(p.slots.length){
        slotHtml='<div class="meta slots">'+p.slots.map((s,si)=>{
          const on = p.selectedSlot===si ? ' style="color:var(--a)"' : '';
          return `<span${on}>${p.selectedSlot===si?'▶':'↳'} ${s.name}</span> `+
            `<button data-pick="${i}:${si}" class="cyan" style="padding:0 4px;font-size:9px" title="Select subroutine">R</button> `+
            `<button data-unload="${i}:${si}" class="amber" style="padding:0 4px;font-size:9px">⏏</button>`;
        }).join('<br/>')+'</div>';
      }
    }
    const selDemon=S.programs[S.selectedProg];
    const showLoad = selDemon && isDemon(selDemon) && !isDemon(p) && i!==S.selectedProg;
    div.innerHTML=`<div class="prog-main"><span class="glyph">${cm.glyph}</span><div><div class="name">${p.name}</div><div class="meta">${meta}</div>${slotHtml}</div></div>
      <button data-sel="${i}" class="cyan">SEL</button>
      ${showLoad?`<button data-load="${i}" class="amber" title="Load into selected Demon">→D</button>`:''}
      <button data-del="${i}" class="red">×</button>`;
    div.onclick=(e)=>{if(e.target.tagName==='BUTTON')return;S.selectedProg=i;renderPrograms()};
    div.addEventListener('mouseenter',ev=>tipShow(tipHtmlProgram(p,false), ev.clientX, ev.clientY));
    div.addEventListener('mousemove',ev=>tipShow(tipHtmlProgram(p,false), ev.clientX, ev.clientY));
    div.addEventListener('mouseleave',tipHide);
    box.appendChild(div);
    // staggered appear
    div.style.opacity='0'; div.style.transform='translateX(-6px)';
    requestAnimationFrame(()=>{
      setTimeout(()=>{ div.style.transition='opacity .28s ease, transform .28s ease, border-color .2s, box-shadow .2s'; div.style.opacity='1'; div.style.transform='none'; }, i*28);
    });
  });
  box.querySelectorAll('[data-load]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    loadProgramIntoDemon(S.selectedProg, +b.dataset.load);
  });
  box.querySelectorAll('[data-unload]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const [di,si]=b.dataset.unload.split(':').map(Number);
    unloadFromDemon(di, si);
  });
  box.querySelectorAll('[data-pick]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    const [di,si]=b.dataset.pick.split(':').map(Number);
    selectDemonSlot(di, si);
  });
  box.querySelectorAll('[data-sel]').forEach(b=>b.onclick=e=>{e.stopPropagation();S.selectedProg=+b.dataset.sel;renderPrograms()});
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    S.programs.splice(+b.dataset.del,1);
    if(S.selectedProg>=S.programs.length)S.selectedProg=Math.max(0,S.programs.length-1);
    renderPrograms();updateMu();
  });
  updateMu();
}

window.S = S;
window.setSeed = setSeed; window.rng = rng; window.d10 = d10; window.d6 = d6;
window.netAttackRoll = netAttackRoll; window.netDefendRoll = netDefendRoll;
window.key = key; window.log = log; window.clearNetLog = clearNetLog; window.copyNetLog = copyNetLog; window.nr = nr; window.deck = deck;
window.muUsed = muUsed; window.updateMu = updateMu; window.updateRunnerBars = updateRunnerBars;
window.updateNeuralMap = updateNeuralMap;
window.progClassMeta = progClassMeta;
window.renderPrograms = renderPrograms;
