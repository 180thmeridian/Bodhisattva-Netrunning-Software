/* CP2020 Netrun Terminal — pure data tables (programs, ICE, forts, LDL, regions) */
const PROGRAM_DB = [
  // Intrusion
  {name:'Hammer',cls:'Intrusion',str:4,mu:1,
   note:'Batter datawalls. On hit −2d6 wall STR. Loud: +1 Alarm on use.'},
  {name:'Jackhammer',cls:'Intrusion',str:2,mu:2,
   note:'Quieter wall breach. On hit −1d6 wall STR.'},
  {name:'Worm',cls:'Intrusion',str:2,mu:5,
   note:'Silent. Plants on adjacent wall; opens after 2 turns with no alarm.'},
  // Decryption
  {name:"Wizard's Book",cls:'Decryption',str:4,mu:2,
   note:'Treat as STR 6 vs codegates. Core gatecracker.'},
  {name:'Codecracker',cls:'Decryption',str:3,mu:2,
   note:'Codegates and file locks. Solid mid-tier decrypt.'},
  {name:'Raffles',cls:'Decryption',str:5,mu:3,
   note:'Heavy decrypt for complex word-key gates.'},
  // Anti-IC
  {name:'Killer II',cls:'Anti-IC',str:2,mu:5, note:'Anti-program attack. Hit: 1d6 to ICE STR.'},
  {name:'Killer IV',cls:'Anti-IC',str:4,mu:5, note:'Stronger Killer series. Hit: 1d6 to ICE STR.'},
  {name:'Killer VI',cls:'Anti-IC',str:6,mu:5, note:'Top-tier Killer. Hit: 1d6 to ICE STR.'},
  {name:'Manticore',cls:'Anti-IC',str:2,mu:3, note:'Assassin vs Demons — de-rezzes Demon instantly on successful attack (RAW).'},
  // Protection
  {name:'Shield',cls:'Protection',str:3,mu:1, note:'Stops the next successful attack against you.'},
  {name:'Force Shield',cls:'Protection',str:4,mu:2, note:'Stops the next 2 successful attacks.'},
  {name:'Armor',cls:'Protection',str:4,mu:2, note:'−3 damage for up to 3 hits if Shield fails.'},
  // Evasion
  {name:'Invisibility',cls:'Evasion',str:3,mu:1, note:'Hide cybersignal · 3 turns. ICE must beat cloak to detect.'},
  {name:'Stealth',cls:'Evasion',str:4,mu:3, note:'Mute signal · 3 turns. Stronger hide than Invisibility.'},
  {name:'Replicator',cls:'Evasion',str:3,mu:2, note:'Confuse Dog-series tracers (Hellhound / Bloodhound / Pit Bull).'},
  // Anti-Personnel
  {name:'Stun',cls:'Anti-Personnel',str:3,mu:3, note:'Neural freeze. Can lock jack-out attempts.'},
  {name:'Hellbolt',cls:'Anti-Personnel',str:4,mu:4, note:'1d10 physical feedback through the link.'},
  // Demons (multi-task: act as several loaded subroutines in one MU package)
  {name:'Imp',cls:'Demon',str:3,mu:3,
   note:'Demon (RAW). Carries 2 programs. Subroutines use Demon core STR in combat.'},
  {name:'Afreet',cls:'Demon',str:3,mu:4,
   note:'Demon (RAW). Carries 3 programs. Subroutines use Demon core STR in combat.'},
  {name:'Succubus',cls:'Demon',str:4,mu:4,
   note:'Demon (RAW). Carries 4 programs. Subroutines use Demon core STR in combat.'},
  {name:'Balron',cls:'Demon',str:5,mu:5,
   note:'Demon (RAW). Carries 4 programs. Subroutines use Demon core STR in combat.'},
  {name:'Daemon',cls:'Demon',str:4,mu:5,
   note:'Compiler shell (house). Treat as Demon; slots 3. Subroutines use core STR.'},
];

const ICE_LORE = {
  'watchdog':'Detection ICE. Barks alarm when it sees a runner. Low aggression unless cornered.',
  'bloodhound':'Tracer. Can leave the fortress to follow a signal. Contributes to Trace rolls.',
  'hellhound':'Anti-personnel hunter. Deals serious wound feedback. Chases outside the system.',
  'pit bull':'Stubborn tracer/attacker. Locks onto a target and pursues.',
  'killer':'Anti-program ICE. Tries to de-rez your loaded software (STR vs program STR).',
  'manticore':'Anti-Demon specialist. Extra dangerous to Imp/Afreet/Succubus/Balron.',
  'ashura':'High-end anti-program. Often paired with corporate forts.',
  'golem':'Datawall guardian / brute. Hard to push past.',
  'flatline':'Lethal anti-personnel. INT / wound threat.',
  'brainwipe':'Attacks INT — can fry your deck interface.',
  'scribe':'File guardian / utility ICE.',
  'dummy':'Decoy icon. Wastes your action if you engage blindly.',
};

const SAMPLE_FORT = {
  name:'DEMO // HK–Macao · Golden Promise Datafort',
  rows:12, columns:14, cpu:2, int:6, datawallStr:5,
  cpuNodes:[{x:6,y:5},{x:7,y:5}],
  muNodes:[{x:4,y:4},{x:9,y:4},{x:4,y:7},{x:9,y:7}],
  datawallNodes:(()=>{const n=[];for(let x=2;x<=11;x++){n.push({x,y:2},{x,y:9})}for(let y=3;y<=8;y++){n.push({x:2,y},{x:11,y})}return n})(),
  codegates:[{str:3,coord:{x:6,y:2}},{str:4,coord:{x:11,y:5}}],
  remotes:[
    {name:'Lobby Cam',type:8,coord:{x:3,y:3}},
    {name:'Door-A',type:14,coord:{x:5,y:3}},
    {name:'Term-Sysop',type:6,coord:{x:8,y:6}}
  ],
  defenses:[
    {name:'Watchdog',coord:{x:5,y:5},program:{name:'Watchdog',strength:4,mu:5}},
    {name:'Hellhound',coord:{x:8,y:5},program:{name:'Hellhound',strength:6,mu:6}},
    {name:'Killer',coord:{x:6,y:8},program:{name:'Killer',strength:5,mu:5}}
  ],
  files:[{key:'Black Project',value:4},{key:'Payroll Q3',value:2}]
};



/* ========== NetMap LDLs (CP2020 core, abbreviated) ========== */
const LDL_DB = [
  // PACIFICA W — west coast cascade + islands
  {id:'seattle',    city:'Seattle',         region:'Pacifica',    sec:2, trace:2, x:1.2,  y:3.9},
  {id:'sf',         city:'San Francisco',   region:'Pacifica',    sec:2, trace:2, x:0.85, y:5.15},
  {id:'nightcity',  city:'Night City',      region:'Pacifica',    sec:2, trace:2, x:1.55, y:5.55},
  {id:'la',         city:'Los Angeles',     region:'Pacifica',    sec:2, trace:2, x:1.1,  y:6.7},
  {id:'honolulu',   city:'Honolulu',        region:'Pacifica',    sec:2, trace:2, x:0.4,  y:9.6},
  // OLYMPIA — interior west
  {id:'saltlake',   city:'Salt Lake',       region:'Olympia',     sec:2, trace:1, x:3.35, y:4.6},
  {id:'denver',     city:'Denver',          region:'Olympia',     sec:2, trace:1, x:4.4,  y:5.35},
  // RUSTBELT — east / midwest
  {id:'montreal',   city:'Montreal',        region:'Rustbelt',    sec:2, trace:2, x:6.55, y:3.35},
  {id:'chicago',    city:'Chicago',         region:'Rustbelt',    sec:2, trace:2, x:5.25, y:4.85},
  {id:'ny',         city:'NYC / BosWash',   region:'Rustbelt',    sec:3, trace:1, x:7.15, y:4.55},
  {id:'atlanta',    city:'Atlanta',         region:'Rustbelt',    sec:2, trace:3, x:6.4,  y:6.2},
  {id:'neworleans', city:'New Orleans',     region:'Rustbelt',    sec:2, trace:3, x:5.45, y:7.15},
  // ATLANTIS — Caribbean / LatAm / South Atlantic
  {id:'mexicocity', city:'Mexico City',     region:'Atlantis',    sec:1, trace:2, x:3.4,  y:7.55},
  {id:'havana',     city:'Havana',          region:'Atlantis',    sec:2, trace:3, x:5.6,  y:7.7},
  {id:'panama',     city:'Panama City',     region:'Atlantis',    sec:1, trace:3, x:4.5,  y:8.55},
  {id:'bogota',     city:'Bogota',          region:'Atlantis',    sec:1, trace:4, x:5.3,  y:9.1},
  {id:'ascension',  city:'Ascension',       region:'Atlantis',    sec:2, trace:3, x:8.6,  y:9.4},
  {id:'rio',        city:'Rio de Janeiro',  region:'Atlantis',    sec:2, trace:2, x:7.2,  y:10.35},
  {id:'buenos',     city:'Buenos Aires',    region:'Atlantis',    sec:2, trace:3, x:6.1,  y:11.25},
  // EUROPE — compact theater
  {id:'stockholm',  city:'Stockholm',       region:'Europe',      sec:3, trace:2, x:9.55, y:3.35},
  {id:'london',     city:'London',          region:'Europe',      sec:3, trace:2, x:8.35, y:4.25},
  {id:'berlin',     city:'Berlin',          region:'Europe',      sec:3, trace:3, x:10.15,y:4.15},
  {id:'paris',      city:'Paris',           region:'Europe',      sec:3, trace:2, x:8.7,  y:5.05},
  {id:'madrid',     city:'Madrid',          region:'Europe',      sec:3, trace:2, x:8.25, y:5.85},
  {id:'rome',       city:'Rome',            region:'Europe',      sec:2, trace:2, x:9.7,  y:6.15},
  // SOVSPACE
  {id:'moscow',     city:'Moscow',          region:'SovSpace',    sec:3, trace:2, x:13.2, y:5.15},
  // AFRICANI
  {id:'dakar',      city:'Dakar',           region:'Afrikani',    sec:2, trace:2, x:11.35,y:8.15},
  {id:'cairo',      city:'Cairo',           region:'Afrikani',    sec:4, trace:4, x:12.4, y:7.55},
  {id:'nairobi',    city:'Nairobi',         region:'Afrikani',    sec:2, trace:2, x:13.1, y:9.35},
  {id:'delhi',      city:'Delhi',           region:'Afrikani',    sec:1, trace:2, x:14.6, y:7.7},
  // PACIFICA E + TOKYO CHIBA
  {id:'beijing',    city:'Beijing',         region:'Pacifica',    sec:3, trace:2, x:16.7, y:4.6},
  {id:'hongkong',   city:'Hong Kong–Macao', region:'Pacifica',    sec:2, trace:3, x:17.35,y:6.35},
  {id:'tokyo',      city:'Tokyo / Chiba',   region:'TokyoChiba',  sec:3, trace:2, x:18.85,y:6.55},
  {id:'melbourne',  city:'Melbourne',       region:'Pacifica',    sec:2, trace:2, x:18.4, y:11.15},
];







/* ========== WORLD NET MAP (NETSPACE) — CP2020 core style ========== */
/** Region blocks on a 16×10 grid (matches LDL x,y). Pattern: solid / hatch / dense */


/* Netspace 21×13 — schematic geometry; void = uncolored; full square cells only */
const MAP_COLS = 21;
const MAP_ROWS = 13;

function buildVoidMask(){
  const v = Array.from({length:MAP_ROWS},()=>Array(MAP_COLS).fill(false));
  for(let y=0;y<=2;y++) for(let x=0;x<MAP_COLS;x++) v[y][x]=true;
  for(let x=0;x<=15;x++) v[12][x]=true;
  // notch above SOVSPACE (y3, x11–15)
  for(let x=11;x<=15;x++) v[3][x]=true;
  return v;
}
const VOID_MASK = buildVoidMask();
function isVoid(x,y){
  if(y<0||x<0||y>=MAP_ROWS||x>=MAP_COLS) return true;
  return VOID_MASK[y][x];
}

/** Full region rectangles (square cells only).
 *  Layout matches the CP2020 Netspace schematic (PACIFICA W/E, OLYMPIA,
 *  RUSTBELT, EUROPE, SOVSPACE, AFRICANI, ATLANTIS, TOKYO CHIBA). */
const NET_REGIONS = [
  {name:'PACIFICA',    x:0,  y:3,  w:3, h:9, fill:'#1a3a28', hatch:null},
  {name:'OLYMPIA',     x:3,  y:3,  w:2, h:4, fill:'#1a3020', hatch:'diag'},
  {name:'RUSTBELT',    x:5,  y:3,  w:3, h:5, fill:'#2a2a22', hatch:null},
  // EUROPE width 3 (x8–10)
  {name:'EUROPE',      x:8,  y:3,  w:3, h:4, fill:'#222038', hatch:'diag'},
  // SOVSPACE: w5 h3, shifted 1 left → pressed to Europe (x11–15, y4–6)
  {name:'SOVSPACE',    x:11, y:4,  w:5, h:3, fill:'#1a1010', hatch:'dense'},
  // ATLANTIS width 8 height 5 (x3–10)
  {name:'ATLANTIS',    x:3,  y:7,  w:8, h:5, fill:'#1a2830', hatch:null},
  // AFRICANI under Sov / east of Atlantis
  {name:'AFRICANI',    x:11, y:7,  w:5, h:5, fill:'#2a2818', hatch:'diag'},
  // PACIFICA E +1 width, pressed to Sov (x16–20)
  {name:'PACIFICA E',  x:16, y:3,  w:5, h:10, fill:'#1a3a28', hatch:null},
  // TOKYO CHIBA last: solid zone over eastern Pacifica
  {name:'TOKYO CHIBA', x:18, y:6,  w:2, h:2, fill:'#183040', hatch:'diag'},
];


// expose for modules / game
window.PROGRAM_DB = PROGRAM_DB;
window.ICE_LORE = ICE_LORE;
window.SAMPLE_FORT = SAMPLE_FORT;
window.LDL_DB = LDL_DB;
window.MAP_COLS = MAP_COLS;
window.MAP_ROWS = MAP_ROWS;
window.VOID_MASK = VOID_MASK;
window.NET_REGIONS = NET_REGIONS;
window.isVoid = isVoid;
window.buildVoidMask = buildVoidMask;
