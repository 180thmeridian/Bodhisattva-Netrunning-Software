/* combat.js — movement, programs, damage, ICE AI */
function tryMove(dx,dy){
  if(!S.fort) return;
  if(S._moving) return;
  // map WASD to logical under rotation
  const tr=screenDirToLogical(dx,dy); dx=tr.dx; dy=tr.dy;
  if(S.flatlined){log('FLATLINED — no signal.','bad');return}
  if(S.stunned){log('Stunned — make recovery save next turn.','bad');return}
  if(S.wounds>=17||nr().int<=0){log('Incapacitated.','bad');return}
  if(S.moveLeft<=0){log('No movement left (max 5 spaces/turn).','bad');return}
  const ox=S.runner.x, oy=S.runner.y;
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
  // fog reveals immediately (real-time), before/during the step animation
  if(typeof revealAround==='function') revealAround(nx,ny);
  updateHUD();
  const tag=c.type!=='empty'?` [${c.label}]`:'';
  log(`→ (${nx},${ny})${tag} · move ${S.moveLeft}`,'sys');
  if(S.scene){
    const oldIso=S.scene.iso(ox,oy);
    const newIso=S.scene.iso(nx,ny);
    // rebuild map so FOW updates live; then tween runner from previous cell
    if(S.scene.rebuildMap) S.scene.rebuildMap();
    if(S.scene.runnerGfx){
      S._moving=true;
      S.scene.runnerGfx.setPosition(oldIso.sx, oldIso.sy-12);
      S.scene.tweens.add({
        targets:S.scene.runnerGfx,
        x:newIso.sx, y:newIso.sy-12,
        duration:120,
        ease:'Cubic.easeOut',
        onUpdate:()=>{
          if(!S.camFree && S.scene.runnerGfx){
            S.scene.cameras.main.centerOn(S.scene.runnerGfx.x, S.scene.runnerGfx.y+12);
          }
        },
        onComplete:()=>{ S._moving=false; }
      });
    } else if(!S.camFree){
      S.scene.centerCam(nx,ny);
    }
  }
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
      iceSpeak(o.c.name, 'Intruder on the subgrid. Logging path.');
      S.alarm++; updateHUD();
    }
  }
}


/* Program voice → AI channel (detection, demons, utilities that "report") */
function progSpeak(prog, text){
  const name = (prog && prog.name) ? prog.name : 'PROG';
  if(typeof aiMsg==='function') aiMsg(name.slice(0,14), text);
  else log(`[${name}] ${text}`,'info');
}
function iceSpeak(iceName, text){
  if(typeof aiMsg==='function') aiMsg(String(iceName||'ICE').slice(0,14), text);
}
function scanLocalReport(prog){
  const adj=neighbors4(S.runner.x,S.runner.y);
  const here=cellAt(S.runner.x,S.runner.y);
  const bits=[];
  if(here) bits.push(`underfoot: ${here.label||here.type}`);
  for(const o of adj){
    const c=o.c;
    if(c.type==='empty') continue;
    if(c.type==='ice') bits.push(`ICE ${c.name||c.iceName||'?'} STR${c.str} @(${o.x},${o.y})`);
    else if(c.type==='wall') bits.push(`datawall STR${c.str} @(${o.x},${o.y})`);
    else if(c.type==='gate') bits.push(`codegate STR${c.str} @(${o.x},${o.y})`);
    else bits.push(`${c.label||c.type} @(${o.x},${o.y})`);
  }
  // invisible check flavor for SeeYa-class
  const inv = S.buffs && S.buffs.invis>0;
  if(/seeya|clairvoy|looking glass|smarteye|speedtrap|hidden virtue|guest book|mouse|netspace inverter/i.test(prog.name)){
    if(inv) bits.push('cloak residual detected (self)');
  }
  if(!bits.length) bits.push('sector quiet — no hard contacts');
  return bits;
}

/** CP2020 Intrusion damage vs Data Wall after successful attack roll. */
function intrusionWallDamage(prog){
  const n = (prog && prog.name) ? String(prog.name) : '';
  if(/^Hammer$/i.test(n)) return d6()+d6();                 // 2D6
  if(/Jackhammer/i.test(n)) return d6();                    // 1D6
  if(/Pile\s*Driver/i.test(n)) return d6()+d6()+d6()+d6();  // 4D6
  if(/Sledgehammer/i.test(n)) return d6()+d6()+d6();        // 3D6
  if(/Ramming\s*Piston/i.test(n)) return d6()+d6()+d6()+d6()+d6(); // 5D6
  if(/Termite/i.test(n)) return d6();                       // 1D6
  // Parse "ND6" from program note when present
  const note = (prog && prog.note) ? String(prog.note) : '';
  const m = note.match(/(\d)\s*D\s*6/i);
  if(m){
    let t=0, k=+m[1]|0;
    for(let i=0;i<k;i++) t+=d6();
    return Math.max(1, t);
  }
  return d6();
}

/** Restore cls/str/mu/note from PROGRAM_DB when saves/imports stripped fields. */
function hydrateProgram(p){
  if(!p || !p.name) return p;
  const db = (typeof PROGRAM_DB!=='undefined' && PROGRAM_DB) ? PROGRAM_DB : (window.PROGRAM_DB||[]);
  const src = db.find(x=>x && x.name===p.name);
  if(!src) return p;
  // Always restore rules text; keep runtime mutations (str chips, slots) intact
  if(src.cls) p.cls = src.cls;
  if(src.note) p.note = src.note;
  if(p.str==null && src.str!=null) p.str = src.str;
  if(p.mu==null && src.mu!=null) p.mu = src.mu;
  if(p.cost==null && src.cost!=null) p.cost = src.cost;
  return p;
}

function runSelectedProgram(){
  if(!S.fort) return;
  if(!spendAction()) return;
  let prog=S.programs[S.selectedProg];
  if(!prog){log('No program selected.','bad');return}
  prog = hydrateProgram(prog);
  S.programs[S.selectedProg] = prog;
  // CP2020: Demon shell deploys as autonomous agent — plot route first
  if(typeof isDemon==='function' && isDemon(prog)){
    // refund menu action; planning is free, confirm spends later if desired
    S.actionLeft = 1;
    updateHUD();
    if(typeof beginDemonPlan==='function') beginDemonPlan(S.selectedProg);
    return;
  } else {
    log(`RUN ${prog.name} [${prog.cls} STR ${prog.str}]`,'info');
  }
  const deckProgRef = prog; // for One-Use consumption
  try {
  const adj=neighbors4(S.runner.x,S.runner.y);
  const walls=adj.filter(o=>o.c.type==='wall');
  const gates=adj.filter(o=>o.c.type==='gate');
  const ice=adj.filter(o=>o.c.type==='ice');
  const here=cellAt(S.runner.x,S.runner.y);
  // UI pulse on selected program row
  try{
    const rows=document.querySelectorAll('#prog-list .prog');
    if(rows[S.selectedProg]){ rows[S.selectedProg].classList.remove('run-pulse'); void rows[S.selectedProg].offsetWidth; rows[S.selectedProg].classList.add('run-pulse'); }
  }catch(_e){}
  const talkative = /Detection|Utility|Controller|Demon|Multi/i.test(prog.cls)
    || /seeya|smarteye|speedtrap|clairvoy|guest book|cartographer|igor|imp|afreet|succubus|balron|killer|manticore/i.test(prog.name);

  if(prog.cls==='Intrusion'){
    if(prog.name==='Worm'&&walls.length){
      const t=walls[0]; S.buffs.worm={x:t.x,y:t.y,turns:2};
      log(`  Worm planted on (${t.x},${t.y}) — opens in 2 turns, silent.`,'ok');
      progSpeak(prog, `Silent burrow at (${t.x},${t.y}). Two turns to open.`);
      flashFx(t.x,t.y,0x33ff66); updateRunnerBars(); return;
    }
    if(!walls.length){log('  No adjacent datawall.','bad'); progSpeak(prog,'No datawall in contact.'); return;}
    const t=walls[0]; const atk=netAttackRoll(prog.str); const def=netDefendRoll(t.c.str,true);
    log(`  Wall (${t.x},${t.y}): ${atk.detail} vs ${def.detail}`,'sys');
    if(atk.total>def.total){
      const dmg = intrusionWallDamage(prog);
      const k=key(t.x,t.y); const ns=Math.max(0,(S.wallStr[k]??t.c.str)-dmg);
      S.wallStr[k]=ns; log(`  HIT · −${dmg} STR → ${ns}`,'ok');
      if(/hammer|pile driver|ramming|sledge/i.test(prog.name)){bumpAlarm(1); log('  Loud intrusion — ALARM +1','bad'); progSpeak(prog,'That was loud. Alarm spike.');}
      else progSpeak(prog, ns<=0 ? 'Wall integrity zero. Path open.' : `Wall −${dmg}. STR ${ns}.`);
      buildGrid(); if(ns<=0) log('  DATAWALL BREACHED.','ok');
      if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0x33ff66);
    } else { log('  FAIL — wall holds.','bad'); bumpAlarm(1); progSpeak(prog,'Wall held. Pulse wasted.'); flashFx(t.x,t.y,0xff3355); }
    updateHUD(); return;
  }
  if(prog.cls==='Decryption'){
    if(!gates.length){log('  No adjacent codegate.','bad');return}
    const t=gates[0]; let pStr=prog.str; if(prog.name==="Wizard's Book") pStr=6;
    const atk=netAttackRoll(pStr); const def=netDefendRoll(t.c.str,true);
    log(`  Gate (${t.x},${t.y}): ${atk.detail} vs ${def.detail}`,'sys');
    if(atk.total>def.total){
      S.openGates.add(key(t.x,t.y)); buildGrid(); log('  CODEGATE OPEN.','ok');
      progSpeak(prog, 'Cipher locks yield. Gate is a door now.');
      if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0x33ccff);
    } else { log('  FAIL — gate holds.','bad'); bumpAlarm(1); progSpeak(prog,'Gate laughed. Try a harder book.'); flashFx(t.x,t.y,0xff3355); }
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
        progSpeak(prog, `Demon-class ${t.c.name} erased. That is what I am for.`);
        if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0xffaa33); return;
      }
      const dmg=d6(); const k=key(t.x,t.y); const ns=Math.max(0,(S.iceStr[k]??t.c.str)-dmg);
      S.iceStr[k]=ns; log(`  HIT · ${dmg} to STR → ${ns}`,'ok');
      progSpeak(prog, ns<=0 ? `${t.c.name} de-rezzed.` : `Scored ${dmg} on ${t.c.name}. STR ${ns}.`);
      if(ns<=0){ S.deadIce.add(k); buildGrid(); log(`  ${t.c.name} DE-REZZED.`,'ok');
        if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0xffaa33);
      } else { buildGrid(); if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0x33ff66); }
    } else { log('  MISS — ICE responds!','bad'); progSpeak(prog, `${t.c.name} slipped the frame.`); iceCounter(t); }
    return;
  }
  if(prog.cls==='Protection'){
    if(prog.name==='Shield'||prog.name==='Force Shield'){ S.buffs.shield=prog.name==='Force Shield'?2:1; log(`  ${prog.name} up.`,'ok'); progSpeak(prog,'Barrier lattice engaged.'); }
    else if(prog.name==='Armor'){ S.buffs.armor=3; log('  Armor online.','ok'); progSpeak(prog,'Anti-personnel padding online.'); }
    else if(/reflector/i.test(prog.name)){ S.buffs.shield=1; log(`  ${prog.name} active.`,'ok'); progSpeak(prog,'Reflect vector armed vs stun/bolt.'); }
    else if(/deckshield/i.test(prog.name)){ log(`  ${prog.name} active.`,'ok'); progSpeak(prog,'Deck data walls reinforced +3 soft.'); }
    else { S.buffs.shield=1; log(`  ${prog.name} active.`,'ok'); progSpeak(prog, `${prog.name} holding.`); }
    flashFx(S.runner.x,S.runner.y,0x33ccff); updateRunnerBars(); return;
  }
  if(prog.cls==='Evasion'){
    if(prog.name==='Invisibility'){ S.buffs.invis=3; log('  Invisibility · 3 turns.','ok'); progSpeak(prog,'Signal folded. Three turns of quiet.'); }
    else if(prog.name==='Stealth'){ S.buffs.stealth=3; log('  Stealth · 3 turns.','ok'); progSpeak(prog,'Footfalls muted on the grid.'); }
    else if(/george/i.test(prog.name)){ S.buffs.stealth=2; log(`  ${prog.name} active.`,'ok'); progSpeak(prog,'Trace difficulty spiked (+4 soft).'); }
    else if(/domino|black mask/i.test(prog.name)){ S.buffs.invis=2; log(`  ${prog.name} active.`,'ok'); progSpeak(prog,'ICON mask applied. Blend with locale.'); }
    else if(/replicator/i.test(prog.name)){ S.buffs.stealth=2; log(`  ${prog.name} active.`,'ok'); progSpeak(prog,'False signals flooding local space.'); }
    else { S.buffs.stealth=2; log(`  ${prog.name} active.`,'ok'); progSpeak(prog, `${prog.name} weaving.`); }
    flashFx(S.runner.x,S.runner.y,0xaa66ff); updateRunnerBars(); return;
  }
  
  if(prog.cls==='Demon'){
    ensureDemonSlots(prog);
    // multi-role: use best matching sub STR, else shell STR
    if(walls.length){
      const use=prog.str; // RAW: subroutines use Demon core STR
      const t=walls[0]; const atk=netAttackRoll(use); const def=netDefendRoll(t.c.str,true);
      progSpeak(prog,'Intrusion subroutine — focusing wall.');
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
      progSpeak(prog,'Decrypt subroutine — gate.');
      log(`  [Demon/Decrypt] Gate: ${atk.detail} vs ${def.detail}`,'sys');
      if(atk.total>def.total){ S.openGates.add(key(t.x,t.y)); buildGrid(); log('  CODEGATE OPEN.','ok');
        if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0xaa66ff); }
      else { log('  FAIL.','bad'); S.alarm++; }
      updateHUD(); return;
    }
    if(ice.length){
      const use=prog.str;
      const t=ice[0]; const atk=netAttackRoll(use); const def=netDefendRoll(t.c.str,true);
      progSpeak(prog,`Anti-IC subroutine — ${t.c.name}.`);
      log(`  [Demon/Anti-IC] ${t.c.name}: ${atk.detail} vs ${def.detail}`,'sys');
      if(atk.total>def.total){
        const dmg=d6(); const k=key(t.x,t.y); const ns=Math.max(0,(S.iceStr[k]??t.c.str)-dmg);
        S.iceStr[k]=ns; log(`  HIT · ${dmg} → ${ns}`,'ok');
        if(ns<=0){ S.deadIce.add(k); log(`  ${t.c.name} DE-REZZED.`,'ok'); }
        buildGrid(); if(S.scene) S.scene.rebuildMap(); flashFx(t.x,t.y,0xaa66ff);
      } else { log('  MISS — ICE responds!','bad'); iceCounter(t); }
      return;
    }
    log('  Demon has no adjacent target (wall / gate / ICE).','bad'); progSpeak(prog,'Nothing in reach. Move me.'); return;
  }

  // Detection — programs that observe and report
  if(prog.cls==='Detection' || /seeya|smarteye|speedtrap|clairvoy|looking glass|hidden virtue|guest book|mouse|netspace inverter|hunter|fetch|data raven/i.test(prog.name)){
    const bits = scanLocalReport(prog);
    log('  Scan: '+bits.join('; '),'info');
    progSpeak(prog, bits.slice(0,3).join(' · '));
    // SeeYa / Clairvoyance: chance to flag invisible ICE flavor
    if(/seeya|clairvoy|looking glass/i.test(prog.name)){
      const nearIce = neighbors4(S.runner.x,S.runner.y).filter(o=>o.c.type==='ice');
      if(nearIce.length) progSpeak(prog, `ICON match: ${nearIce.map(o=>o.c.name).join(', ')}. Threat geometry locked.`);
      else progSpeak(prog, 'No invisible signatures in adjacent subgrids.');
    }
    if(/smarteye|speedtrap/i.test(prog.name)){
      const atk = neighbors4(S.runner.x,S.runner.y).filter(o=>o.c.type==='ice' && /killer|hell|stun|zombie|sword|spazz/i.test((o.c.iceName||o.c.name||'')));
      if(atk.length) progSpeak(prog, `Attack-class ICE vector: ${atk.map(o=>o.c.name).join(', ')}.`);
      else progSpeak(prog, 'No active attack programs in 1-space radius.');
    }
    if(/guest book|mouse/i.test(prog.name)){
      progSpeak(prog, `Area log: runner@(${S.runner.x},${S.runner.y}) alarm=${S.alarm} turn=${S.turn}.`);
    }
    flashFx(S.runner.x,S.runner.y,0x33ccff);
    return;
  }

  // Utility / Controller — soft effects + chatter
  if(prog.cls==='Utility' || prog.cls==='Controller'){
    if(/cartographer/i.test(prog.name) && S.fort){
      const f=S.fort;
      progSpeak(prog, `Map sketch: ${f.columns}×${f.rows} · INT ${f.int} · defenses ${(f.defenses||[]).length}.`);
      log('  Cartographer updates local fort sketch.','ok');
    } else if(/instant replay/i.test(prog.name)){
      progSpeak(prog, `Replay buffer: last loc (${S.runner.x},${S.runner.y}) · moveLeft ${S.moveLeft}.`);
    } else if(/netmap/i.test(prog.name)){
      progSpeak(prog, 'Regional NetMap routine online — open NETMAP for full grid.');
      if(typeof openNetMap==='function') setTimeout(()=>openNetMap(), 200);
    } else if(/phone home/i.test(prog.name)){
      progSpeak(prog, 'External line open. No answering icon.');
    } else if(/news at/i.test(prog.name)){
      progSpeak(prog, 'Screamsheet ping: markets jitter · Netwatch quiet in this sector.');
    } else if(/databaser|file/i.test(prog.name)){
      progSpeak(prog, here && here.type==='mu' ? `Reading MU node ${here.label}.` : 'No MU/file node underfoot.');
    } else if(/crystal ball|viddy|soundmachine|genie|hotwire|terminator|dee-2/i.test(prog.name)){
      progSpeak(prog, `Control handshake… ${here && here.type==='remote' ? 'remote socket accepts.' : 'no remote in cell.'}`);
    } else if(/re-rezz/i.test(prog.name)){
      progSpeak(prog, 'Repair subroutine ready — target a crashed process next action.');
    } else if(/padlock|alias|backup|gate.?master/i.test(prog.name)){
      progSpeak(prog, `${prog.name} routine armed.`);
    } else {
      progSpeak(prog, `${prog.name} executes. Soft utility pulse.`);
    }
    flashFx(S.runner.x,S.runner.y,0x88aa66);
    return;
  }

  // Multi / special
  if(prog.cls==='Multi'){
    if(/igor/i.test(prog.name)){
      const bits=scanLocalReport(prog);
      progSpeak(prog, 'Flunky online. '+bits[0]);
      progSpeak(prog, 'Standing by for next order, boss.');
    } else if(/dummy/i.test(prog.name)){
      progSpeak(prog, 'Decoy ICON spun. Looking harmless.');
    } else if(/scribe/i.test(prog.name)){
      progSpeak(prog, 'Ready to disassemble a captured process.');
    } else if(/black sky/i.test(prog.name)){
      progSpeak(prog, 'Storm cloud forming. Lightning will seek hostile code.');
    } else if(/evil twin/i.test(prog.name)){
      progSpeak(prog, 'Mirror process up — shield/krash hybrid.');
    } else if(/omnivore|wolfpack|lightning bug/i.test(prog.name)){
      progSpeak(prog, `${prog.name} hungers. Point me at ICE.`);
      // try attack if ice adjacent
      if(ice.length){
        const t=ice[0]; const atk=netAttackRoll(prog.str); const def=netDefendRoll(t.c.str,true);
        log(`  ${t.c.name}: ${atk.detail} vs ${def.detail}`,'sys');
        if(atk.total>def.total){
          const dmg=d6(); const k=key(t.x,t.y); const ns=Math.max(0,(S.iceStr[k]??t.c.str)-dmg);
          S.iceStr[k]=ns; log(`  HIT · ${dmg} → ${ns}`,'ok');
          progSpeak(prog, `Bit into ${t.c.name}. STR now ${ns}.`);
          if(ns<=0){ S.deadIce.add(k); buildGrid(); log(`  ${t.c.name} DE-REZZED.`,'ok'); progSpeak(prog,'Target de-rezzed.'); }
          buildGrid(); if(S.scene) S.scene.rebuildMap();
        } else { log('  MISS','bad'); progSpeak(prog,'Missed. It looked back.'); iceCounter(t); }
        return;
      }
    } else {
      progSpeak(prog, `${prog.name} online.`);
    }
    flashFx(S.runner.x,S.runner.y,0xaa88ff);
    return;
  }

  if(here&&(here.type==='mu'||here.type==='cpu'||here.type==='remote')){
    log(`  ${prog.name} probes ${here.label}.`,'info');
    progSpeak(prog, `Probing ${here.label}… handshake partial.`);
    return;
  }
  log('  No valid target for this Class.','bad');
  if(talkative) progSpeak(prog, 'No valid target in contact. Reposition.');
  } finally {
    if(typeof consumeProgramAfterUse==='function') consumeProgramAfterUse(deckProgRef);
    if(typeof lotfOnProgramRun==='function') lotfOnProgramRun(deckProgRef);
  }
}



const HOLLYWOOD_FX = [
  'Screams, windmills arms, falls.',
  'Crumples like a rag doll.',
  'Spins around in place, falls.',
  'Clutches wound, staggers and falls.',
  'Stares stupidly at wound, then falls.',
  'Slumps to ground, moaning.',
];

/** CP2020 Stun/Shock Save: roll 1D10 ≤ Body Type + wound penalty. Fail → out of combat. */
function makeStunSave(reason){
  const bt = (typeof bodyTypeStat==='function') ? bodyTypeStat() : 5;
  const lvl = (typeof woundLevel==='function') ? woundLevel(S.wounds|0) : {mod:0,name:'?'};
  const target = bt + (lvl.mod||0); // mod is negative
  const roll = d10();
  const ok = roll <= target;
  if(ok){
    log(`  Stun Save OK — 1D10=${roll} ≤ BT ${bt}${lvl.mod||0} (need ≤${target}) · ${lvl.name}`,'ok');
    return true;
  }
  const fx = HOLLYWOOD_FX[(roll-1)%HOLLYWOOD_FX.length];
  log(`  Stun Save FAIL — 1D10=${roll} vs ≤${target} (BT ${bt}${lvl.mod||0}) · ${lvl.name}`,'bad');
  log(`  → ${fx}`,'bad');
  if(typeof aiMsg==='function') aiMsg('STUN', reason || fx);
  S.stunned = true;
  S.moveLeft = 0;
  S.actionLeft = 0;
  return false;
}

/** CP2020 Death Save (Mortal only): 1D10 ≤ Body Type − mortal level. Fail → flatline end of turn. */
function makeDeathSave(){
  const bt = (typeof bodyTypeStat==='function') ? bodyTypeStat() : 5;
  const lvl = (typeof woundLevel==='function') ? woundLevel(S.wounds|0) : {mortal:false,mortalLvl:0,name:'?'};
  if(!lvl.mortal) return true;
  if(S.stabilized) return true;
  const mort = lvl.mortalLvl|0;
  const target = bt - mort;
  const roll = d10();
  const ok = roll <= target;
  if(ok){
    log(`  Death Save OK — 1D10=${roll} ≤ ${target} (BT ${bt} − Mortal ${mort})`,'ok');
    return true;
  }
  log(`  Death Save FAIL — 1D10=${roll} vs ≤${target} (BT ${bt} − Mortal ${mort})`,'bad');
  log(`  FLATLINE — neural link collapsing.`,'bad');
  if(typeof aiMsg==='function') aiMsg('DEATH', 'Flatline signal.');
  S.flatlined = true;
  S.stunned = true;
  S.moveLeft = 0;
  S.actionLeft = 0;
  if(!S._flatlineShown && typeof triggerFlatlineSequence==='function'){
    S._flatlineShown = true;
    setTimeout(()=>triggerFlatlineSequence(), 600);
  }
  return false;
}

/** Attempt to recover from stun at start of turn (one Stun Save). */
function tryStunRecovery(){
  if(!S.stunned || S.flatlined) return;
  const bt = (typeof bodyTypeStat==='function') ? bodyTypeStat() : 5;
  const lvl = (typeof woundLevel==='function') ? woundLevel(S.wounds|0) : {mod:0,name:'?'};
  const target = bt + (lvl.mod||0);
  const roll = d10();
  if(roll <= target){
    S.stunned = false;
    log(`  Stun recovery OK — 1D10=${roll} ≤ ${target}. Back online.`,'ok');
    if(typeof aiMsg==='function') aiMsg('STUN', 'Conscious again.');
  } else {
    log(`  Still stunned — 1D10=${roll} vs ≤${target}. No actions this turn.`,'bad');
    S.moveLeft = 0;
    S.actionLeft = 0;
  }
}


/** Programs that forcibly sever the link (Jack Attack, some anti-personnel dumps). */
function bumpAlarm(n){
  const prev = S.alarm|0;
  S.alarm = prev + (n|0);
  if(typeof lotfOnAlarmRise==='function') lotfOnAlarmRise(prev, S.alarm);
  if(typeof updateHUD==='function') updateHUD();
}
function forceJackout(reason){
  log(`  FORCED LOG-OFF — ${reason||'link severed'}`,'bad');
  if(typeof aiMsg==='function') aiMsg('SYS', 'Connection dropped.');
  S.jackLocked = 0;
  S.fort=null; S.grid=null; S.combatActive=false;
  S.activeDemons=[]; S.demonPlan=null;
  if(typeof updateHUD==='function') updateHUD();
  if(S.scene && S.scene.showPlaceholder) S.scene.showPlaceholder();
  if(typeof flashTurnBanner==='function') flashTurnBanner(null, 'JACKED OUT');
}
function isDumpProgram(name){
  return /jack.?attack|jackattack|dump|log.?off|kick|boot.*out/i.test(name||'');
}
/** Screen-space pain feedback: red flash + shake + CRT glitch by severity. */
function screenDamageFx(amount, kind){
  const dmg = Math.max(0, amount|0);
  // intensity tiers: light 1-3 · medium 4-7 · heavy 8+
  let tier = 'light';
  if(dmg >= 8 || kind==='int' && dmg>=3) tier = 'heavy';
  else if(dmg >= 4 || kind==='int') tier = 'medium';
  const shell = document.getElementById('shell') || document.body;
  const glitch = document.getElementById('crt-glitch');
  const fx = document.getElementById('fx-layer');
  // red flash overlay
  let flash = document.getElementById('dmg-flash');
  if(!flash){
    flash = document.createElement('div');
    flash.id = 'dmg-flash';
    flash.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1200;opacity:0;background:radial-gradient(ellipse at center,rgba(255,40,60,.55)0%,rgba(120,0,20,.25)55%,transparent 75%);transition:opacity .08s linear';
    document.body.appendChild(flash);
  }
  const opacity = tier==='heavy' ? 0.85 : (tier==='medium' ? 0.55 : 0.32);
  flash.style.opacity = String(opacity);
  // shake
  const shakeClass = tier==='heavy' ? 'dmg-shake-heavy' : (tier==='medium' ? 'dmg-shake-med' : 'dmg-shake-light');
  shell.classList.remove('dmg-shake-light','dmg-shake-med','dmg-shake-heavy');
  void shell.offsetWidth;
  shell.classList.add(shakeClass);
  // CRT glitch pulse
  if(glitch){
    const gOp = tier==='heavy' ? 0.55 : (tier==='medium' ? 0.32 : 0.15);
    glitch.style.transition = 'opacity .05s linear';
    glitch.style.opacity = String(gOp);
    if(tier==='heavy'){
      glitch.style.animation = 'dmg-glitch-skew .35s steps(2) 2';
    } else if(tier==='medium'){
      glitch.style.animation = 'dmg-glitch-skew .28s steps(2) 1';
    } else {
      glitch.style.animation = 'none';
    }
  }
  // sparks
  if(typeof spawnCssSparks==='function'){
    spawnCssSparks(tier==='heavy'?18:(tier==='medium'?10:5), '#ff3355');
  } else if(fx){
    for(let i=0;i<(tier==='heavy'?12:6);i++){
      const s=document.createElement('div');
      s.className='fx-spark';
      s.style.background='#ff3355';
      s.style.boxShadow='0 0 10px #ff3355';
      s.style.left=(15+Math.random()*70)+'%';
      s.style.top=(20+Math.random()*60)+'%';
      fx.appendChild(s);
      setTimeout(()=>s.remove(), 650);
    }
  }
  const clearMs = tier==='heavy' ? 520 : (tier==='medium' ? 380 : 260);
  setTimeout(()=>{
    flash.style.opacity = '0';
    shell.classList.remove('dmg-shake-light','dmg-shake-med','dmg-shake-heavy');
    if(glitch){
      glitch.style.opacity = '0';
      glitch.style.animation = 'none';
    }
  }, clearMs);
}


/** Lower the runner's INT characteristic (profile + DOM). Returns new INT. */
function reduceRunnerInt(amount){
  const dmg = Math.max(0, amount|0);
  if(dmg<=0) return (typeof nr==='function' ? nr().int : 5)|0;
  let cur = 5;
  if(S.profile && typeof S.profile.int==='number'){
    if(S.profile.intBase==null) S.profile.intBase = S.profile.int;
    S.profile.int = (S.profile.int|0) - dmg;
    cur = S.profile.int;
  } else {
    const el = document.getElementById('nr-int');
    cur = el ? (+el.value||5) - dmg : 5 - dmg;
  }
  // sync DOM / readout
  const setVal=(id,val)=>{ const el=document.getElementById(id); if(el) el.value=val; };
  const setText=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=String(val); };
  setVal('nr-int', cur);
  setText('nr-int-ro', cur);
  if(S.profile) S.profile.int = cur;
  // persist scar on character
  if(S.profile){
    S.profile.intLost = (S.profile.intLost|0) + dmg;
  }
  if(typeof persistActiveProfile==='function') persistActiveProfile();
  if(typeof maybeIntThemeShift==='function') maybeIntThemeShift(false);
  if(typeof updateIntTraumaFx==='function') updateIntTraumaFx();
  return cur;
}
function killRunnerFromInt(){
  S.flatlined = true;
  S.stunned = true;
  if((S.wounds|0) < 17) S.wounds = 17;
  if(typeof log==='function') log('FLATLINE — INT destroyed. Netrunner dead.','bad');
  if(typeof aiMsg==='function') aiMsg('SYS', 'No cortical response. Line is a corpse.');
  if(typeof updateRunnerBars==='function') updateRunnerBars();
  if(typeof updateHUD==='function') updateHUD();
  if(typeof screenDamageFx==='function') screenDamageFx(12, 'int');
}

function applyDamage(amount, kind){
  if(S.buffs.shield>0){ S.buffs.shield--; log('  Shield absorbs the hit!','ok'); updateRunnerBars(); return; }
  let dmg=Math.max(0, amount|0);
  if(S.buffs.armor>0){ const before=dmg; dmg=Math.max(0,dmg-3); S.buffs.armor--; log(`  Armor softens ${before} → ${dmg}.`,'info'); }
  if(kind==='int'){
    // INT damage lowers the INT characteristic itself
    const before = (typeof nr==='function' ? nr().int : 5)|0;
    S.intDmg = (S.intDmg|0) + dmg;
    const after = reduceRunnerInt(dmg);
    log(`  INT damage −${dmg}  (${before} → ${after})`,'bad');
    if(typeof aiMsg==='function') aiMsg('DMG', `INT ${before}→${after}`);
    if(after<=0){
      log('  INT ≤ 0 — cortical collapse. You die in the chair.','bad');
      killRunnerFromInt();
    }
  } else {
    // CP2020: BTM reduces each wound hit; minimum 1 if any damage gets through
    const btm = (typeof S.btm==='number') ? S.btm : (S.profile && typeof S.profile.btm==='number' ? S.profile.btm : -2);
    const raw=dmg;
    if(dmg>0){
      dmg = dmg + btm; // btm is negative
      if(dmg<1) dmg=1;
    }
    S.wounds += dmg;
    const lvl = (typeof woundLevel==='function') ? woundLevel(S.wounds) : {name:'?', mod:0};
    log(`  Wound hit ${raw} · BTM ${btm} → +${dmg}  (total ${S.wounds} · ${lvl.name})`,'bad');
    if(typeof aiMsg==='function') aiMsg('DMG', `Body +${dmg} (${lvl.name}) · Σ${S.wounds}`);
    // CP2020 Stun/Shock Save every time damage is taken (core p.104)
    if(dmg>0){
      makeStunSave('Wound shock');
      // Mortal track → immediate Death Save (and every turn while untreated)
      if(lvl.mortal && !S.stabilized){
        makeDeathSave();
      } else if(lvl.mortal){
        log('  Mortal wound — stabilized; no Death Save this hit.','info');
      } else if(S.wounds>=9){
        log('  CRITICAL wounds — Stun penalties apply.','bad');
      }
    }
  }
  updateRunnerBars();
  flashFx(S.runner.x,S.runner.y,0xff3355);
  if(dmg>0) screenDamageFx(dmg, kind||'wound');
}

function iceCounterApplyAntiPerson(t, name, mitigated){
  const scale = mitigated ? 0.35 : 1;
  const soft = (n)=>{
    const v = Math.floor((+n||0) * scale);
    return mitigated ? Math.max(0, v) : Math.max(0, +n||0);
  };
  const n = String(name||'').toLowerCase();
  // Hellhound family — physical wounds
  if(/hellhound|werewolf|mastiff|fatal\s*attractor|cerebus/.test(n)){
    const a=d6(), b=d6();
    const raw=a+b, dmg=soft(raw);
    log(`  ${t.c.name} fangs: 2D6 = ${a}+${b} = ${raw}`+(mitigated?` · QTE soft ${dmg}`:'') ,'bad');
    if(typeof iceSpeak==='function') iceSpeak(t.c.name, mitigated?'Signal slipped…':'Flesh. Through the wire.');
    if(dmg>0) applyDamage(dmg,'wound');
    else log('  QTE nullified the bite.','ok');
  }
  // Bolts / fire — physical
  else if(/hellbolt|firestarter|cinderella|homewrecker|bolter|data\s*darts|sword|neural\s*blade/.test(n)){
    let dice=1;
    if(/bolter/.test(n)) dice=4;
    else if(/data\s*darts/.test(n)) dice=3;
    let raw=0; const parts=[];
    for(let i=0;i<dice;i++){ const v=d6(); parts.push(v); raw+=v; }
    const dmg=soft(raw);
    log(`  ${t.c.name}: ${dice}D6 = ${parts.join('+')} = ${raw}`+(mitigated?` → ${dmg}`:'')+'.','bad');
    if(dmg>0) applyDamage(dmg,'wound');
  }
  // Zombie / Brainwipe / Code Corpse / Cortical Scrub — INT damage
  else if(/brainwipe|zombie|code\s*corpse|cortical\s*scrub|flatline/.test(n)){
    const a=d6(); const dmg=soft(a);
    log(`  Neural shred ${a}`+(mitigated?` → ${dmg}`:'')+' INT.','bad');
    if(typeof iceSpeak==='function') iceSpeak(t.c.name, mitigated?'Echoes only…':'Forebrain. Open.');
    if(dmg>0) applyDamage(dmg,'int');
  }
  // Liche — INT + memory overwrite (junk/corrupt saves)
  else if(/liche/.test(n)){
    const a=d6(); const dmg=soft(a);
    log(`  Liche grip: 1D6 = ${a}`+(mitigated?` → ${dmg}`:'')+' INT. Selective memory burn.','bad');
    if(typeof iceSpeak==='function') iceSpeak(t.c.name, mitigated?'The crown slips…':'Your past is mine.');
    if(dmg>0) applyDamage(dmg,'int');
    if(!mitigated && typeof licheMemoryCorrupt==='function') licheMemoryCorrupt();
    else if(mitigated) log('  QTE — memory overwrite aborted.','ok');
  }
  else if(/jack.?attack/.test(n)){
    if(mitigated){
      log('  QTE — Jack Attack partially held; brief lock only.','info');
      S.jackLocked=Math.max(S.jackLocked|0, 1+Math.floor(Math.random()*2));
    } else if(typeof forceJackout==='function'){
      forceJackout((t.c.name||'ICE')+' · Jack Attack');
      return;
    } else {
      S.jackLocked=d6(); log(`  Locked out of menu actions for ${S.jackLocked} turns.`,'bad');
    }
  }
  else if(/stun|glue|knockout|spazz|shockr|tko|red-?out|stationery|ball and chain|pepe|psychodrome|threat|audio virus/.test(n)){
    let lock=d6();
    if(mitigated) lock=Math.max(1, Math.floor(lock*0.5));
    S.jackLocked=lock; log(`  Locked out of menu actions for ${S.jackLocked} turns.`,'bad');
    if(/knockout|psychodrome|tko/.test(n) && !mitigated){
      log('  Consciousness fragmenting — dump risk.','bad');
      applyDamage(soft(d6()),'int');
    }
  } else {
    const a=d6(); const dmg=soft(a);
    if(dmg>0) applyDamage(dmg,'wound');
    else log('  QTE scrubbed the residual spike.','ok');
  }
}
async function iceCounterBlackIceQTE(t, name, dispName){
  let mitigated=false;
  try{
    const r=await qteBlackIceDefense(dispName);
    mitigated=!!(r&&r.mitigated);
  }catch(_e){ mitigated=false; }
  iceCounterApplyAntiPerson(t, name, mitigated);
}

function iceCounter(t){
  const name=(t.c.iceName||t.c.name||'').toLowerCase();
  const dispName = t.c.name||t.c.iceName||'ICE';
  // Anti-personnel / black ICE that hits the body or mind
  if(/hellhound|hellbolt|stun|brainwipe|zombie|liche|code\s*corpse|cortical|spazz|glue|knockout|firestarter|jack.?attack|hell|bloodhound|killer iv|cerebus|flatline|werewolf|mastiff|bolter|sword|neural|data\s*darts|pepe|psychodrome|red-?out|stationery|shockr|tko|threat|audio|cinderella|homewrecker|fatal/.test(name)){
    const atk=netDefendRoll(t.c.str,true); // ICE attacks with fort INT
    const def=netAttackRoll(deck().dw); // defend with Data Wall program STR as stand-in + INT+IF
    log(`  ${t.c.name} strikes: ${atk.detail} vs DataWall ${def.detail}`,'sys');
    if(atk.total>def.total){
      // Black ICE / lethal anti-personnel → QTE before damage
      const isBlack = (typeof qteIsBlackIce==='function') ? qteIsBlackIce(name) : /hellhound|hellbolt|brainwipe|zombie|liche|firestarter|jack|bloodhound|cerebus|flatline|code\s*corpse|cortical/i.test(name);
      if(isBlack && typeof qteBlackIceDefense==='function'){
        iceCounterBlackIceQTE(t, name, dispName);
        return;
      }
      iceCounterApplyAntiPerson(t, name, false);
    } else {
      log('  Deck data walls hold.','ok');
      if(typeof iceSpeak==='function') iceSpeak(t.c.name, 'Blocked. For now.');
    }
  } else if(/killer|manticore|hydra|dragon|aardvark/.test(name)){
    if(!S.programs.length) return;
    // Assassins prefer Demon-class programs
    let pool=S.programs;
    if(/manticore|hydra|dragon|manifactor/i.test(name)){
      const demons=S.programs.filter(p=>typeof isDemon==='function'&&isDemon(p));
      if(demons.length) pool=demons;
    }
    const victim=pool[Math.floor(Math.random()*pool.length)];
    const atk=netDefendRoll(t.c.str,true); const def=netAttackRoll(victim.str);
    log(`  ${t.c.name} vs ${victim.name}: ${atk.detail} vs ${def.detail}`,'sys');
    if(atk.total>def.total){
      const dmg=d6(); victim.str=Math.max(0,victim.str-dmg);
      log(`  ${victim.name} STR −${dmg} → ${victim.str}`,'bad');
      if(victim.str<=0){
        log(`  ${victim.name} DE-REZZED from deck!`,'bad');
        const vi=S.programs.indexOf(victim);
        if(vi>=0 && typeof isDemon==='function' && isDemon(victim) && typeof destroyDemonAt==='function'){
          destroyDemonAt(vi);
        } else {
          S.programs=S.programs.filter(p=>p!==victim);
          if(S.selectedProg>=S.programs.length) S.selectedProg=Math.max(0,S.programs.length-1);
          renderPrograms();
        }
      }
      renderPrograms();
    } else log('  Your program holds.','ok');
  } else {
    bumpAlarm(1); log(`  ${t.c.name} raises ALARM (+1).`,'bad'); updateHUD();
  }
}
function iceCanChase(name, prog){
  if(/hellhound|bloodhound|pit.?bull|cerebus/i.test(name||'')) return true;
  if(prog && typeof hasTrace==='function' && hasTrace(prog)) return true;
  if(prog && typeof programHasOption==='function' && programHasOption(prog,'Trace')) return true;
  return false;
}
function iceHasTrace(iceObj){
  const d = iceObj.d || iceObj;
  const prog = (d && d.program) || iceObj.program || {};
  const name = iceObj.iceName || iceObj.name || prog.name || '';
  return iceCanChase(name, prog);
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
    if(S.buffs.invis>0 && !iceCanChase(ice.iceName||ice.name, (ice.d&&ice.d.program)||{})){
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
      const prog = (ice.d && ice.d.program) || {};
      const chase = iceCanChase(ice.iceName||ice.name, prog);
      const useTrace = chase || (typeof hasTrace==='function' && hasTrace(prog));
      let cx=ice.x, cy=ice.y;
      let steps=0;
      const maxSteps = useTrace ? 5 : 3;
      let route = null;
      if(useTrace && typeof pathfindBFS==='function'){
        route = pathfindBFS(cx, cy, rx, ry, {canBreak:false});
      }
      while(steps<maxSteps){
        let nx=cx, ny=cy;
        if(route && route.length>1){
          nx=route[1].x; ny=route[1].y;
          route = route.slice(1);
        } else {
          const dx=Math.sign(rx-cx), dy=Math.sign(ry-cy);
          if(Math.abs(rx-cx)>=Math.abs(ry-cy) && dx) nx=cx+dx;
          else if(dy) ny=cy+dy;
          else if(dx) nx=cx+dx;
          else break;
        }
        if(ny<0||nx<0||ny>=fort.rows||nx>=fort.columns) break;
        const dest=cellAt(nx,ny);
        let blocked = !dest || dest.type==='wall' || dest.type==='gate' || dest.type==='ice';
        if(blocked && !useTrace){
          // greedy alternate axis
          if(nx!==cx){ nx=cx; ny=cy+Math.sign(ry-cy); }
          else { ny=cy; nx=cx+Math.sign(rx-cx); }
          const dest2=cellAt(nx,ny);
          if(!dest2||dest2.type==='wall'||dest2.type==='gate'||dest2.type==='ice') break;
          blocked=false;
        }
        if(blocked) break;
        const def=fort.defenses[ice.idx];
        if(def.coord){ def.coord.x=nx; def.coord.y=ny; }
        else { def.x=nx; def.y=ny; }
        if(S.iceStr[ice.k]!==undefined){
          S.iceStr[key(nx,ny)]=S.iceStr[ice.k];
          delete S.iceStr[ice.k];
        }
        ice.k=key(nx,ny); ice.x=nx; ice.y=ny; cx=nx; cy=ny; steps++;
        if(Math.abs(cx-rx)+Math.abs(cy-ry)<=1) break;
      }
      if(steps>0){
        buildGrid();
        if(S.scene) S.scene.rebuildMap();
        log(`[ICE AI] ${ice.name} advances ${steps} → (${cx},${cy})${useTrace?' [TRACE path]':(chase?' [chase]':'')}.`,'info');
        iceSpeak(ice.name, chase?`Tracking your signal… (${cx},${cy}).`:`Reposition (${cx},${cy}). Perimeter tightens.`);
        actionsBudget--;
        // if now adjacent, attack same turn if budget
        if(Math.abs(cx-rx)+Math.abs(cy-ry)===1 && actionsBudget>0){
          const cell=cellAt(cx,cy);
          log(`[ICE AI] ${ice.name} strikes.`,'turn');
          iceSpeak(ice.name, 'Engaging intruder.');
          iceCounter({c:cell,x:cx,y:cy});
          actionsBudget--;
        }
      } else if(/watchdog|bloodhound|pit/i.test(ice.iceName||ice.name) && S.alarm>=1){
        // bark alarm only
        if(Math.random()<0.45){ bumpAlarm(1); log(`[ICE AI] ${ice.name} howls — ALARM +1`,'bad'); iceSpeak(ice.name,'ALARM — unauthorized process!'); updateHUD(); actionsBudget--; }
      }
    }
  }
}


window.progSpeak = progSpeak; window.iceSpeak = iceSpeak; window.scanLocalReport = scanLocalReport;
window.tryMove = tryMove; window.checkDetection = checkDetection;
window.runSelectedProgram = runSelectedProgram; 
/** Field stabilize (CP2020): TECH+Med+1D10 ≥ total damage points. Netrunner proxy: INT+Interface+1D10. */
function attemptStabilize(){
  if(S.flatlined){ log('Already flatlined — need Trauma Team.','bad'); return; }
  const lvl = (typeof woundLevel==='function') ? woundLevel(S.wounds|0) : {mortal:false};
  if(!lvl.mortal){ log('Not at Mortal — no Death Save risk.','info'); return; }
  if(S.stabilized){ log('Already stabilized.','ok'); return; }
  // Self-stabilize is not allowed in core book ("except the patient himself") — netrun: deck auto-med / remote
  // Allow ally-style roll using INT+Interface as Medtech proxy (solo netrunner aid software)
  const skill = (nr().int|0) + (nr().iface|0);
  const roll = d10();
  const total = skill + roll;
  const need = Math.max(1, S.wounds|0);
  if(total >= need){
    S.stabilized = true;
    log(`  Stabilize OK — ${skill}+1D10=${roll} → ${total} ≥ ${need} dmg. Bleeding contained.`,'ok');
    if(typeof aiMsg==='function') aiMsg('MED', 'Stabilized.');
  } else {
    log(`  Stabilize FAIL — ${skill}+1D10=${roll} → ${total} < ${need}. Still crashing.`,'bad');
  }
  if(typeof updateRunnerBars==='function') updateRunnerBars();
  if(typeof updateHUD==='function') updateHUD();
}

window.applyDamage = applyDamage;
window.isOneUseProgram = isOneUseProgram;
window.consumeProgramAfterUse = consumeProgramAfterUse;
window.hasEndurance = hasEndurance;
window.attemptStabilize = attemptStabilize;
window.makeStunSave = makeStunSave;
window.makeDeathSave = makeDeathSave;
window.forceJackout = forceJackout;
window.bumpAlarm = bumpAlarm;
window.isDumpProgram = isDumpProgram;
window.tryStunRecovery = tryStunRecovery;
window.iceCounter = iceCounter;
window.iceCounterApplyAntiPerson = iceCounterApplyAntiPerson;
window.iceCounterBlackIceQTE = iceCounterBlackIceQTE; window.iceCanChase = iceCanChase;
window.iceHomeKey = iceHomeKey; window.systemPhase = systemPhase;
