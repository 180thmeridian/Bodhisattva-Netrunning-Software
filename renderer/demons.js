/* demons.js — CP2020 Demon Series (core book p.144, 172–173) */
/*
  Rules summary:
  - Imp 2 / Afreet 3 / Succubus 4 / Balron 4 subroutine slots
  - Subroutines use the Demon's current Strength, not their own
  - Effective STR = base STR − number of programs currently loaded (min 1)
  - Deck Speed −1 per loaded subroutine while any Demon is carried packed
  - Subroutines are compacted (half MU) inside the shell; only shell MU counts vs deck
  - If the Demon is destroyed, all linked subroutines are destroyed with it
  - To use: activate Demon and specify which subroutine runs
*/
const DEMON_SLOTS = {
  Imp:2, 'Imp II':2,
  Afreet:3, 'Afreet II':3,
  Succubus:4, 'Succubus II':4,
  Balron:4, 'Balron II':4,
  Daemon:3, Thug:3, Vampyre:4
};

function isDemon(p){
  if(!p) return false;
  const c=String(p.cls||'').toLowerCase();
  return c==='demon' || c.includes('demon');
}
function demonSlotMax(p){
  if(!p) return 3;
  if(DEMON_SLOTS[p.name]!=null) return DEMON_SLOTS[p.name];
  // fallback by note text "carries N"
  const m=String(p.note||'').match(/carries\s+(\d+)/i);
  if(m) return +m[1];
  return 3;
}
function ensureDemonSlots(p){
  if(!isDemon(p)) return p;
  if(!Array.isArray(p.slots)) p.slots=[];
  if(typeof p.baseStr!=='number') p.baseStr = +p.str||0;
  return p;
}
/** Book: −1 STR per program on board. */
function demonCurrentStr(p){
  if(!isDemon(p)) return +p.str||0;
  ensureDemonSlots(p);
  const base = (typeof p.baseStr==='number') ? p.baseStr : (+p.str||0);
  return Math.max(1, base - p.slots.length);
}
/** MU of packed subs (half, rounded up) — informational; shell MU already paid. */
function demonPackedMu(p){
  if(!isDemon(p)) return 0;
  ensureDemonSlots(p);
  return p.slots.reduce((s,x)=>s+Math.ceil((+x.mu||0)/2),0);
}
function demonLoadedMu(p){ return demonPackedMu(p); }

function canLoadIntoDemon(demon, prog){
  if(!isDemon(demon) || !prog) return false;
  if(isDemon(prog)) return false;
  ensureDemonSlots(demon);
  if(demon.slots.length >= demonSlotMax(demon)) return false;
  return true;
}
function loadProgramIntoDemon(demonIdx, progIdx){
  if(demonIdx===progIdx) return false;
  const demon=S.programs[demonIdx];
  const prog=S.programs[progIdx];
  if(!canLoadIntoDemon(demon, prog)){
    log('Cannot load into Demon (full, not a Demon, or target is Demon).','bad');
    return false;
  }
  ensureDemonSlots(demon);
  demon.slots.push({
    name:prog.name, cls:prog.cls, str:prog.str, mu:prog.mu,
    note:prog.note||'', cost:prog.cost
  });
  S.programs.splice(progIdx,1);
  if(S.selectedProg===progIdx) S.selectedProg = demonIdx>progIdx ? demonIdx-1 : demonIdx;
  else if(S.selectedProg>progIdx) S.selectedProg--;
  const dIdx = demonIdx>progIdx ? demonIdx-1 : demonIdx;
  S.selectedProg = dIdx;
  const cur = demonCurrentStr(demon);
  log(`Loaded ${prog.name} into ${demon.name} [${demon.slots.length}/${demonSlotMax(demon)}] · Demon STR now ${cur} (base ${demon.baseStr}−${demon.slots.length})`,'ok');
  if(typeof updateDeckSpeedPenalty==='function') updateDeckSpeedPenalty();
  renderPrograms(); updateMu();
  return true;
}
function unloadFromDemon(demonIdx, slotIdx){
  const demon=S.programs[demonIdx];
  if(!isDemon(demon)) return;
  ensureDemonSlots(demon);
  if(slotIdx<0||slotIdx>=demon.slots.length) return;
  const sub=demon.slots.splice(slotIdx,1)[0];
  S.programs.push({name:sub.name, cls:sub.cls, str:sub.str, mu:sub.mu, note:sub.note||'', cost:sub.cost});
  log(`Ejected ${sub.name} from ${demon.name}. Demon STR now ${demonCurrentStr(demon)}.`,'info');
  if(demon.selectedSlot!=null && demon.selectedSlot>=demon.slots.length) demon.selectedSlot=null;
  if(typeof updateDeckSpeedPenalty==='function') updateDeckSpeedPenalty();
  renderPrograms(); updateMu();
}
/** Total Speed penalty from all carried Demons (−1 per loaded sub). */
function demonSpeedPenalty(){
  let pen=0;
  for(const p of (S.programs||[])){
    if(!isDemon(p)) continue;
    ensureDemonSlots(p);
    pen += p.slots.length;
  }
  return pen;
}
function updateDeckSpeedPenalty(){
  // reflected in deck() via demonSpeedPenalty; refresh HUD labels if present
  const el=document.getElementById('deck-spd-ro');
  const inp=document.getElementById('deck-spd');
  if(el && inp){
    const base=+inp.value||0;
    const pen=demonSpeedPenalty();
    el.textContent = pen>0 ? `${base} (−${pen} Demon)` : String(base);
  }
}
/**
 * Resolve what actually runs when player hits RUN on a Demon row.
 * Returns a pseudo-program {name,cls,str,mu,note,fromDemon} using Demon STR.
 */
function resolveDemonRun(demon){
  ensureDemonSlots(demon);
  if(!demon.slots.length){
    log(`${demon.name} is an empty shell — load subroutines first (SEL Demon, then →D on a program).`,'bad');
    return null;
  }
  let si = demon.selectedSlot;
  if(si==null || si<0 || si>=demon.slots.length){
    // single slot auto-pick; else require selection
    if(demon.slots.length===1) si=0;
    else {
      log(`Select a subroutine on ${demon.name} (click slot), then RUN.`,'info');
      return null;
    }
  }
  const sub=demon.slots[si];
  const str=demonCurrentStr(demon);
  return {
    name: sub.name,
    cls: sub.cls,
    str,
    mu: sub.mu,
    note: sub.note||'',
    fromDemon: demon.name,
    demonStr: str,
    baseStr: demon.baseStr,
    slotIndex: si
  };
}
function selectDemonSlot(demonIdx, slotIdx){
  const demon=S.programs[demonIdx];
  if(!isDemon(demon)) return;
  ensureDemonSlots(demon);
  if(slotIdx<0||slotIdx>=demon.slots.length) return;
  demon.selectedSlot = slotIdx;
  log(`${demon.name}: subroutine → ${demon.slots[slotIdx].name} (will run at STR ${demonCurrentStr(demon)})`,'sys');
  renderPrograms();
}
/** When Demon is destroyed (anti-demon ICE etc.), wipe linked subs. */
function destroyDemonAt(progIdx){
  const p=S.programs[progIdx];
  if(!isDemon(p)) return;
  ensureDemonSlots(p);
  const n=p.slots.length;
  const names=p.slots.map(s=>s.name).join(', ')||'none';
  log(`${p.name} destroyed — ${n} linked subroutine(s) lost: ${names}`,'bad');
  S.programs.splice(progIdx,1);
  if(S.selectedProg>=S.programs.length) S.selectedProg=Math.max(0,S.programs.length-1);
  if(typeof updateDeckSpeedPenalty==='function') updateDeckSpeedPenalty();
  renderPrograms(); updateMu();
}
function demonEffectiveFor(demon, cls){
  // Book: all subs fight at Demon STR (not their own)
  return demonCurrentStr(demon);
}
function demonTipExtra(p){
  if(!isDemon(p)) return '';
  ensureDemonSlots(p);
  const max=demonSlotMax(p);
  const cur=demonCurrentStr(p);
  let h=`<div class="tip-row"><span>SLOTS</span><b>${p.slots.length} / ${max}</b></div>`;
  h+=`<div class="tip-row"><span>DEMON STR</span><b>${cur}</b> <span style="color:var(--m)">(base ${p.baseStr}−${p.slots.length})</span></div>`;
  h+=`<div class="tip-row"><span>SPEED PEN</span><b>−${p.slots.length}</b></div>`;
  if(p.slots.length){
    h+='<div class="tip-body"><b style="color:var(--c)">Subroutines</b> (run at Demon STR):<br/>';
    h+=p.slots.map((s,i)=>{
      const mark = p.selectedSlot===i ? '▶ ' : '· ';
      return `${mark}${s.name} <span style="color:#5a7a5a">[${s.cls}]</span>`;
    }).join('<br/>');
    h+='</div>';
  } else {
    h+='<div class="tip-body">Empty shell — SEL this Demon, then →D on another program to load.</div>';
  }
  return h;
}

window.DEMON_SLOTS = DEMON_SLOTS;
window.isDemon = isDemon;
window.demonSlotMax = demonSlotMax;
window.ensureDemonSlots = ensureDemonSlots;
window.demonCurrentStr = demonCurrentStr;
window.demonLoadedMu = demonLoadedMu;
window.demonPackedMu = demonPackedMu;
window.canLoadIntoDemon = canLoadIntoDemon;
window.loadProgramIntoDemon = loadProgramIntoDemon;
window.unloadFromDemon = unloadFromDemon;
window.demonSpeedPenalty = demonSpeedPenalty;
window.updateDeckSpeedPenalty = updateDeckSpeedPenalty;
window.resolveDemonRun = resolveDemonRun;
window.selectDemonSlot = selectDemonSlot;
window.destroyDemonAt = destroyDemonAt;
window.demonEffectiveFor = demonEffectiveFor;
window.demonTipExtra = demonTipExtra;

/* ===== Autonomous Demon agents (separate entity from runner) ===== */
/*
  Flow: RUN a loaded Demon → enter route-plan mode → click tiles to set path →
  confirm with Enter / `demon go` → agent walks path each turn and auto-runs
  matching subroutines on walls / gates / ICE in the way.
*/

function ensureActiveDemons(){
  if(!Array.isArray(S.activeDemons)) S.activeDemons=[];
}
function isAntiDemonProgram(name){
  return /dragon|hydra|manticore|manifactor|assassin/i.test(name||'');
}
function programHasOption(prog, opt){
  if(!prog) return false;
  const needle = opt.toLowerCase();
  const o = prog.options || prog.Options || [];
  if(Array.isArray(o)){
    for(const x of o){
      const s = (typeof x==='string') ? x : (x && (x.name||x.description||'')) || '';
      if(String(s).toLowerCase().includes(needle)) return true;
    }
  } else if(typeof o==='string' && o.toLowerCase().includes(needle)) return true;
  const blob = `${prog.note||''} ${prog.description||''} ${prog.name||''}`;
  if(blob.toLowerCase().includes(needle)) return true;
  if(needle.includes('pseudo')) return /pseudo[- ]?int/i.test(blob);
  return false;
}
function iceIgnoresDemons(iceName){
  // Most watchdogs ignore autonomous shells; assassins hunt them
  if(isAntiDemonProgram(iceName)) return false;
  return /watchdog|bloodhound|pit.?bull|guest.?book|smarteye|seesya|see ya/i.test(iceName||'');
}
function iceHuntsDemons(iceName){
  return isAntiDemonProgram(iceName);
}

/** Start route planning for selected Demon. */
function beginDemonPlan(progIdx){
  ensureActiveDemons();
  const p=S.programs[progIdx];
  if(!isDemon(p)){ log('Not a Demon.','bad'); return false; }
  if(p._unobtainable || p._internal || /lord of the flies/i.test(p.name||'')){
    log('That entity cannot be deployed by a runner.','bad'); return false;
  }
  ensureDemonSlots(p);
  if(!p.slots.length){ log('Empty Demon — load subroutines first.','bad'); return false; }
  if(!S.fort||!S.runner){ log('No fort loaded.','bad'); return false; }
  if(!p._uid) p._uid = 'prog_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);
  S.demonPlan = {
    progIdx,
    progUid: p._uid,
    path: [{x:S.runner.x, y:S.runner.y, use:null, attack:false}],
    name: p.name,
    mode: 'path' // path | assign
  };
  log(`DEMON PLAN: ${p.name}`,'sys');
  log('  1) Click tiles — purple route','info');
  log('  2) demon use <sub> — attach subroutine at last waypoint','info');
  log('  3) demon attack — attack adjacent ICE/wall at last waypoint','info');
  log('  4) demon go — deploy · demon cancel — abort','info');
  log(`  Subs: ${p.slots.map(s=>s.name+'['+s.cls+']').join(', ')} · STR ${demonCurrentStr(p)}`,'info');
  if(typeof aiMsg==='function') aiMsg(p.name, 'Route mode. Purple path. Then assign actions.');
  if(S.scene && S.scene.drawDemonPlan) S.scene.drawDemonPlan();
  return true;
}
function demonPlanAddTile(x,y){
  if(!S.demonPlan) return false;
  const path=S.demonPlan.path;
  const last=path[path.length-1];
  if(last && last.x===x && last.y===y) return false;
  path.push({x,y, use:null, attack:false});
  log(`  waypoint (${x},${y}) · #${path.length-1}`,'sys');
  if(S.scene && typeof S.scene.drawDemonPlan==='function') S.scene.drawDemonPlan();
  return true;
}
function demonPlanSetUse(subName){
  if(!S.demonPlan || S.demonPlan.path.length<1){ log('No plan.','bad'); return false; }
  const p=S.programs[S.demonPlan.progIdx];
  if(!p){ log('Demon missing.','bad'); return false; }
  ensureDemonSlots(p);
  const sub = p.slots.find(s=>String(s.name).toLowerCase()===String(subName).toLowerCase())
    || p.slots.find(s=>String(s.name).toLowerCase().includes(String(subName).toLowerCase()));
  if(!sub){ log(`Sub not loaded in Demon: ${subName}`,'bad'); return false; }
  const last=S.demonPlan.path[S.demonPlan.path.length-1];
  last.use = sub.name;
  last.attack = false;
  log(`  @(${last.x},${last.y}) will RUN ${sub.name}`,'ok');
  if(S.scene && S.scene.drawDemonPlan) S.scene.drawDemonPlan();
  return true;
}
function demonPlanSetAttack(){
  if(!S.demonPlan || S.demonPlan.path.length<1){ log('No plan.','bad'); return false; }
  const last=S.demonPlan.path[S.demonPlan.path.length-1];
  last.attack = true;
  log(`  @(${last.x},${last.y}) will ATTACK adjacent target`,'ok');
  if(S.scene && S.scene.drawDemonPlan) S.scene.drawDemonPlan();
  return true;
}
function cancelDemonPlan(){
  S.demonPlan=null;
  if(S.scene && typeof S.scene.drawDemonPlan==='function') S.scene.drawDemonPlan();
  log('Demon route cancelled.','sys');
}
function findDemonProgram(ag){
  if(!ag) return null;
  // stable: by uid then name then idx
  if(ag.progUid){
    const byUid = S.programs.find(p=>p && p._uid===ag.progUid);
    if(byUid) return byUid;
  }
  if(ag.progName){
    const byName = S.programs.find(p=>p && isDemon(p) && p.name===ag.progName);
    if(byName) return byName;
  }
  if(ag.progIdx!=null && S.programs[ag.progIdx] && isDemon(S.programs[ag.progIdx])){
    return S.programs[ag.progIdx];
  }
  return null;
}
function confirmDemonPlan(){
  if(!S.demonPlan || S.demonPlan.path.length<2){
    log('Need at least one destination tile.','bad'); return false;
  }
  const progIdx=S.demonPlan.progIdx;
  const p=S.programs[progIdx];
  if(!p||!isDemon(p)){ log('Demon missing from deck.','bad'); cancelDemonPlan(); return false; }
  if(!p._uid) p._uid = 'prog_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);
  ensureActiveDemons();
  // Expand geometry from waypoints; carry action markers onto nearest expanded step
  const wps = S.demonPlan.path.map(pt=>({x:pt.x,y:pt.y,use:pt.use||null,attack:!!pt.attack}));
  let expanded=expandPathOrtho(wps);
  const traceCapable = hasTrace(p) || (p.slots||[]).some(s=>hasTrace(s));
  if(traceCapable && wps.length>=2){
    const smart=[{x:wps[0].x,y:wps[0].y}];
    for(let i=1;i<wps.length;i++){
      const seg=pathfindBFS(smart[smart.length-1].x, smart[smart.length-1].y, wps[i].x, wps[i].y, {canBreak:false});
      if(seg && seg.length>1) smart.push(...seg.slice(1));
      else smart.push({x:wps[i].x,y:wps[i].y});
    }
    expanded=smart;
    log(`  Trace pathfinding — ${expanded.length-1} steps.`,'info');
  }
  // map actions from waypoints onto expanded cells
  const actionAt = {};
  for(const wp of wps){
    if(wp.use || wp.attack) actionAt[`${wp.x},${wp.y}`] = {use:wp.use, attack:wp.attack};
  }
  const pathSteps = expanded.slice(1).map(pt=>{
    const a = actionAt[`${pt.x},${pt.y}`] || {};
    return {x:pt.x, y:pt.y, use:a.use||null, attack:!!a.attack};
  });
  // remove any existing agent for same demon (re-deploy)
  S.activeDemons = S.activeDemons.filter(a=>a.progUid!==p._uid && a.progName!==p.name);
  const agent={
    id: 'd_'+Date.now().toString(36),
    progIdx,
    progUid: p._uid,
    progName: p.name,
    name: p.name,
    x: expanded[0].x,
    y: expanded[0].y,
    path: pathSteps,
    alive: true,
    str: demonCurrentStr(p),
    chatter: true
  };
  S.activeDemons.push(agent);
  const acts = pathSteps.filter(s=>s.use||s.attack).length;
  log(`${p.name} DEPLOYED @(${agent.x},${agent.y}) · ${agent.path.length} steps · ${acts} scripted action(s).`,'ok');
  if(typeof aiMsg==='function') aiMsg(p.name, 'Shell detached. Executing plan.');
  S.demonPlan=null;
  if(S.scene && typeof S.scene.drawDemonPlan==='function') S.scene.drawDemonPlan();
  if(S.scene && typeof S.scene.drawActiveDemons==='function') S.scene.drawActiveDemons();
  return true;
}

function expandPathOrtho(pts){
  if(!pts.length) return [];
  const out=[{x:pts[0].x,y:pts[0].y}];
  for(let i=1;i<pts.length;i++){
    let cx=out[out.length-1].x, cy=out[out.length-1].y;
    const tx=pts[i].x, ty=pts[i].y;
    while(cx!==tx || cy!==ty){
      if(cx<tx) cx++;
      else if(cx>tx) cx--;
      else if(cy<ty) cy++;
      else if(cy>ty) cy--;
      out.push({x:cx,y:cy});
      if(out.length>200) break;
    }
  }
  return out;
}

/** One turn of all autonomous demons. */
function tickActiveDemons(){
  ensureActiveDemons();
  if(!S.activeDemons.length || !S.fort) return;
  const survivors=[];
  for(const ag of S.activeDemons){
    if(!ag.alive) continue;
    const p = findDemonProgram(ag);
    if(!p){
      // deck entry gone — keep agent if still has path, or retire
      log(`${ag.name} link lost (program removed from deck) — agent dissolves.`,'bad');
      continue;
    }
    // refresh idx for other systems
    ag.progIdx = S.programs.indexOf(p);
    ag.str = demonCurrentStr(p);
    // move along path up to demon speed-ish (3–5 steps)
    const maxSteps = 4;
    let steps=0;
    while(steps<maxSteps && ag.path && ag.path.length){
      const next = ag.path[0];
      const cell = cellAt(next.x, next.y);
      // if blocked, try breach with matching sub OR scripted use
      if(cell && (cell.type==='wall'||cell.type==='gate'||cell.type==='ice')){
        let ok=false;
        if(next.use){
          ok = demonAgentRunNamed(ag, p, next.x, next.y, cell, next.use);
        } else {
          ok = demonAgentBreach(ag, p, next.x, next.y, cell);
        }
        if(!ok){
          // wait on tile — do not kill agent
          log(`${ag.name} blocked at (${next.x},${next.y}) — holding.`,'info');
          break;
        }
        // re-read cell after breach
      }
      const cell2 = cellAt(next.x, next.y);
      if(cell2 && (cell2.type==='wall'||cell2.type==='gate') && !cell2.walkable){
        break;
      }
      ag.path.shift();
      ag.x = next.x; ag.y = next.y;
      steps++;
      // scripted program on this tile (non-breach)
      if(next.use){
        const c3 = cellAt(ag.x, ag.y);
        demonAgentRunNamed(ag, p, ag.x, ag.y, c3, next.use);
      }
      if(next.attack){
        demonAgentAttackAdjacent(ag, p);
      }
    }
    if(ag.chatter && Math.random()<0.2 && typeof aiMsg==='function'){
      aiMsg(ag.name, ag.path.length?`Moving (${ag.x},${ag.y})…`:`Holding (${ag.x},${ag.y}).`);
    }
    survivors.push(ag);
  }
  S.activeDemons = survivors;
  if(S.scene && typeof S.scene.drawActiveDemons==='function') S.scene.drawActiveDemons();
}

function demonAgentRunNamed(ag, demon, x, y, cell, subName){
  ensureDemonSlots(demon);
  const sub = demon.slots.find(s=>s.name===subName) || demon.slots.find(s=>String(s.name).toLowerCase().includes(String(subName).toLowerCase()));
  if(!sub){ log(`${ag.name}: ${subName} not in shell.`,'bad'); return false; }
  const cls = String(sub.cls||'').toLowerCase();
  if(cell && cell.type==='wall' && cls.includes('intrusion')){
    return demonAgentBreach(ag, demon, x, y, cell);
  }
  if(cell && cell.type==='gate' && cls.includes('decrypt')){
    return demonAgentBreach(ag, demon, x, y, cell);
  }
  if(cell && cell.type==='ice' && (cls.includes('anti')||cls.includes('killer'))){
    return demonAgentBreach(ag, demon, x, y, cell);
  }
  // generic: just announce / soft effect
  log(`${ag.name} executes ${sub.name} @(${x},${y}).`,'sys');
  if(typeof noteSelfMod==='function' && hasSelfModifying(sub)) noteSelfMod(sub.name, 'script', true);
  return true;
}
function demonAgentAttackAdjacent(ag, demon){
  ensureDemonSlots(demon);
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dx,dy] of dirs){
    const tx=ag.x+dx, ty=ag.y+dy;
    const cell=cellAt(tx,ty);
    if(!cell) continue;
    if(cell.type==='ice'||cell.type==='wall'||cell.type==='gate'){
      log(`${ag.name} attacks (${tx},${ty}) ${cell.type}.`,'sys');
      demonAgentBreach(ag, demon, tx, ty, cell);
      return true;
    }
  }
  log(`${ag.name} attack: no adjacent target.`,'info');
  return false;
}

/** Try use a subroutine matching obstacle class. */
function demonAgentBreach(ag, demon, x, y, cell){
  ensureDemonSlots(demon);
  let needCls=null;
  if(cell.type==='wall') needCls='Intrusion';
  else if(cell.type==='gate') needCls='Decryption';
  else if(cell.type==='ice') needCls='Anti-IC';
  else return false;
  const sub = demon.slots.find(s=>String(s.cls).toLowerCase().includes(needCls.toLowerCase().slice(0,5)))
    || demon.slots.find(s=>String(s.cls).toLowerCase()===needCls.toLowerCase());
  // looser match
  const sub2 = sub || demon.slots.find(s=>{
    const c=String(s.cls).toLowerCase();
    if(needCls==='Intrusion') return c.includes('intrusion');
    if(needCls==='Decryption') return c.includes('decrypt');
    if(needCls==='Anti-IC') return c.includes('anti-ic')||c.includes('antiprogram')||c.includes('anti ic');
    return false;
  });
  if(!sub2){
    log(`  [Agent ${ag.name}] no ${needCls} subroutine for ${cell.type}.`,'bad');
    return false;
  }
  const str=demonCurrentStr(demon);
  const atk=netAttackRoll(str);
  const def=netDefendRoll(cell.str,true);
  log(`  [Agent ${ag.name}] ${sub2.name} on ${cell.type} (${x},${y}): ${atk.detail} vs ${def.detail}`,'sys');
  // pseudo-intellect: small memory bonus already in netAttack via S.pseudoMem
  if(atk.total>def.total){
    if(cell.type==='wall'){
      const dmg=d6();
      const k=key(x,y);
      const ns=Math.max(0,(S.wallStr[k]??cell.str)-dmg);
      S.wallStr[k]=ns;
      log(`  HIT wall −${dmg} → ${ns}`,'ok');
      buildGrid();
      if(S.scene) S.scene.rebuildMap();
      if(ns<=0){ notePseudo(demon.name,'wall',true); return true; }
      notePseudo(demon.name,'wall',true);
      return false; // need another hit
    }
    if(cell.type==='gate'){
      S.openGates.add(key(x,y));
      buildGrid();
      if(S.scene) S.scene.rebuildMap();
      log(`  Gate opened by agent.`,'ok');
      notePseudo(demon.name,'gate',true);
      return true;
    }
    if(cell.type==='ice'){
      const dmg=d6();
      const k=key(x,y);
      const ns=Math.max(0,(S.iceStr[k]??cell.str)-dmg);
      S.iceStr[k]=ns;
      log(`  ICE ${cell.name} −${dmg} → ${ns}`,'ok');
      if(ns<=0){
        S.deadIce.add(k);
        log(`  ${cell.name} de-rezzed by agent.`,'ok');
        buildGrid(); if(S.scene) S.scene.rebuildMap();
        notePseudo(demon.name,'ice',true);
        return true;
      }
      buildGrid(); if(S.scene) S.scene.rebuildMap();
      notePseudo(demon.name,'ice',true);
      return false;
    }
  } else {
    log(`  Agent FAIL vs ${cell.type}.`,'bad');
    notePseudo(demon.name, cell.type, false);
    S.alarm++; updateHUD();
    return false;
  }
  return false;
}
function demonAgentAct(ag, demon){
  // opportunity: attack adjacent ICE with anti-ic if present
  const ice = neighbors4(ag.x,ag.y).filter(o=>o.c.type==='ice');
  if(!ice.length) return false;
  const hasAnti = demon.slots.some(s=>/anti-ic|antiprogram|anti ic/i.test(s.cls||''));
  if(!hasAnti) return false;
  // only auto-engage if path is empty or next is blocked by this ice
  if(ag.path.length) return false;
  return demonAgentBreach(ag, demon, ice[0].x, ice[0].y, ice[0].c);
}

/* ===== Pseudo-Intellect: program acts with INT 6 (Brainware Blowout) ===== */
function hasPseudoIntellect(prog){
  if(!prog) return false;
  if(typeof programHasOption==='function' && programHasOption(prog,'Pseudo-Intellect')) return true;
  if(typeof programHasOption==='function' && programHasOption(prog,'Pseudo-Int')) return true;
  return /pseudo[- ]?int/i.test(`${prog.note||''} ${prog.description||''}`);
}
/** Effective INT for a program roll: Pseudo-Intellect → 6, else fort/runner context. */
function programInt(prog, fallback){
  if(hasPseudoIntellect(prog)) return 6;
  return (fallback!=null ? fallback : 3);
}

/* ===== Self-Modifying Code: learns during the run (BB) ===== */
function hasSelfModifying(prog){
  if(!prog) return false;
  if(typeof programHasOption==='function' && programHasOption(prog,'Self-Modifying')) return true;
  return /self[- ]?modif/i.test(`${prog.note||''} ${prog.description||''} ${prog.name||''}`);
}
function noteSelfMod(name, kind, success){
  if(!S.selfModMem) S.selfModMem={};
  const m=S.selfModMem[name]||(S.selfModMem[name]={hits:0,fails:0,kinds:{},strBoost:0});
  if(success) m.hits++; else m.fails++;
  m.kinds[kind]=(m.kinds[kind]||0)+(success?1:-1);
  // occasional STR growth or crash risk (lightweight)
  if(success && m.hits>=3 && m.hits%3===0 && m.hits>m.fails){
    if(Math.random()<0.25){
      m.strBoost = Math.min(2, (m.strBoost||0)+1);
      if(typeof log==='function') log(`  ${name} Self-Modifying Code adapts (+1 STR boost, total +${m.strBoost}).`,'ok');
    }
  }
  if(!success && m.fails>=4 && Math.random()<0.15){
    if(typeof log==='function') log(`  ${name} Self-Modifying Code flickers (unstable).`,'bad');
  }
}
function selfModBonus(name){
  if(!S.selfModMem||!S.selfModMem[name]) return 0;
  return Math.min(2, S.selfModMem[name].strBoost||0);
}
// back-compat aliases
function notePseudo(name, kind, success){ noteSelfMod(name, kind, success); }
function pseudoBonus(name){ return selfModBonus(name); }

/* ===== BFS pathfinding (Trace-capable agents) ===== */
function pathfindBFS(x0,y0,x1,y1, opts){
  opts = opts||{};
  const fort=S.fort; if(!fort||!S.grid) return null;
  const canBreak = !!opts.canBreak; // treat wall/gate as costly passable for planning
  const maxNodes = (fort.rows*fort.columns)*2;
  const start=key(x0,y0), goal=key(x1,y1);
  if(start===goal) return [{x:x0,y:y0}];
  const q=[{x:x0,y:y0}];
  const prev=new Map(); prev.set(start, null);
  let qi=0;
  while(qi<q.length && qi<maxNodes){
    const cur=q[qi++];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=cur.x+dx, ny=cur.y+dy;
      if(ny<0||nx<0||ny>=fort.rows||nx>=fort.columns) continue;
      const k=key(nx,ny);
      if(prev.has(k)) continue;
      const cell=cellAt(nx,ny);
      if(!cell) continue;
      const blocked = cell.type==='wall'||cell.type==='gate'||cell.type==='ice';
      if(blocked && canBreak){
        // Trace flies / phase movement: pass walls & gates; still avoid other ICE unless goal
        if(cell.type==='ice' && !(nx===x1&&ny===y1)) continue;
      } else if(blocked){
        continue;
      } else if(cell.type==='ice' && !(nx===x1&&ny===y1)){
        continue;
      }
      prev.set(k,{x:cur.x,y:cur.y});
      if(nx===x1&&ny===y1){
        // reconstruct
        const path=[{x:nx,y:ny}];
        let p=prev.get(k);
        while(p){ path.push(p); p=prev.get(key(p.x,p.y)); }
        path.reverse();
        return path;
      }
      q.push({x:nx,y:ny});
    }
  }
  return null; // unreachable
}
function hasTrace(prog){
  if(!prog) return false;
  if(typeof programHasOption==='function' && programHasOption(prog,'Trace')) return true;
  return /\btrace\b/i.test(`${prog.note||''} ${prog.description||''} ${prog.name||''}`);
}

/* ===== Conversational Ability ===== */
const CHAT_LINES = {
  default: [
    'Channel open.',
    'Standing by.',
    'Processing…',
    'Signal nominal.',
  ],
  intrusion: ['Wall geometry locked.','Intrusion vector ready.','I can smell the datawall.'],
  decryption: ['Cipher soup. Lovely.','Gate codes spinning.','Passphrase lattice in range.'],
  detection: ['Sweeping subgrid.','Anomaly? Maybe.','Eyes open.'],
  demon: ['Shell warm.','Subs packed. Point me.','I am not the runner. I am the tool that walks.'],
  ice: ['Intruder signature.','Security posture elevated.','Do not touch the files.'],
};
function pickChat(kind){
  const arr=CHAT_LINES[kind]||CHAT_LINES.default;
  return arr[Math.floor(Math.random()*arr.length)];
}
function conversationalTick(){
  if(!S.fort) return;
  // ambient ICE with conversational option — rare
  if(Math.random()>0.12) return;
  const defs=S.fort.defenses||[];
  if(!defs.length) return;
  const d=defs[Math.floor(Math.random()*defs.length)];
  const prog=d.program||d;
  const name=prog.name||d.name||'ICE';
  if(S.deadIce && S.deadIce.has(key((d.coord||d).x,(d.coord||d).y))) return;
  const talkative = programHasOption(prog,'conversational') || /killer|hellhound|ai|black/i.test(name);
  if(!talkative && Math.random()>0.3) return;
  if(typeof iceSpeak==='function') iceSpeak(name, pickChat('ice'));
  else if(typeof aiMsg==='function') aiMsg(name, pickChat('ice'));
}
function demonConversationalTick(){
  ensureActiveDemons();
  for(const ag of S.activeDemons){
    if(Math.random()>0.2) continue;
    if(typeof aiMsg==='function') aiMsg(ag.name, pickChat('demon'));
  }
}
/** Limited keyword replies when runner talks to a program/demon via `say`. */
function conversationalReply(text){
  const t=String(text||'').toLowerCase();
  ensureActiveDemons();
  // address active demon
  for(const ag of S.activeDemons){
    if(t.includes(ag.name.toLowerCase()) || t.includes('demon') || t.includes('imp') || t.includes('afreet')){
      if(/status|where|report/.test(t)){
        return `${ag.name}: at (${ag.x},${ag.y}), ${ag.path.length} steps left, STR ${ag.str}.`;
      }
      if(/stop|halt|wait/.test(t)){
        ag.path=[];
        return `${ag.name}: path cleared. Holding position.`;
      }
      if(/go|move|continue/.test(t)){
        return `${ag.name}: executing remaining route.`;
      }
      return `${ag.name}: ${pickChat('demon')}`;
    }
  }
  if(/status|report/.test(t)) return 'Deck: '+((S.programs||[]).length)+' programs · alarm '+(S.alarm||0);
  if(/help|what/.test(t)) return 'Try: demon go · demon cancel · say <name> status';
  return null;
}

window.beginDemonPlan=beginDemonPlan;
window.demonPlanAddTile=demonPlanAddTile;
window.demonPlanSetUse=demonPlanSetUse;
window.demonPlanSetAttack=demonPlanSetAttack;
window.findDemonProgram=findDemonProgram;
window.cancelDemonPlan=cancelDemonPlan;
window.confirmDemonPlan=confirmDemonPlan;
window.tickActiveDemons=tickActiveDemons;
window.isAntiDemonProgram=isAntiDemonProgram;
window.iceHuntsDemons=iceHuntsDemons;
window.iceIgnoresDemons=iceIgnoresDemons;
window.programHasOption=programHasOption;
window.pseudoBonus=pseudoBonus;
window.notePseudo=notePseudo;
window.hasPseudoIntellect=hasPseudoIntellect;
window.programInt=programInt;
window.hasSelfModifying=hasSelfModifying;
window.noteSelfMod=noteSelfMod;
window.selfModBonus=selfModBonus;
window.pathfindBFS=pathfindBFS;
window.hasTrace=hasTrace;
window.conversationalTick=conversationalTick;
window.demonConversationalTick=demonConversationalTick;
window.conversationalReply=conversationalReply;
