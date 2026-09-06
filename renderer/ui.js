/* ui.js — tooltips, clock, rotation, debug, CRT, session, program list */
function defaultPrograms(){
  const pick=n=>{const p=PROGRAM_DB.find(x=>x.name===n);return p?{...p}:null};
  S.programs=[pick('Hammer'),pick("Wizard's Book"),pick('Killer IV'),pick('Shield'),pick('Invisibility')].filter(Boolean);
  S.programs.forEach(ensureDemonSlots);
  S.selectedProg=0; renderPrograms();
}
function fillPresetSelect(){
  const sel=document.getElementById('prog-preset');
  if(!sel) return;
  const _lib=PROGRAM_DB.filter(p=>!p._unobtainable && !p._internal);
  sel.innerHTML='<option value="">— add from library ('+_lib.length+') —</option>';
  const by={};
  PROGRAM_DB.forEach((p,i)=>{ if(p._unobtainable||p._internal) return; (by[p.cls]=by[p.cls]||[]).push({p,i}); });
  Object.keys(by).sort().forEach(cls=>{
    const og=document.createElement('optgroup');
    og.label=cls+' ('+by[cls].length+')';
    by[cls].forEach(({p,i})=>{
      const o=document.createElement('option');
      o.value=i;
      o.textContent=p.name+' · STR'+p.str+' · MU'+p.mu;
      og.appendChild(o);
    });
    sel.appendChild(og);
  });
  sel.onchange=()=>{
    if(sel.value==='') return;
    const _src=PROGRAM_DB[+sel.value]; if(!_src||_src._unobtainable||_src._internal){ sel.value=''; return; }
    const _np={..._src}; if(typeof isDemon==='function' && isDemon(_np)){ _np.slots=[]; _np.baseStr=+_np.str||0; } S.programs.push(_np);
    sel.value=''; renderPrograms(); updateMu();
  };
}

/** Soft-validate Cybersmily / fort JSON before load */
function tipShow(html, clientX, clientY){
  const el=document.getElementById('tip');
  if(!el) return;
  el.innerHTML=html;
  el.classList.add('show');
  const pad=14;
  let x=clientX+14, y=clientY+14;
  const w=el.offsetWidth||260, h=el.offsetHeight||120;
  if(x+w>window.innerWidth-8) x=clientX-w-10;
  if(y+h>window.innerHeight-8) y=clientY-h-10;
  el.style.left=Math.max(8,x)+'px';
  el.style.top=Math.max(8,y)+'px';
}
function tipHide(){
  const el=document.getElementById('tip');
  if(el) el.classList.remove('show');
}
function tipHtmlProgram(p, enemy){
  if(!p) return '';
  // Prefer full library entry when note/stats are thin (fort ICE, copies)
  if(typeof PROGRAM_DB!=='undefined' && Array.isArray(PROGRAM_DB)){
    const hit=PROGRAM_DB.find(x=>String(x.name||'').toLowerCase()===String(p.name||'').toLowerCase());
    if(hit){
      p={
        ...hit,
        ...p,
        cls:p.cls&&p.cls!=='ICE'?p.cls:hit.cls,
        str:p.str!=null?p.str:hit.str,
        mu:p.mu!=null&&p.mu!=='—'?p.mu:hit.mu,
        cost:p.cost!=null?p.cost:hit.cost,
        note:(p.note&&String(p.note).trim())?p.note:hit.note
      };
    }
  }
  const cls=p.cls||p.class||'Program';
  const str=p.str!=null?p.str:(p.strength!=null?p.strength:'?');
  const mu=p.mu!=null?p.mu:'—';
  const cost=p.cost!=null?p.cost:null;
  const note=String(p.note||'').trim();
  // Pull explicit damage / options lines out of note for clearer fort tooltips
  const dmgBits=[];
  const optBits=[];
  const noteRest=[];
  note.split(/[.;]/).map(s=>s.trim()).filter(Boolean).forEach(part=>{
    if(/\b(\d+D\d+|\d+d\d+|damage|dmg|wound|INT|REF)\b/i.test(part)) dmgBits.push(part);
    else if(/\b(turns?|silent|noisy|loud|chase|trace|invisible|disguise|variant|max |per )\b/i.test(part)) optBits.push(part);
    else noteRest.push(part);
  });
  let lore='';
  if(enemy){
    const key=String(p.name||'').toLowerCase();
    for(const k of Object.keys(ICE_LORE||{})){
      if(key.includes(k)){ lore=ICE_LORE[k]; break; }
    }
  }
  return `<div class="tip-title">${p.name||'UNKNOWN'}</div>
    <div class="tip-cls">${enemy?'ICE · ':''}${cls}</div>
    <div class="tip-row"><span>STR</span><b>${str}</b></div>
    <div class="tip-row"><span>MU</span><b>${mu}</b></div>
    ${cost!=null?`<div class="tip-row"><span>COST</span><b>${cost} eb</b></div>`:''}
    ${dmgBits.length?`<div class="tip-body"><b style="color:var(--r,#f66)">Effect / dmg:</b> ${dmgBits.join('; ')}</div>`:''}
    ${optBits.length?`<div class="tip-body"><b style="color:var(--c,#6cf)">Options:</b> ${optBits.join('; ')}</div>`:''}
    ${noteRest.length?`<div class="tip-body">${noteRest.join('. ')}</div>`:(!dmgBits.length&&!optBits.length&&note?`<div class="tip-body">${note}</div>`:'')}
    ${lore?`<div class="tip-body">${lore}</div>`:''}
    ${cls==='Demon'?`<div class="tip-warn">Demon: multi-function shell — one target for Anti-IC.</div>`:''}
    ${typeof demonTipExtra==='function'?demonTipExtra(p):''}
    ${enemy&&/hellhound|bloodhound|pit.?bull|cerebus|werewolf|mastiff|fatal attractor/i.test(p.name||'')?`<div class="tip-warn">Chase-capable · Trace risk on jack-out.</div>`:''}`;
}


/* ========== Net clock (2032-08 · +1s per completed turn) ========== */
function formatNetClock(){
  const t=S.netTime;
  const pad=n=>String(n).padStart(2,'0');
  return `${t.y}-${pad(t.m)}-${pad(t.d)} · ${pad(t.h)}:${pad(t.mi)}:${pad(t.s)}`;
}
function bumpNetClock(sec){
  let t=S.netTime; t.s += sec;
  while(t.s>=60){ t.s-=60; t.mi++; }
  while(t.mi>=60){ t.mi-=60; t.h++; }
  while(t.h>=24){ t.h-=24; t.d++; }
  // simple month length 31 for demo
  while(t.d>31){ t.d-=31; t.m++; if(t.m>12){ t.m=1; t.y++; } }
  const el=document.getElementById('net-clock');
  if(el){
    el.textContent=formatNetClock();
    el.style.boxShadow='0 0 12px rgba(255,170,51,.5)';
    setTimeout(()=>{ el.style.boxShadow=''; }, 350);
  }
}
function refreshClock(){
  const el=document.getElementById('net-clock');
  if(el) el.textContent=formatNetClock();
}

/* ========== Auto-end turn when stealth (no combat, no alarm) ========== */
function maybeAutoEndTurn(){
  if(!S.fort) return;
  if(S.combatActive || S.alarm>0) return;
  if(S.moveLeft>0) return;
  // if action still available and something interactive is adjacent — wait for player
  if(S.actionLeft>0){
    const adj=neighbors4(S.runner.x,S.runner.y);
    if(adj.some(o=>o.c&&(o.c.type==='wall'||o.c.type==='gate'||o.c.type==='ice'||o.c.type==='mu'||o.c.type==='cpu'))){
      return;
    }
  }
  if(S._autoTimer) clearTimeout(S._autoTimer);
  S._autoTimer=setTimeout(()=>{
    if(!S.fort) return;
    if(S.combatActive || S.alarm>0) return;
    if(S.moveLeft>0) return;
    if(S.actionLeft>0){
      const adj=neighbors4(S.runner.x,S.runner.y);
      if(adj.some(o=>o.c&&(o.c.type==='wall'||o.c.type==='gate'||o.c.type==='ice'||o.c.type==='mu'||o.c.type==='cpu'))) return;
    }
    log('…signal idle — turn auto-closed (+1s net-time).','sys');
    endTurn(true);
  }, 420);
}

/* ========== View rotation (does not change logical grid) ========== */
function viewXY(x,y){
  const r=(S.mapRot||0)%4;
  if(!S.fort) return {x,y};
  const cols=S.fort.columns, rows=S.fort.rows;
  if(r===0) return {x,y};
  if(r===1) return {x:y, y:cols-1-x};           // 90 CW
  if(r===2) return {x:cols-1-x, y:rows-1-y};     // 180
  return {x:rows-1-y, y:x};                      // 270 CW
}
function rotateMap(dir){
  // dir +1 CW, -1 CCW — smooth spin then snap logical orientation
  if(S._rotating) return;
  if(!S.scene || !S.scene.mapRoot){
    S.mapRot = (S.mapRot + dir + 4) % 4;
    log(`Map rotation: ${S.mapRot*90}°`,'info');
    return;
  }
  S._rotating=true;
  const root=S.scene.mapRoot;
  const targetAngle=(dir>0?90:-90);
  root.angle=0;
  // spin current geometry, then snap to new logical orientation
  S.scene.tweens.add({
    targets:root,
    angle:targetAngle,
    alpha:0.35,
    duration:260,
    ease:'Cubic.easeInOut',
    onComplete:()=>{
      root.angle=0;
      root.alpha=1;
      S.mapRot = (S.mapRot + dir + 4) % 4;
      log(`Map rotation: ${S.mapRot*90}°`,'info');
      if(S.scene) S.scene.rebuildMap();
      S._rotating=false;
      spawnCssSparks(12);
    }
  });
}
function screenDirToLogical(dx,dy){
  // transform WASD screen intent into logical grid step under rotation
  const r=(S.mapRot||0)%4;
  if(r===0) return {dx,dy};
  if(r===1) return {dx:dy, dy:-dx};   // screen up was -y → logical -x after 90CW view... derive:
  // view 90CW: logical (x,y) shows at (y, cols-1-x)
  // moving "screen up" decreases viewY → ...
  // inverse of view mapping for delta:
  // r1: dx_s, dy_s → dx_l= -dy_s, dy_l = dx_s
  if(r===1) return {dx:-dy, dy:dx};
  if(r===2) return {dx:-dx, dy:-dy};
  return {dx:dy, dy:-dx}; // r3
}

function spawnCssSparks(n, color){
  const layer=document.getElementById('fx-layer');
  if(!layer) return;
  const rect=layer.getBoundingClientRect();
  for(let i=0;i<n;i++){
    const s=document.createElement('div');
    s.className='fx-spark';
    if(color) s.style.background=s.style.boxShadow=`0 0 8px ${color}`, s.style.background=color;
    s.style.left=(20+Math.random()*60)+'%';
    s.style.top=(30+Math.random()*40)+'%';
    layer.appendChild(s);
    setTimeout(()=>s.remove(), 700);
  }
}

/* Phaser ISO */
/* ========== Debug overlay (F3) ========== */
function ensureDebugDom(){
  if(document.getElementById('debug-overlay')) return;
  const d=document.createElement('div');
  d.id='debug-overlay';
  d.style.cssText='display:none;position:fixed;top:48px;left:12px;z-index:2000;background:rgba(2,10,6,.92);border:1px solid #1a3a24;color:#33ff66;font:11px/1.45 Courier New,monospace;padding:8px 12px;min-width:220px;pointer-events:none;white-space:pre';
  document.body.appendChild(d);
}
function toggleDebug(){
  S.debug=!S.debug;
  ensureDebugDom();
  const el=document.getElementById('debug-overlay');
  el.style.display=S.debug?'block':'none';
  log(S.debug?'DEBUG overlay ON (F3)':'DEBUG overlay OFF','sys');
  if(S.debug) refreshDebug();
}
function refreshDebug(){
  if(!S.debug) return;
  ensureDebugDom();
  const el=document.getElementById('debug-overlay');
  const r=S.runner||{};
  const fort=S.fort;
  const fps=(S.game&&S.game.loop)?Math.round(S.game.loop.actualFps):'—';
  el.textContent = [
    `DEBUG  seed=${S.seed??'—'}  fps=${fps}`,
    `turn=${S.turn}  move=${S.moveLeft}  act=${S.actionLeft}`,
    `alarm=${S.alarm}  wounds=${S.wounds}  intDmg=${S.intDmg}`,
    `runner @ ${r.x},${r.y}  rot=${S.mapRot}`,
    `LDL=${S.netLoc}  netMove=${S.netMoveLeft}  trace=${S.traceTotal}`,
    `mode=${S.mode}  combat=${S.combatActive}  jackLock=${S.jackLocked}`,
    fort?`fort=${fort.name||'?'}  ${fort.columns}x${fort.rows}  INT=${fort.int}`:'fort=—',
    `ICE alive=${(fort&&fort.defenses)?fort.defenses.filter(d=>!S.deadIce.has(key(d.coord.x,d.coord.y))).length:'—'}`,
    `CRT=${S.crtEnabled?'on':'off'}  logLevel=${S.logLevel}`,
  ].join('\n');
}
setInterval(()=>{ if(S.debug) refreshDebug(); }, 400);


/* ========== INT trauma → CRT / noise / palette ========== */
const INT_THEMES = ['', 'theme-invert', 'theme-amber', 'theme-ice', 'theme-blood', 'theme-violet', 'theme-toxic'];

function intTraumaTier(){
  const d = (S.intDmg|0);
  if(d<=0) return 0;
  if(d<=2) return 1;
  if(d<=4) return 2;
  if(d<=7) return 3;
  return 4;
}

function clearIntTraumaClasses(){
  const b=document.body;
  if(!b) return;
  b.classList.remove('int-trauma-1','int-trauma-2','int-trauma-3','int-trauma-4');
  const root=document.documentElement;
  INT_THEMES.forEach(t=>{ if(t) root.classList.remove(t); });
}

/** Apply persistent CRT intensity from cumulative INT loss. */
function updateIntTraumaFx(){
  const tier = intTraumaTier();
  const b=document.body;
  if(!b) return;
  b.classList.remove('int-trauma-1','int-trauma-2','int-trauma-3','int-trauma-4');
  if(tier>=1) b.classList.add('int-trauma-'+tier);

  // baseline layer opacities (CSS classes handle most; nudge nodes too)
  const noise=document.getElementById('crt-noise');
  const glitch=document.getElementById('crt-glitch');
  const scan=document.getElementById('crt-scan');
  if(noise){
    const base = [0.045, 0.08, 0.14, 0.22, 0.32][tier] ?? 0.045;
    noise.style.opacity = String(base);
  }
  if(glitch && tier>=2){
    glitch.style.opacity = String([0,0,0.12,0.22,0.35][tier]);
  } else if(glitch && tier<2){
    // leave pulse FX free to override; only clear sticky if no pulse
    if(!glitch.style.animation || glitch.style.animation==='none'){
      glitch.style.opacity = '0';
    }
  }
  if(scan){
    scan.style.opacity = tier>=2 ? '1' : '';
  }

  // re-apply locked theme if any
  if(S.intTheme){
    const root=document.documentElement;
    INT_THEMES.forEach(t=>{ if(t) root.classList.remove(t); });
    if(S.intTheme) root.classList.add(S.intTheme);
  }
}

/**
 * On INT hit: 25% chance to swap UI palette (invert / alt phosphor).
 * Sticky for the session; mild chance to stick on profile.licheScar.theme
 */
function maybeIntThemeShift(force){
  if(!force && Math.random()>=0.25) return false;
  const options = INT_THEMES.filter(Boolean);
  // avoid picking same twice in a row when possible
  let pick = options[Math.floor(Math.random()*options.length)];
  if(options.length>1 && pick===S.intTheme){
    pick = options[(options.indexOf(pick)+1+Math.floor(Math.random()*(options.length-1)))%options.length];
  }
  S.intTheme = pick;
  const root=document.documentElement;
  INT_THEMES.forEach(t=>{ if(t) root.classList.remove(t); });
  root.classList.add(pick);
  if(typeof log==='function') log('  Sensory palette shift — '+pick.replace('theme-','')+'.','bad');
  if(S.profile && Math.random()<0.4){
    S.profile.licheScar = S.profile.licheScar || {};
    S.profile.licheScar.theme = pick;
    if(typeof persistActiveProfile==='function') persistActiveProfile();
  }
  return true;
}

window.updateIntTraumaFx = updateIntTraumaFx;
window.maybeIntThemeShift = maybeIntThemeShift;
window.intTraumaTier = intTraumaTier;

/* ========== CRT toggle (F4) ========== */
function toggleCrt(){
  // CRT locked ON — keyboard toggle removed
  S.crtEnabled=true;
  ['crt-scan','crt-vignette','crt-noise','crt-glitch','crt-roll','crt-rgb','crt-glow'].forEach(id=>{
    const n=document.getElementById(id);
    if(n) n.style.display='';
  });
  log('CRT effects are locked ON.','sys');
}

/* saveSession/loadSession → saves.js */

window.renderPrograms = renderPrograms; window.defaultPrograms = defaultPrograms;
window.fillPresetSelect = fillPresetSelect;
window.tipShow = tipShow; window.tipHide = tipHide; window.tipHtmlProgram = tipHtmlProgram;
window.formatNetClock = formatNetClock; window.bumpNetClock = bumpNetClock; window.refreshClock = refreshClock;
window.maybeAutoEndTurn = maybeAutoEndTurn;
window.viewXY = viewXY; window.rotateMap = rotateMap; window.screenDirToLogical = screenDirToLogical;
window.spawnCssSparks = spawnCssSparks;
window.toggleDebug = toggleDebug; window.refreshDebug = refreshDebug;
window.toggleCrt = toggleCrt; window.saveSession = saveSession; window.loadSession = loadSession;


/* ========== Dossier photo placeholder ========== */
/** Pixelate + CRT green process for dossier portraits. */
function processAvatarToPixel(img, outW, outH){
  const pxW = 24, pxH = 29; // chunky net-ID resolution
  const small = document.createElement('canvas');
  small.width = pxW; small.height = pxH;
  const sctx = small.getContext('2d');
  sctx.imageSmoothingEnabled = false;
  // cover-fit
  const scale = Math.max(pxW/img.width, pxH/img.height);
  const sw = img.width*scale, sh = img.height*scale;
  sctx.drawImage(img, (pxW-sw)/2, (pxH-sh)/2, sw, sh);
  // read & green-tint / quantize
  const data = sctx.getImageData(0,0,pxW,pxH);
  const d = data.data;
  for(let i=0;i<d.length;i+=4){
    const r=d[i], g=d[i+1], b=d[i+2], a=d[i+3];
    if(a<20){ d[i]=d[i+1]=d[i+2]=0; continue; }
    // luminosity → green phosphor
    let y = 0.3*r + 0.59*g + 0.11*b;
    y = Math.pow(y/255, 0.85)*255; // slight contrast
    // quantize to 6 levels
    const q = Math.round(y/51)*51;
    d[i]   = Math.floor(q*0.15);
    d[i+1] = Math.min(255, Math.floor(q*1.05));
    d[i+2] = Math.floor(q*0.25);
    d[i+3] = 255;
  }
  sctx.putImageData(data,0,0);
  // scale up nearest-neighbor to dossier size
  const out = document.createElement('canvas');
  out.width = outW; out.height = outH;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.drawImage(small, 0, 0, outW, outH);
  // scanlines
  octx.fillStyle = 'rgba(0,0,0,0.22)';
  for(let y=0;y<outH;y+=2) octx.fillRect(0,y,outW,1);
  // vignette
  const vg = octx.createRadialGradient(outW/2,outH/2,outH*0.2, outW/2,outH/2,outH*0.75);
  vg.addColorStop(0,'rgba(0,0,0,0)');
  vg.addColorStop(1,'rgba(0,8,4,0.55)');
  octx.fillStyle = vg;
  octx.fillRect(0,0,outW,outH);
  // border
  octx.strokeStyle = 'rgba(51,204,255,0.4)';
  octx.lineWidth = 1;
  octx.strokeRect(1,1,outW-2,outH-2);
  octx.fillStyle = 'rgba(51,255,102,0.55)';
  octx.font = '7px Courier New';
  octx.fillText('ID', 3, 9);
  return out.toDataURL('image/png');
}

function drawDossierPhoto(){
  const cv=document.getElementById('dossier-canvas');
  if(!cv) return;
  const ctx=cv.getContext('2d');
  const w=cv.width, h=cv.height;
  const avatar = (S.profile && S.profile.avatar) || null;
  if(avatar){
    const im = new Image();
    im.onload = ()=>{
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0,0,w,h);
      ctx.drawImage(im, 0, 0, w, h);
    };
    im.src = avatar;
    return;
  }
  // default silhouette
  const g=ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,'#1a2a22'); g.addColorStop(1,'#0a1210');
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#2a3a32';
  ctx.beginPath();
  ctx.ellipse(w*0.5, h*0.38, w*0.28, h*0.26, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w*0.18, h);
  ctx.quadraticCurveTo(w*0.2, h*0.55, w*0.5, h*0.58);
  ctx.quadraticCurveTo(w*0.8, h*0.55, w*0.82, h);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(51,255,102,0.08)';
  for(let i=0;i<6;i++){
    const y=(Math.sin(i*1.7)+1)*0.5*(h-8)+2;
    ctx.fillRect(0,y,w,1+((i*3)%3));
  }
  for(let i=0;i<80;i++){
    ctx.fillStyle='rgba(180,220,180,'+(0.04+Math.random()*0.08)+')';
    ctx.fillRect(Math.random()*w, Math.random()*h, 1, 1);
  }
  ctx.strokeStyle='rgba(51,204,255,0.35)';
  ctx.lineWidth=1;
  ctx.strokeRect(2,2,w-4,h-4);
  ctx.fillStyle='rgba(51,255,102,0.5)';
  ctx.font='7px Courier New';
  ctx.fillText('ID', 4, 10);
}

function setupDossierPhotoUpload(){
  const cv=document.getElementById('dossier-photo')||document.getElementById('dossier-canvas');
  if(!cv || cv.dataset.uploadBound) return;
  cv.dataset.uploadBound='1';
  cv.style.cursor='pointer';
  cv.title='Click to upload netrunner portrait';
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='image/*'; inp.style.display='none';
  document.body.appendChild(inp);
  cv.addEventListener('click', ()=>inp.click());
  inp.addEventListener('change', ()=>{
    const f=inp.files&&inp.files[0];
    if(!f) return;
    const reader=new FileReader();
    reader.onload=()=>{
      const im=new Image();
      im.onload=()=>{
        const dataUrl = processAvatarToPixel(im, 72, 88);
        if(S.profile){
          S.profile.avatar = dataUrl;
          // persist into stored profiles list
          try{
            const list = (typeof loadProfiles==='function') ? loadProfiles() : [];
            const i = list.findIndex(p=>p.id===S.profile.id);
            if(i>=0){ list[i].avatar=dataUrl; if(typeof saveProfiles==='function') saveProfiles(list); }
          }catch(_e){}
        }
        drawDossierPhoto();
        if(typeof log==='function') log('Portrait processed — pixel ID locked to profile.','ok');
      };
      im.src = reader.result;
    };
    reader.readAsDataURL(f);
    inp.value='';
  });
}

function syncDossierHandle(){
  const inp=document.getElementById('nr-name');
  const el=document.getElementById('dossier-handle');
  if(inp&&el) el.textContent=(inp.value||'GHOST').toUpperCase();
}
window.processAvatarToPixel=processAvatarToPixel;
window.drawDossierPhoto=drawDossierPhoto;
window.setupDossierPhotoUpload=setupDossierPhotoUpload;
window.syncDossierHandle=syncDossierHandle;

/* ========== City Grid + DataFort placement ========== */
function cityGridFortList(ldlId){
  return window.FortLibrary ? window.FortLibrary.listCity(ldlId) : [];
}
function cityGridGeometry(g){
  const wrap=document.getElementById('citygrid-canvas-wrap');
  const rw=wrap?.clientWidth||600, rh=wrap?.clientHeight||400;
  const pad=24, cols=g.cols||12, rows=g.rows||10;
  return {rw,rh,pad,cols,rows,cellW:(rw-pad*2)/cols,cellH:(rh-pad*2)/rows};
}
function openCityGrid(ldlId){
  const g = (window.CITY_GRIDS||{})[ldlId];
  const ov=document.getElementById('citygrid-overlay');
  if(!ov){ log('No city-grid UI.','bad'); return; }
  if(!g){ log('No city grid registered for this LDL.','bad'); return; }
  document.getElementById('citygrid-title').textContent=g.name.toUpperCase();
  document.getElementById('citygrid-note').textContent=g.note||'';
  renderCityGridSide(ldlId,g);
  ov.classList.add('open');
  drawCityGrid(g,ldlId);
  bindCityGridHits(g,ldlId);
  S._cityGridId=ldlId;
}
function closeCityGrid(){
  const ov=document.getElementById('citygrid-overlay');
  if(ov) ov.classList.remove('open');
}
function renderCityGridSide(ldlId,g){
  const list=document.getElementById('citygrid-list');
  if(!list) return;
  list.innerHTML='<h4 style="color:var(--c);margin:0 0 6px">GRID NODES</h4>';
  (g.nodes||[]).forEach(n=>{
    const d=document.createElement('div');
    d.style.cssText='padding:4px 0;border-bottom:1px solid #1a2a20;cursor:pointer';
    d.innerHTML='<b style="color:var(--g)">'+n.label+'</b><div style="color:var(--m)">'+n.t+' · ('+n.x+','+n.y+')'+(n.action?' · <span style="color:var(--c)">INTERACT</span>':'')+'</div>';
    d.onmouseenter=()=>{ d.style.background='rgba(51,204,255,0.08)'; };
    d.onmouseleave=()=>{ d.style.background='transparent'; };
    d.onclick=()=>cityGridNodeClick(n,g);
    list.appendChild(d);
  });
  const forts=cityGridFortList(ldlId);
  const h=document.createElement('h4'); h.style.cssText='color:var(--a);margin:12px 0 5px'; h.textContent='DATAFORTS ('+forts.length+')'; list.appendChild(h);
  if(!forts.length){
    const e=document.createElement('div'); e.style.cssText='color:var(--m);font-size:10px;padding:4px 0'; e.textContent='No imported DataForts. Empty grid.'; list.appendChild(e);
  } else forts.forEach(rec=>{
    const d=document.createElement('div');
    d.className='city-fort-entry';
    d.style.cssText='padding:6px;border:1px solid #183323;margin-bottom:4px;cursor:pointer;background:#050c08';
    d.innerHTML='<b style="color:var(--a)">'+escapeHtml(rec.fort.name)+'</b><div style="color:var(--m);font-size:9px">CELL ('+rec.x+','+rec.y+') · '+rec.fort.columns+'×'+rec.fort.rows+' · '+rec.fort.defenses.length+' ICE</div><div style="display:flex;gap:4px;margin-top:4px"><button class="amber cgf-enter">ENTER</button><button class="cyan cgf-move">MOVE</button></div>';
    d.onclick=e=>{ if(e.target.tagName==='BUTTON') return; window.enterStoredFort?.(rec.id); };
    d.querySelector('.cgf-enter').onclick=e=>{e.stopPropagation(); window.enterStoredFort?.(rec.id);};
    d.querySelector('.cgf-move').onclick=e=>{e.stopPropagation(); openFortMoveDialog(rec.id);};
    d.onmouseenter=()=>d.style.borderColor='var(--a)';
    d.onmouseleave=()=>d.style.borderColor='#183323';
    list.appendChild(d);
  });
}
function escapeHtml(v){ return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function drawCityGrid(g,ldlId){
  const cv=document.getElementById('citygrid-canvas');
  const wrap=document.getElementById('citygrid-canvas-wrap');
  if(!cv||!wrap) return;
  const dpr=window.devicePixelRatio||1;
  const {rw,rh,pad,cols,rows,cellW,cellH}=cityGridGeometry(g);
  cv.width=Math.floor(rw*dpr); cv.height=Math.floor(rh*dpr);
  cv.style.width=rw+'px'; cv.style.height=rh+'px';
  const ctx=cv.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#020806'; ctx.fillRect(0,0,rw,rh);
  // Every cell is a real local-grid location. Imported forts occupy one cell.
  for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
    const px=pad+x*cellW, py=pad+y*cellH;
    ctx.fillStyle=(x+y)%2?'rgba(20,35,25,.28)':'rgba(10,24,16,.18)';
    ctx.fillRect(px,py,cellW,cellH);
    ctx.strokeStyle='rgba(80,120,90,0.25)'; ctx.lineWidth=1; ctx.strokeRect(px,py,cellW,cellH);
    ctx.fillStyle='rgba(100,140,110,.35)'; ctx.font='8px Courier New'; ctx.fillText(x+','+y,px+3,py+10);
  }
  const colors={ldl:'#33ccff',corp:'#ffaa33',gov:'#ff3355',pub:'#33ff66',bank:'#c0a0ff',media:'#ff66aa',port:'#33ffcc'};
  (g.nodes||[]).forEach(n=>{
    const cx=pad+(n.x+0.5)*cellW, cy=pad+(n.y+0.5)*cellH;
    const col=colors[n.t]||'#88aa88';
    ctx.fillStyle=col+'33'; ctx.beginPath(); ctx.arc(cx,cy,Math.min(cellW,cellH)*.3,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=col; ctx.lineWidth=2; ctx.strokeRect(cx-6,cy-6,12,12);
    ctx.fillStyle=col; ctx.font='10px Courier New'; ctx.textAlign='center'; ctx.fillText(n.label,cx,cy+Math.min(cellH,18)+4);
  });
  const forts=cityGridFortList(ldlId);
  forts.forEach(rec=>{
    const cx=pad+(rec.x+0.5)*cellW, cy=pad+(rec.y+0.5)*cellH;
    const w=Math.min(cellW*.68,72), h=Math.min(cellH*.52,42);
    ctx.fillStyle='rgba(255,170,51,.16)'; ctx.fillRect(cx-w/2,cy-h/2,w,h);
    ctx.strokeStyle='#ffaa33'; ctx.lineWidth=2; ctx.strokeRect(cx-w/2,cy-h/2,w,h);
    ctx.fillStyle='#ffaa33'; ctx.font='bold 9px Courier New'; ctx.textAlign='center';
    ctx.fillText('DATAFORT',cx,cy-2);
    ctx.font='8px Courier New'; ctx.fillText(String(rec.fort.name).slice(0,12),cx,cy+9);
  });
  ctx.textAlign='left'; ctx.fillStyle='rgba(120,160,120,0.7)'; ctx.font='11px Courier New';
  ctx.fillText(g.region+' · CITY GRID · '+cols+'×'+rows,pad,rh-8);
}
function cityGridNodeClick(n,g){
  if(n.action==='hkpa'){
    openExternalTerminal('terminals/HKPA_Terminal.html','Hongkong Port Terminal // PA Net'); return;
  }
  log((n.label||'?')+' · '+n.t+' — no interactive payload.','sys');
}
function bindCityGridHits(g,ldlId){
  const cv=document.getElementById('citygrid-canvas');
  if(!cv) return;
  cv.style.cursor='pointer';
  cv.onclick=function(ev){
    const rect=cv.getBoundingClientRect();
    const geom=cityGridGeometry(g);
    const mx=ev.clientX-rect.left, my=ev.clientY-rect.top;
    const gx=Math.floor((mx-geom.pad)/geom.cellW), gy=Math.floor((my-geom.pad)/geom.cellH);
    if(gx<0||gy<0||gx>=geom.cols||gy>=geom.rows) return;
    const fort=window.FortLibrary?.at(ldlId,gx,gy);
    if(fort){ window.enterStoredFort?.(fort.id); return; }
    const node=(g.nodes||[]).find(n=>n.x===gx&&n.y===gy);
    if(node){ cityGridNodeClick(node,g); return; }
    log(`City grid cell (${gx},${gy}) is empty.`,'sys');
  };
}
window.openCityGrid=openCityGrid;
window.closeCityGrid=closeCityGrid;
window.drawCityGrid=drawCityGrid;
window.cityGridNodeClick=cityGridNodeClick;
window.bindCityGridHits=bindCityGridHits;

/* ========== DataFort placement dialog ========== */
function openFortPlacementDialog(fort, moveId){
  let ov=document.getElementById('fort-placement-overlay');
  if(!ov){
    ov=document.createElement('div'); ov.id='fort-placement-overlay';
    ov.innerHTML=`<div id="fort-placement-box">
      <div class="fp-head"><b>INSTALL DATAFORT</b><button id="fp-close" class="red">CANCEL</button></div>
      <div id="fp-summary"></div>
      <label>CITY / LDL <select id="fp-city"></select></label>
      <div class="fp-grid-label">SELECT GRID CELL</div>
      <div id="fp-grid"></div>
      <div id="fp-selected" class="fp-selected">Select a free cell.</div>
      <div class="fp-actions"><button id="fp-install" class="cyan" disabled>INSTALL DATAFORT</button></div>
    </div>`;
    document.body.appendChild(ov);
    document.getElementById('fp-close').onclick=()=>ov.remove();
  }
  ov.__fort=fort; ov.__moveId=moveId||null;
  const citySel=ov.querySelector('#fp-city');
  citySel.innerHTML=(window.LDL_DB||[]).map(l=>`<option value="${escapeHtml(l.id)}">${escapeHtml(l.city)} · ${escapeHtml(l.region)}</option>`).join('');
  citySel.value=S.netLoc && (window.CITY_GRIDS||{})[S.netLoc] ? S.netLoc : (window.LDL_DB?.[0]?.id||'');
  ov.querySelector('#fp-summary').innerHTML=`<b>${escapeHtml(fort.name)}</b><div>${fort.columns}×${fort.rows} · ${fort.datawallNodes.length} DATAWALL · ${fort.codegates.length} GATE · ${fort.defenses.length} ICE</div>`;
  const state={cityId:citySel.value,x:null,y:null}; ov.__placement=state;
  function redraw(){ state.cityId=citySel.value; state.x=null; state.y=null; renderPlacementGrid(ov, state); }
  citySel.onchange=redraw;
  renderPlacementGrid(ov,state);
  const actionBtn=ov.querySelector('#fp-install');
  actionBtn.textContent=moveId?'MOVE DATAFORT':'INSTALL DATAFORT';
  actionBtn.onclick=()=>{
    if(state.x==null||state.y==null) return;
    try{
      if(moveId){
        const rec=window.FortLibrary.move(moveId,state.cityId,state.x,state.y);
        ov.remove();
        log(`Moved ${fort.name} to ${window.FortLibrary.cityName(state.cityId)} city grid at (${state.x},${state.y}).`,'ok');
        if(typeof openCityGrid==='function') openCityGrid(state.cityId);
        if(typeof drawWorldNetMap==='function') drawWorldNetMap();
        if(typeof renderFortLibrary==='function') renderFortLibrary();
      }else{
        const rec=window.FortLibrary.add(fort,state.cityId,state.x,state.y);
        ov.remove();
        log(`Installed ${fort.name} in ${window.FortLibrary.cityName(state.cityId)} city grid at (${state.x},${state.y}).`,'ok');
        if(typeof openCityGrid==='function') openCityGrid(state.cityId);
        if(typeof drawWorldNetMap==='function') drawWorldNetMap();
      }
    }catch(e){ log((moveId?'DATAFORT MOVE FAILED: ':'DATAFORT INSTALL FAILED: ')+e.message,'bad'); }
  };
  ov.style.display='flex';
}
function openFortMoveDialog(id){
  const rec=window.FortLibrary?.get(id);
  if(!rec){ log('DataFort entry not found.','bad'); return false; }
  openFortPlacementDialog(cloneFortObject(rec.fort), id);
  return true;
}
window.openFortMoveDialog=openFortMoveDialog;
function renderPlacementGrid(ov,state){
  const g=(window.CITY_GRIDS||{})[state.cityId]; const box=ov.querySelector('#fp-grid');
  if(!g||!box) return;
  const forts=cityGridFortList(state.cityId);
  const occupied=new Set(forts.filter(r=>r.id!==ov.__moveId).map(r=>r.x+','+r.y));
  box.style.gridTemplateColumns=`repeat(${g.cols},1fr)`; box.innerHTML='';
  for(let y=0;y<g.rows;y++) for(let x=0;x<g.cols;x++){
    const b=document.createElement('button'); b.type='button'; b.className='fp-cell'; b.textContent=x+','+y;
    const node=(g.nodes||[]).find(n=>n.x===x&&n.y===y);
    const key=x+','+y;
    if(occupied.has(key)){ b.classList.add('occupied'); b.title='Occupied by an existing DataFort'; b.disabled=true; }
    else if(node){ b.classList.add('node'); b.title=node.label; }
    b.onclick=()=>{
      state.x=x; state.y=y;
      box.querySelectorAll('.fp-cell.selected').forEach(el=>el.classList.remove('selected'));
      b.classList.add('selected');
      ov.querySelector('#fp-selected').textContent=`Selected ${window.FortLibrary.cityName(state.cityId)} · cell (${x},${y})`;
      ov.querySelector('#fp-install').disabled=false;
    };
    box.appendChild(b);
  }
}
window.openFortPlacementDialog=openFortPlacementDialog;
function openExternalTerminal(relPath, title){
  let ov=document.getElementById('ext-term-overlay');
  if(!ov){
    ov=document.createElement('div');
    ov.id='ext-term-overlay';
    ov.style.cssText='position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;background:#000;';
    ov.innerHTML='<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#0a1210;border-bottom:1px solid #1a3a24">'+
      '<b id="ext-term-title" style="color:#33ccff;letter-spacing:1px;flex:1"></b>'+
      '<button id="ext-term-close" class="red" style="padding:4px 12px">JACK OUT</button></div>'+
      '<iframe id="ext-term-frame" style="flex:1;border:0;width:100%;background:#0a0a0a" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>';
    document.body.appendChild(ov);
    document.getElementById('ext-term-close').onclick=()=>{
      const f=document.getElementById('ext-term-frame');
      if(f) f.src='about:blank';
      ov.style.display='none';
      log('Jacked out of external terminal.','sys');
    };
  }
  document.getElementById('ext-term-title').textContent=(title||'EXTERNAL TERMINAL').toUpperCase();
  const frame=document.getElementById('ext-term-frame');
  // resolve relative to current page (works for packaged + patch)
  frame.src = new URL(relPath, window.location.href).href;
  ov.style.display='flex';
  log('Accessing '+title+'…','ok');
}

window.openExternalTerminal=openExternalTerminal;

/* ========== Installed DataFort library ========== */
function openFortLibrary(){
  const ov=document.getElementById('fort-library-overlay'); if(!ov) return;
  const box=document.getElementById('fort-library-list');
  const items=window.FortLibrary?.list()||[];
  box.innerHTML='';
  if(!items.length){
    box.innerHTML='<div style="color:var(--m);padding:20px;text-align:center">No imported DataForts yet.<br>Use LOAD and choose a city-grid cell.</div>';
  } else items.forEach(rec=>{
    const row=document.createElement('div'); row.className='fl-entry';
    const city=window.FortLibrary.cityName(rec.cityId);
    row.innerHTML='<div class="fl-main"><div class="fl-name">'+escapeHtml(rec.fort.name)+'</div><div class="fl-meta">'+escapeHtml(city)+' · CELL ('+rec.x+','+rec.y+') · '+rec.fort.columns+'×'+rec.fort.rows+' · '+rec.fort.datawallNodes.length+' walls · '+rec.fort.codegates.length+' gates · '+rec.fort.defenses.length+' ICE</div></div><div class="fl-actions"><button class="cyan fl-view">GRID</button><button class="cyan fl-move">MOVE</button><button class="amber fl-enter">ENTER</button><button class="red fl-delete">DEL</button></div>';
    row.querySelector('.fl-view').onclick=()=>{ closeFortLibrary(); openCityGrid(rec.cityId); };
    row.querySelector('.fl-move').onclick=()=>{ closeFortLibrary(); openFortMoveDialog(rec.id); };
    row.querySelector('.fl-enter').onclick=()=>{ closeFortLibrary(); window.enterStoredFort?.(rec.id); };
    row.querySelector('.fl-delete').onclick=()=>{
      if(confirm('Delete installed DataFort "'+rec.fort.name+'"?')){ window.FortLibrary.remove(rec.id); renderFortLibrary(); if(S._cityGridId) openCityGrid(S._cityGridId); }
    };
    row.querySelector('.fl-main').onclick=()=>{ closeFortLibrary(); openCityGrid(rec.cityId); };
    box.appendChild(row);
  });
  ov.style.display='flex';
}
function renderFortLibrary(){
  const ov=document.getElementById('fort-library-overlay'); if(ov?.style.display==='flex') openFortLibrary();
}
function closeFortLibrary(){ const ov=document.getElementById('fort-library-overlay'); if(ov) ov.style.display='none'; }
window.openFortLibrary=openFortLibrary; window.closeFortLibrary=closeFortLibrary; window.renderFortLibrary=renderFortLibrary;

/* ========== Idle NET screensaver (30s) ========== */
let _idleTimer=null, _idleOn=false;
function resetIdleTimer(){
  if(_idleTimer) clearTimeout(_idleTimer);
  if(_idleOn) hideIdleNet();
  _idleTimer=setTimeout(showIdleNet, 30000);
}
function showIdleNet(){
  const ov=document.getElementById('idle-net');
  if(!ov) return;
  _idleOn=true;
  ov.classList.add('on');
  const w=document.getElementById('idle-net-word');
  if(w){
    w.style.left = (10 + Math.random()*50)+'%';
    w.style.top = (15 + Math.random()*45)+'%';
  }
}
function hideIdleNet(){
  const ov=document.getElementById('idle-net');
  if(ov) ov.classList.remove('on');
  _idleOn=false;
}
function setupIdleNet(){
  ['mousemove','mousedown','keydown','touchstart','wheel'].forEach(ev=>{
    window.addEventListener(ev, resetIdleTimer, {passive:true});
  });
  resetIdleTimer();
}
window.setupIdleNet=setupIdleNet;
window.resetIdleTimer=resetIdleTimer;

/* ========== AI / SYS message panel ========== */
function aiMsg(src, text){
  const feed=document.getElementById('ai-feed');
  if(!feed) return;
  const d=document.createElement('div');
  d.className='ai-line new';
  const t=new Date();
  const ts=String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0')+':'+String(t.getSeconds()).padStart(2,'0');
  d.innerHTML='<b>'+String(src||'SYS').slice(0,12)+'</b> <span style="color:#3a5a3a">'+ts+'</span> '+String(text||'');
  feed.appendChild(d);
  while(feed.children.length>40) feed.removeChild(feed.firstChild);
  feed.scrollTop=feed.scrollHeight;
  setTimeout(()=>d.classList.remove('new'), 2500);
}
window.aiMsg=aiMsg;

/* ========== Command line ========== */
function setupCommandLine(){
  const inp=document.getElementById('cmd-input');
  if(!inp) return;
  inp.addEventListener('keydown', e=>{
    if(e.key!=='Enter') return;
    e.preventDefault();
    const raw=(inp.value||'').trim();
    inp.value='';
    if(!raw) return;
    runCommand(raw);
  });
}
function runCommand(raw){
  const parts=raw.split(/\s+/);
  const cmd=(parts[0]||'').toLowerCase();
  const arg=parts.slice(1).join(' ');
  log('> '+raw,'sys');
  if(cmd==='help'){
    log('Commands: help, status, save [n], load [n], saves, netmap, jackout, stabilize, demon go|cancel|attack|use <sub>, clear, say, loc, programs, end, exit','info');
    aiMsg('HELP','help · status · demon go · demon cancel · say · jackout · stabilize');
  } else if(cmd==='status'){
    const c=typeof currentLdl==='function'?currentLdl():null;
    const lvl=(typeof woundLevel==='function')?woundLevel(S.wounds|0):{name:'?'};
    const stun = S.flatlined?'FLATLINE':(S.stunned?'STUNNED':(S.stabilized?'STABILIZED':'OK'));
    const msg=`Loc ${c?c.city:'—'} · move ${S.netMoveLeft} · alarm ${S.alarm} · wounds ${S.wounds} (${lvl.name}) · ${stun}`;
    log(msg,'info'); aiMsg('STATUS',msg);
  } else if(cmd==='netmap'){
    if(typeof openNetMap==='function') openNetMap();
    aiMsg('SYS','Opening regional NetMap…');
  } else if(cmd==='jackout'){
    if(typeof doJackout==='function') doJackout();
    else log('Jackout unavailable.','bad');
  } else if(cmd==='stabilize'||cmd==='stab'){
    if(typeof attemptStabilize==='function') attemptStabilize();
    else log('Stabilize unavailable.','bad');
  } else if(cmd==='clear'){
    const feed=document.getElementById('ai-feed');
    if(feed) feed.innerHTML='';
    aiMsg('SYS','Channel cleared.');
  } else if(cmd==='say'){
    aiMsg('YOU', arg||'…');
    const reply = (typeof conversationalReply==='function') ? conversationalReply(arg) : null;
    setTimeout(()=>{
      if(reply){ aiMsg('NET', reply); log(reply,'info'); return; }
      const replies=[
        'Acknowledged.',
        'Signal received. Processing…',
        'Interesting. Continue.',
        'Noise on the line. Repeat?',
        'Logged.',
        'That trails into black ICE territory.',
      ];
      aiMsg('ECHO', replies[Math.floor(Math.random()*replies.length)]);
    }, 400+Math.random()*600);
  } else if(cmd==='loc'){
    const c=typeof currentLdl==='function'?currentLdl():null;
    aiMsg('LOC', c?`${c.city} / ${c.region} (SEC ${c.sec})`:'unknown');
  } else if(cmd==='programs'||cmd==='progs'){
    const n=(S.programs||[]).length;
    aiMsg('DECK', n+' programs loaded · MU '+(typeof muUsed==='function'?muUsed():'?')+'/'+(document.getElementById('deck-mu')?.value||'?'));
  } else if(cmd==='demon'){
    const raw=(arg||'').trim();
    const sub=raw.toLowerCase();
    if(sub==='go'||sub==='launch'||sub==='confirm'){
      if(typeof confirmDemonPlan==='function') confirmDemonPlan();
    } else if(sub==='cancel'||sub==='stop'||sub==='abort'){
      if(typeof cancelDemonPlan==='function') cancelDemonPlan();
    } else if(sub==='status'){
      const n=(S.activeDemons||[]).length;
      log(`Active demon agents: ${n}`,'info');
      (S.activeDemons||[]).forEach(ag=>log(`  ${ag.name} @(${ag.x},${ag.y}) path ${(ag.path||[]).length}`,'info'));
    } else if(sub==='attack'){
      if(typeof demonPlanSetAttack==='function') demonPlanSetAttack();
    } else if(sub.startsWith('use ')){
      const name=raw.slice(4).trim();
      if(typeof demonPlanSetUse==='function') demonPlanSetUse(name);
    } else {
      log('Usage: demon go | cancel | status | attack | use <subname>','info');
    }
  } else if(cmd==='save'){
    if(arg && /^\d+$/.test(arg.trim())) saveToSlot(+arg.trim());
    else if(typeof promptSaveUI==='function') promptSaveUI();
  } else if(cmd==='load'){
    if(arg && /^\d+$/.test(arg.trim())) loadFromSlot(+arg.trim());
    else if(typeof promptLoadUI==='function') promptLoadUI();
  } else if(cmd==='saves'){
    (typeof listSaveSlots==='function'?listSaveSlots():[]).forEach(s=>{
      log(s.empty?`  [${s.slot}] empty`:`  [${s.slot}] ${s.label} · ${s.fort||'—'} · T${s.turn||0}`,'info');
    });
  } else if(cmd==='end'){
    if(typeof endTurn==='function') endTurn();
  } else if(cmd==='exit'||cmd==='quit'){
    if(typeof prepareQuitToNetMap==='function') prepareQuitToNetMap();
    else if(window.netrunAPI&&window.netrunAPI.quitApp) window.netrunAPI.quitApp();
    else window.close();
  } else {
    log('Unknown command: '+cmd+' (help)','bad');
    aiMsg('SYS','Unknown: '+cmd);
  }
}
window.setupCommandLine=setupCommandLine;
window.runCommand=runCommand;


/* ========== Fortress AI ambient ASCII face ========== */
/* AI face disabled — assets TBD; channel text still uses aiMsg */
function fortHasAi(fort){
  if(!fort || !fort.ai) return false;
  const a = fort.ai;
  if(typeof a === 'boolean') return a;
  if(typeof a === 'string') return a.length > 0 && a.toLowerCase() !== 'none';
  if(typeof a === 'object') return true;
  return false;
}
function renderAiFace(){ /* disabled */ }
function startAiFaceLoop(){ /* disabled */ }
function stopAiFaceLoop(){ /* disabled */ }
window.fortHasAi = fortHasAi;
window.renderAiFace = renderAiFace;
window.startAiFaceLoop = startAiFaceLoop;
window.stopAiFaceLoop = stopAiFaceLoop;

