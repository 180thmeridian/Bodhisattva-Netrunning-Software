/* saves.js — multi-slot save / load with modal menu
   Slots 1–5 + autosave. localStorage with try/catch + download fallback.
*/
const SAVE_PREFIX = 'cp2020_netrun_save_';
const AUTOSAVE_KEY = 'cp2020_netrun_session';
const SAVE_VERSION = 6;
const SAVE_SLOTS = 5;

function saveStorageAvailable(){
  try{
    const k='__cp_test__';
    localStorage.setItem(k,'1');
    localStorage.removeItem(k);
    return true;
  }catch(_e){ return false; }
}

function saveSerializeSets(){
  return {
    openGates: S.openGates instanceof Set ? [...S.openGates] : (S.openGates||[]),
    deadIce: S.deadIce instanceof Set ? [...S.deadIce] : (S.deadIce||[]),
  };
}

function captureSaveSnapshot(label){
  if(typeof S==='undefined') throw new Error('State S not ready');
  const sets = saveSerializeSets();
  let fortCopy = null;
  try{ fortCopy = S.fort ? JSON.parse(JSON.stringify(S.fort)) : null; }catch(_e){ fortCopy = S.fort ? {...S.fort} : null; }
  const snap = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    label: label || ('Save '+new Date().toLocaleString()),
    seed: S.seed,
    netLoc: S.netLoc,
    netTime: S.netTime ? Object.assign({}, S.netTime) : null,
    netMoveLeft: S.netMoveLeft,
    pathTrace: Array.isArray(S.pathTrace) ? S.pathTrace.slice() : [],
    mode: S.mode,
    fort: fortCopy,
    runner: S.runner ? {x:S.runner.x,y:S.runner.y} : null,
    turn: S.turn|0,
    moveLeft: S.moveLeft,
    actionLeft: S.actionLeft,
    alarm: S.alarm|0,
    wounds: S.wounds|0,
    intDmg: S.intDmg|0,
    wallStr: S.wallStr ? Object.assign({}, S.wallStr) : {},
    iceStr: S.iceStr ? Object.assign({}, S.iceStr) : {},
    openGates: sets.openGates,
    deadIce: sets.deadIce,
    buffs: S.buffs ? JSON.parse(JSON.stringify(S.buffs)) : {},
    jackLocked: S.jackLocked|0,
    combatActive: !!S.combatActive,
    loot: Array.isArray(S.loot) ? JSON.parse(JSON.stringify(S.loot)) : [],
    programs: Array.isArray(S.programs) ? JSON.parse(JSON.stringify(S.programs)) : [],
    selectedProg: S.selectedProg|0,
    activeDemons: Array.isArray(S.activeDemons) ? JSON.parse(JSON.stringify(S.activeDemons)) : [],
    demonPlan: S.demonPlan ? JSON.parse(JSON.stringify(S.demonPlan)) : null,
    selfModMem: S.selfModMem ? JSON.parse(JSON.stringify(S.selfModMem)) : {},
    pseudoMem: S.pseudoMem ? JSON.parse(JSON.stringify(S.pseudoMem)) : {},
    explored: S.explored instanceof Set ? [...S.explored] : [],
    lotf: null,
    stunned: !!S.stunned,
    stabilized: !!S.stabilized,
    flatlined: !!S.flatlined,
    btm: S.btm,
    profileId: (S.profile && S.profile.id) || (typeof getActiveProfileId==='function' ? getActiveProfileId() : ''),
    deckUi: {
      mu: document.getElementById('deck-mu') && document.getElementById('deck-mu').value,
      spd: document.getElementById('deck-spd') && document.getElementById('deck-spd').value,
      dw: document.getElementById('deck-dw') && document.getElementById('deck-dw').value,
    },
    logLevel: S.logLevel,
  };
  if(S.lotf){
    try{
      snap.lotf = JSON.parse(JSON.stringify(Object.assign({}, S.lotf, {glitchTimer:null, _swarmTimer:null})));
    }catch(_e){ snap.lotf = null; }
  }
  return snap;
}

function applySaveSnapshot(snap){
  if(!snap || typeof snap!=='object') throw new Error('Invalid save');
  if(typeof S==='undefined') throw new Error('State S not ready');

  if(snap.seed!=null && typeof setSeed==='function') setSeed(snap.seed);

  if(snap.profileId && typeof loadProfiles==='function'){
    try{
      const list = loadProfiles();
      const p = list.find(x=>x.id===snap.profileId);
      if(p && !p.dead){
        if(typeof setActiveProfileId==='function') setActiveProfileId(p.id);
        if(typeof applyProfileToUI==='function') applyProfileToUI(p);
        if(typeof hideBootScreen==='function') hideBootScreen();
      }
    }catch(_e){}
  }

  S.netLoc = snap.netLoc || S.netLoc;
  if(snap.netTime) S.netTime = snap.netTime;
  S.netMoveLeft = snap.netMoveLeft!=null ? snap.netMoveLeft : 5;
  S.pathTrace = Array.isArray(snap.pathTrace) ? snap.pathTrace : (S.netLoc?[S.netLoc]:[]);
  S.mode = snap.mode || 'subgrid';
  S.programs = Array.isArray(snap.programs) ? snap.programs : [];
  S.selectedProg = snap.selectedProg|0;
  S.selfModMem = snap.selfModMem || {};
  S.pseudoMem = snap.pseudoMem || {};
  if(snap.btm!=null) S.btm = snap.btm;
  if(snap.logLevel) S.logLevel = snap.logLevel;

  if(snap.deckUi){
    const mu=document.getElementById('deck-mu');
    const spd=document.getElementById('deck-spd');
    const dw=document.getElementById('deck-dw');
    if(mu && snap.deckUi.mu!=null) mu.value = snap.deckUi.mu;
    if(spd && snap.deckUi.spd!=null) spd.value = snap.deckUi.spd;
    if(dw && snap.deckUi.dw!=null) dw.value = snap.deckUi.dw;
  }

  if(snap.fort){
    S.fort = snap.fort;
    S.wallStr = snap.wallStr || {};
    S.iceStr = snap.iceStr || {};
    S.openGates = new Set(snap.openGates||[]);
    S.deadIce = new Set(snap.deadIce||[]);
    S.runner = snap.runner || {x:0,y:0};
    S.turn = snap.turn|0;
    S.moveLeft = snap.moveLeft!=null ? snap.moveLeft : 5;
    S.actionLeft = snap.actionLeft!=null ? snap.actionLeft : 1;
    S.alarm = snap.alarm|0;
    S.wounds = snap.wounds|0;
    S.intDmg = snap.intDmg|0;
    S.buffs = snap.buffs || {shield:0,invis:0,stealth:0,armor:0,worm:null};
    S.jackLocked = snap.jackLocked|0;
    S.combatActive = !!snap.combatActive;
    S.loot = snap.loot || [];
    S.stunned = !!snap.stunned;
    S.stabilized = !!snap.stabilized;
    S.flatlined = !!snap.flatlined;
    S.activeDemons = snap.activeDemons || [];
    S.demonPlan = snap.demonPlan || null;
    S.explored = new Set(snap.explored||[]);
    if(snap.lotf){
      S.lotf = snap.lotf;
      S.lotf.glitchTimer = null;
      S.lotf._swarmTimer = null;
    } else if(typeof lotfReset==='function'){
      lotfReset();
    }
    if(typeof buildGrid==='function') buildGrid();
    if(typeof updateRunnerBars==='function') updateRunnerBars();
    if(S.scene && S.scene.rebuildMap) S.scene.rebuildMap();
    if(S.lotf && S.lotf.phase==='lord'){
      if(typeof lotfShowIntegrity==='function') lotfShowIntegrity();
      if(typeof lotfSetMapBurn==='function') lotfSetMapBurn(true);
    }
  } else {
    S.fort = null;
    S.grid = null;
    if(S.scene && S.scene.showPlaceholder) S.scene.showPlaceholder();
  }

  if(typeof renderPrograms==='function') renderPrograms();
  if(typeof updateMu==='function') updateMu();
  if(typeof updateHUD==='function') updateHUD();
  if(typeof updateLocHud==='function') updateLocHud();
  if(typeof refreshClock==='function') refreshClock();
}

function listSaveSlots(){
  const out=[];
  for(let i=1;i<=SAVE_SLOTS;i++){
    try{
      const raw = localStorage.getItem(SAVE_PREFIX+i);
      if(!raw){ out.push({slot:i, empty:true}); continue; }
      const snap = JSON.parse(raw);
      out.push({
        slot:i, empty:false,
        label: snap.label||('Slot '+i),
        savedAt: snap.savedAt,
        fort: snap.fort && snap.fort.name,
        turn: snap.turn,
        profileId: snap.profileId,
        wounds: snap.wounds,
        alarm: snap.alarm,
      });
    }catch(_e){
      out.push({slot:i, empty:true, corrupt:true});
    }
  }
  return out;
}

function saveToSlot(slot, label){
  slot = Math.max(1, Math.min(SAVE_SLOTS, slot|0));
  const snap = captureSaveSnapshot(label || ('Slot '+slot));
  const json = JSON.stringify(snap);
  if(!saveStorageAvailable()){
    // download fallback
    downloadJson(json, 'cp2020_netrun_save_slot'+slot+'.json');
    if(typeof log==='function') log('localStorage blocked — save downloaded as file.','bad');
    return snap;
  }
  try{
    localStorage.setItem(SAVE_PREFIX+slot, json);
    localStorage.setItem(AUTOSAVE_KEY, json);
  }catch(e){
    downloadJson(json, 'cp2020_netrun_save_slot'+slot+'.json');
    if(typeof log==='function') log('Storage full/blocked — downloaded file instead: '+e.message,'bad');
    throw e;
  }
  if(typeof log==='function') log('Saved → slot '+slot+' · '+(snap.label||'')+(snap.fort?(' · '+snap.fort.name):''),'ok');
  return snap;
}

function loadFromSlot(slot){
  slot = Math.max(1, Math.min(SAVE_SLOTS, slot|0));
  const raw = localStorage.getItem(SAVE_PREFIX+slot);
  if(!raw){
    if(typeof log==='function') log('Slot '+slot+' is empty.','bad');
    return false;
  }
  const snap = JSON.parse(raw);
  applySaveSnapshot(snap);
  if(typeof log==='function') log('Loaded slot '+slot+' · '+(snap.label||'')+' · '+(snap.savedAt||''),'ok');
  return true;
}

function deleteSlot(slot){
  slot = Math.max(1, Math.min(SAVE_SLOTS, slot|0));
  localStorage.removeItem(SAVE_PREFIX+slot);
  if(typeof log==='function') log('Slot '+slot+' cleared.','sys');
}

/**
 * Liche memory overwrite (gamified):
 * - May trash 1–2 filled save slots into "junk" pseudo-memories
 * - Or wipe a slot entirely
 * Pseudo-personality fragments replace labels / coordinates.
 */
function licheMemoryCorrupt(){
  if(!saveStorageAvailable()){
    if(typeof log==='function') log('  Liche claws at memory — no local engrams found.','info');
    return;
  }
  const filled=[];
  for(let i=1;i<=SAVE_SLOTS;i++){
    try{
      const raw=localStorage.getItem(SAVE_PREFIX+i);
      if(raw) filled.push(i);
    }catch(_e){}
  }
  // always try to taint autosave too
  const targets=filled.slice();
  if(Math.random()<0.7) targets.push('auto');
  if(!targets.length){
    // implant a junk engram into a random empty slot
    const slot=1+Math.floor(Math.random()*SAVE_SLOTS);
    const junk={
      version:SAVE_VERSION,
      savedAt:new Date().toISOString(),
      label:'∴ PSEUDO-SELF ∴ '+['Loyal Corp Asset','Dead Netrunner','Sysop Echo','Empty Smile','Someone Else'][Math.floor(Math.random()*5)],
      licheJunk:true,
      fort:null,
      runner:{x:0,y:0},
      turn:0, wounds:99, intDmg:99,
      notes:'Memory overwritten by Liche. This person is not you.'
    };
    try{
      localStorage.setItem(SAVE_PREFIX+slot, JSON.stringify(junk));
      if(typeof log==='function') log('  Liche implants junk engram → slot '+slot+' ('+junk.label+').','bad');
    }catch(_e){}
    return;
  }
  // corrupt up to 2 targets
  const n=Math.min(targets.length, 1+(Math.random()<0.45?1:0));
  for(let k=0;k<n;k++){
    const idx=Math.floor(Math.random()*targets.length);
    const t=targets.splice(idx,1)[0];
    if(t==='auto'){
      try{
        const raw=localStorage.getItem(AUTOSAVE_KEY);
        if(!raw) continue;
        const snap=JSON.parse(raw);
        snap.label='∴ OVERWRITE ∴ '+(snap.label||'session');
        snap.licheJunk=true;
        snap.intDmg=Math.max(snap.intDmg|0, 3+Math.floor(Math.random()*4));
        snap.runner={x:Math.floor(Math.random()*8), y:Math.floor(Math.random()*8)};
        snap.notes='Liche pseudo-personality fragment. Coordinates lie.';
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap));
        if(typeof log==='function') log('  Liche rewrites autosave engram.','bad');
      }catch(_e){}
    } else if(Math.random()<0.35){
      // full erase
      try{
        localStorage.removeItem(SAVE_PREFIX+t);
        if(typeof log==='function') log('  Memory slot '+t+' — ERASED by Liche.','bad');
      }catch(_e){}
    } else {
      // replace with junk / mutated copy
      try{
        const raw=localStorage.getItem(SAVE_PREFIX+t);
        let snap;
        try{ snap=JSON.parse(raw); }catch(_e){ snap={}; }
        const personas=['Corp Asset #'+Math.floor(Math.random()*9000),'Ghost of You','Sysop\'s Pet','Blank Stare','Wrong Name'];
        snap.label='∴ '+personas[Math.floor(Math.random()*personas.length)];
        snap.licheJunk=true;
        snap.savedAt=new Date().toISOString();
        snap.intDmg=Math.max(snap.intDmg|0, 2+Math.floor(Math.random()*5));
        if(snap.runner){ snap.runner.x^=3; snap.runner.y^=5; }
        snap.notes='Selective memory burn. Personality scaffold unstable.';
        localStorage.setItem(SAVE_PREFIX+t, JSON.stringify(snap));
        if(typeof log==='function') log('  Slot '+t+' overwritten → "'+snap.label+'".','bad');
      }catch(_e){}
    }
  }
}
window.licheMemoryCorrupt = licheMemoryCorrupt;

function downloadJson(text, filename){
  const blob = new Blob([text], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

function exportSaveSlot(slot){
  slot = Math.max(1, Math.min(SAVE_SLOTS, slot|0));
  let raw = localStorage.getItem(SAVE_PREFIX+slot);
  if(!raw) raw = JSON.stringify(captureSaveSnapshot('Export slot '+slot), null, 2);
  else {
    try{ raw = JSON.stringify(JSON.parse(raw), null, 2); }catch(_e){}
  }
  downloadJson(raw, 'cp2020_netrun_save_slot'+slot+'.json');
}

function importSaveFile(file, intoSlot){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = ()=>{
      try{
        const snap = JSON.parse(r.result);
        if(intoSlot>=1 && intoSlot<=SAVE_SLOTS){
          localStorage.setItem(SAVE_PREFIX+intoSlot, JSON.stringify(snap));
          if(typeof log==='function') log('Imported into slot '+intoSlot,'ok');
        }
        applySaveSnapshot(snap);
        if(typeof log==='function') log('Save file applied.','ok');
        resolve(snap);
      }catch(e){ reject(e); }
    };
    r.onerror = ()=>reject(r.error);
    r.readAsText(file);
  });
}

function saveSession(){
  try{
    if(typeof S==='undefined') return;
    const snap = captureSaveSnapshot('Autosave');
    if(saveStorageAvailable()) localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap));
  }catch(_e){}
}

function loadSession(){
  try{
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if(!raw) return;
    const snap = JSON.parse(raw);
    if((snap.version|0) >= 5){
      applySaveSnapshot(snap);
      if(typeof log==='function') log('Autosave restored.','sys');
    }
  }catch(_e){}
}

/* ===== Modal menu ===== */
function ensureSaveMenuDom(){
  let root = document.getElementById('save-menu');
  if(root) return root;
  root = document.createElement('div');
  root.id = 'save-menu';
  root.innerHTML = `
    <div class="sm-panel">
      <div class="sm-head">
        <span class="sm-title" id="sm-title">SAVE / LOAD</span>
        <button type="button" class="sm-x" id="sm-close" title="Close">×</button>
      </div>
      <div class="sm-tabs">
        <button type="button" class="sm-tab on" data-mode="save">SAVE</button>
        <button type="button" class="sm-tab" data-mode="load">LOAD</button>
      </div>
      <div class="sm-slots" id="sm-slots"></div>
      <div class="sm-foot">
        <label class="sm-label">Label <input id="sm-label" type="text" maxlength="48" placeholder="optional name"/></label>
        <button type="button" class="sm-btn cyan" id="sm-import">IMPORT FILE</button>
        <input type="file" id="sm-file" accept=".json,application/json" hidden />
      </div>
      <div class="sm-hint" id="sm-hint">Select a slot.</div>
    </div>`;
  document.body.appendChild(root);
  root.querySelector('#sm-close').onclick = ()=> closeSaveMenu();
  root.addEventListener('click', e=>{ if(e.target===root) closeSaveMenu(); });
  root.querySelectorAll('.sm-tab').forEach(btn=>{
    btn.onclick = ()=>{
      root.querySelectorAll('.sm-tab').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on');
      root.dataset.mode = btn.dataset.mode;
      renderSaveMenuSlots();
    };
  });
  root.querySelector('#sm-import').onclick = ()=> root.querySelector('#sm-file').click();
  root.querySelector('#sm-file').onchange = async (ev)=>{
    const f = ev.target.files && ev.target.files[0];
    if(!f) return;
    try{
      await importSaveFile(f, null);
      closeSaveMenu();
    }catch(e){
      if(typeof log==='function') log('Import failed: '+e.message,'bad');
      alert('Import failed: '+e.message);
    }
    ev.target.value = '';
  };
  return root;
}

function renderSaveMenuSlots(){
  const root = ensureSaveMenuDom();
  const mode = root.dataset.mode || 'save';
  const box = root.querySelector('#sm-slots');
  const hint = root.querySelector('#sm-hint');
  const title = root.querySelector('#sm-title');
  title.textContent = mode==='save' ? 'SAVE GAME' : 'LOAD GAME';
  hint.textContent = mode==='save'
    ? 'Click a slot to overwrite/save. Empty slots are fine.'
    : 'Click a filled slot to load. Empty slots are disabled.';
  const slots = listSaveSlots();
  box.innerHTML = '';
  slots.forEach(s=>{
    const row = document.createElement('div');
    row.className = 'sm-slot'+(s.empty?' empty':'')+(s.corrupt?' corrupt':'');
    const meta = s.empty
      ? '<span class="sm-empty">— empty —</span>'
      : `<span class="sm-name">${escapeSaveHtml(s.label)}</span>
         <span class="sm-meta">${escapeSaveHtml(s.fort||'no fort')} · T${s.turn|0} · W${s.wounds|0} · A${s.alarm|0}</span>
         <span class="sm-date">${escapeSaveHtml((s.savedAt||'').replace('T',' ').slice(0,19))}</span>`;
    row.innerHTML = `
      <div class="sm-num">${s.slot}</div>
      <div class="sm-body">${meta}</div>
      <div class="sm-actions">
        ${mode==='save' ? `<button type="button" class="sm-act save" data-slot="${s.slot}">SAVE</button>` : ''}
        ${mode==='load' && !s.empty ? `<button type="button" class="sm-act load" data-slot="${s.slot}">LOAD</button>` : ''}
        ${!s.empty ? `<button type="button" class="sm-act exp" data-slot="${s.slot}" title="Export JSON">↓</button>` : ''}
        ${!s.empty ? `<button type="button" class="sm-act del" data-slot="${s.slot}" title="Delete">×</button>` : ''}
      </div>`;
    box.appendChild(row);
  });
  box.querySelectorAll('.sm-act.save').forEach(b=>{
    b.onclick = ()=>{
      const n = +b.dataset.slot;
      const lab = (root.querySelector('#sm-label').value||'').trim() || ('Slot '+n);
      try{
        saveToSlot(n, lab);
        renderSaveMenuSlots();
        hint.textContent = 'Saved to slot '+n+'.';
        hint.classList.add('ok');
      }catch(e){
        hint.textContent = 'Save failed: '+(e && e.message);
        hint.classList.add('bad');
      }
    };
  });
  box.querySelectorAll('.sm-act.load').forEach(b=>{
    b.onclick = ()=>{
      const n = +b.dataset.slot;
      try{
        if(loadFromSlot(n)){
          closeSaveMenu();
        }
      }catch(e){
        hint.textContent = 'Load failed: '+(e && e.message);
        if(typeof log==='function') log('Load failed: '+e.message,'bad');
      }
    };
  });
  box.querySelectorAll('.sm-act.del').forEach(b=>{
    b.onclick = ()=>{
      const n = +b.dataset.slot;
      if(confirm('Delete slot '+n+'?')){
        deleteSlot(n);
        renderSaveMenuSlots();
      }
    };
  });
  box.querySelectorAll('.sm-act.exp').forEach(b=>{
    b.onclick = ()=> exportSaveSlot(+b.dataset.slot);
  });
}

function escapeSaveHtml(s){
  return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function openSaveMenu(mode){
  const root = ensureSaveMenuDom();
  root.dataset.mode = mode==='load' ? 'load' : 'save';
  root.querySelectorAll('.sm-tab').forEach(b=>{
    b.classList.toggle('on', b.dataset.mode===root.dataset.mode);
  });
  root.classList.add('on');
  renderSaveMenuSlots();
  const lab = root.querySelector('#sm-label');
  if(lab){
    const fort = S.fort && S.fort.name;
    lab.value = fort ? (fort.slice(0,28)+' T'+(S.turn|0)) : '';
  }
}

function closeSaveMenu(){
  const root = document.getElementById('save-menu');
  if(root) root.classList.remove('on');
}

function promptSaveUI(){ openSaveMenu('save'); }
function promptLoadUI(){ openSaveMenu('load'); }

window.SAVE_SLOTS = SAVE_SLOTS;
window.captureSaveSnapshot = captureSaveSnapshot;
window.applySaveSnapshot = applySaveSnapshot;
window.listSaveSlots = listSaveSlots;
window.saveToSlot = saveToSlot;
window.loadFromSlot = loadFromSlot;
window.deleteSlot = deleteSlot;
window.exportSaveSlot = exportSaveSlot;
window.importSaveFile = importSaveFile;
window.saveSession = saveSession;
window.loadSession = loadSession;
window.promptSaveUI = promptSaveUI;
window.promptLoadUI = promptLoadUI;
window.openSaveMenu = openSaveMenu;
window.closeSaveMenu = closeSaveMenu;
