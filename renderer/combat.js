/* combat.js — movement, programs, damage, ICE AI */
function tryMove(dx,dy){
  if(!S.fort) return;
  // map WASD to logical under rotation
  const tr=screenDirToLogical(dx,dy); dx=tr.dx; dy=tr.dy;
  if(S.wounds>=10||S.intDmg>=nr().int){log('Incapacitated.','bad');return}
  if(S.moveLeft<=0){log('No movement left (max 5 spaces/turn).','bad');return}
  const nx=S.runner.x+dx, ny=S.runner.y+dy;
  const c=cellAt(nx,ny);
  if(!c){log('Subgrid edge.','sys');return}
  if(!c.walkable){
    if(c.type==='gate') log('Codegate sealed — RUN Decryption while adjacent.','bad');
    else if(c.type==='wall') log('Datawall — RUN Intrusion while adjacent.','bad');
    else if(c.type==='ice') log(`${c.name} blocks — engage with Anti-IC.`,'bad');
    else log('Blocked.','bad');
    return;
  }
  S.runner.x=nx; S.runner.y=ny; S.moveLeft--;
  updateHUD();
  if(S.scene){S.scene.drawRunner(); S.scene.centerCam(nx,ny)}
  const tag=c.type!=='empty'?` [${c.label}]`:'';
  log(`→ (${nx},${ny})${tag} · move ${S.moveLeft}`,'sys');
  checkDetection();
  maybeAutoEndTurn();
}
function checkDetection(){
  if(S.buffs.invis>0||S.buffs.stealth>0){
    for(const o of neighbors4(S.runner.x,S.runner.y)){
      if(o.c.type!=='ice') continue;
      const eStr=S.buffs.invis?3:(S.buffs.stealth?4:0);
      if(o.c.str+d10()>eStr+d10()){ log(`${o.c.name} pierces your cloak!`,'bad'); S.alarm++; updateHUD(); }
    }
    return;
  }
  for(const o of neighbors4(S.runner.x,S.runner.y)){
    if(o.c.type==='ice' && /watchdog|bloodhound|pit.?bull|seer/i.test(o.c.iceName||o.c.name)){
      log(`${o.c.name} detects intrusion — ALARM +1`,'bad');
      S.alarm++; updateHUD();
    }
  }
}

function runSelectedProgram(){
  if(!S.fort) return;
  if(!spendAction()) return;
  const prog=S.programs[S.selectedProg];
  if(!prog){log('No program selected.','bad');return}
  const adj=neighbors4(S.runner.x,S.runner.y);
  const walls=adj.filter(o=>o.c.type==='wall');
  const gates=adj.filter(o=>o.c.type==='gate');
  const ice=adj.filter(o=>o.c.type==='ice');
  const here=cellAt(S.runner.x,S.runner.y);
  log(`RUN ${prog.name} [${prog.cls} STR ${prog.str}]`,'info');

  if(prog.cls==='Intrusion'){
    if(prog.name==='Worm'&&walls.length){
      const t=walls[0]; S.buffs.worm={x:t.x,y:t.y,turns:2};
      log(`  Worm planted on (${t.x},${t.y}) — opens in 2 turns, silent.`,'ok');
      flashFx(t.x,t.y,0x33ff66); updateRunnerBars(); return;
    }
    if(!walls.length){log('  No adjacent datawall.','bad');return}
    const t=walls[0]; const atk=netAttackRoll(prog.str); const def=netDefendRoll(t.c.str,true);
    log(`  Wall (${t.x},${t.y}): ${atk.detail} vs ${def.detail}`,'sys');
    if(atk.total>def.total){
      const dmg=prog.name==='Hammer'?(d6()+d6()):d6();
      const k=key(t.x,t.y); const ns=Math.max(0,(S.wallStr[k]??t.c.str)-dmg);
      S.wallStr[k]=ns; log(`  HIT · −${dmg} STR → ${ns}`,'ok');
      if(prog.name==='Hammer'){S.alarm++; log('  Hammer is noisy — ALARM +1','bad')}
      buildGrid(); if(ns<=0) log('  DATAWALL BREACHED.','ok');
      if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0x33ff66);
    } else { log('  FAIL — wall holds.','bad'); S.alarm++; flashFx(t.x,t.y,0xff3355); }
    updateHUD(); return;
  }
  if(prog.cls==='Decryption'){
    if(!gates.length){log('  No adjacent codegate.','bad');return}
    const t=gates[0]; let pStr=prog.str; if(prog.name==="Wizard's Book") pStr=6;
    const atk=netAttackRoll(pStr); const def=netDefendRoll(t.c.str,true);
    log(`  Gate (${t.x},${t.y}): ${atk.detail} vs ${def.detail}`,'sys');
    if(atk.total>def.total){
      S.openGates.add(key(t.x,t.y)); buildGrid(); log('  CODEGATE OPEN.','ok');
      if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0x33ccff);
    } else { log('  FAIL — gate holds.','bad'); S.alarm++; flashFx(t.x,t.y,0xff3355); }
    updateHUD(); return;
  }
  if(prog.cls==='Anti-IC'||prog.cls==='Anti-Personnel'){
    if(!ice.length){log('  No adjacent ICE.','bad');return}
    const t=ice[0];
    if(!S.combatActive){
      S.combatActive=true;
      const rInit=nr().ref+deck().speed+d10(); const sInit=S.fort.int+d10();
      log(`  INITIATIVE · Runner ${rInit} vs System ${sInit}`,'turn');
      log(sInit>rInit?'  System seizes tempo.':'  You seize the net-tempo.', sInit>rInit?'bad':'ok');
    }
    const atk=netAttackRoll(prog.str); const def=netDefendRoll(t.c.str,true);
    log(`  ${t.c.name}: ${atk.detail} vs ${def.detail}`,'sys');
    if(atk.total>def.total){
      // Manticore / Hydra / Dragon: instant vs Demons (RAW)
      if(/manticore|hydra|dragon/i.test(prog.name) && /demon|imp|afreet|succubus|balron|daemon/i.test(t.c.name+' '+(t.c.iceName||''))){
        const k=key(t.x,t.y); S.deadIce.add(k); buildGrid();
        log(`  ${prog.name} ASSASSINATES demon-class ${t.c.name} — DE-REZZED.`,'ok');
        if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0xffaa33); return;
      }
      const dmg=d6(); const k=key(t.x,t.y); const ns=Math.max(0,(S.iceStr[k]??t.c.str)-dmg);
      S.iceStr[k]=ns; log(`  HIT · ${dmg} to STR → ${ns}`,'ok');
      if(ns<=0){ S.deadIce.add(k); buildGrid(); log(`  ${t.c.name} DE-REZZED.`,'ok');
        if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0xffaa33);
      } else { buildGrid(); if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0x33ff66); }
    } else { log('  MISS — ICE responds!','bad'); iceCounter(t); }
    return;
  }
  if(prog.cls==='Protection'){
    if(prog.name==='Shield'||prog.name==='Force Shield'){ S.buffs.shield=prog.name==='Force Shield'?2:1; log(`  ${prog.name} up.`,'ok'); }
    else if(prog.name==='Armor'){ S.buffs.armor=3; log('  Armor online.','ok'); }
    else { S.buffs.shield=1; log(`  ${prog.name} active.`,'ok'); }
    flashFx(S.runner.x,S.runner.y,0x33ccff); updateRunnerBars(); return;
  }
  if(prog.cls==='Evasion'){
    if(prog.name==='Invisibility'){ S.buffs.invis=3; log('  Invisibility · 3 turns.','ok'); }
    else if(prog.name==='Stealth'){ S.buffs.stealth=3; log('  Stealth · 3 turns.','ok'); }
    else { S.buffs.stealth=2; log(`  ${prog.name} active.`,'ok'); }
    flashFx(S.runner.x,S.runner.y,0xaa66ff); updateRunnerBars(); return;
  }
  
  if(prog.cls==='Demon'){
    ensureDemonSlots(prog);
    // multi-role: use best matching sub STR, else shell STR
    if(walls.length){
      const use=prog.str; // RAW: subroutines use Demon core STR
      const t=walls[0]; const atk=netAttackRoll(use); const def=netDefendRoll(t.c.str,true);
      log(`  [Demon/Intrusion] Wall: ${atk.detail} vs ${def.detail}`,'sys');
      if(atk.total>def.total){
        const dmg=d6(); const k=key(t.x,t.y); const ns=Math.max(0,(S.wallStr[k]??t.c.str)-dmg);
        S.wallStr[k]=ns; log(`  HIT · −${dmg} STR → ${ns}`,'ok');
        buildGrid(); if(ns<=0) log('  DATAWALL BREACHED.','ok');
        if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0xaa66ff);
      } else { log('  FAIL.','bad'); S.alarm++; flashFx(t.x,t.y,0xff3355); }
      updateHUD(); return;
    }
    if(gates.length){
      const use=prog.str;
      const t=gates[0]; const atk=netAttackRoll(use); const def=netDefendRoll(t.c.str,true);
      log(`  [Demon/Decrypt] Gate: ${atk.detail} vs ${def.detail}`,'sys');
      if(atk.total>def.total){ S.openGates.add(key(t.x,t.y)); buildGrid(); log('  CODEGATE OPEN.','ok');
        if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0xaa66ff); }
      else { log('  FAIL.','bad'); S.alarm++; }
      updateHUD(); return;
    }
    if(ice.length){
      const use=prog.str;
      const t=ice[0]; const atk=netAttackRoll(use); const def=netDefendRoll(t.c.str,true);
      log(`  [Demon/Anti-IC] ${t.c.name}: ${atk.detail} vs ${def.detail}`,'sys');
      if(atk.total>def.total){
        const dmg=d6(); const k=key(t.x,t.y); const ns=Math.max(0,(S.iceStr[k]??t.c.str)-dmg);
        S.iceStr[k]=ns; log(`  HIT · ${dmg} → ${ns}`,'ok');
        if(ns<=0){ S.deadIce.add(k); log(`  ${t.c.name} DE-REZZED.`,'ok'); }
        buildGrid(); if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0xaa66ff);
      } else { log('  MISS — ICE responds!','bad'); iceCounter(t); }
      return;
    }
    log('  Demon has no adjacent target (wall / gate / ICE).','bad'); return;
  }

  if(here&&(here.type==='mu'||here.type==='cpu'||here.type==='remote')){
    log(`  ${prog.name} probes ${here.label}.`,'info'); return;
  }
  log('  No valid target for this Class.','bad');
}

function applyDamage(amount, kind){
  if(S.buffs.shield>0){ S.buffs.shield--; log('  Shield absorbs the hit!','ok'); updateRunnerBars(); return; }
  let dmg=amount;
  if(S.buffs.armor>0){ dmg=Math.max(0,dmg-3); S.buffs.armor--; log(`  Armor reduces to ${dmg}.`,'info'); }
  if(kind==='int'){
    S.intDmg+=dmg; log(`  INT damage +${dmg} (total ${S.intDmg}/${nr().int})`,'bad');
    if(S.intDmg>=nr().int) log('  FOREBRAIN FRIED.','bad');
  } else {
    S.wounds+=dmg; log(`  Wounds +${dmg} (total ${S.wounds})`,'bad');
    if(S.wounds>=10) log('  CRITICAL — signal collapsing.','bad');
  }
  updateRunnerBars(); flashFx(S.runner.x,S.runner.y,0xff3355);
}
function iceCounter(t){
  const name=(t.c.iceName||t.c.name||'').toLowerCase();
  if(/hellhound|hellbolt|stun|brainwipe|zombie|spazz|glue|knockout|firestarter|jack.?attack|hell/.test(name)){
    const atk=netDefendRoll(t.c.str,true); // ICE as system attacker
    const def=netAttackRoll(deck().dw); // deck wall uses runner INT+IF
    log(`  ${t.c.name} strikes: ${atk.detail} vs deckDW ${def.detail}`,'sys');
    if(atk.total>def.total){
      if(/hellhound/.test(name)) applyDamage(d10()+d10(),'wound'); // RAW Hellhound 2D10
      else if(/hellbolt|sword|firestarter/.test(name)) applyDamage(/sword/.test(name)?d6():d10(),'wound');
      else if(/brainwipe|zombie|liche/.test(name)) applyDamage(d6(),'int');
      else if(/stun|glue|knockout|spazz|jack/.test(name)){ S.jackLocked=d6(); log(`  Locked for ${S.jackLocked} turns.`,'bad'); }
      else applyDamage(d6(),'wound');
    } else log('  Deck data walls hold.','ok');
  } else if(/killer|manticore|hydra|dragon|aardvark/.test(name)){
    if(!S.programs.length) return;
    const victim=S.programs[Math.floor(rng()*S.programs.length)];
    const atk=netDefendRoll(t.c.str,true); const def=netAttackRoll(victim.str);
    log(`  ${t.c.name} vs ${victim.name}: ${atk.detail} vs ${def.detail}`,'sys');
    if(atk.total>def.total){
      const dmg=d6(); victim.str=Math.max(0,victim.str-dmg);
      log(`  ${victim.name} STR −${dmg} → ${victim.str}`,'bad');
      if(victim.str<=0){
        log(`  ${victim.name} DE-REZZED from deck!`,'bad');
        S.programs=S.programs.filter(p=>p!==victim);
        if(S.selectedProg>=S.programs.length) S.selectedProg=Math.max(0,S.programs.length-1);
      }
      renderPrograms();
    } else log('  Your program holds.','ok');
  } else {
    S.alarm++; log(`  ${t.c.name} raises ALARM (+1).`,'bad'); updateHUD();
  }
}
function iceCanChase(name){
  return /hellhound|bloodhound|pit.?bull/i.test(name||'');
}
function iceHomeKey(d){
  const c=d.coord||d; return key(c.x,c.y);
}
/** ICE AI: one action each for alerted programs. Most stay in-fort; Dog-series may step 1 outside. */
function systemPhase(){
  if(!S.fort) return;
  // process worm already in tickBuffs
  if(S.alarm<=0 && !S.combatActive) return;

  const fort=S.fort;
  const rx=S.runner.x, ry=S.runner.y;
  let actionsBudget = 1 + Math.floor((fort.cpu-1)/2); // extra action per 2 CPU

  // collect live ICE
  const live=[];
  fort.defenses.forEach((d,idx)=>{
    const c=d.coord||d; const k=key(c.x,c.y);
    if(S.deadIce.has(k)) return;
    const cell=cellAt(c.x,c.y);
    if(!cell||cell.type!=='ice') return;
    live.push({d, x:c.x, y:c.y, k, cell, name:cell.name, iceName:cell.iceName, str:cell.str, idx});
  });

  // sort: adjacent first, then by distance
  live.sort((a,b)=>{
    const da=Math.abs(a.x-rx)+Math.abs(a.y-ry);
    const db=Math.abs(b.x-rx)+Math.abs(b.y-ry);
    return da-db;
  });

  for(const ice of live){
    if(actionsBudget<=0) break;
    if(S.buffs.invis>0 && !iceCanChase(ice.iceName||ice.name)){
      // invisible: detection already handled on move
      continue;
    }
    const dist=Math.abs(ice.x-rx)+Math.abs(ice.y-ry);
    // adjacent -> attack
    if(dist===1){
      log(`[ICE AI] ${ice.name} engages from (${ice.x},${ice.y}).`,'turn');
      iceCounter({c:ice.cell, x:ice.x, y:ice.y});
      actionsBudget--;
      continue;
    }
    // alerted or combat: try to close distance (move up to 5, but one "action" = up to 5 steps in net)
    if(S.alarm>=1 || S.combatActive){
      const chase=iceCanChase(ice.iceName||ice.name);
      // path: step toward runner, stay on walkable or current ice tiles; cannot pass walls/gates closed
      let cx=ice.x, cy=ice.y;
      let steps=0;
      const maxSteps=5;
      while(steps<maxSteps){
        const dx=Math.sign(rx-cx), dy=Math.sign(ry-cy);
        // prefer axis with larger delta
        let nx=cx, ny=cy;
        if(Math.abs(rx-cx)>=Math.abs(ry-cy) && dx){ nx=cx+dx; }
        else if(dy){ ny=cy+dy; }
        else if(dx){ nx=cx+dx; }
        else break;
        // bounds
        if(ny<0||nx<0||ny>=fort.rows||nx>=fort.columns) break;
        const dest=cellAt(nx,ny);
        // ICE can move onto empty/breach/open/remote/cpu/mu; not closed wall/gate/other ice
        const blocked = !dest || dest.type==='wall' || dest.type==='gate' || dest.type==='ice';
        // outside fortress "one space outside" only for chase dogs — simplified: dogs may enter empty fringe
        if(blocked){
          // try alternate axis
          if(nx!==cx){ nx=cx; ny=cy+Math.sign(ry-cy); }
          else { ny=cy; nx=cx+Math.sign(rx-cx); }
          const dest2=cellAt(nx,ny);
          if(!dest2||dest2.type==='wall'||dest2.type==='gate'||dest2.type==='ice') break;
        }
        // move ICE: update defense coord
        const def=fort.defenses[ice.idx];
        if(def.coord){ def.coord.x=nx; def.coord.y=ny; }
        else { def.x=nx; def.y=ny; }
        // move iceStr key
        if(S.iceStr[ice.k]!==undefined){
          S.iceStr[key(nx,ny)]=S.iceStr[ice.k];
          // keep old? clear if empty
          delete S.iceStr[ice.k];
        }
        ice.k=key(nx,ny); ice.x=nx; ice.y=ny; cx=nx; cy=ny; steps++;
        if(Math.abs(cx-rx)+Math.abs(cy-ry)===1) break;
      }
      if(steps>0){
        buildGrid();
        if(S.scene) S.scene.rebuildMap();
        log(`[ICE AI] ${ice.name} advances ${steps} → (${cx},${cy})${chase?' [chase-capable]':''}.`,'info');
        actionsBudget--;
        // if now adjacent, attack same turn if budget
        if(Math.abs(cx-rx)+Math.abs(cy-ry)===1 && actionsBudget>0){
          const cell=cellAt(cx,cy);
          log(`[ICE AI] ${ice.name} strikes.`,'turn');
          iceCounter({c:cell,x:cx,y:cy});
          actionsBudget--;
        }
      } else if(/watchdog|bloodhound|pit/i.test(ice.iceName||ice.name) && S.alarm>=1){
        // bark alarm only
        if(rng()<0.35){ S.alarm++; log(`[ICE AI] ${ice.name} howls — ALARM +1`,'bad'); updateHUD(); actionsBudget--; }
      }
    }
  }
}


window.tryMove = tryMove; window.checkDetection = checkDetection;
window.runSelectedProgram = runSelectedProgram; window.applyDamage = applyDamage;
window.iceCounter = iceCounter; window.iceCanChase = iceCanChase;
window.iceHomeKey = iceHomeKey; window.systemPhase = systemPhase;
