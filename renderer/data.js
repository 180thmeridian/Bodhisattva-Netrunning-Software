/* CP2020 Netrun Terminal — pure data tables (programs, ICE, forts, LDL, regions) */
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
  "name": "Bastion of Free Will",
  "notes": "",
  "rows": 15,
  "columns": 15,
  "cost": 193800,
  "additionalCosts": 0,
  "cpu": 4,
  "cpuNodes": [
    {
      "x": 3,
      "y": 3
    },
    {
      "x": 11,
      "y": 3
    },
    {
      "x": 11,
      "y": 11
    },
    {
      "x": 3,
      "y": 11
    }
  ],
  "mu": [
    {
      "key": "Porn",
      "value": 1
    },
    {
      "key": "Financial data",
      "value": 1
    },
    {
      "key": "off-the-books accounting",
      "value": 6
    },
    {
      "key": "Porn",
      "value": 3
    },
    {
      "key": "off-the-books accounting",
      "value": 1
    },
    {
      "key": "Suspicious data",
      "value": 2
    },
    {
      "key": "Porn",
      "value": 6
    },
    {
      "key": "Financial data",
      "value": 3
    },
    {
      "key": "off-the-books accounting",
      "value": 4
    },
    {
      "key": "Financial data",
      "value": 2
    },
    {
      "key": "Suspicious data",
      "value": 3
    },
    {
      "key": "off-the-books accounting",
      "value": 1
    },
    {
      "key": "Porn",
      "value": 5
    },
    {
      "key": "Suspicious data",
      "value": 2
    },
    {
      "key": "Financial data",
      "value": 2
    },
    {
      "key": "Music",
      "value": 7
    }
  ],
  "muNodes": [
    {
      "x": 3,
      "y": 2
    },
    {
      "x": 2,
      "y": 2
    },
    {
      "x": 11,
      "y": 2
    },
    {
      "x": 12,
      "y": 2
    },
    {
      "x": 12,
      "y": 3
    },
    {
      "x": 2,
      "y": 3
    },
    {
      "x": 2,
      "y": 11
    },
    {
      "x": 2,
      "y": 12
    },
    {
      "x": 3,
      "y": 12
    },
    {
      "x": 12,
      "y": 11
    },
    {
      "x": 12,
      "y": 12
    },
    {
      "x": 11,
      "y": 12
    }
  ],
  "muAvailable": 160,
  "muUsed": 84,
  "int": 12,
  "ai": {
    "personality": "Friendly, curious",
    "reaction": "Talk to intruder to find intent",
    "icon": "Geometric"
  },
  "datawallStr": 8,
  "datawallNodes": [
    {
      "x": 4,
      "y": 12
    },
    {
      "x": 2,
      "y": 10
    },
    {
      "x": 2,
      "y": 4
    },
    {
      "x": 4,
      "y": 2
    },
    {
      "x": 10,
      "y": 2
    },
    {
      "x": 12,
      "y": 4
    },
    {
      "x": 10,
      "y": 12
    },
    {
      "x": 12,
      "y": 10
    },
    {
      "x": 6,
      "y": 3
    },
    {
      "x": 6,
      "y": 2
    },
    {
      "x": 8,
      "y": 2
    },
    {
      "x": 8,
      "y": 3
    },
    {
      "x": 11,
      "y": 6
    },
    {
      "x": 12,
      "y": 6
    },
    {
      "x": 12,
      "y": 8
    },
    {
      "x": 11,
      "y": 8
    },
    {
      "x": 8,
      "y": 11
    },
    {
      "x": 8,
      "y": 12
    },
    {
      "x": 6,
      "y": 12
    },
    {
      "x": 6,
      "y": 11
    },
    {
      "x": 3,
      "y": 8
    },
    {
      "x": 2,
      "y": 8
    },
    {
      "x": 2,
      "y": 6
    },
    {
      "x": 3,
      "y": 6
    },
    {
      "x": 3,
      "y": 9
    },
    {
      "x": 5,
      "y": 11
    },
    {
      "x": 3,
      "y": 5
    },
    {
      "x": 5,
      "y": 3
    },
    {
      "x": 9,
      "y": 3
    },
    {
      "x": 11,
      "y": 5
    },
    {
      "x": 9,
      "y": 11
    },
    {
      "x": 11,
      "y": 9
    },
    {
      "x": 12,
      "y": 13
    },
    {
      "x": 11,
      "y": 13
    },
    {
      "x": 13,
      "y": 12
    },
    {
      "x": 13,
      "y": 11
    },
    {
      "x": 3,
      "y": 13
    },
    {
      "x": 2,
      "y": 13
    },
    {
      "x": 1,
      "y": 12
    },
    {
      "x": 1,
      "y": 11
    },
    {
      "x": 11,
      "y": 1
    },
    {
      "x": 12,
      "y": 1
    },
    {
      "x": 13,
      "y": 1
    },
    {
      "x": 13,
      "y": 2
    },
    {
      "x": 13,
      "y": 3
    },
    {
      "x": 3,
      "y": 1
    },
    {
      "x": 2,
      "y": 1
    },
    {
      "x": 1,
      "y": 1
    },
    {
      "x": 1,
      "y": 2
    },
    {
      "x": 1,
      "y": 3
    },
    {
      "x": 4,
      "y": 6
    },
    {
      "x": 4,
      "y": 8
    },
    {
      "x": 10,
      "y": 8
    },
    {
      "x": 10,
      "y": 6
    },
    {
      "x": 8,
      "y": 4
    },
    {
      "x": 6,
      "y": 4
    },
    {
      "x": 6,
      "y": 10
    },
    {
      "x": 8,
      "y": 10
    }
  ],
  "codegates": [
    {
      "str": 6,
      "coord": {
        "x": 1,
        "y": 7
      }
    },
    {
      "str": 6,
      "coord": {
        "x": 13,
        "y": 7
      }
    },
    {
      "str": 6,
      "coord": {
        "x": 7,
        "y": 1
      }
    },
    {
      "str": 6,
      "coord": {
        "x": 7,
        "y": 13
      }
    },
    {
      "str": 10,
      "coord": {
        "x": 4,
        "y": 7
      }
    },
    {
      "str": 10,
      "coord": {
        "x": 7,
        "y": 4
      }
    },
    {
      "str": 10,
      "coord": {
        "x": 10,
        "y": 7
      }
    },
    {
      "str": 10,
      "coord": {
        "x": 7,
        "y": 10
      }
    },
    {
      "str": 8,
      "coord": {
        "x": 5,
        "y": 9
      }
    },
    {
      "str": 8,
      "coord": {
        "x": 5,
        "y": 5
      }
    },
    {
      "str": 8,
      "coord": {
        "x": 9,
        "y": 5
      }
    },
    {
      "str": 8,
      "coord": {
        "x": 9,
        "y": 9
      }
    }
  ],
  "files": [],
  "remotes": [],
  "skills": [
    {
      "key": "Operate Hvy. Machinery",
      "value": 10
    }
  ],
  "defenses": [
    {
      "name": "",
      "coord": {
        "x": 4,
        "y": 4
      },
      "program": {
        "name": "Cerebus",
        "description": "Pit Bull that shoots Hellbolts. Bartmoss Brainware Blowout pg. 54",
        "icon": "",
        "class": {
          "name": "anti-personnel",
          "diff": 20,
          "costMod": 25,
          "source": {
            "book": "BB",
            "page": 34
          },
          "description": "Attacks Netrunners doing 1D6 damage or mind wipe."
        },
        "options": [
          {
            "name": "Movement Ability",
            "description": "Move freely throughout the NET.",
            "diff": 5
          },
          {
            "name": "Trace",
            "description": "Follow program/runner through NET.",
            "diff": 2
          },
          {
            "name": "Pseudo-Intellect",
            "description": "Has INT 6.",
            "diff": 6
          },
          {
            "name": "Endurance",
            "description": "Never quits until destroyed.",
            "diff": 3
          }
        ],
        "loaded": false,
        "_str": 6,
        "bookMu": 7,
        "bookCost": 10500
      }
    },
    {
      "name": "",
      "coord": {
        "x": 10,
        "y": 4
      },
      "program": {
        "name": "Cerebus",
        "description": "Pit Bull that shoots Hellbolts. Bartmoss Brainware Blowout pg. 54",
        "icon": "",
        "class": {
          "name": "anti-personnel",
          "diff": 20,
          "costMod": 25,
          "source": {
            "book": "BB",
            "page": 34
          },
          "description": "Attacks Netrunners doing 1D6 damage or mind wipe."
        },
        "options": [
          {
            "name": "Movement Ability",
            "diff": 5,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Move freely throughout the NET."
          },
          {
            "name": "Trace",
            "diff": 2,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Follow program/runner through NET."
          },
          {
            "name": "Pseudo-Intellect",
            "diff": 6,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Has INT 6."
          },
          {
            "name": "Endurance",
            "diff": 3,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Never quits until destroyed."
          }
        ],
        "loaded": false,
        "_str": 6,
        "bookMu": 8,
        "bookCost": 9500
      }
    },
    {
      "name": "",
      "coord": {
        "x": 4,
        "y": 10
      },
      "program": {
        "name": "Cerebus",
        "description": "Pit Bull that shoots Hellbolts. Bartmoss Brainware Blowout pg. 54",
        "icon": "",
        "class": {
          "name": "anti-personnel",
          "diff": 20,
          "costMod": 25,
          "source": {
            "book": "BB",
            "page": 34
          },
          "description": "Attacks Netrunners doing 1D6 damage or mind wipe."
        },
        "options": [
          {
            "name": "Movement Ability",
            "diff": 5,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Move freely throughout the NET."
          },
          {
            "name": "Trace",
            "diff": 2,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Follow program/runner through NET."
          },
          {
            "name": "Pseudo-Intellect",
            "diff": 6,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Has INT 6."
          },
          {
            "name": "Endurance",
            "diff": 3,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Never quits until destroyed."
          }
        ],
        "loaded": false,
        "_str": 6,
        "bookMu": 8,
        "bookCost": 9500
      }
    },
    {
      "name": "",
      "coord": {
        "x": 10,
        "y": 10
      },
      "program": {
        "name": "Cerebus",
        "description": "Pit Bull that shoots Hellbolts. Bartmoss Brainware Blowout pg. 54",
        "icon": "",
        "class": {
          "name": "anti-personnel",
          "diff": 20,
          "costMod": 25,
          "source": {
            "book": "BB",
            "page": 34
          },
          "description": "Attacks Netrunners doing 1D6 damage or mind wipe."
        },
        "options": [
          {
            "name": "Movement Ability",
            "diff": 5,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Move freely throughout the NET."
          },
          {
            "name": "Trace",
            "diff": 2,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Follow program/runner through NET."
          },
          {
            "name": "Pseudo-Intellect",
            "diff": 6,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Has INT 6."
          },
          {
            "name": "Endurance",
            "diff": 3,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Never quits until destroyed."
          }
        ],
        "loaded": false,
        "_str": 6,
        "bookMu": 8,
        "bookCost": 9500
      }
    },
    {
      "name": "",
      "coord": {
        "x": 7,
        "y": 7
      },
      "program": {
        "name": "Liche",
        "description": "Erases 'runner's memory and over-writes personality. Bartmoss Brainware Blowout pg. 56Learning program that may crash or grow in strength. Has INT 6. Remembers events/people. Move freely throughout the NET. Recognizes programs/runners. Reduce MU 1/2. Can speak. ",
        "icon": "",
        "class": {
          "name": "anti-personnel",
          "diff": 20,
          "costMod": 25,
          "source": {
            "book": "BB",
            "page": 34
          },
          "description": "Attacks Netrunners doing 1D6 damage or mind wipe."
        },
        "options": [
          {
            "name": "Trace",
            "diff": 2,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Follow program/runner through NET."
          },
          {
            "name": "Self-Modifying Code",
            "diff": 15,
            "source": {
              "book": "BB",
              "page": 70
            },
            "description": "Learning program that may crash or grow in strength."
          },
          {
            "name": "Pseudo-Intellect",
            "diff": 6,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Has INT 6."
          },
          {
            "name": "Memory",
            "diff": 5,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Remembers events/people."
          },
          {
            "name": "Movement Ability",
            "diff": 5,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Move freely throughout the NET."
          },
          {
            "name": "Recognition",
            "diff": 2,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Recognizes programs/runners."
          },
          {
            "name": "Code Optimization",
            "diff": 10,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Reduce MU 1/2."
          },
          {
            "name": "Conversational Ability",
            "diff": 3,
            "source": {
              "book": "BB",
              "page": 34
            },
            "description": "Can speak."
          }
        ],
        "loaded": false,
        "_str": 8,
        "bookMu": 4,
        "bookCost": 7250
      }
    }
  ]
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
window.ICE_LORE = ICE_LORE;
window.SAMPLE_FORT = SAMPLE_FORT;
window.LDL_DB = LDL_DB;
window.MAP_COLS = MAP_COLS;
window.MAP_ROWS = MAP_ROWS;
window.VOID_MASK = VOID_MASK;
window.NET_REGIONS = NET_REGIONS;
window.isVoid = isVoid;
window.buildVoidMask = buildVoidMask;
