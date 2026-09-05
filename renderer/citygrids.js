/* citygrids.js — local City Grid maps per LDL (simplified from Guide to the Net) */
const CITY_GRIDS = {
  nightcity: {
    name:'Night City City Grid', region:'Pacifica', cols:12, rows:10,
    note:'Arisaka / Militech / dense corp nodes · Pacifica LDL hub',
    nodes:[
      {x:1,y:1,t:'ldl',label:'LDL Uplink'},
      {x:3,y:2,t:'corp',label:'Arisaka'},
      {x:5,y:2,t:'corp',label:'Militech'},
      {x:7,y:2,t:'corp',label:'Petrochem'},
      {x:9,y:2,t:'media',label:'Net 54'},
      {x:2,y:4,t:'pub',label:'Combat Zone BBS'},
      {x:4,y:4,t:'corp',label:'Zetatech'},
      {x:6,y:4,t:'bank',label:'EuroBank'},
      {x:8,y:4,t:'pub',label:'DataTerm Hub'},
      {x:5,y:6,t:'gov',label:'NCPD Net'},
      {x:3,y:7,t:'corp',label:'EBM'},
      {x:7,y:7,t:'media',label:'WNS'},
      {x:9,y:8,t:'pub',label:'University'},
    ]
  },
  seattle: {
    name:'Seattle City Grid', region:'Pacifica', cols:10, rows:8,
    note:'Arisaka stronghold · US West',
    nodes:[
      {x:1,y:1,t:'ldl',label:'LDL Uplink'},
      {x:4,y:2,t:'corp',label:'Arisaka'},
      {x:6,y:2,t:'corp',label:'Microtech'},
      {x:3,y:4,t:'pub',label:'Street BBS'},
      {x:5,y:4,t:'gov',label:'Netwatch Desk'},
      {x:7,y:5,t:'corp',label:'Orbital Air'},
    ]
  },
  tokyo: {
    name:'Tokyo / Chiba Grid', region:'TokyoChiba', cols:11, rows:9,
    note:'Dense closet of rhinos · Arisaka Castle VR · FACS links',
    nodes:[
      {x:1,y:1,t:'ldl',label:'LDL Uplink'},
      {x:5,y:1,t:'ldl',label:'Glass LDL'},
      {x:3,y:3,t:'corp',label:'Arisaka Castle'},
      {x:6,y:3,t:'corp',label:'FACS'},
      {x:8,y:3,t:'corp',label:'Kendachi'},
      {x:4,y:5,t:'pub',label:'Chiba Market'},
      {x:7,y:5,t:'media',label:'Disney LDL'},
      {x:5,y:7,t:'gov',label:'METI Net'},
    ]
  },
  hongkong: {
    name:'Hong Kong–Macao Grid', region:'Pacifica', cols:10, rows:8,
    note:'Default LDL · Far East Co-Prosperity · Netwatch SEC2 · Port Authority terminal',
    nodes:[
      {x:1,y:1,t:'ldl',label:'LDL Uplink'},
      {x:4,y:2,t:'corp',label:'Arisaka'},
      {x:6,y:2,t:'corp',label:'EBM'},
      {x:3,y:4,t:'bank',label:'Pacific Rim Trust'},
      {x:5,y:4,t:'pub',label:'Harbor BBS'},
      {x:8,y:4,t:'port',label:'Hongkong Port Terminal', action:'hkpa'},
      {x:7,y:5,t:'gov',label:'Netwatch'},
      {x:4,y:6,t:'media',label:'WNS Far East'},
    ]
  },
  london: {
    name:'London City Grid', region:'Europe', cols:10, rows:8,
    note:'EuroTheatre · street heat like Night City',
    nodes:[
      {x:1,y:1,t:'ldl',label:'LDL Uplink'},
      {x:4,y:2,t:'gov',label:'Netwatch HQ'},
      {x:6,y:2,t:'bank',label:'City Banks'},
      {x:3,y:4,t:'corp',label:'EBM Europe'},
      {x:5,y:4,t:'pub',label:'Underground BBS'},
      {x:7,y:5,t:'media',label:'BBC Net'},
    ]
  },
  berlin: {
    name:'Berlin City Grid', region:'Europe', cols:12, rows:10,
    note:'Largest city grid by area · EC de facto capital',
    nodes:[
      {x:1,y:1,t:'ldl',label:'LDL Uplink'},
      {x:5,y:2,t:'gov',label:'EC Core'},
      {x:8,y:2,t:'gov',label:'Netwatch EC'},
      {x:3,y:4,t:'corp',label:'German Nat. Corps'},
      {x:6,y:4,t:'bank',label:'EuroBank'},
      {x:9,y:4,t:'media',label:'WNS Europe'},
      {x:4,y:6,t:'pub',label:'Artist VR'},
      {x:7,y:7,t:'corp',label:'IEC'},
    ]
  },
  paris: {
    name:'Paris City Grid', region:'Europe', cols:10, rows:8,
    note:'Dream-painting · virtual sculpture BBSs',
    nodes:[
      {x:1,y:1,t:'ldl',label:'LDL Uplink'},
      {x:4,y:2,t:'pub',label:'VR Gallery'},
      {x:6,y:2,t:'corp',label:'EBM'},
      {x:3,y:4,t:'gov',label:'French Net'},
      {x:5,y:5,t:'media',label:'Euro Media'},
      {x:7,y:6,t:'bank',label:'Credit Suisse'},
    ]
  },
  moscow: {
    name:'Moscow City Grid', region:'SovSpace', cols:10, rows:8,
    note:'Beautiful architecture · tourist EC runners',
    nodes:[
      {x:1,y:1,t:'ldl',label:'LDL Uplink'},
      {x:4,y:2,t:'gov',label:'SRC HQ Link'},
      {x:6,y:2,t:'corp',label:'SovOil'},
      {x:3,y:4,t:'pub',label:'Museum VR'},
      {x:5,y:5,t:'gov',label:'Net Militia'},
      {x:7,y:6,t:'media',label:'State News'},
    ]
  },
  havana: {
    name:'Havana City Grid', region:'Atlantis', cols:10, rows:8,
    note:'US netrunner flea market · gauntlet on downlink',
    nodes:[
      {x:1,y:1,t:'ldl',label:'LDL Uplink'},
      {x:4,y:2,t:'pub',label:'Black Market'},
      {x:6,y:2,t:'corp',label:'CAF'},
      {x:3,y:4,t:'pub',label:'Fixer BBS'},
      {x:5,y:5,t:'corp',label:'Corp Gauntlet'},
      {x:7,y:6,t:'media',label:'WNS Desk'},
    ]
  },
  nairobi: {
    name:'Nairobi City Grid', region:'Afrikani', cols:10, rows:8,
    note:'Biggest modern Afrikani grid · Orbital Air presence',
    nodes:[
      {x:1,y:1,t:'ldl',label:'LDL Uplink'},
      {x:4,y:2,t:'corp',label:'Orbital Air'},
      {x:6,y:2,t:'corp',label:'WorldSat'},
      {x:3,y:4,t:'pub',label:'Local BBS'},
      {x:5,y:5,t:'gov',label:'City Sysop'},
      {x:7,y:6,t:'bank',label:'Trade Hub'},
    ]
  },
  denver: {
    name:'Denver City Grid', region:'Olympia', cols:10, rows:8,
    note:'Orbital Air / miltech interior · teleporter room rumors',
    nodes:[
      {x:1,y:1,t:'ldl',label:'LDL Uplink'},
      {x:4,y:2,t:'corp',label:'Orbital Air'},
      {x:6,y:2,t:'corp',label:'Militech'},
      {x:3,y:4,t:'pub',label:'Free State BBS'},
      {x:5,y:5,t:'gov',label:'Local Watch'},
    ]
  },
  ny: {
    name:'NYC / BosWash Grid', region:'Rustbelt', cols:11, rows:9,
    note:'Grand Americana · heavy Netwatch',
    nodes:[
      {x:1,y:1,t:'ldl',label:'LDL Uplink'},
      {x:4,y:2,t:'gov',label:'Netwatch'},
      {x:7,y:2,t:'gov',label:'US Gov Net'},
      {x:3,y:4,t:'corp',label:'EBM'},
      {x:5,y:4,t:'bank',label:'Wall Street'},
      {x:8,y:4,t:'media',label:'Net 54 East'},
      {x:4,y:6,t:'pub',label:'Street Nodes'},
      {x:6,y:7,t:'corp',label:'IEC'},
    ]
  },
  melbourne: {
    name:'Melbourne City Grid', region:'Pacifica', cols:9, rows:7,
    note:'Southern Pacifica tower',
    nodes:[
      {x:1,y:1,t:'ldl',label:'LDL Uplink'},
      {x:4,y:2,t:'corp',label:'EBM Aus'},
      {x:6,y:3,t:'pub',label:'Local BBS'},
      {x:3,y:4,t:'gov',label:'Netwatch'},
    ]
  },
};
window.CITY_GRIDS = CITY_GRIDS;
