/* scene.js — Phaser NetScene */
const TILE_W=56, TILE_H=28;
class NetScene extends Phaser.Scene {
  constructor(){super('NetScene')}
  create(){
    S.scene=this; this.mapRoot=this.add.container(0,0); this.runnerGfx=null;
    this.cameras.main.setBackgroundColor('#010402');
    this.cameras.main.setRoundPixels(true);
    this.input.on('wheel',(p,o,dx,dy)=>{ this.cameras.main.zoom=Phaser.Math.Clamp(this.cameras.main.zoom-dy*0.001,0.5,2.0); });
    let drag=null;
    if(typeof S.camFree==='undefined') S.camFree=false;
    this.input.on('pointerdown',p=>{
      if(p.middleButtonDown()||p.rightButtonDown()){
        // free-look: unlock camera follow until re-centered
        S.camFree=true;
        drag={x:p.x,y:p.y,cx:this.cameras.main.scrollX,cy:this.cameras.main.scrollY};
        return;
      }
      // left-click: demon route waypoint
      if(S.demonPlan && p.leftButtonDown()){
        const wx=p.worldX, wy=p.worldY;
        // iso inverse approx — reuse grid hit from hover logic
        let best=null, bestD=1e9;
        if(S.grid){
          for(let y=0;y<S.grid.length;y++){
            for(let x=0;x<(S.grid[0]||[]).length;x++){
              // world pos of tile center from scene helpers if any
              const sx = (x - y) * (TILE_W/2);
              const sy = (x + y) * (TILE_H/2);
              const d = (wx-sx)*(wx-sx)+(wy-sy)*(wy-sy);
              if(d<bestD){ bestD=d; best={x,y}; }
            }
          }
        }
        if(best && bestD < 50*50){
          demonPlanAddTile(best.x, best.y);
        }
      }
    });
    this.input.on('pointerup',()=>drag=null);
    this.input.on('pointermove',p=>{ if(!drag) return; this.cameras.main.scrollX=drag.cx-(p.x-drag.x); this.cameras.main.scrollY=drag.cy-(p.y-drag.y); });
    if(S.fort) this.rebuildMap(); else this.showPlaceholder();
    // ambient data-rain in empty space
    this._rain=[];
    for(let i=0;i<18;i++){
      const t=this.add.text(
        (Math.random()-0.5)*800,
        (Math.random()-0.5)*600,
        Math.random()>0.5?'01':'10',
        {fontFamily:'Courier New',fontSize:'10px',color:'#0a3a18'}
      ).setAlpha(0.15);
      this._rain.push(t);
    }
    this.time.addEvent({
      delay:80, loop:true,
      callback:()=>{
        for(const t of this._rain){
          t.y+=3+Math.random()*4;
          if(t.y>400){ t.y=-400; t.x=(Math.random()-0.5)*800; }
        }
      }
    });
  }
  iso(x,y){
    const v=(typeof viewXY==='function'&&S.fort)?viewXY(x,y):{x,y};
    return{sx:(v.x-v.y)*(TILE_W/2),sy:(v.x+v.y)*(TILE_H/2)}
  }
  showPlaceholder(){
    this.mapRoot.removeAll(true);
    this.mapRoot.add(this.add.text(0,0,'NETRUN 1.0\nLOAD JSON or SAMPLE',{fontFamily:'Courier New',fontSize:'18px',color:'#1a8033',align:'center'}).setOrigin(0.5));
    this.cameras.main.centerOn(0,0);
  }
  fillFor(t){return ({wall:0x14332a,breach:0x0a1c12,gate:0x3a2a10,'gate-open':0x1a3a33,cpu:0x1a2a3a,mu:0x2a1a3a,ice:0x3a1520,remote:0x1a3328,empty:0x08140e})[t]||0x08140e}
  edgeFor(t){return ({wall:0x33ff66,breach:0x226644,gate:0xffaa33,'gate-open':0x33ccff,cpu:0x33ccff,mu:0xaa66ff,ice:0xff3355,remote:0x66ffaa,empty:0x1a3a22})[t]||0x1a3a22}
  drawPyramid(g,sx,sy,fill,edge,h){
    // isometric pyramid: base diamond + 4 triangular faces to apex
    const apexH = (h||14) + 16;
    const apexY = sy - apexH;
    const n = {x:sx, y:sy-TILE_H/2};
    const e = {x:sx+TILE_W/2, y:sy};
    const s = {x:sx, y:sy+TILE_H/2};
    const w = {x:sx-TILE_W/2, y:sy};
    // base (subtle)
    g.fillStyle(fill,0.35); g.lineStyle(1,edge,0.35);
    g.beginPath(); g.moveTo(n.x,n.y); g.lineTo(e.x,e.y); g.lineTo(s.x,s.y); g.lineTo(w.x,w.y); g.closePath(); g.fillPath(); g.strokePath();
    // faces (back first)
    g.fillStyle(fill,0.55); g.lineStyle(1.2,edge,0.7);
    g.fillTriangle(n.x,n.y, w.x,w.y, sx,apexY);
    g.fillTriangle(n.x,n.y, e.x,e.y, sx,apexY);
    // front faces brighter
    const lighten=(c,a)=>{
      const R=Math.min(255,((c>>16)&255)+a), G=Math.min(255,((c>>8)&255)+a), B=Math.min(255,(c&255)+a);
      return (R<<16)|(G<<8)|B;
    };
    g.fillStyle(lighten(fill,28), 0.88);
    g.fillTriangle(s.x,s.y, e.x,e.y, sx,apexY);
    g.fillStyle(lighten(fill,14), 0.92);
    g.fillTriangle(s.x,s.y, w.x,w.y, sx,apexY);
    // edges
    g.lineStyle(1.4,edge,0.95);
    g.lineBetween(sx,apexY, n.x,n.y);
    g.lineBetween(sx,apexY, e.x,e.y);
    g.lineBetween(sx,apexY, s.x,s.y);
    g.lineBetween(sx,apexY, w.x,w.y);
    g.lineStyle(1,edge,0.5);
    g.lineBetween(n.x,n.y,e.x,e.y); g.lineBetween(e.x,e.y,s.x,s.y);
    g.lineBetween(s.x,s.y,w.x,w.y); g.lineBetween(w.x,w.y,n.x,n.y);
    return apexY;
  }
  drawDiamond(g,sx,sy,fill,edge,h){
    g.fillStyle(fill,0.95); g.lineStyle(1.25,edge,0.95);
    g.beginPath(); g.moveTo(sx,sy-TILE_H/2); g.lineTo(sx+TILE_W/2,sy); g.lineTo(sx,sy+TILE_H/2); g.lineTo(sx-TILE_W/2,sy); g.closePath(); g.fillPath(); g.strokePath();
    if(h>0){
      g.fillStyle(fill,0.7);
      g.fillTriangle(sx-TILE_W/2,sy,sx-TILE_W/2,sy-h,sx,sy-TILE_H/2-h);
      g.fillTriangle(sx+TILE_W/2,sy,sx+TILE_W/2,sy-h,sx,sy-TILE_H/2-h);
      g.fillStyle(edge,0.12);
      g.beginPath(); g.moveTo(sx,sy-TILE_H/2-h); g.lineTo(sx+TILE_W/2,sy-h); g.lineTo(sx,sy+TILE_H/2-h); g.lineTo(sx-TILE_W/2,sy-h); g.closePath(); g.fillPath();
      g.lineStyle(1,edge,0.45); g.strokePath();
    }
  }
  rebuildMap(){
    this.mapRoot.removeAll(true);
    if(!S.fort||!S.grid){this.showPlaceholder();return}
    const f=S.fort; const cells=[];
    for(let y=0;y<f.rows;y++) for(let x=0;x<f.columns;x++) cells.push({x,y,c:S.grid[y][x]});
    cells.sort((a,b)=>(a.x+a.y)-(b.x+b.y));
    const g=this.add.graphics(); this.mapRoot.add(g);
    const fogOn = S.explored instanceof Set;
    for(const {x,y,c} of cells){
      const {sx,sy}=this.iso(x,y);
      const seen = !fogOn || S.explored.has((typeof key==='function'?key(x,y):(x+','+y)));
      if(!seen){
        // fog of war — slightly oversized diamond seals seams between diagonal walls
        g.fillStyle(0x030805,1);
        g.lineStyle(1,0x0a1810,0.9);
        const pad=1.5;
        g.beginPath();
        g.moveTo(sx, sy-TILE_H/2-pad);
        g.lineTo(sx+TILE_W/2+pad, sy);
        g.lineTo(sx, sy+TILE_H/2+pad);
        g.lineTo(sx-TILE_W/2-pad, sy);
        g.closePath(); g.fillPath(); g.strokePath();
        continue;
      }
      const fill=this.fillFor(c.type), edge=this.edgeFor(c.type);
      const col='#'+edge.toString(16).padStart(6,'0');

      if(c.type==='ice'){
        // programs / ICE → pyramids
        const apexY = this.drawPyramid(g,sx,sy,fill,edge,12);
        const stt = this.add.text(sx, (apexY+sy)/2 - 2, String(c.str),{
          fontFamily:'Courier New', fontSize:'16px', color:col, resolution:3,
          stroke:'#1a0508', strokeThickness:3
        }).setOrigin(0.5).setScale(0.7);
        this.mapRoot.add(stt);
        continue;
      }

      const h = c.type==='wall' ? 10 : (c.type==='gate' ? 6 : 0);
      this.drawDiamond(g,sx,sy,fill,edge,h);

      if(c.type==='wall'){
        // datawall: strength only, no glyph
        const stt = this.add.text(sx, sy - (h?h:0) - 2, String(c.str),{
          fontFamily:'Courier New', fontSize:'16px', color:col, resolution:3,
          stroke:'#041208', strokeThickness:3
        }).setOrigin(0.5).setScale(0.72);
        this.mapRoot.add(stt);
        continue;
      }

      let icon='·';
      if(c.type==='breach') icon='░';
      else if(c.type==='gate') icon='▣';
      else if(c.type==='gate-open') icon='□';
      else if(c.type==='cpu') icon='◆';
      else if(c.type==='mu') icon='◉';
      else if(c.type==='remote') icon='◎';
      else if(c.type==='empty') icon='';

      const ty = sy - (h ? h+2 : 2);
      if(icon){
        const ic = this.add.text(sx,ty,icon,{
          fontFamily:'Courier New', fontSize:'18px', color:col, resolution:3
        }).setOrigin(0.5).setScale(0.65);
        this.mapRoot.add(ic);
      }
      if(c.type==='gate'){
        const stt = this.add.text(sx, ty+11, String(c.str),{
          fontFamily:'Courier New', fontSize:'14px', color:col, resolution:3
        }).setOrigin(0.5).setScale(0.65);
        this.mapRoot.add(stt);
      }
    }
    this.drawRunner(); this.drawLotfEntity(); this.drawLotfFlies(); this.drawActiveDemons(); this.drawDemonPlan();
    if(!S.camFree) this.centerCam(S.runner.x,S.runner.y);
    this.setupIceHover();
  }
  drawRunner(){
    if(this.runnerGfx){this.runnerGfx.destroy();this.runnerGfx=null}
    if(!S.fort) return;
    const {sx,sy}=this.iso(S.runner.x,S.runner.y);
    const c=this.add.container(sx,sy-12);
    const ring=this.add.circle(0,14,16,0x33ff66,0.0).setStrokeStyle(1,0x33ff66,0.35);
    const aura=this.add.circle(0,12,12,0x33ff66,0.18);
    const body=this.add.text(0,0,'@',{fontFamily:'Courier New',fontSize:'28px',color:'#33ff66',stroke:'#041208',strokeThickness:4,resolution:3}).setOrigin(0.5).setScale(0.72);
    c.add([ring,aura,body]); this.mapRoot.add(c); this.runnerGfx=c;
    this.tweens.add({targets:aura,alpha:0.45,duration:650,yoyo:true,repeat:-1});
    this.tweens.add({targets:ring,scaleX:1.25,scaleY:1.25,alpha:0.15,duration:900,yoyo:true,repeat:-1});
  }
  centerCam(gx,gy){ const {sx,sy}=this.iso(gx,gy); this.cameras.main.centerOn(sx,sy); }
  /** Re-center on runner and lock follow until next middle-button pan */
  lockCamOnRunner(){
    S.camFree=false;
    if(S.runner) this.centerCam(S.runner.x,S.runner.y);
  }

  setupIceHover(){
    // pointer hover over ICE / gates / walls for lore tips
    this.input.off('pointermove', this._tipMove);
    this._tipMove = (pointer)=>{
      if(!S.fort||!S.grid){ tipHide(); return; }
      // invert screen to rough grid via scanning nearest tile
      let best=null, bestD=1e9;
      const cam=this.cameras.main;
      const wx=pointer.worldX, wy=pointer.worldY;
      for(let y=0;y<S.fort.rows;y++) for(let x=0;x<S.fort.columns;x++){
        const {sx,sy}=this.iso(x,y);
        const d=(sx-wx)*(sx-wx)+(sy-wy)*(sy-wy);
        if(d<bestD){ bestD=d; best={x,y}; }
      }
      if(!best||bestD>28*28){ tipHide(); return; }
      const c=S.grid[best.y][best.x];
      if(!c) { tipHide(); return; }
      if(S.explored instanceof Set && typeof isExplored==='function' && !isExplored(best.x,best.y)){ tipHide(); return; }
      if(c.type==='ice'){
        // hydrate full PROGRAM_DB entry so fort ICE shows damage/options
        let p={name:c.name,cls:'ICE',str:c.str,mu:'—',note:''};
        if(typeof PROGRAM_DB!=='undefined' && Array.isArray(PROGRAM_DB)){
          const hit=PROGRAM_DB.find(x=>String(x.name||'').toLowerCase()===String(c.name||'').toLowerCase()
            || String(x.name||'').toLowerCase()===String(c.iceName||'').toLowerCase());
          if(hit) p={...hit, str:c.str!=null?c.str:hit.str, name:c.name||hit.name};
        }
        if(typeof hydrateProgram==='function') p=hydrateProgram(p)||p;
        tipShow(tipHtmlProgram(p, true), pointer.x, pointer.y);
      } else if(c.type==='gate'||c.type==='gate-open'){
        tipShow(`<div class="tip-title">${c.label}</div><div class="tip-cls">Codegate</div>
          <div class="tip-row"><span>STR</span><b>${c.str}</b></div>
          <div class="tip-body">${c.type==='gate'?'Sealed. RUN Decryption while adjacent.':'Open. You may pass.'}</div>`, pointer.x, pointer.y);
      } else if(c.type==='wall'){
        tipShow(`<div class="tip-title">DATAWALL</div><div class="tip-cls">Barrier</div>
          <div class="tip-row"><span>STR</span><b>${c.str}</b></div>
          <div class="tip-body">RUN Intrusion while adjacent. Hammer is loud.</div>`, pointer.x, pointer.y);
      } else if(c.type==='cpu'||c.type==='mu'){
        tipShow(`<div class="tip-title">${c.label}</div><div class="tip-cls">System node</div>
          <div class="tip-body">Stand here to READ / COPY files.</div>`, pointer.x, pointer.y);
      } else {
        tipHide();
      }
    };
    this.input.on('pointermove', this._tipMove);
    this.input.on('pointerout', ()=>tipHide());
  }

  flashAt(gx,gy,color){
    const {sx,sy}=this.iso(gx,gy);
    // soft ring
    const ring=this.add.circle(sx,sy,6,color,0.0).setStrokeStyle(2,color,0.85);
    this.mapRoot.add(ring);
    this.tweens.add({targets:ring, scale:2.8, alpha:0, duration:700, ease:'Cubic.easeOut', onComplete:()=>ring.destroy()});
    const circ=this.add.circle(sx,sy,5,color,0.75); this.mapRoot.add(circ);
    this.tweens.add({targets:circ,scale:2.2,alpha:0,duration:480, ease:'Sine.easeOut', onComplete:()=>circ.destroy()});
    for(let i=0;i<10;i++){
      const ang=Math.random()*Math.PI*2, dist=14+Math.random()*32;
      const px=sx+Math.cos(ang)*3, py=sy+Math.sin(ang)*3;
      const p=this.add.circle(px,py,1.5+Math.random()*2.2,color,0.9); this.mapRoot.add(p);
      this.tweens.add({
        targets:p,
        x:sx+Math.cos(ang)*dist, y:sy+Math.sin(ang)*dist,
        alpha:0, duration:520+Math.random()*380, ease:'Cubic.easeOut',
        onComplete:()=>p.destroy()
      });
    }
    if(typeof spawnCssSparks==='function') spawnCssSparks(8, '#'+color.toString(16).padStart(6,'0'));
  }
}

function bootPhaser(){
  const wrap=document.getElementById('game-wrap');
  S.game=new Phaser.Game({
    type:Phaser.AUTO, width:wrap.clientWidth, height:wrap.clientHeight,
    parent:'phaser-host', backgroundColor:'#010402', scene:[NetScene],
    scale:{mode:Phaser.Scale.NONE}, render:{antialias:true}
  });
  window.addEventListener('resize',()=>{ if(S.game) S.game.scale.resize(wrap.clientWidth,wrap.clientHeight); });
}

window.NetScene = NetScene;
window.bootPhaser = bootPhaser;
window.TILE_W = TILE_W;
window.TILE_H = TILE_H;

NetScene.prototype.drawDemonPlan = function(){
  if(this._planGfx){ this._planGfx.destroy(); this._planGfx=null; }
  if(this._planTxt){ this._planTxt.forEach(t=>t.destroy()); this._planTxt=null; }
  if(!S.demonPlan || !S.demonPlan.path || !S.demonPlan.path.length) return;
  const g=this.add.graphics();
  this._planGfx=g;
  this._planTxt=[];
  if(this.mapRoot) this.mapRoot.add(g);
  const path=S.demonPlan.path;
  // purple route
  g.lineStyle(3, 0xaa44ff, 0.85);
  for(let i=1;i<path.length;i++){
    const a=path[i-1], b=path[i];
    const sx0=(a.x-a.y)*(TILE_W/2), sy0=(a.x+a.y)*(TILE_H/2);
    const sx1=(b.x-b.y)*(TILE_W/2), sy1=(b.x+b.y)*(TILE_H/2);
    g.lineBetween(sx0, sy0-4, sx1, sy1-4);
  }
  path.forEach((pt,idx)=>{
    const sx=(pt.x-pt.y)*(TILE_W/2), sy=(pt.x+pt.y)*(TILE_H/2);
    const col = pt.attack ? 0xff3355 : (pt.use ? 0x33ccff : 0xaa44ff);
    g.fillStyle(col, idx===0?0.35:0.7);
    g.fillCircle(sx, sy-4, idx===0?5:7);
    g.lineStyle(1.5, col, 1);
    g.strokeCircle(sx, sy-4, idx===0?5:7);
    if(pt.use || pt.attack){
      const label = pt.attack ? 'ATK' : String(pt.use).slice(0,6);
      const t=this.add.text(sx, sy-18, label,{
        fontFamily:'Courier New', fontSize:'10px', color:'#ffccff', resolution:2
      }).setOrigin(0.5);
      this._planTxt.push(t);
      if(this.mapRoot) this.mapRoot.add(t);
    }
  });
};

NetScene.prototype.drawActiveDemons = function(){
  if(this._agentGfx){ this._agentGfx.destroy(); this._agentGfx=null; }
  if(!S.activeDemons || !S.activeDemons.length) return;
  const g=this.add.graphics();
  this._agentGfx=g;
  if(this.mapRoot) this.mapRoot.add(g);
  for(const ag of S.activeDemons){
    const sx=(ag.x-ag.y)*(TILE_W/2), sy=(ag.x+ag.y)*(TILE_H/2);
    g.fillStyle(0xff66aa, 0.85);
    g.fillCircle(sx, sy-8, 8);
    g.lineStyle(1, 0xffaadd, 1);
    g.strokeCircle(sx, sy-8, 8);
  }
};


/** Lord of the Flies map icons — detailed isometric forms */
NetScene.prototype.drawLotfEntity = function(){
  if(this._lotfEntGfx){ this._lotfEntGfx.destroy(); this._lotfEntGfx=null; }
  if(this._lotfEntText){ this._lotfEntText.destroy(); this._lotfEntText=null; }
  if(!S.lotf || !S.fort) return;
  if(S.lotf.phase!=='larva' && S.lotf.phase!=='lord') return;
  if(S.lotf.x==null || S.lotf.y==null) return;
  // fog: only if explored or lord (lord is loud)
  if(S.lotf.phase==='larva' && S.explored instanceof Set && typeof isExplored==='function' && !isExplored(S.lotf.x,S.lotf.y)){
    return; // larva invisible in fog
  }
  const g=this.add.graphics();
  this._lotfEntGfx=g;
  if(this.mapRoot) this.mapRoot.add(g);
  const sx=(S.lotf.x-S.lotf.y)*(TILE_W/2), sy=(S.lotf.x+S.lotf.y)*(TILE_H/2);

  if(S.lotf.phase==='larva'){
    // cocoon / chrysalis — tall narrow prism, muted green-black
    const fill=0x1a3020, edge=0x3a6a40;
    this.drawPyramid(g, sx, sy, fill, edge, 18);
    // subtle rings
    g.lineStyle(1, 0x2a5030, 0.5);
    g.strokeCircle(sx, sy-22, 6);
    g.strokeCircle(sx, sy-28, 3);
  } else {
    // Lord — multi-tier spire with crown of "wings"
    const fill=0x4a1018, edge=0xff3355;
    // base pyramid taller
    this.drawPyramid(g, sx, sy, fill, edge, 26);
    // secondary apex cluster
    g.fillStyle(0x801028, 0.85);
    g.fillTriangle(sx, sy-48, sx-10, sy-28, sx+10, sy-28);
    g.fillStyle(0xff2040, 0.55);
    g.fillTriangle(sx, sy-56, sx-6, sy-42, sx+6, sy-42);
    // wing fins
    g.lineStyle(2, 0xff4466, 0.8);
    g.lineBetween(sx-16, sy-30, sx-28, sy-50);
    g.lineBetween(sx+16, sy-30, sx+28, sy-50);
    g.lineBetween(sx-12, sy-24, sx-22, sy-40);
    g.lineBetween(sx+12, sy-24, sx+22, sy-40);
    // eye
    g.fillStyle(0xffe0a0, 0.95);
    g.fillCircle(sx, sy-36, 3);
    g.fillStyle(0xff0000, 1);
    g.fillCircle(sx, sy-36, 1.5);
    const t=this.add.text(sx, sy-62, 'LOTF',{
      fontFamily:'Courier New', fontSize:'10px', color:'#ff6680', resolution:2
    }).setOrigin(0.5).setAlpha(0.85);
    this._lotfEntText=t;
    if(this.mapRoot) this.mapRoot.add(t);
  }
};

NetScene.prototype.drawLotfFlies = function(){
  if(this._lotfGfx){ this._lotfGfx.destroy(); this._lotfGfx=null; }
  if(!S.lotf || !S.lotf.flies || !S.lotf.flies.length) return;
  const g=this.add.graphics();
  this._lotfGfx=g;
  if(this.mapRoot) this.mapRoot.add(g);
  for(const f of S.lotf.flies){
    if(S.explored instanceof Set && typeof isExplored==='function' && !isExplored(f.x,f.y)) continue;
    const sx=(f.x-f.y)*(TILE_W/2), sy=(f.x+f.y)*(TILE_H/2);
    // mini pyramid / diamond fly
    g.fillStyle(0xff2244, 0.9);
    g.fillTriangle(sx, sy-14, sx-5, sy-4, sx+5, sy-4);
    g.fillStyle(0xaa1028, 0.8);
    g.fillTriangle(sx, sy-4, sx-5, sy-4, sx, sy+2);
    g.fillTriangle(sx, sy-4, sx+5, sy-4, sx, sy+2);
    g.lineStyle(1, 0xff6688, 0.9);
    g.lineBetween(sx-6, sy-10, sx-11, sy-16);
    g.lineBetween(sx+6, sy-10, sx+11, sy-16);
  }
};
