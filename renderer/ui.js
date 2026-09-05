/* ui.js — tooltips, clock, rotation, debug, CRT, session, program list */
function defaultPrograms(){
  S.programs=[{...PROGRAM_DB[0]},{...PROGRAM_DB[3]},{...PROGRAM_DB[7]},{...PROGRAM_DB[10]},{...PROGRAM_DB[13]}]; S.programs.forEach(ensureDemonSlots);
  S.selectedProg=0; renderPrograms();
}
function fillPresetSelect(){
  const sel=document.getElementById('prog-preset');
  PROGRAM_DB.forEach((p,i)=>{
    const o=document.createElement('option');
    o.value=i; o.textContent=`${p.name} [${p.cls} STR${p.str} MU${p.mu}]`;
    sel.appendChild(o);
  });
  sel.onchange=()=>{
    if(sel.value==='')return;
    const _np={...PROGRAM_DB[+sel.value]}; if(isDemon(_np)) _np.slots=[]; S.programs.push(_np);
    S.selectedProg=S.programs.length-1;
    renderPrograms(); sel.value='';
    if(muUsed()>deck().mu) log('Warning: MU over capacity.','bad');
  };
}

/** Soft-validate Cybersmily / fort JSON before load */
function tipShow(html, clientX, clientY){
  const el=document.getElementById('tip');
  if(!el) return;
  el.innerHTML=html;
  el.classList.add('show');
  const pad=14;
  let x=clientX+14, y=clientY+14;
  const w=el.offsetWidth||260, h=el.offsetHeight||120;
  if(x+w>window.innerWidth-8) x=clientX-w-10;
  if(y+h>window.innerHeight-8) y=clientY-h-10;
  el.style.left=Math.max(8,x)+'px';
  el.style.top=Math.max(8,y)+'px';
}
function tipHide(){
  const el=document.getElementById('tip');
  if(el) el.classList.remove('show');
}
function tipHtmlProgram(p, enemy){
  if(!p) return '';
  const cls=p.cls||p.class||'Program';
  const str=p.str!=null?p.str:(p.strength!=null?p.strength:'?');
  const mu=p.mu!=null?p.mu:'—';
  const note=p.note||'';
  let lore='';
  if(enemy){
    const key=String(p.name||'').toLowerCase();
    for(const k of Object.keys(ICE_LORE||{})){
      if(key.includes(k)){ lore=ICE_LORE[k]; break; }
    }
  }
  return `<div class="tip-title">${p.name||'UNKNOWN'}</div>
    <div class="tip-cls">${enemy?'ICE · ':''}${cls}</div>
    <div class="tip-row"><span>STR</span><b>${str}</b></div>
    <div class="tip-row"><span>MU</span><b>${mu}</b></div>
    ${note?`<div class="tip-body">${note}</div>`:''}
    ${lore?`<div class="tip-body">${lore}</div>`:''}
    ${cls==='Demon'?`<div class="tip-warn">Demon: multi-function shell — one target for Anti-IC.</div>`:''}
    ${typeof demonTipExtra==='function'?demonTipExtra(p):''}
    ${enemy&&/hellhound|bloodhound|pit.?bull/i.test(p.name||'')?`<div class="tip-warn">Chase-capable · Trace risk on jack-out.</div>`:''}`;
}


/* ========== Net clock (2032-08 · +1s per completed turn) ========== */
function formatNetClock(){
  const t=S.netTime;
  const pad=n=>String(n).padStart(2,'0');
  return `${t.y}-${pad(t.m)}-${pad(t.d)} · ${pad(t.h)}:${pad(t.mi)}:${pad(t.s)}`;
}
function bumpNetClock(sec){
  let t=S.netTime; t.s += sec;
  while(t.s>=60){ t.s-=60; t.mi++; }
  while(t.mi>=60){ t.mi-=60; t.h++; }
  while(t.h>=24){ t.h-=24; t.d++; }
  // simple month length 31 for demo
  while(t.d>31){ t.d-=31; t.m++; if(t.m>12){ t.m=1; t.y++; } }
  const el=document.getElementById('net-clock');
  if(el){
    el.textContent=formatNetClock();
    el.style.boxShadow='0 0 12px rgba(255,170,51,.5)';
    setTimeout(()=>{ el.style.boxShadow=''; }, 350);
  }
}
function refreshClock(){
  const el=document.getElementById('net-clock');
  if(el) el.textContent=formatNetClock();
}

/* ========== Auto-end turn when stealth (no combat, no alarm) ========== */
function maybeAutoEndTurn(){
  if(!S.fort) return;
  if(S.combatActive || S.alarm>0) return;
  if(S.moveLeft>0) return;
  // if action still available and something interactive is adjacent — wait for player
  if(S.actionLeft>0){
    const adj=neighbors4(S.runner.x,S.runner.y);
    if(adj.some(o=>o.c&&(o.c.type==='wall'||o.c.type==='gate'||o.c.type==='ice'||o.c.type==='mu'||o.c.type==='cpu'))){
      return;
    }
  }
  if(S._autoTimer) clearTimeout(S._autoTimer);
  S._autoTimer=setTimeout(()=>{
    if(!S.fort) return;
    if(S.combatActive || S.alarm>0) return;
    if(S.moveLeft>0) return;
    if(S.actionLeft>0){
      const adj=neighbors4(S.runner.x,S.runner.y);
      if(adj.some(o=>o.c&&(o.c.type==='wall'||o.c.type==='gate'||o.c.type==='ice'||o.c.type==='mu'||o.c.type==='cpu'))) return;
    }
    log('…signal idle — turn auto-closed (+1s net-time).','sys');
    endTurn(true);
  }, 420);
}

/* ========== View rotation (does not change logical grid) ========== */
function viewXY(x,y){
  const r=(S.mapRot||0)%4;
  if(!S.fort) return {x,y};
  const cols=S.fort.columns, rows=S.fort.rows;
  if(r===0) return {x,y};
  if(r===1) return {x:y, y:cols-1-x};           // 90 CW
  if(r===2) return {x:cols-1-x, y:rows-1-y};     // 180
  return {x:rows-1-y, y:x};                      // 270 CW
}
function rotateMap(dir){
  // dir +1 CW, -1 CCW
  S.mapRot = (S.mapRot + dir + 4) % 4;
  log(`Map rotation: ${S.mapRot*90}°`,'info');
  if(S.scene) S.scene.rebuildMap();
  spawnCssSparks(12);
}
function screenDirToLogical(dx,dy){
  // transform WASD screen intent into logical grid step under rotation
  // viewXY maps logical → screen; this is the inverse for movement deltas
  const r=(S.mapRot||0)%4;
  if(r===0) return {dx,dy};
  if(r===1) return {dx:-dy, dy:dx};   // 90° CW view
  if(r===2) return {dx:-dx, dy:-dy};  // 180°
  return {dx:dy, dy:-dx};             // 270° CW
}

function spawnCssSparks(n, color){
  const layer=document.getElementById('fx-layer');
  if(!layer) return;
  const rect=layer.getBoundingClientRect();
  for(let i=0;i<n;i++){
    const s=document.createElement('div');
    s.className='fx-spark';
    if(color) s.style.background=s.style.boxShadow=`0 0 8px ${color}`, s.style.background=color;
    s.style.left=(20+Math.random()*60)+'%';
    s.style.top=(30+Math.random()*40)+'%';
    layer.appendChild(s);
    setTimeout(()=>s.remove(), 700);
  }
}

/* Phaser ISO */
/* ========== Debug overlay (F3) ========== */
function ensureDebugDom(){
  if(document.getElementById('debug-overlay')) return;
  const d=document.createElement('div');
  d.id='debug-overlay';
  d.style.cssText='display:none;position:fixed;top:48px;left:12px;z-index:2000;background:rgba(2,10,6,.92);border:1px solid #1a3a24;color:#33ff66;font:11px/1.45 Courier New,monospace;padding:8px 12px;min-width:220px;pointer-events:none;white-space:pre';
  document.body.appendChild(d);
}
function toggleDebug(){
  S.debug=!S.debug;
  ensureDebugDom();
  const el=document.getElementById('debug-overlay');
  el.style.display=S.debug?'block':'none';
  log(S.debug?'DEBUG overlay ON (F3)':'DEBUG overlay OFF','sys');
  if(S.debug) refreshDebug();
}
function refreshDebug(){
  if(!S.debug) return;
  ensureDebugDom();
  const el=document.getElementById('debug-overlay');
  const r=S.runner||{};
  const fort=S.fort;
  const fps=(S.game&&S.game.loop)?Math.round(S.game.loop.actualFps):'—';
  el.textContent = [
    `DEBUG  seed=${S.seed??'—'}  fps=${fps}`,
    `turn=${S.turn}  move=${S.moveLeft}  act=${S.actionLeft}`,
    `alarm=${S.alarm}  wounds=${S.wounds}  intDmg=${S.intDmg}`,
    `runner @ ${r.x},${r.y}  rot=${S.mapRot}`,
    `LDL=${S.netLoc}  netMove=${S.netMoveLeft}  trace=${S.traceTotal}`,
    `mode=${S.mode}  combat=${S.combatActive}  jackLock=${S.jackLocked}`,
    fort?`fort=${fort.name||'?'}  ${fort.columns}x${fort.rows}  INT=${fort.int}`:'fort=—',
    `ICE alive=${(fort&&fort.defenses)?fort.defenses.filter(d=>{const c=d.coord||d;return c&&!S.deadIce.has(key(c.x,c.y));}).length:'—'}`,
    `CRT=${S.crtEnabled?'on':'off'}  logLevel=${S.logLevel}`,
  ].join('\n');
}
setInterval(()=>{ if(S.debug) refreshDebug(); }, 400);

/* ========== CRT toggle (F4) ========== */
function toggleCrt(){
  S.crtEnabled=!S.crtEnabled;
  ['crt-scan','crt-vignette','crt-noise','crt-glitch'].forEach(id=>{
    const n=document.getElementById(id);
    if(n) n.style.display=S.crtEnabled?'':'none';
  });
  log(`CRT effects ${S.crtEnabled?'ON':'OFF'} (F4)`,'sys');
}

/* ========== Session autosave (localStorage fallback) ========== */
function saveSession(){
  try{
    const snap={
      version:2, seed:S.seed, netLoc:S.netLoc, pathTrace:S.pathTrace,
      netTime:S.netTime, programs:S.programs, selectedProg:S.selectedProg,
      turn:S.turn, alarm:S.alarm, wounds:S.wounds, intDmg:S.intDmg,
      crtEnabled:S.crtEnabled, logLevel:S.logLevel,
      runnerName:document.getElementById('nr-name')?.value,
      deck:{mu:document.getElementById('deck-mu')?.value, spd:document.getElementById('deck-spd')?.value, dw:document.getElementById('deck-dw')?.value},
    };
    localStorage.setItem('cp2020_netrun_session', JSON.stringify(snap));
  }catch(e){}
}
function loadSession(){
  try{
    const raw=localStorage.getItem('cp2020_netrun_session');
    if(!raw) return;
    const snap=JSON.parse(raw);
    if(snap.seed) setSeed(snap.seed);
    if(snap.netLoc) S.netLoc=snap.netLoc;
    if(snap.pathTrace) S.pathTrace=snap.pathTrace;
    if(snap.netTime) S.netTime=snap.netTime;
    if(typeof snap.crtEnabled==='boolean'){
      S.crtEnabled = snap.crtEnabled;
      ['crt-scan','crt-vignette','crt-noise','crt-glitch'].forEach(id=>{
        const n=document.getElementById(id);
        if(n) n.style.display=S.crtEnabled?'':'none';
      });
    }
    if(snap.logLevel) S.logLevel=snap.logLevel;
    if(snap.runnerName) document.getElementById('nr-name').value=snap.runnerName;
    log('Session restored from localStorage.','sys');
  }catch(e){}
}
setInterval(saveSession, 15000);


window.renderPrograms = renderPrograms; window.defaultPrograms = defaultPrograms;
window.fillPresetSelect = fillPresetSelect;
window.tipShow = tipShow; window.tipHide = tipHide; window.tipHtmlProgram = tipHtmlProgram;
window.formatNetClock = formatNetClock; window.bumpNetClock = bumpNetClock; window.refreshClock = refreshClock;
window.maybeAutoEndTurn = maybeAutoEndTurn;
window.viewXY = viewXY; window.rotateMap = rotateMap; window.screenDirToLogical = screenDirToLogical;
window.spawnCssSparks = spawnCssSparks;
window.toggleDebug = toggleDebug; window.refreshDebug = refreshDebug;
window.toggleCrt = toggleCrt; window.saveSession = saveSession; window.loadSession = loadSession;
