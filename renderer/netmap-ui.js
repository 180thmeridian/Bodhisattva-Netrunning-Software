/* netmap-ui.js — LDL travel UI, menu actions, end turn */
function ldlById(id){ return LDL_DB.find(l=>l.id===id); }
function currentLdl(){ return ldlById(S.netLoc); }
window.ldlById=ldlById; window.currentLdl=currentLdl;
function ldlDist(a,b){
  // continuous map coords → net-spaces (Manhattan, rounded up)
  if(!a||!b) return 99;
  if(a.id && b.id && a.id===b.id) return 0;
  const dx=Math.abs((a.x||0)-(b.x||0)), dy=Math.abs((a.y||0)-(b.y||0));
  return Math.max(1, Math.ceil(dx + dy - 1e-9));
}
window.ldlDist=ldlDist;
function openNetMap(){
  const ov=document.getElementById('netmap-overlay');
  if(!ov) return;
  ov.classList.add('open');
  renderNetMap();
  const cv=document.getElementById('netmap-canvas');
  if(cv && !cv._netmapBound){
    cv._netmapBound=true;
    cv.addEventListener('click', e=>{
      const hit=netmapHitTest(e.clientX, e.clientY);
      if(hit) tryNetTravel(hit.id);
    });
    cv.addEventListener('mousemove', e=>{
      const hit=netmapHitTest(e.clientX, e.clientY);
      cv.style.cursor=hit?'pointer':'default';
      if(hit && typeof tipShow==='function'){
        tipShow(`<div class="tip-title">${hit.city}</div>
          <div class="tip-cls">${hit.region} LDL</div>
          <div class="tip-row"><span>SEC</span><b>${hit.sec}</b></div>
          <div class="tip-row"><span>TRACE</span><b>${hit.trace}</b></div>
          <div class="tip-body">Click to hop if within net-move range.</div>`, e.clientX, e.clientY);
      }
    });
    cv.addEventListener('mouseleave', ()=>{ if(typeof tipHide==='function') tipHide(); });
  }
  // redraw on size
  setTimeout(drawWorldNetMap, 30);
  if(!window._netmapResizeBound){
    window._netmapResizeBound=true;
    let t=null;
    window.addEventListener('resize', ()=>{
      clearTimeout(t);
      t=setTimeout(()=>{
        if(typeof invalidateNetmapCache==='function') invalidateNetmapCache();
        const ov=document.getElementById('netmap-overlay');
        if(ov && ov.classList.contains('open')) drawWorldNetMap();
      }, 120);
    });
  }
}
function closeNetMap(){
  const ov=document.getElementById('netmap-overlay');
  if(ov) ov.classList.remove('open');
}


// NetMap static layer + drawWorldNetMap → netmap.js

// netmapHitTest → netmap.js

function renderNetMap(){
  const st=document.getElementById('netmap-status');
  const grid=document.getElementById('netmap-grid');
  if(!grid) return;
  const cur=currentLdl();
  if(st) st.innerHTML = `Location: <b style="color:var(--g)">${cur?cur.city:'?'}</b> · Trace Σ <b>${S.traceTotal}</b> · Net-move left <b>${S.netMoveLeft}</b> · Clock ${typeof formatNetClock==='function'?formatNetClock():''}`;
  grid.innerHTML='';
  const sorted=[...LDL_DB].sort((a,b)=>a.city.localeCompare(b.city));
  sorted.forEach(l=>{
    const card=document.createElement('div');
    const dist=cur?ldlDist(cur,l):99;
    const here=l.id===S.netLoc;
    const inRange=!here && dist<=(S.netMoveLeft||0);
    card.className='ldl-card'+(here?' here':'')+(inRange?' range':'');
    card.innerHTML=`<div class="city">${l.city}</div>
      <div class="meta">${l.region} · SEC ${l.sec} · TRACE ${l.trace} · Δ${dist}${inRange?' · IN RANGE':''}</div>`;
    card.onclick=()=>tryNetTravel(l.id);
    if(window.CITY_GRIDS && CITY_GRIDS[l.id]){
      const b=document.createElement('button');
      b.className='cyan'; b.style.cssText='margin-top:4px;padding:2px 6px;font-size:9px';
      b.textContent='CITY GRID';
      b.onclick=e=>{e.stopPropagation(); openCityGrid(l.id);};
      card.appendChild(b);
    }
    grid.appendChild(card);
  });
  drawWorldNetMap();
  updateLocHud();
}

function updateLocHud(){
  const el=document.getElementById('st-loc');
  const tr=document.getElementById('st-trace');
  const hdr=document.getElementById('hdr-loc');
  const footCity=document.getElementById('foot-loc-city');
  const footFort=document.getElementById('foot-loc-fort');
  if(tr){
    tr.textContent=S.traceTotal||0;
    const row=document.getElementById('row-trace');
    if(row) row.style.display = (S.traceTotal>0) ? 'flex' : 'none';
  }
  const c=currentLdl();
  const city = c ? c.city : '—';
  if(el) el.textContent = city.slice(0,14);
  if(hdr) hdr.textContent = c ? (c.city + (c.region?(' · '+c.region):'')) : 'NO LDL';
  if(footCity) footCity.textContent = city;
  if(footFort){
    footFort.textContent = S.fort ? S.fort.name : 'no fort';
    footFort.title = S.fort ? (S.fort.name + ' · CPU '+(S.fort.cpu||'?')+' · INT '+(S.fort.int||'?')) : '';
  }
}
function tryNetTravel(targetId){
  if(targetId===S.netLoc){
    log('Already at this LDL.','sys');
    if(window.CITY_GRIDS && CITY_GRIDS[targetId]) openCityGrid(targetId);
    return;
  }
  const cur=currentLdl(); const tgt=ldlById(targetId);
  if(!cur||!tgt) return;
  const dist=ldlDist(cur,tgt);
  if(dist>S.netMoveLeft){
    log(`Too far (Δ${dist}). Net-move left: ${S.netMoveLeft}. End turn or LDL LINK.`,'bad');
    return;
  }
  S.netMoveLeft-=dist;
  if(!S.pathTrace || !S.pathTrace.length) S.pathTrace=[cur.id];
  S.netLoc=targetId;
  S.pathTrace.push(targetId);
  S.traceTotal+=tgt.trace;
  log(`LDL hop → ${tgt.city} (Δ${dist}) · Trace +${tgt.trace} = ${S.traceTotal}`,'ok');
  if(typeof aiMsg==='function') aiMsg('LDL',`Hop → ${tgt.city} (Δ${dist}) · Trace ${S.traceTotal}`);
  if(window.CITY_GRIDS && CITY_GRIDS[targetId]) log('City grid available — CITY GRID button on node list.','sys');
  renderNetMap();
  updateLocHud();
  if(typeof refreshClock==='function') refreshClock();
}
function doLdlLink(){
  // Menu action: spoof long distance from current LDL (security roll)
  if(S.fort){
    log('Jack out of the fortress before long-distance LDL play — or use NETMAP for local hops.','sys');
    // still allow as action in fort? book uses Menu LDL while in net generally
  }
  if(S.actionLeft!==undefined && S.fort){
    if(!spendAction()) return;
  } else if(!S.fort){
    // world mode: consume as menu-like once per turn via actionLeft if we track it
    if(S.actionLeft<=0){ log('No Menu actions left.','bad'); return; }
    S.actionLeft=Math.max(0,S.actionLeft-1);
  }
  const cur=currentLdl();
  if(!cur){ log('No LDL underfoot.','bad'); return; }
  const roll=d10();
  log(`LDL LINK at ${cur.city}: d10=${roll} vs SEC ${cur.sec}`,'sys');
  if(roll>=cur.sec){
    log('Spoof OK — free LD channel. Choose destination on NETMAP (no euro charge).','ok');
    // grant bonus hop range this turn
    S.netMoveLeft+=5;
    openNetMap();
  } else {
    log('LDL LINK failed.','bad');
    const n=d6();
    if(n<=4) log('Cut off & charged for the call.','bad');
    else if(n===5){ log('NETWATCH has your access code.','bad'); S.alarm+=2; }
    else {
      log('NetCops attempt bust!','bad');
      const b=d6();
      if(b<=2) log(`Fine: ${d6()*100} eb.`,'bad');
      else log('You slip the trace — for now.','ok');
    }
  }
  updateHUD(); updateLocHud();
refreshClock();
document.getElementById('btn-rot-cw') && (document.getElementById('btn-rot-cw').onclick=()=>rotateMap(1));
document.getElementById('btn-rot-ccw') && (document.getElementById('btn-rot-ccw').onclick=()=>rotateMap(-1));
document.getElementById('btn-rot-reset') && (document.getElementById('btn-rot-reset').onclick=()=>{ S.mapRot=0; if(S.scene) S.scene.rebuildMap(); log('Map rotation reset.','sys'); });

}
function onHellhoundTrace(){
  // called when jackout with live Hellhound somewhere
  if(!S.fort) return false;
  const hasHH=S.fort.defenses.some(d=>{
    const c=d.coord||d; if(S.deadIce.has(key(c.x,c.y))) return false;
    const n=((d.program||{}).name||d.name||'').toLowerCase();
    return /hellhound|bloodhound|pit.?bull/.test(n);
  });
  if(!hasHH) return false;
  // strongest dog rolls
  let best=0;
  S.fort.defenses.forEach(d=>{
    const c=d.coord||d; if(S.deadIce.has(key(c.x,c.y))) return;
    const n=((d.program||{}).name||d.name||'').toLowerCase();
    if(!/hellhound|bloodhound|pit/.test(n)) return;
    const str=Number((d.program||{}).strength||4);
    best=Math.max(best,str);
  });
  const roll=best+d10();
  log(`Trace attempt: Dog STR ${best}+d10=${roll} vs Trace Σ ${S.traceTotal}`,'sys');
  if(roll>=S.traceTotal && S.traceTotal>0){
    log('TRACE SUCCESS — it knows your entry LDL. Waiting next logon.','bad');
    return true;
  }
  log('Trace failed — clean signal.','ok');
  return false;
}


function doCopy(){
  if(!spendAction()) return;
  const c=cellAt(S.runner.x,S.runner.y);
  if(c&&(c.type==='mu'||c.type==='cpu')){
    const files=S.fort.files||[];
    if(files.length){ const f=files[Math.floor(Math.random()*files.length)]; S.loot.push(f);
      log(`COPY · "${f.key||f.name}" (${f.value||'?'} MU)`,'ok'); }
    else log('COPY · empty node.','sys');
  } else log('COPY · stand on MU/CPU.','sys');
}
function doRead(){
  if(!spendAction()) return;
  const c=cellAt(S.runner.x,S.runner.y);
  if(!c){log('READ · void.','sys');return}
  log(`READ · ${c.label||c.type} STR ${c.str||'—'}`,'info');
  if(c.type==='mu'||c.type==='cpu') (S.fort.files||[]).forEach(f=>log(`  · ${f.key||f.name} (${f.value} MU)`,'sys'));
}
function doErase(){ if(!spendAction()) return; log('ERASE · buffer wiped.','bad'); }
function disconnectFromFort(){
  if(!S.fort){
    log('No fortress connection is active.','sys');
    openNetMap();
    return true;
  }
  if(S.jackLocked>0){
    log(`Cannot disconnect — locked ${S.jackLocked} turn(s).`,'bad');
    return false;
  }
  try{ onHellhoundTrace(); }catch(_e){}
  if(S.loot?.length) log(`Loot: ${S.loot.map(f=>f.key||f.name).join(', ')}`,'ok');
  S.fort=null; S.grid=null; S.combatActive=false; S.activeDemons=[]; S.demonPlan=null;
  S.openGates=new Set(); S.deadIce=new Set(); S.wallStr={}; S.iceStr={};
  if(typeof updateHUD==='function') updateHUD();
  if(S.scene && typeof S.scene.showPlaceholder==='function') S.scene.showPlaceholder();
  if(typeof openNetMap==='function') openNetMap();
  log('Connection severed. Returned to the world NETMAP.','ok');
  return true;
}
function doJackout(){
  // Gameplay LOG OFF keeps the CP2020 risk roll. A separate Disconnect action is always available.
  if(!S.fort){ return disconnectFromFort(); }
  if(S.jackLocked>0){ log(`Cannot LOG OFF — locked ${S.jackLocked} turn(s).`,'bad'); return; }
  const roll=d10(); log(`LOG OFF: d10=${roll} (need ≤8)`,'sys');
  if(roll<=8) disconnectFromFort();
  else log('Jackout failed.','bad');
}
window.disconnectFromFort=disconnectFromFort;
function endTurn(auto){
  if(!S.fort) return;
  if(S._autoTimer){ clearTimeout(S._autoTimer); S._autoTimer=null; }
  if(!auto) log('Turn ended.','turn');
  bumpNetClock(1);
  startTurn();
}
function flashFx(gx,gy,color){ if(S.scene&&S.scene.flashAt) S.scene.flashAt(gx,gy,color); }





window.ldlById = ldlById; window.currentLdl = currentLdl; window.ldlDist = ldlDist;
window.openNetMap = openNetMap; window.closeNetMap = closeNetMap;
window.renderNetMap = renderNetMap; window.updateLocHud = updateLocHud;
window.tryNetTravel = tryNetTravel; window.doLdlLink = doLdlLink;
window.onHellhoundTrace = onHellhoundTrace;
window.doCopy = doCopy; window.doRead = doRead; window.doErase = doErase;
window.doJackout = doJackout; window.endTurn = endTurn; window.flashFx = flashFx;
