/* fort.js — fort validation, grid, spawn, load */
function fortPayload(raw){
  // Accept direct Cybersmily DF Designer exports and common wrapper objects.
  // Some tools export {datafort:{...}} / {fort:{...}} instead of the fort at root.
  if(typeof raw==='string'){
    let text=raw.replace(/^\uFEFF/, '').trim();
    raw=JSON.parse(text);
  }
  if(Array.isArray(raw)){
    if(raw.length!==1) throw new Error('Fort JSON must contain one fortress object.');
    raw=raw[0];
  }
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) throw new Error('Fort JSON root is not an object.');
  const wrappers=['datafort','dataFort','data_fort','fortress','fort','data'];
  let cur=raw;
  for(let i=0;i<3;i++){
    if(cur.rows!=null || cur.columns!=null || cur.datawallNodes || cur.codegates || cur.defenses) break;
    const key=wrappers.find(k=>cur[k] && typeof cur[k]==='object' && !Array.isArray(cur[k]));
    if(!key) break;
    cur=cur[key];
  }
  // Cybersmily's Datafort Designer exports this canonical shape.  A few
  // older/local forks use singular aliases; convert them here so the gameplay
  // layer never has to know which designer revision produced the JSON.
  if(cur.datawallNodes==null && Array.isArray(cur.datawalls)) cur.datawallNodes=cur.datawalls;
  if(cur.datawallNodes==null && Array.isArray(cur.walls)) cur.datawallNodes=cur.walls;
  if(cur.codegates==null && Array.isArray(cur.gates)) cur.codegates=cur.gates;
  if(cur.defenses==null && Array.isArray(cur.ice)) cur.defenses=cur.ice;
  if(cur.cpuNodes==null && Array.isArray(cur.cpu_nodes)) cur.cpuNodes=cur.cpu_nodes;
  if(cur.muNodes==null && Array.isArray(cur.mu_nodes)) cur.muNodes=cur.mu_nodes;
  return cur;
}
function coordOf(value){
  if(Array.isArray(value) && value.length>=2) return {x:Number(value[0]),y:Number(value[1])};
  if(value && typeof value==='object'){
    const c=value.coord && typeof value.coord==='object' ? value.coord : value;
    if(c.x!=null && c.y!=null) return {x:Number(c.x),y:Number(c.y)};
  }
  return null;
}
function normalizeNode(value){
  const c=coordOf(value);
  return c && Number.isFinite(c.x) && Number.isFinite(c.y) ? c : null;
}
function validateFort(raw){
  const errs=[];
  try{ raw=fortPayload(raw); }catch(e){ return [e.message]; }
  if(!raw || typeof raw!=='object') return ['Not a JSON object'];
  if(raw.rows!=null && (Number(raw.rows)<3||Number(raw.rows)>40)) errs.push('rows out of range (3–40)');
  if(raw.columns!=null && (Number(raw.columns)<3||Number(raw.columns)>40)) errs.push('columns out of range (3–40)');
  for(const key of ['datawallNodes','codegates','cpuNodes','muNodes','remotes','defenses']){
    if(raw[key]!=null && !Array.isArray(raw[key])) errs.push(key+' must be an array');
  }
  const R=Number(raw.rows)||12, C=Number(raw.columns)||14;
  const checkCoord=(c,label)=>{
    const q=coordOf(c);
    if(!q) return;
    if(q.x<0||q.y<0||q.x>=C||q.y>=R) errs.push(`${label} coord (${q.x},${q.y}) outside ${C}×${R}`);
  };
  (raw.datawallNodes||[]).forEach((n,i)=>checkCoord(n,'datawall#'+i));
  (raw.cpuNodes||[]).forEach((n,i)=>checkCoord(n,'cpu#'+i));
  (raw.muNodes||[]).forEach((n,i)=>checkCoord(n,'mu#'+i));
  (raw.remotes||[]).forEach((n,i)=>checkCoord(n,'remote#'+i));
  (raw.defenses||[]).forEach((d,i)=>checkCoord(d,'ICE#'+i));
  (raw.codegates||[]).forEach((g,i)=>checkCoord(g,'gate#'+i));
  return errs;
}
function normalizeFort(raw){
  raw=fortPayload(raw);
  const mapNodes=(arr)=>Array.isArray(arr)?arr.map(normalizeNode).filter(Boolean):[];
  const defenses=(Array.isArray(raw.defenses)?raw.defenses:[]).map((d,idx)=>{
    d=d&&typeof d==='object'?d:{};
    const p=d.program&&typeof d.program==='object'?d.program:{};
    const name=String(d.name||p.name||'ICE');
    const str=Number(p.strength??p.str??p._str??d.str??4)||4;
    const options=Array.isArray(p.options)?p.options:(Array.isArray(d.options)?d.options:[]);
    const coord=normalizeNode(d) || {x:0,y:0};
    const cls=(p.class&&typeof p.class==='object') ? (p.class.name||'') : (p.class||p.cls||'');
    return {
      ...d,
      name,
      coord,
      program:{
        ...p,
        name:String(p.name||name),
        strength:str,
        str,
        mu:Number(p.bookMu??p.mu??0)||0,
        description:p.description||'',
        options,
        class:cls,
      }
    };
  });
  let files=Array.isArray(raw.files)?raw.files.map((f,i)=>({
    ...((f&&typeof f==='object')?f:{}),
    key:String(f?.key||f?.name||`File ${i+1}`),
    value:Number(f?.value??f?.mu??1)||1
  })):[];
  if(!files.length && Array.isArray(raw.mu)){
    files=raw.mu.map((m,i)=>({
      ...((m&&typeof m==='object')?m:{}),
      key:String(m?.key||m?.name||`File ${i+1}`),
      value:Number(m?.value??m?.mu??1)||1
    }));
  }
  const rows=Number(raw.rows??raw.height??12)||12;
  const columns=Number(raw.columns??raw.width??14)||14;
  return {
    ...raw,
    name:String(raw.name||'Unknown Fortress'),
    notes:raw.notes||'', cost:Number(raw.cost)||0, additionalCosts:Number(raw.additionalCosts)||0,
    rows, columns,
    cpu:Number(raw.cpu)||1, int:Number(raw.int)||5,
    ai:raw.ai||null,
    datawallStr:Number(raw.datawallStr)||3,
    datawallNodes:mapNodes(raw.datawallNodes),
    codegates:Array.isArray(raw.codegates)?raw.codegates.map(g=>({...g,coord:normalizeNode(g)||{x:0,y:0}})):[],
    cpuNodes:mapNodes(raw.cpuNodes),
    muNodes:mapNodes(raw.muNodes),
    remotes:Array.isArray(raw.remotes)?raw.remotes.map(r=>({...r,coord:normalizeNode(r)||{x:0,y:0}})):[],
    defenses,
    files,
    skills:Array.isArray(raw.skills)?raw.skills:[],
    muAvailable:Number(raw.muAvailable)||0,
    muUsed:Number(raw.muUsed)||0,
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
    // skip origin; block diagonal corner peeking between two walls
    while(!(x0===x1 && y0===y1)){
      const e2=2*err;
      let stepX=false, stepY=false;
      if(e2>=dy){ err+=dy; stepX=true; }
      if(e2<=dx){ err+=dx; stepY=true; }
      // closed corner: two diagonal datawalls must not leave a LOS gap
      if(stepX && stepY){
        if(isOpaqueTile(x0+sx, y0) && isOpaqueTile(x0, y0+sy)) break;
      }
      if(stepX) x0+=sx;
      if(stepY) y0+=sy;
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
  S.turn++; S.moveLeft=5; S.actionMax=(typeof actionCapacity==='function'?actionCapacity():1); S.actionLeft=S.actionMax; S.netMoveLeft=5; S.programTarget=null;
  if(S.scene&&typeof S.scene.drawProgramTarget==='function') S.scene.drawProgramTarget();
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
  let act=`ACTION ${S.actionLeft}/${S.actionMax||1}`;
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
  document.getElementById('st-act').textContent=`${S.actionLeft}/${S.actionMax||1}`;
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
  const can=S.actionLeft>0&&!!S.fort&&!S.stunned&&!S.flatlined&&S.wounds<17&&nr().int>0;
  ['m-run','m-copy','m-read','m-erase'].forEach(id=>document.getElementById(id).disabled=!can);
}
function spendAction(){
  if(S.flatlined){log('FLATLINED — no actions.','bad');return false}
  if(S.stunned){log('Stunned — no Menu action.','bad');return false}
  if(S.actionLeft<=0){log('No Menu actions left this turn.','bad');return false}
  if(S.wounds>=17||nr().int<=0){log('You are incapacitated.','bad');return false}
  S.actionLeft=Math.max(0,S.actionLeft-1); updateHUD(); return true;
}

function loadSampleFort(){
  // Keep the built-in test fortress available as a real gameplay fixture.
  // Clone it so gameplay/state changes can never mutate the source template.
  const template = window.SAMPLE_FORT;
  if(!template || typeof template!=='object'){
    if(typeof log==='function') log('Sample DataFort is unavailable. Check renderer/data.js.','bad');
    return false;
  }
  let sample;
  try{ sample=JSON.parse(JSON.stringify(template)); }
  catch(e){
    if(typeof log==='function') log('Sample DataFort clone failed: '+e.message,'bad');
    return false;
  }
  loadFort(sample);
  return !!S.fort;
}

function fortRuntimeSnapshot(){
  return {
    fort:S.fort, grid:S.grid, runner:S.runner && {...S.runner}, turn:S.turn,
    moveLeft:S.moveLeft, actionLeft:S.actionLeft, actionMax:S.actionMax, netMoveLeft:S.netMoveLeft, programTarget:S.programTarget, 
    wallStr:{...(S.wallStr||{})}, openGates:new Set(S.openGates||[]),
    deadIce:new Set(S.deadIce||[]), iceStr:{...(S.iceStr||{})}, alarm:S.alarm,
    wounds:S.wounds, intDmg:S.intDmg, loot:Array.isArray(S.loot)?S.loot.slice():[],
    buffs:JSON.parse(JSON.stringify(S.buffs||{})), stunned:S.stunned,
    stabilized:S.stabilized, flatlined:S.flatlined, _flatlineShown:S._flatlineShown,
    activeDemons:Array.isArray(S.activeDemons)?S.activeDemons.slice():[],
    demonPlan:S.demonPlan, pseudoMem:{...(S.pseudoMem||{})}, selfModMem:{...(S.selfModMem||{})},
    explored:new Set(S.explored||[]), jackLocked:S.jackLocked, combatActive:S.combatActive,
    mapRot:S.mapRot
  };
}
function restoreFortRuntime(s){
  if(!s) return;
  Object.assign(S,s);
}

function parseFortFileText(text){
  if(typeof text!=='string') throw new Error('The selected file is not text.');
  const clean=text.replace(/^\uFEFF/, '').trim();
  if(!clean) throw new Error('The selected JSON file is empty.');
  try{return JSON.parse(clean);}catch(e){
    const pos=Number.isInteger(e?.message?.match(/position (\d+)/i)?.[1]) ? Number(e.message.match(/position (\d+)/i)[1]) : null;
    throw new Error(pos!=null ? `Invalid JSON near character ${pos}.` : `Invalid JSON: ${e.message}`);
  }
}

async function readFortFile(file){
  if(!file) throw new Error('No fortress file selected.');
  if(typeof file.text==='function') return parseFortFileText(await file.text());
  return await new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onerror=()=>reject(new Error('Could not read the fortress file.'));
    r.onload=()=>{try{resolve(parseFortFileText(String(r.result||'')))}catch(e){reject(e)}};
    r.readAsText(file,'utf-8');
  });
}

async function importFortFile(file){
  try{
    const raw=await readFortFile(file);
    let normalized;
    try{
      const payload=fortPayload(raw);
      const errs=validateFort(payload);
      if(errs.length) log('Fort JSON warnings: '+errs.join('; '),'bad');
      normalized=normalizeFort(payload);
      if(normalized.rows<3||normalized.columns<3||normalized.rows>40||normalized.columns>40){
        throw new Error(`Unsupported fortress size: ${normalized.columns}×${normalized.rows}.`);
      }
    }catch(e){ throw new Error('Fortress validation failed: '+e.message); }
    if(typeof openFortPlacementDialog!=='function') throw new Error('DataFort placement interface is not initialized.');
    openFortPlacementDialog(normalized);
    return true;
  }catch(e){
    console.error('DataFort import failed',e);
    log('DATAFORT IMPORT FAILED: '+e.message,'bad');
    return false;
  }
}

function enterStoredFort(id){
  const rec=window.FortLibrary?.get(id);
  if(!rec){ log('DataFort entry not found.','bad'); return false; }
  if(typeof loadFort!=='function') return false;
  const ok=loadFort(cloneFortObject(rec.fort));
  if(!ok) return false;
  S._activeFortId=rec.id;
  S._activeFortCityId=rec.cityId;
  S._activeFortCell={x:rec.x,y:rec.y};
  closeCityGrid?.();
  closeNetMap?.();
  const city=window.FortLibrary.cityName(rec.cityId);
  log(`Entered ${rec.fort.name} · ${city} grid (${rec.x},${rec.y}).`,'ok');
  return true;
}
function cloneFortObject(v){ return JSON.parse(JSON.stringify(v)); }
window.enterStoredFort=enterStoredFort;

function loadFort(raw){
  let normalized;
  try{
    const payload=fortPayload(raw);
    const errs=validateFort(payload);
    if(errs.length){
      // Coordinate warnings are useful, but are not fatal for designer files.
      log('Fort JSON warnings: '+errs.join('; '),'bad');
    }
    normalized=normalizeFort(payload);
    if(!normalized.rows || !normalized.columns) throw new Error('Fortress dimensions are missing.');
    if(normalized.rows<3 || normalized.columns<3 || normalized.rows>40 || normalized.columns>40){
      throw new Error(`Unsupported fortress size: ${normalized.columns}×${normalized.rows}.`);
    }
  }catch(e){
    log('Fort load failed: '+e.message,'bad');
    return false;
  }

  const previous=fortRuntimeSnapshot();
  try{
    // Defensive initialization makes external imports independent of whatever
    // state the player was in before pressing LOAD.
    if(!(S.openGates instanceof Set)) S.openGates=new Set();
    if(!(S.deadIce instanceof Set)) S.deadIce=new Set();
    S.wallStr={}; S.openGates.clear(); S.deadIce.clear(); S.iceStr={};
    S.alarm=0; S.wounds=0; S.intDmg=0; S.loot=[];
    S.buffs={shield:0,invis:0,stealth:0,armor:0,worm:null};
    S.stunned=false; S.stabilized=false; S.flatlined=false; S._flatlineShown=false;
    S.activeDemons=[]; S.demonPlan=null; S.pseudoMem={}; S.selfModMem={}; S.explored=new Set();
    if(typeof lotfReset==='function') lotfReset();
    S.jackLocked=0; S.combatActive=false; S.mapRot=0;
    S.fort=normalized;
    for(const n of S.fort.datawallNodes) S.wallStr[key(n.x,n.y)]=S.fort.datawallStr;
    for(const d of S.fort.defenses){
      const c=d.coord; const p=d.program||{};
      S.iceStr[key(c.x,c.y)]=Number(p.strength||p.str)||4;
    }
    buildGrid();
    S.runner=findSpawn();
    S.turn=0;
    if(typeof revealAround==='function') revealAround(S.runner.x,S.runner.y);
    updateRunnerBars();
    startTurn();
    if(S.fort.ai && typeof aiMsg==='function') aiMsg('AI',S.fort.ai.personality||'Resident process watching.');
    log('Loaded: '+S.fort.name,'ok');
    log(`Datawall STR ${S.fort.datawallStr} · ${S.fort.codegates.length} gates · ${S.fort.defenses.length} ICE`,'info');
    if(S.scene) S.scene.rebuildMap();
    updateHUD();
    return true;
  }catch(e){
    console.error('loadFort runtime error',e);
    restoreFortRuntime(previous);
    log('Fort load failed during initialization: '+e.message,'bad');
    return false;
  }
}

window.validateFort = validateFort; window.normalizeFort = normalizeFort;
window.buildGrid = buildGrid; window.findSpawn = findSpawn;
window.cellAt = cellAt; window.neighbors4 = neighbors4;
window.tickBuffs = tickBuffs; window.startTurn = startTurn;
window.updateHUD = updateHUD; window.spendAction = spendAction;
window.loadFort = loadFort;
window.loadSampleFort = loadSampleFort;
window.importFortFile = importFortFile;
window.enterStoredFort = enterStoredFort;
window.readFortFile = readFortFile;
window.revealAround=revealAround;
window.isOpaqueTile=isOpaqueTile;
window.isExplored=isExplored;
window.ensureExplored=ensureExplored;
window.revealAll=revealAll;
