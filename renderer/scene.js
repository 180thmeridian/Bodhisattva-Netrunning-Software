/* scene.js — Phaser NetScene */
const TILE_W=56, TILE_H=28;
class NetScene extends Phaser.Scene {
  constructor(){super('NetScene')}
  create(){
    S.scene=this; this.mapRoot=this.add.container(0,0); this.runnerGfx=null;
    this.cameras.main.setBackgroundColor('#010402');
    this.input.on('wheel',(p,o,dx,dy)=>{ this.cameras.main.zoom=Phaser.Math.Clamp(this.cameras.main.zoom-dy*0.001,0.5,2.0); });
    let drag=null;
    this.input.on('pointerdown',p=>{ if(p.middleButtonDown()||p.rightButtonDown()) drag={x:p.x,y:p.y,cx:this.cameras.main.scrollX,cy:this.cameras.main.scrollY}; });
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
    for(const {x,y,c} of cells){
      const {sx,sy}=this.iso(x,y);
      const h=(c.type==='wall'||c.type==='ice')?10:(c.type==='gate'?6:0);
      this.drawDiamond(g,sx,sy,this.fillFor(c.type),this.edgeFor(c.type),h);
      let icon='·';
      if(c.type==='wall') icon='▓'; else if(c.type==='breach') icon='░';
      else if(c.type==='gate') icon='▣'; else if(c.type==='gate-open') icon='□';
      else if(c.type==='cpu') icon='◆'; else if(c.type==='mu') icon='◉';
      else if(c.type==='ice') icon='☠'; else if(c.type==='remote') icon='◎';
      const col='#'+this.edgeFor(c.type).toString(16).padStart(6,'0');
      const ty=sy-(h?h+2:2);
      this.mapRoot.add(this.add.text(sx,ty,icon,{fontFamily:'Courier New',fontSize:c.type==='ice'?'15px':'12px',color:col}).setOrigin(0.5));
      if(c.type==='wall'||c.type==='gate'||c.type==='ice')
        this.mapRoot.add(this.add.text(sx,ty+12,String(c.str),{fontFamily:'Courier New',fontSize:'9px',color:col}).setOrigin(0.5));
    }
    this.drawRunner(); this.centerCam(S.runner.x,S.runner.y);
    this.setupIceHover();
  }
  drawRunner(){
    if(this.runnerGfx){this.runnerGfx.destroy();this.runnerGfx=null}
    if(!S.fort) return;
    const {sx,sy}=this.iso(S.runner.x,S.runner.y);
    const c=this.add.container(sx,sy-12);
    const ring=this.add.circle(0,14,16,0x33ff66,0.0).setStrokeStyle(1,0x33ff66,0.35);
    const aura=this.add.circle(0,12,12,0x33ff66,0.18);
    const body=this.add.text(0,0,'@',{fontFamily:'Courier New',fontSize:'20px',color:'#33ff66',stroke:'#041208',strokeThickness:3}).setOrigin(0.5);
    c.add([ring,aura,body]); this.mapRoot.add(c); this.runnerGfx=c;
    this.tweens.add({targets:aura,alpha:0.45,duration:650,yoyo:true,repeat:-1});
    this.tweens.add({targets:ring,scaleX:1.25,scaleY:1.25,alpha:0.15,duration:900,yoyo:true,repeat:-1});
  }
  centerCam(gx,gy){ const {sx,sy}=this.iso(gx,gy); this.cameras.main.centerOn(sx,sy); }

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
      if(c.type==='ice'){
        tipShow(tipHtmlProgram({name:c.name,cls:'ICE',str:c.str,mu:'—',note:''}, true), pointer.x, pointer.y);
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
    const circ=this.add.circle(sx,sy,8,color,0.9); this.mapRoot.add(circ);
    this.tweens.add({targets:circ,scale:3.4,alpha:0,duration:520,onComplete:()=>circ.destroy()});
    for(let i=0;i<8;i++){
      const ang=Math.random()*Math.PI*2, dist=12+Math.random()*28;
      const px=sx+Math.cos(ang)*4, py=sy+Math.sin(ang)*4;
      const p=this.add.circle(px,py,2+Math.random()*2,color,0.95); this.mapRoot.add(p);
      this.tweens.add({
        targets:p,
        x:sx+Math.cos(ang)*dist, y:sy+Math.sin(ang)*dist,
        alpha:0, duration:400+Math.random()*300,
        onComplete:()=>p.destroy()
      });
    }
    if(typeof spawnCssSparks==='function') spawnCssSparks(6, '#'+color.toString(16).padStart(6,'0'));
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
