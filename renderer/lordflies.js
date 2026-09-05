/* lordflies.js — Hidden demon: Lord of the Flies
   Options (BB-style): Recognition, Movement, Conversational Ability,
   Auto Re-Rezz, Speed, Self-Modifying Code, Endurance, Code Optimization, Memory.
   Not obtainable by player. Copies runner stats + deck; uses non-demon programs
   to hinder evasion and anti-fly efforts. On-screen speech (not AI chat).
*/
const LOTF = {
  larvaTurnsNeeded: 4,
  flyMove: 10,
  degPerFly: 5,
  integrityMaxBase: 40,
  options: [
    'Recognition',
    'Movement Ability',
    'Conversational Ability',
    'Auto Re-Rezz',
    'Speed',
    'Self-Modifying Code',
    'Endurance',
    'Code Optimization',
    'Memory',
  ],
};

const LOTF_LINES = {
  larva: [
    '…',
    'soft signal…',
    'learning the mask…',
    'almost a face…',
  ],
  awaken: [
    'I WEAR YOUR FACE NOW.',
    'THE SWARM REMEMBERS.',
    'YOUR DECK IS MY HIVE.',
  ],
  lord: [
    'RUNNING YOUR CODE AGAINST YOU.',
    'FLIES DO NOT MISS.',
    'INTEGRITY HOLDS.',
    'YOU CANNOT OUTRUN WINGS.',
    'I KEPT YOUR SPEED. I IMPROVED IT.',
    'MEMORY: YOUR LAST MOVE.',
    'RECOGNITION: INTRUDER = SELF.',
    'ENDURANCE. I DO NOT QUIT.',
  ],
  feed: [
    'NOURISHMENT.',
    'WALLS ARE MEAT.',
    'SMALL PROGRAMS TASTE LIKE STATIC.',
  ],
  flies: [
    'RELEASE THE SWARM.',
    'WINGS IN THE WIRE.',
    '2… 5… COUNT THE EYES.',
  ],
  hit: [
    'CONTACT.',
    'INSIDE THE CHROME.',
    'DEGRADATION CLIMBS.',
  ],
  hurt: [
    'INTEGRITY FRACTURE.',
    'AUTO RE-REZZ PENDING…',
    'SELF-MODIFYING… ADAPTING.',
  ],
  rezz: [
    'AUTO RE-REZZ COMPLETE.',
    'I RETURN.',
  ],
  death: [
    '…scattered…',
    'HIVE COLLAPSE.',
  ],
};

function lotfPick(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

/** On-screen speech — never AI chat. */
function lotfSpeak(kind, forceText){
  const lines = LOTF_LINES[kind] || LOTF_LINES.lord;
  const text = forceText || lotfPick(lines);
  let el = document.getElementById('lotf-speech');
  if(!el){
    el = document.createElement('div');
    el.id = 'lotf-speech';
    (document.getElementById('game-wrap')||document.getElementById('shell')||document.body).appendChild(el);
  }
  el.textContent = text;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('on','flash');
  clearTimeout(el._hide);
  el._hide = setTimeout(()=>{
    el.classList.remove('flash');
    setTimeout(()=>el.classList.remove('on'), 400);
  }, 2200);
}

function lotfReset(){
  S.lotf = {
    phase: 'dormant', // dormant | larva | lord | dead
    copyTurns: 0,
    copied: null,
    deck: null,       // copy of runner deck stats
    arsenal: [],      // available non-demon programs
    options: LOTF.options.slice(),
    integrity: 0,
    integrityMax: LOTF.integrityMaxBase,
    flies: [],
    degradation: 0,
    nextSpawnIn: 2,
    firstContact: false,
    glitchTimer: null,
    uiInfest: false,
    _swarmTimer: null,
    rezzUsed: false,
    x: null, y: null, // map presence (lord icon)
    memory: [],       // Memory option: last runner positions
    speed: 5,         // Speed option
  };
  lotfHideUI();
}

function lotfEnsure(){
  if(!S.lotf) lotfReset();
  return S.lotf;
}

function lotfRunnerStats(){
  const n = typeof nr==='function' ? nr() : {int:5,ref:5,cool:5,iface:4};
  const btm = (typeof S.btm==='number') ? S.btm : -2;
  const body = (S.profile && S.profile.bodyType) || 'average';
  const sum = (n.int|0)+(n.ref|0)+(n.cool|0)+(n.iface|0);
  const weak = sum < 28;
  const bump = weak ? 2 : 0;
  return {
    int: Math.min(12, (n.int|0) + bump),
    ref: Math.min(12, (n.ref|0) + bump),
    cool: Math.min(12, (n.cool|0) + bump),
    iface: Math.min(12, (n.iface|0) + bump),
    btm,
    bodyType: body,
    weakCopy: weak,
    handle: (S.profile && S.profile.handle) || n.name || 'Runner',
  };
}

function lotfCopyDeck(){
  const d = typeof deck==='function' ? deck() : {speed:2,dw:4,mu:20};
  const baseSpd = (d.speedBase!=null ? d.speedBase : d.speed)|0;
  // Speed option: at least runner speed, often +1
  const speed = Math.min(8, Math.max(baseSpd, baseSpd+1, 3));
  const L = S.lotf;
  L.deck = {
    name: 'Hive-Mirror Deck',
    speed,
    dw: Math.max(2, (d.dw|0)),
    mu: Math.max(20, (d.mu|0)+4), // Code Optimization flavour: extra packed MU
    cpu: (S.profile && S.profile.deck && S.profile.deck.cpu) || 2,
  };
  L.speed = speed;
  // Arsenal: most PROGRAM_DB except Demon class
  const db = (typeof PROGRAM_DB!=='undefined' && PROGRAM_DB) ? PROGRAM_DB : [];
  L.arsenal = db
    .filter(p=>{
      const c=String(p.cls||'').toLowerCase();
      return c!=='demon' && !c.includes('demon');
    })
    .map(p=>({
      name:p.name, cls:p.cls, str:p.str, mu:p.mu, note:p.note||'',
      options:['Recognition','Movement Ability','Conversational Ability','Speed','Self-Modifying Code','Endurance','Memory'].filter(()=>Math.random()<0.3),
    }));
  // Ensure interference suite exists
  const need = ['Glue','Stun','Spazz','Invisibility','Speedtrap','Killer','Shield','SeeYa'];
  for(const name of need){
    if(!L.arsenal.some(p=>p.name===name)){
      const src = db.find(p=>p.name===name);
      if(src) L.arsenal.push({name:src.name,cls:src.cls,str:src.str,mu:src.mu,note:src.note||''});
    }
  }
}

function lotfOnAlarmRise(prev, next){
  const L = lotfEnsure();
  if(!S.fort) return;
  // Auto-spawn only when fort explicitly flags lotf / debug — not on sample maps by default
  const allowed = !!(S.fort && (S.fort.lotf || (S.fort.ai && S.fort.ai.lotf))) || !!S.debugLotf;
  if(!allowed) return;
  if(L.phase==='dormant' && next>=1){
    L.phase = 'larva';
    L.copyTurns = 0;
    L.copied = null;
    // place larva near a random CPU or center
    const fort=S.fort;
    if(fort.cpuNodes && fort.cpuNodes.length){
      const n=fort.cpuNodes[Math.floor(Math.random()*fort.cpuNodes.length)];
      L.x=n.x; L.y=n.y;
    } else {
      L.x=Math.floor(fort.columns/2); L.y=Math.floor(fort.rows/2);
    }
    log('…something stirs in the subgrid. A larval process, silent.','info');
    lotfSpeak('larva');
    if(S.scene && S.scene.rebuildMap) S.scene.rebuildMap();
  }
}

function lotfTick(){
  if(!S.fort) return;
  const L = lotfEnsure();
  if(L.phase==='dormant'){
    if((S.alarm|0)>=1) lotfOnAlarmRise(0, S.alarm);
    return;
  }
  if(L.phase==='larva'){
    L.copyTurns++;
    const snap = lotfRunnerStats();
    L.copied = snap;
    // Memory: store runner position
    if(S.runner){
      L.memory.push({x:S.runner.x,y:S.runner.y,turn:S.turn});
      if(L.memory.length>12) L.memory.shift();
    }
    log(`Larval demon samples the link… (${L.copyTurns}/${LOTF.larvaTurnsNeeded})`,'sys');
    if(snap.weakCopy && L.copyTurns===1){
      log('  Soft signal — the larva amplifies stolen patterns (+2).','bad');
    }
    if(L.copyTurns===2 || L.copyTurns===4) lotfSpeak('larva');
    // drift slightly (Movement Ability, slow)
    if(S.runner && Math.random()<0.4){
      const dx=Math.sign(S.runner.x-L.x)||0, dy=Math.sign(S.runner.y-L.y)||0;
      const nx=L.x+(Math.random()<0.5?dx:0), ny=L.y+(Math.random()<0.5?dy:0);
      if(ny>=0&&nx>=0&&ny<S.fort.rows&&nx<S.fort.columns){ L.x=nx; L.y=ny; }
    }
    if(L.copyTurns >= LOTF.larvaTurnsNeeded) lotfAwaken();
    else if(S.scene && S.scene.drawLotfEntity) S.scene.drawLotfEntity();
    return;
  }
  if(L.phase==='lord'){
    lotfLordTurn();
  }
}

function lotfAwaken(){
  const L = lotfEnsure();
  const c = L.copied || lotfRunnerStats();
  L.phase = 'lord';
  lotfCopyDeck();
  L.integrityMax = LOTF.integrityMaxBase + (c.int|0) + (c.iface|0) + (L.deck.mu|0)/4;
  L.integrity = L.integrityMax;
  L.nextSpawnIn = 1 + Math.floor(Math.random()*3);
  L.firstContact = false;
  L.degradation = 0;
  L.rezzUsed = false;
  log('══════════════════════════════════════','bad');
  log('LORD OF THE FLIES has hatched.','bad');
  log(`  Options: ${L.options.join(' · ')}`,'bad');
  log(`  Stolen mask: INT ${c.int} REF ${c.ref} COOL ${c.cool} IF ${c.iface} BTM ${c.btm}`,'bad');
  log(`  Hive-Mirror Deck · SPD ${L.deck.speed} · DW ${L.deck.dw} · MU ${L.deck.mu}`,'bad');
  log('  Arsenal loaded (no Demons). Interference protocols online.','bad');
  log('══════════════════════════════════════','bad');
  lotfSpeak('awaken');
  lotfShowIntegrity();
  lotfSetMapBurn(true);
  lotfStartGlitches();
  if(S.scene && S.scene.rebuildMap) S.scene.rebuildMap();
}

function lotfLordTurn(){
  const L = S.lotf;
  // Memory track
  if(S.runner){
    L.memory.push({x:S.runner.x,y:S.runner.y,turn:S.turn});
    if(L.memory.length>16) L.memory.shift();
  }
  // Move toward runner (Movement + Speed)
  lotfLordMove();
  lotfTryFeed();
  lotfInterfere();
  lotfMoveFlies();
  L.nextSpawnIn--;
  if(L.nextSpawnIn<=0){
    lotfSpawnFlies();
    L.nextSpawnIn = 1 + Math.floor(Math.random()*3);
  }
  if(Math.random()<0.35) lotfSpeak('lord');
  // Self-Modifying: rare integrity harden
  if(Math.random()<0.12 && L.integrity < L.integrityMax){
    L.integrity = Math.min(L.integrityMax, L.integrity+1);
    log('  Lord Self-Modifying Code knits integrity +1.','info');
  }
  lotfUpdateIntegrityUI();
  lotfUpdateDegradationUI();
  if(S.scene && S.scene.drawLotfEntity) S.scene.drawLotfEntity();
}

function lotfLordMove(){
  const L = S.lotf;
  if(!S.runner || L.x==null) return;
  const steps = Math.min(5, Math.max(2, (L.speed|0)-1));
  let route = null;
  if(typeof pathfindBFS==='function'){
    route = pathfindBFS(L.x, L.y, S.runner.x, S.runner.y, {canBreak:false});
  }
  let n=0;
  while(n<steps && route && route.length>1){
    L.x=route[1].x; L.y=route[1].y;
    route=route.slice(1); n++;
  }
}

/** Use arsenal to hinder player (Glue/Stun/Spazz/Speedtrap/Invis spoof etc.) */
function lotfInterfere(){
  const L = S.lotf;
  if(!L.arsenal || !L.arsenal.length || !S.runner) return;
  if(Math.random()>0.55) return;
  // Prefer disruption programs
  const prefs = L.arsenal.filter(p=>/glue|stun|spazz|speedtrap|invis|see|killer|shield|armor|jack/i.test(p.name));
  const pool = prefs.length ? prefs : L.arsenal;
  const prog = pool[Math.floor(Math.random()*pool.length)];
  const str = (+prog.str||3) + (typeof selfModBonus==='function'?selfModBonus('LOTF'):0);
  const name = (prog.name||'').toLowerCase();
  log(`Lord runs ${prog.name} [${prog.cls} STR ${str}] from Hive-Mirror.`,'bad');

  if(/glue|stun|spazz|jack/.test(name)){
    const lock = 1 + Math.floor(Math.random()*3);
    S.jackLocked = Math.max(S.jackLocked|0, lock);
    S.moveLeft = Math.max(0, (S.moveLeft|0) - 2);
    log(`  Interference: movement choked · menu lock ${lock} turn(s).`,'bad');
    lotfSpeak('lord', 'HOLD STILL.');
  } else if(/speedtrap|see/.test(name)){
    // Recognition: reveal is against player — reduce invis/stealth
    if(S.buffs){ S.buffs.invis=0; S.buffs.stealth=0; }
    log('  Recognition burns your cloak. Stealth stripped.','bad');
  } else if(/invis/.test(name)){
    log('  Lord folds into static (false Invisibility). Flies still hunt.','info');
  } else if(/killer|anti/.test(name) || /anti-ic/i.test(prog.cls||'')){
    // attack a random player program that could fight flies
    if(S.programs && S.programs.length){
      const anti = S.programs.filter(p=>/anti|killer|dragon|hydra/i.test(p.name+' '+(p.cls||'')));
      const victim = (anti.length?anti:S.programs)[Math.floor(Math.random()* (anti.length||S.programs.length))];
      if(victim){
        const dmg = 1+Math.floor(Math.random()*3);
        victim.str = Math.max(0, (+victim.str||0)-dmg);
        log(`  ${prog.name} claws ${victim.name} STR −${dmg} → ${victim.str}.`,'bad');
        if(victim.str<=0){
          S.programs = S.programs.filter(p=>p!==victim);
          log(`  ${victim.name} de-rezzed by the Lord.`,'bad');
        }
        if(typeof renderPrograms==='function') renderPrograms();
      }
    }
  } else if(/shield|armor/.test(name)){
    // Lord hardens — small integrity shield
    L.integrity = Math.min(L.integrityMax, L.integrity+2);
    log('  Lord raises a mirrored Shield · Integrity +2.','info');
  } else {
    // generic harassment
    S.moveLeft = Math.max(0, (S.moveLeft|0)-1);
    log('  Net turbulence — MOVE −1.','bad');
  }
  if(typeof updateHUD==='function') updateHUD();
}

function lotfTryFeed(){
  const L = S.lotf;
  if(!L || L.phase!=='lord' || !S.fort || !S.grid) return;
  if(L.integrity >= L.integrityMax) return;
  let healed = 0;
  if(S.fort.datawallNodes && Math.random()<0.55){
    const nodes = S.fort.datawallNodes.slice();
    for(let i=nodes.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [nodes[i],nodes[j]]=[nodes[j],nodes[i]]; }
    for(const n of nodes){
      const k = key(n.x,n.y);
      const str = S.wallStr[k]!==undefined ? S.wallStr[k] : S.fort.datawallStr;
      if(str<=0 || str>6) continue;
      const bite = Math.min(str, 1+Math.floor(Math.random()*3));
      S.wallStr[k] = str - bite;
      healed = 2 + bite;
      log(`Lord of the Flies gnaws datawall (${n.x},${n.y}) −${bite} STR · Integrity +${healed}.`,'bad');
      if(S.wallStr[k]<=0) log('  Wall segment dissolved into swarm-code.','bad');
      buildGrid();
      if(S.scene) S.scene.rebuildMap();
      lotfSpeak('feed');
      break;
    }
  }
  if(!healed && S.programs && S.programs.length && Math.random()<0.4){
    const small = S.programs.filter(p=>!(typeof isDemon==='function'&&isDemon(p)) && (+p.mu||0)<=2 && (+p.str||0)<=3);
    if(small.length){
      const vic = small[Math.floor(Math.random()*small.length)];
      const idx = S.programs.indexOf(vic);
      if(idx>=0){
        S.programs.splice(idx,1);
        if(S.selectedProg>=S.programs.length) S.selectedProg=Math.max(0,S.programs.length-1);
        healed = 3 + (+vic.mu||1);
        log(`Lord of the Flies devours program ${vic.name} · Integrity +${healed}.`,'bad');
        if(typeof renderPrograms==='function') renderPrograms();
        if(typeof updateMu==='function') updateMu();
        lotfSpeak('feed');
      }
    }
  }
  if(healed){
    L.integrity = Math.min(L.integrityMax, L.integrity + healed);
    lotfUpdateIntegrityUI();
  }
}

function lotfSpawnFlies(){
  const L = S.lotf;
  if(!S.fort || !S.runner) return;
  const n = 2 + Math.floor(Math.random()*4);
  const fort = S.fort;
  for(let i=0;i<n;i++){
    let x,y, tries=0;
    do {
      const edge = Math.floor(Math.random()*4);
      if(edge===0){ x=0; y=Math.floor(Math.random()*fort.rows); }
      else if(edge===1){ x=fort.columns-1; y=Math.floor(Math.random()*fort.rows); }
      else if(edge===2){ x=Math.floor(Math.random()*fort.columns); y=0; }
      else { x=Math.floor(Math.random()*fort.columns); y=fort.rows-1; }
      tries++;
    } while(tries<12 && S.runner && x===S.runner.x && y===S.runner.y);
    L.flies.push({ id:'fly_'+Date.now().toString(36)+'_'+i, x, y });
  }
  log(`Lord of the Flies releases ${n} Flies into the subgrid.`,'bad');
  lotfSpeak('flies');
  if(S.scene && S.scene.drawLotfFlies) S.scene.drawLotfFlies();
}

function lotfMoveFlies(){
  const L = S.lotf;
  if(!L.flies.length || !S.runner || !S.fort) return;
  const rx=S.runner.x, ry=S.runner.y;
  const survivors=[];
  let hits=0;
  for(const f of L.flies){
    let route = null;
    if(typeof pathfindBFS==='function'){
      route = pathfindBFS(f.x, f.y, rx, ry, {canBreak:true});
    }
    let steps=0;
    while(steps<LOTF.flyMove){
      if(f.x===rx && f.y===ry) break;
      let nx=f.x, ny=f.y;
      if(route && route.length>1){
        nx=route[1].x; ny=route[1].y; route=route.slice(1);
      } else {
        const dx=Math.sign(rx-f.x), dy=Math.sign(ry-f.y);
        if(Math.abs(rx-f.x)>=Math.abs(ry-f.y) && dx) nx=f.x+dx;
        else if(dy) ny=f.y+dy;
        else if(dx) nx=f.x+dx;
        else break;
      }
      if(ny<0||nx<0||ny>=S.fort.rows||nx>=S.fort.columns) break;
      f.x=nx; f.y=ny; steps++;
    }
    if(f.x===rx && f.y===ry){ hits++; }
    else survivors.push(f);
  }
  L.flies = survivors;
  if(hits){
    log(`${hits} Fly(s) reach the interface — QTE!`,'bad');
    lotfResolveFlyHits(hits);
  }
  if(S.scene && S.scene.drawLotfFlies) S.scene.drawLotfFlies();
}

async function lotfResolveFlyHits(hits){
  let swatted = false;
  if(typeof qteFlySwat==='function'){
    try{
      const r = await qteFlySwat(hits);
      swatted = !!(r && r.swatted);
    }catch(_e){ swatted = false; }
  }
  if(swatted){
    log('Swarm broken — no degradation this wave.','ok');
    if(typeof lotfSpeak==='function') lotfSpeak('lord', 'MISSED ME?');
    return;
  }
  for(let i=0;i<hits;i++) lotfOnFlyHit();
}

function lotfOnFlyHit(){
  const L = S.lotf;
  const before = L.degradation;
  L.degradation = Math.min(100, L.degradation + LOTF.degPerFly);
  if(!L.firstContact){
    L.firstContact = true;
    lotfShowDegradation();
    lotfSpawnInterfaceFlies(true);
    log('Interface infestation begins. DEGRADATION meter online.','bad');
    lotfSpeak('hit');
  } else {
    lotfSpawnInterfaceFlies(false);
  }
  const crossed = [];
  for(let t=5; t<=L.degradation; t+=5){
    if(before < t && L.degradation >= t) crossed.push(t);
  }
  for(const t of crossed){
    if(t===25){
      L.uiInfest = true;
      lotfStartSwarmMotion();
      log('Degradation 25% — fly swarms breach the UI frame.','bad');
    }
    if(t > 25 && t <= 50){
      if(Math.random()<0.5) lotfDegradeStats(1+Math.floor(Math.random()*2));
    }
    if(t > 50){
      lotfDegradeStats(1);
      const brain = Math.max(0, (typeof d6==='function'?d6():(1+Math.floor(Math.random()*6))) - 3);
      if(brain>0){
        if(typeof applyDamage==='function') applyDamage(brain, 'int');
        else { S.intDmg=(S.intDmg||0)+brain; if(typeof updateRunnerBars==='function') updateRunnerBars(); }
        log(`Neural static from the swarm — ${brain} INT trauma.`,'bad');
      }
    }
  }
  lotfUpdateDegradationUI();
}

function lotfDegradeStats(n){
  const keys = ['int','ref','cool','iface'];
  for(let i=0;i<n;i++){
    const k = keys[Math.floor(Math.random()*keys.length)];
    const el = document.getElementById('nr-'+k);
    let v = el ? (+el.value||5) : (S.profile && S.profile[k]) || 5;
    v = Math.max(1, v-1);
    if(el) el.value = v;
    /* session only — profile disk cache left intact */
    const ro = document.getElementById('nr-'+k+'-ro');
    if(ro) ro.textContent = v;
    log(`  Degradation eats ${k.toUpperCase()} → ${v}.`,'bad');
  }
  /* session-only stat drain — do not persist to profile cache */
}

function lotfDamageLord(amount, src){
  const L = lotfEnsure();
  if(L.phase!=='lord') return false;
  const dmg = Math.max(0, amount|0);
  if(!dmg) return false;
  L.integrity = Math.max(0, L.integrity - dmg);
  log(`Lord of the Flies Integrity −${dmg} → ${L.integrity}/${L.integrityMax}` + (src?` (${src})`:''),'ok');
  lotfSpeak('hurt');
  lotfUpdateIntegrityUI();
  if(L.integrity<=0){
    // Auto Re-Rezz once (Endurance + Auto Re-Rezz)
    if(!L.rezzUsed){
      L.rezzUsed = true;
      L.integrity = Math.max(8, Math.floor(L.integrityMax * 0.35));
      log('AUTO RE-REZZ — Lord of the Flies reforms from residual code!','bad');
      lotfSpeak('rezz');
      lotfUpdateIntegrityUI();
      return true;
    }
    lotfDefeat();
  }
  return true;
}

function lotfDefeat(){
  const L = S.lotf;
  log('══════════════════════════════════════','ok');
  log('LORD OF THE FLIES integrity collapsed. Swarm scattering.','ok');
  log('══════════════════════════════════════','ok');
  lotfSpeak('death');
  L.phase = 'dead';
  L.flies = [];
  lotfSetMapBurn(false);
  lotfStopGlitches();
  lotfHideUI();
  document.querySelectorAll('.lotf-ui-fly').forEach(e=>e.remove());
  const haze=document.getElementById('lotf-swarm-haze'); if(haze){ haze.classList.remove('on','pulse'); }
  if(S.scene){
    if(S.scene.drawLotfFlies) S.scene.drawLotfFlies();
    if(S.scene.drawLotfEntity) S.scene.drawLotfEntity();
  }
}

function lotfShowIntegrity(){
  let bar = document.getElementById('lotf-integrity');
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'lotf-integrity';
    bar.innerHTML = '<div class="lotf-label">LORD OF THE FLIES · INTEGRITY</div><div class="lotf-track"><div class="lotf-fill" id="lotf-int-fill"></div></div><div class="lotf-val" id="lotf-int-val"></div>';
    (document.getElementById('game-wrap')||document.body).appendChild(bar);
  }
  bar.classList.add('on');
  lotfUpdateIntegrityUI();
}
function lotfUpdateIntegrityUI(){
  const L = S.lotf; if(!L) return;
  const fill = document.getElementById('lotf-int-fill');
  const val = document.getElementById('lotf-int-val');
  const pct = L.integrityMax ? Math.round(100*L.integrity/L.integrityMax) : 0;
  if(fill) fill.style.width = pct+'%';
  if(val) val.textContent = `${L.integrity} / ${L.integrityMax}`;
}
function lotfShowDegradation(){
  let bar = document.getElementById('lotf-degradation');
  if(!bar){
    bar = document.createElement('div');
    bar.id = 'lotf-degradation';
    bar.innerHTML = '<div class="lotf-label">INTERFACE DEGRADATION</div><div class="lotf-track deg"><div class="lotf-fill" id="lotf-deg-fill"></div></div><div class="lotf-val" id="lotf-deg-val">0%</div>';
    (document.getElementById('game-wrap')||document.body).appendChild(bar);
  }
  bar.classList.add('on');
  lotfUpdateDegradationUI();
}
function lotfUpdateDegradationUI(){
  const L = S.lotf; if(!L) return;
  const fill = document.getElementById('lotf-deg-fill');
  const val = document.getElementById('lotf-deg-val');
  if(fill) fill.style.width = L.degradation+'%';
  if(val) val.textContent = L.degradation+'%';
}
function lotfHideUI(){
  ['lotf-integrity','lotf-degradation','lotf-speech'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.classList.remove('on','flash');
  });
  document.getElementById('game-wrap')?.classList.remove('lotf-burn');
}
function lotfSetMapBurn(on){
  document.getElementById('game-wrap')?.classList.toggle('lotf-burn', !!on);
}
function lotfStartGlitches(){
  lotfStopGlitches();
  S.lotf.glitchTimer = setInterval(()=>{
    if(!S.lotf || S.lotf.phase!=='lord') return;
    const shell = document.getElementById('shell') || document.body;
    shell.classList.add('lotf-glitch');
    setTimeout(()=>shell.classList.remove('lotf-glitch'), 120+Math.random()*200);
  }, 2800 + Math.random()*2200);
}
function lotfStopGlitches(){
  if(S.lotf && S.lotf.glitchTimer){ clearInterval(S.lotf.glitchTimer); S.lotf.glitchTimer=null; }
  document.getElementById('shell')?.classList.remove('lotf-glitch');
  if(S.lotf && S.lotf._swarmTimer){ clearInterval(S.lotf._swarmTimer); S.lotf._swarmTimer=null; }
}
/** Cap how many settled flies can linger on the UI. */
function lotfCountSettled(){
  return document.querySelectorAll('.lotf-ui-fly.settled').length;
}
function lotfPruneSettled(maxKeep){
  const all = [...document.querySelectorAll('.lotf-ui-fly.settled')];
  while(all.length > maxKeep){
    const el = all.shift();
    if(el) el.remove();
  }
}

function lotfSpawnInterfaceFlies(burst){
  // Pass-through streaks — almost never settle; max 3 settled on whole UI
  const n = burst ? 5 : 2;
  const root = document.getElementById('shell') || document.body;
  lotfPruneSettled(3);
  for(let i=0;i<n;i++){
    lotfSpawnMovingFly(root, {
      settleChance: burst ? 0.08 : 0.04,
      life: 900 + Math.random()*1100,
    });
  }
  // brief red swarm haze
  lotfPulseSwarmGlow(burst ? 0.55 : 0.3, burst ? 900 : 500);
}

function lotfSpawnMovingFly(root, opts){
  opts = opts || {};
  const el = document.createElement('div');
  el.className = 'lotf-ui-fly flying';
  const fromLeft = Math.random() < 0.5;
  const y0 = 8 + Math.random()*84;
  const x0 = fromLeft ? -4 : 104;
  const x1 = fromLeft ? 104 : -4;
  const y1 = Math.max(2, Math.min(96, y0 + (Math.random()*30 - 15)));
  const dur = (opts.life || 1200) + Math.random()*800;
  // angle: direction of travel (CSS degrees, 0 = right)
  const ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
  el.style.left = x0 + '%';
  el.style.top = y0 + '%';
  el.style.setProperty('--fly-rot', ang + 'deg');
  el.style.setProperty('--fly-dur', (dur/1000).toFixed(2) + 's');
  el.innerHTML = '<span class="fly-glow"></span><img src="assets/fly.png" alt="" draggable="false"/>';
  root.appendChild(el);
  // force reflow then animate
  requestAnimationFrame(()=>{
    el.style.left = x1 + '%';
    el.style.top = y1 + '%';
  });
  const settleChance = opts.settleChance != null ? opts.settleChance : 0.05;
  setTimeout(()=>{
    if(!el.parentNode) return;
    if(Math.random() < settleChance && lotfCountSettled() < 3){
      el.classList.remove('flying');
      el.classList.add('settled');
      el.style.transition = 'none';
      // auto despawn settled after a while
      setTimeout(()=>{ if(el.parentNode) el.remove(); }, 4000 + Math.random()*3000);
    } else {
      el.remove();
    }
  }, dur + 40);
  return el;
}

function lotfPulseSwarmGlow(intensity, ms){
  let haze = document.getElementById('lotf-swarm-haze');
  if(!haze){
    haze = document.createElement('div');
    haze.id = 'lotf-swarm-haze';
    (document.getElementById('shell')||document.body).appendChild(haze);
  }
  haze.style.setProperty('--haze-a', String(intensity||0.4));
  haze.classList.add('on','pulse');
  clearTimeout(haze._t);
  haze._t = setTimeout(()=>{
    haze.classList.remove('pulse');
    if((S.lotf && S.lotf.degradation >= 25 && S.lotf.phase==='lord')){
      haze.classList.add('on');
      haze.style.setProperty('--haze-a', '0.22');
    } else {
      haze.classList.remove('on');
    }
  }, ms || 700);
}

function lotfStartSwarmMotion(){
  if(S.lotf._swarmTimer) return;
  lotfPulseSwarmGlow(0.35, 1200);
  S.lotf._swarmTimer = setInterval(()=>{
    if(!S.lotf || S.lotf.degradation<25 || S.lotf.phase==='dead') return;
    const root = document.getElementById('shell') || document.body;
    // pack of 2–4 flies as a micro-swarm streak
    const pack = 2 + Math.floor(Math.random()*3);
    for(let i=0;i<pack;i++){
      setTimeout(()=>{
        if(!S.lotf || S.lotf.phase==='dead') return;
        lotfSpawnMovingFly(root, { settleChance: 0.03, life: 1400 + Math.random()*1200 });
      }, i * 70);
    }
    lotfPulseSwarmGlow(0.28 + Math.random()*0.15, 600);
    lotfPruneSettled(3);
    // hard cap total live fly nodes
    const all = document.querySelectorAll('.lotf-ui-fly');
    if(all.length > 18){
      [...all].slice(0, all.length-14).forEach(e=>e.remove());
    }
  }, 1100);
}

function lotfOnProgramRun(prog){
  const L = lotfEnsure();
  if(L.phase!=='lord' || !prog) return;
  const cls = String(prog.cls||'').toLowerCase();
  if(cls.includes('anti-ic') || cls.includes('anti-personnel') || cls.includes('antiprogram') || /dragon|hydra|manticore|killer/i.test(prog.name||'')){
    const str = (+prog.str||3) + (typeof selfModBonus==='function' ? selfModBonus(prog.name) : 0);
    const dmg = Math.max(1, Math.floor(str/2) + (typeof d6==='function'?Math.floor(d6()/2):1));
    lotfDamageLord(dmg, prog.name);
  }
}

window.LOTF = LOTF;
window.lotfReset = lotfReset;
window.lotfEnsure = lotfEnsure;
window.lotfTick = lotfTick;
window.lotfOnAlarmRise = lotfOnAlarmRise;
window.lotfDamageLord = lotfDamageLord;
window.lotfOnProgramRun = lotfOnProgramRun;
window.lotfDefeat = lotfDefeat;
window.lotfSpeak = lotfSpeak;
