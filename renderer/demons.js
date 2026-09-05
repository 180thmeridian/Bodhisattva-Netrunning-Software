/* demons.js — Demon program loadout */
/* ========== Demon loadout (sub-programs) ========== */
const DEMON_SLOTS = {Imp:2, Afreet:3, Succubus:4, Balron:4, Daemon:3};

function isDemon(p){ return p && String(p.cls||'').toLowerCase()==='demon'; }
function demonSlotMax(p){ return DEMON_SLOTS[p.name] || 3; }
function ensureDemonSlots(p){
  if(!isDemon(p)) return p;
  if(!Array.isArray(p.slots)) p.slots=[];
  return p;
}
function demonLoadedMu(p){
  if(!isDemon(p)) return 0;
  ensureDemonSlots(p);
  return p.slots.reduce((s,x)=>s+(+x.mu||0),0);
}
/** Sub-programs inside a Demon do NOT count against deck MU (shell already paid). */
function canLoadIntoDemon(demon, prog){
  if(!isDemon(demon) || !prog) return false;
  if(isDemon(prog)) return false; // no nested demons
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
  // move program into demon slots
  ensureDemonSlots(demon);
  demon.slots.push({name:prog.name, cls:prog.cls, str:prog.str, mu:prog.mu, note:prog.note||''});
  S.programs.splice(progIdx,1);
  // fix selected index
  if(S.selectedProg===progIdx) S.selectedProg=demonIdx > progIdx ? demonIdx-1 : demonIdx;
  else if(S.selectedProg > progIdx) S.selectedProg--;
  // if demon index shifted
  let dIdx=demonIdx > progIdx ? demonIdx-1 : demonIdx;
  S.selectedProg=dIdx;
  log(`Loaded ${prog.name} into ${demon.name} [${demon.slots.length}/${demonSlotMax(demon)}]`,'ok');
  renderPrograms(); updateMu();
  return true;
}
function unloadFromDemon(demonIdx, slotIdx){
  const demon=S.programs[demonIdx];
  if(!isDemon(demon)) return;
  ensureDemonSlots(demon);
  if(slotIdx<0||slotIdx>=demon.slots.length) return;
  const sub=demon.slots.splice(slotIdx,1)[0];
  S.programs.push({...sub});
  log(`Ejected ${sub.name} from ${demon.name} back to deck.`,'info');
  renderPrograms(); updateMu();
}
function demonEffectiveFor(demon, cls){
  // best STR among shell and matching sub-programs for a class
  ensureDemonSlots(demon);
  let best=demon.str||0;
  for(const s of demon.slots){
    if(String(s.cls).toLowerCase()===String(cls).toLowerCase()) best=Math.max(best, +s.str||0);
  }
  // shell itself can act at its STR for any role; subs boost if matching
  return best;
}
function demonTipExtra(p){
  if(!isDemon(p)) return '';
  ensureDemonSlots(p);
  const max=demonSlotMax(p);
  let h=`<div class="tip-row"><span>SLOTS</span><b>${p.slots.length} / ${max}</b></div>`;
  if(p.slots.length){
    h+='<div class="tip-body"><b style="color:var(--c)">Loaded:</b><br/>';
    h+=p.slots.map(s=>`· ${s.name} <span style="color:#5a7a5a">[${s.cls} STR${s.str}]</span>`).join('<br/>');
    h+='</div>';
  } else {
    h+='<div class="tip-body">Empty shell — load programs via LOAD→ on another program while Demon is selected.</div>';
  }
  return h;
}



window.DEMON_SLOTS = DEMON_SLOTS; window.isDemon = isDemon;
window.demonSlotMax = demonSlotMax; window.ensureDemonSlots = ensureDemonSlots;
window.demonLoadedMu = demonLoadedMu; window.canLoadIntoDemon = canLoadIntoDemon;
window.loadProgramIntoDemon = loadProgramIntoDemon; window.unloadFromDemon = unloadFromDemon;
window.demonEffectiveFor = demonEffectiveFor; window.demonTipExtra = demonTipExtra;
