/* fort.js — fort validation, grid, spawn, load */
function validateFort(raw){
  const errs=[];
  if(!raw || typeof raw!=='object') return ['Not a JSON object'];
  if(raw.rows!=null && (Number(raw.rows)<3||Number(raw.rows)>40)) errs.push('rows out of range (3–40)');
  if(raw.columns!=null && (Number(raw.columns)<3||Number(raw.columns)>40)) errs.push('columns out of range (3–40)');
  for(const key of ['datawallNodes','codegates','cpuNodes','muNodes','remotes','defenses']){
    if(raw[key]!=null && !Array.isArray(raw[key])) errs.push(key+' must be an array');
  }
  // coordinate sanity
  const R=Number(raw.rows)||12, C=Number(raw.columns)||14;
  const checkCoord=(c,label)=>{
    if(!c) return;
    const x=c.x!=null?c.x:c.coord&&c.coord.x;
    const y=c.y!=null?c.y:c.coord&&c.coord.y;
    if(x==null||y==null) return;
    if(x<0||y<0||x>=C||y>=R) errs.push(`${label} coord (${x},${y}) outside ${C}×${R}`);
  };
  (raw.datawallNodes||[]).forEach((n,i)=>checkCoord(n,'datawall#'+i));
  (raw.defenses||[]).forEach((d,i)=>checkCoord(d.coord||d,'ICE#'+i));
  (raw.codegates||[]).forEach((g,i)=>checkCoord(g.coord||g,'gate#'+i));
  return errs;
}
function normalizeFort(raw){
  const defenses = (Array.isArray(raw.defenses)?raw.defenses:[]).map(d=>{
    const p = d.program || {};
    const name = d.name || p.name || 'ICE';
    const str = Number(p.strength||p.str||p._str||d.str)||4;
    const options = p.options || d.options || [];
    return {
      name,
      coord: d.coord || {x:d.x,y:d.y},
      program: {
        name: p.name || name,
        strength: str,
        str,
        mu: Number(p.bookMu||p.mu)||0,
        description: p.description || '',
        options,
        class: (p.class && p.class.name) || p.cls || '',
      }
    };
  });
  // files from mu array if files empty (DF designer)
  let files = Array.isArray(raw.files)?raw.files:[];
  if(!files.length && Array.isArray(raw.mu)){
    files = raw.mu.map(m=>({key:m.key||m.name||'File', value:Number(m.value||m.mu)||1}));
  }
  return {
    name:raw.name||'Unknown Fortress',
    rows:Number(raw.rows)||12, columns:Number(raw.columns)||14,
    cpu:Number(raw.cpu)||1, int:Number(raw.int)||5,
    ai: raw.ai || null,
    datawallStr:Number(raw.datawallStr)||3,
    datawallNodes:Array.isArray(raw.datawallNodes)?raw.datawallNodes:[],
    codegates:Array.isArray(raw.codegates)?raw.codegates:[],
    cpuNodes:Array.isArray(raw.cpuNodes)?raw.cpuNodes:[],
    muNodes:Array.isArray(raw.muNodes)?raw.muNodes:[],
    remotes:Array.isArray(raw.remotes)?raw.remotes:[],
    defenses,
    files,
  };
}
function buildGrid(){
  const fort=S.fort; const g=[];
  for(let y=0;y<fort.rows;y++){
    g[y]=[];
    for(let x=0;x<fort.columns;x++) g[y][x]={type:'empty',walkable:true,label:'',str:0,name:''};
  }
  const set=(x,y,obj)=>{if(y>=0&&y<fort.rows&&x>=0&&x<fort.columns) Object.assign(g[y][x],obj)};
  for(const n of fort.datawallNodes){
    const k=key(n.x,n.y);
    const str=S.wallStr[k]!==undefined?S.wallStr[k]:fort.datawallStr;
    if(str<=0) set(n.x,n.y,{type:'breach',walkable:true,label:'BREACHED',str:0});
    else set(n.x,n.y,{type:'wall',walkable:false,label:'DATAWALL',str});
  }
  fort.codegates.forEach((cg,i)=>{
    const c=cg.coord||cg; const k=key(c.x,c.y); const open=S.openGates.has(k);
    set(c.x,c.y,{type:open?'gate-open':'gate',walkable:open,label:open?'GATE OPEN':'CODEGATE',str:Number(cg.str)||3,name:'Gate#'+i});
  });
  for(const n of fort.cpuNodes) set(n.x,n.y,{type:'cpu',walkable:true,label:'CPU'});
  for(const n of fort.muNodes) set(n.x,n.y,{type:'mu',walkable:true,label:'MU NODE'});
  fort.remotes.forEach(r=>{const c=r.coord||r; set(c.x,c.y,{type:'remote',walkable:true,label:r.name||'REMOTE',name:r.name||'Remote'})});
  fort.defenses.forEach(d=>{
    const c=d.coord||d; const k=key(c.x,c.y);
    if(S.deadIce.has(k)){ set(c.x,c.y,{type:'empty',walkable:true,label:'DE-REZZED'}); return; }
    const p=d.program||{}; const base=Number(p.strength||p.str)||4;
    const str=S.iceStr[k]!==undefined?S.iceStr[k]:base;
    set(c.x,c.y,{type:'ice',walkable:false,label:d.name||p.name||'ICE',str,name:d.name||p.name||'ICE',iceName:(p.name||d.name||'').toLowerCase()});
  });
  S.grid=g; return g;
}
function findSpawn(){
  const fort=S.fort, grid=S.grid;
  if(fort.codegates.length){
    const g=fort.codegates[0].coord||fort.codegates[0];
    for(const [x,y] of [[g.x,g.y-1],[g.x,g.y+1],[g.x-1,g.y],[g.x+1,g.y],[0,0],[1,1]]){
      if(y>=0&&y<fort.rows&&x>=0&&x<fort.columns&&grid[y][x].walkable) return {x,y};
    }
  }
  for(let y=0;y<fort.rows;y++) for(let x=0;x<fort.columns;x++)
    if(grid[y][x].walkable&&grid[y][x].type==='empty') return {x,y};
  return {x:0,y:0};
}
function cellAt(x,y){
  if(!S.grid||y<0||x<0||y>=S.grid.length||x>=S.grid[0].length) return null;
  return S.grid[y][x];
}

/** Fog of war: tiles the runner has seen. */
function ensureExplored(){
  if(!S.explored) S.explored = new Set();
}
function isExplored(x,y){
  ensureExplored();
  return S.explored.has(key(x,y));
}
/** Opaque for LOS: solid datawalls and sealed codegates. Breach/open/ice/empty do not block. */
function isOpaqueTile(x,y){
  const c = typeof cellAt==='function' ? cellAt(x,y) : (S.grid && S.grid[y] && S.grid[y][x]);
  if(!c) return true;
  if(c.type==='wall') return true;
  if(c.type==='gate') return true; // sealed
  return false;
}

/**
 * Unlimited range LOS fog: Bresenham rays in all directions until a blocker.
 * The blocking tile itself is revealed (you see the wall), but nothing beyond.
 * radius arg kept for API compat — ignored (always full map extent).
 */
function revealAround(cx,cy,radius){
  ensureExplored();
  const fort=S.fort; if(!fort) return;
  S.explored.add(key(cx,cy));
  const R=fort.rows, C=fort.columns;
  // Cast rays toward every border cell (and all cells via endpoints on perimeter)
  // denser: every map cell as endpoint is O(n²) rays — fine for ≤40×40
  function cast(x1,y1){
    let x0=cx, y0=cy;
    const dx=Math.abs(x1-x0), sx=x0<x1?1:-1;
    const dy=-Math.abs(y1-y0), sy=y0<y1?1:-1;
    let err=dx+dy;
    // skip origin
    while(!(x0===x1 && y0===y1)){
      const e2=2*err;
      if(e2>=dy){ err+=dy; x0+=sx; }
      if(e2<=dx){ err+=dx; y0+=sy; }
      if(y0<0||x0<0||y0>=R||x0>=C) break;
      S.explored.add(key(x0,y0));
      if(isOpaqueTile(x0,y0)) break; // see the obstacle, stop beyond
    }
  }
  // perimeter targets guarantee coverage; also diagonals through interior
  for(let x=0;x<C;x++){ cast(x,0); cast(x,R-1); }
  for(let y=0;y<R;y++){ cast(0,y); cast(C-1,y); }
  // extra: all tiles as endpoints for clean corners in open rooms
  for(let y=0;y<R;y++) for(let x=0;x<C;x++){
    if(x===cx&&y===cy) continue;
    cast(x,y);
  }
}
function revealAll(){
  ensureExplored();
  if(!S.fort) return;
  for(let y=0;y<S.fort.rows;y++) for(let x=0;x<S.fort.columns;x++) S.explored.add(key(x,y));
}
function neighbors4(x,y){
  return [[x,y-1],[x,y+1],[x-1,y],[x+1,y]].map(([a,b])=>({x:a,y:b,c:cellAt(a,b)})).filter(o=>o.c);
}

function tickBuffs(){
  for(const k of ['shield','invis','stealth','armor']) if(S.buffs[k]>0) S.buffs[k]--;
  if(S.jackLocked>0) S.jackLocked--;
  if(S.buffs.worm){
    S.buffs.worm.turns--;
    if(S.buffs.worm.turns<=0){
      const {x,y}=S.buffs.worm;
      S.wallStr[key(x,y)]=0; buildGrid();
      log(`Worm finishes — datawall (${x},${y}) opened silently.`,'ok');
      if(S.scene) S.scene.rebuildMap();
      S.buffs.worm=null;
    } else log(`Worm working… ${S.buffs.worm.turns} turn(s) left.`,'info');
  }
  updateRunnerBars();
}
function startTurn(){
  S.turn++; S.moveLeft=5; S.actionLeft=1; S.netMoveLeft=5;
  tickBuffs();
  // CP2020: one Stun recovery attempt per turn while out
  if(S.stunned && !S.flatlined && typeof tryStunRecovery==='function'){
    tryStunRecovery();
  }
  // CP2020: Death Save every turn at Mortal while untreated
  if(!S.flatlined && !S.stabilized && typeof woundLevel==='function'){
    const lvl = woundLevel(S.wounds|0);
    if(lvl.mortal && typeof makeDeathSave==='function'){
      makeDeathSave();
    }
  }
  if(S.flatlined || S.stunned){
    S.moveLeft = 0;
    S.actionLeft = 0;
  }
  // Autonomous demons act on their own initiative
  if(typeof tickActiveDemons==='function') tickActiveDemons();
  if(typeof conversationalTick==='function') conversationalTick();
  if(typeof demonConversationalTick==='function') demonConversationalTick();
  updateHUD();
  const stunTag = S.flatlined ? ' · FLATLINE' : (S.stunned ? ' · STUNNED' : '');
  const demN = (S.activeDemons&&S.activeDemons.length)||0;
  const demTag = demN ? ` · DEMON×${demN}` : '';
  log(`── NET TURN ${S.turn} · move ${S.moveLeft} · 1 Menu action${stunTag}${demTag} ──`,'turn');
  if(typeof flashTurnBanner==='function') flashTurnBanner(S.turn);
  if(!S.flatlined && !S.stunned) systemPhase();
  if(typeof lotfTick==='function') lotfTick();
  // Death resolved after save already set flatlined → trigger screen
  if(S.flatlined && !S._flatlineShown && typeof triggerFlatlineSequence==='function'){
    S._flatlineShown = true;
    triggerFlatlineSequence();
  }
}
function updateHUD(){
  let act=S.actionLeft?'ACTION ready':'ACTION spent';
  if(S.flatlined) act='FLATLINED';
  else if(S.stunned) act='STUNNED';
  const hud=document.getElementById('hud-top');
  if(hud){
    // Quiet HUD: only show when fort loaded; turn number flashed separately
    if(!S.fort){ hud.textContent='LOAD A DATAFORT TO BEGIN'; hud.classList.add('show'); }
    else {
      hud.textContent=`MOVE ${S.moveLeft} · ${act}` + (S.alarm?` · ALARM ${S.alarm}`:'');
      // keep subtle visibility while in fort
      hud.classList.toggle('show', S.moveLeft<=1 || S.stunned || S.flatlined || S.alarm>=2);
    }
  }
  document.getElementById('st-turn').textContent=S.turn||'—';
  document.getElementById('st-move').textContent=S.moveLeft;
  document.getElementById('st-act').textContent=S.actionLeft;
  const al=document.getElementById('st-alarm');
  if(al){
    al.textContent=S.alarm;
    al.style.color=S.alarm>=3?'var(--r)':S.alarm>=1?'var(--a)':'var(--g)';
  }
  const rowAl=document.getElementById('row-alarm');
  if(rowAl) rowAl.style.opacity = S.alarm>0 ? '1' : '0.45';
  if(typeof updateLocHud==='function') updateLocHud();
  if(typeof refreshClock==='function') refreshClock();
  if(S.fort){
    document.getElementById('st-fort').textContent=S.fort.name.slice(0,24);
    document.getElementById('st-cpu').textContent=`${S.fort.cpu} / INT ${S.fort.int}`;
    document.getElementById('st-dw').textContent=`STR ${S.fort.datawallStr}`;
  }
  const can=S.actionLeft>0&&!!S.fort&&!S.stunned&&!S.flatlined&&S.wounds<17&&S.intDmg<nr().int;
  ['m-run','m-copy','m-read','m-erase'].forEach(id=>document.getElementById(id).disabled=!can);
}
function spendAction(){
  if(S.flatlined){log('FLATLINED — no actions.','bad');return false}
  if(S.stunned){log('Stunned — no Menu action.','bad');return false}
  if(S.actionLeft<=0){log('No Menu action left this turn.','bad');return false}
  if(S.wounds>=17||S.intDmg>=nr().int){log('You are incapacitated.','bad');return false}
  S.actionLeft=0; updateHUD(); return true;
}

function loadFort(raw){
  const errs=validateFort(raw);
  if(errs.length){
    log('Fort JSON warnings: '+errs.join('; '),'bad');
    // still try to load — soft validation
  }
  S.wallStr={}; S.openGates.clear(); S.deadIce.clear(); S.iceStr={};
  S.alarm=0; S.wounds=0; S.intDmg=0; S.loot=[];
  S.buffs={shield:0,invis:0,stealth:0,armor:0,worm:null};
  S.stunned=false; S.stabilized=false; S.flatlined=false; S._flatlineShown=false; S.activeDemons=[]; S.demonPlan=null; S.pseudoMem=S.pseudoMem||{}; S.selfModMem=S.selfModMem||{}; S.explored=new Set();
  if(typeof lotfReset==='function') lotfReset();
  S.jackLocked=0; S.combatActive=false; S.mapRot=0;
  S.fort=normalizeFort(raw);
  for(const n of S.fort.datawallNodes) S.wallStr[key(n.x,n.y)]=S.fort.datawallStr;
  for(const d of S.fort.defenses){
    const c=d.coord||d; const p=d.program||{};
    S.iceStr[key(c.x,c.y)]=Number(p.strength||p.str)||4;
  }
  buildGrid(); S.runner=findSpawn(); S.turn=0;
  if(typeof revealAround==='function') revealAround(S.runner.x,S.runner.y);
  updateRunnerBars(); startTurn();
  if(S.fort && S.fort.ai && typeof aiMsg==='function'){
    aiMsg('AI', (S.fort.ai.personality)||'Resident process watching.');
  }
  log('Loaded: '+S.fort.name,'ok');
  log(`Datawall STR ${S.fort.datawallStr} · ${S.fort.codegates.length} gates · ${S.fort.defenses.length} ICE`,'info');
  if(S.scene) S.scene.rebuildMap();
  updateHUD();
}


window.validateFort = validateFort; window.normalizeFort = normalizeFort;
window.buildGrid = buildGrid; window.findSpawn = findSpawn;
window.cellAt = cellAt; window.neighbors4 = neighbors4;
window.tickBuffs = tickBuffs; window.startTurn = startTurn;
window.updateHUD = updateHUD; window.spendAction = spendAction;
window.loadFort = loadFort;
window.revealAround=revealAround;
window.isOpaqueTile=isOpaqueTile;
window.isExplored=isExplored;
window.ensureExplored=ensureExplored;
window.revealAll=revealAll;
