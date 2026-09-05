/* CP2020 Netrun Terminal — World NetMap (cached static layer) */
(function(){
  const MAP_COLS = window.MAP_COLS;
  const MAP_ROWS = window.MAP_ROWS;
  const NET_REGIONS = window.NET_REGIONS;
  const LDL_DB = window.LDL_DB;
  const isVoid = window.isVoid;

  let staticCache = null; // {w,h,dpr,canvas}
  let lastDrawKey = '';

  function mapMetrics(size){
    const w=size.width, h=size.height;
    const padX=0.04, padY=0.08;
    const scaleX = w*(1-2*padX)/MAP_COLS;
    const scaleY = h*(1-2*padY)/MAP_ROWS;
    const ox = w*padX, oy = h*padY;
    // continuous LDL coords (not grid-snapped)
    const toS = (x,y)=>({sx:ox+x*scaleX, sy:oy+y*scaleY});
    // integer cell rect for region paint
    const cell = (x,y)=>({x:ox+x*scaleX, y:oy+y*scaleY, w:scaleX, h:scaleY});
    return {w,h,scaleX,scaleY,ox,oy,toS,cell};
  }

  function hatchRect(ctx, x, y, w, h, mode){
    ctx.save();
    ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
    ctx.strokeStyle='rgba(180,180,160,0.12)';
    ctx.lineWidth=1;
    if(mode==='diag'){
      for(let i=-h;i<w+h;i+=6){
        ctx.beginPath(); ctx.moveTo(x+i,y); ctx.lineTo(x+i+h,y+h); ctx.stroke();
      }
    } else if(mode==='dense'){
      ctx.fillStyle='rgba(0,0,0,0.35)';
      ctx.fillRect(x,y,w,h);
      for(let i=-h;i<w+h;i+=4){
        ctx.beginPath(); ctx.moveTo(x+i,y); ctx.lineTo(x+i+h,y+h); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function regionAt(x,y){
    for(const r of NET_REGIONS){
      if(x>=r.x && x<r.x+r.w && y>=r.y && y<r.y+r.h) return r.name;
    }
    return null;
  }

  /** Build or reuse offscreen canvas with static regions + grid + labels */
  function ensureStaticLayer(rw, rh, dpr){
    const key = rw+'x'+rh+'@'+dpr;
    if(staticCache && lastDrawKey===key) return staticCache;
    const off = document.createElement('canvas');
    off.width = Math.floor(rw*dpr);
    off.height = Math.floor(rh*dpr);
    const ctx = off.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const M = mapMetrics({width:rw,height:rh});
    const {cell,ox,oy,scaleX,scaleY} = M;

    // bg
    ctx.fillStyle='#060808';
    ctx.fillRect(0,0,rw,rh);

    // regions (full squares)
    for(const r of NET_REGIONS){
      for(let yy=r.y; yy<r.y+r.h; yy++){
        for(let xx=r.x; xx<r.x+r.w; xx++){
          if(isVoid(xx,yy)) continue;
          const cc=cell(xx,yy);
          ctx.fillStyle=r.fill;
          ctx.fillRect(cc.x, cc.y, scaleX, scaleY);
          if(r.hatch) hatchRect(ctx, cc.x, cc.y, scaleX, scaleY, r.hatch);
        }
      }
    }

    // labels
    for(const r of NET_REGIONS){
      const c=cell(r.x, r.y);
      const ww=r.w*scaleX, hh=r.h*scaleY;
      ctx.fillStyle='rgba(160,180,160,0.55)';
      if(r.name==='OLYMPIA'){
        ctx.save();
        ctx.translate(c.x + ww*0.55, c.y + hh*0.55);
        ctx.rotate(-Math.PI/2);
        ctx.font='bold 12px Courier New';
        ctx.textAlign='center';
        ctx.fillText(r.name, 0, 0);
        ctx.restore();
      } else if(r.name==='TOKYO CHIBA'){
        ctx.font='bold 10px Courier New';
        ctx.textAlign='center';
        ctx.fillText('TOKYO', c.x + ww/2, c.y + hh*0.4);
        ctx.fillText('CHIBA', c.x + ww/2, c.y + hh*0.7);
        ctx.textAlign='left';
      } else if(r.name==='PACIFICA E'){
        ctx.font='bold 11px Courier New';
        ctx.textAlign='center';
        ctx.fillText('PACIFICA', c.x + ww/2, c.y + 16);
        ctx.textAlign='left';
      } else {
        ctx.font='bold 11px Courier New';
        ctx.textAlign='left';
        ctx.fillText(r.name, c.x+6, c.y+14);
      }
    }

    // grid
    ctx.strokeStyle='rgba(140,160,140,0.22)';
    ctx.lineWidth=1;
    for(let x=0;x<=MAP_COLS;x++){
      ctx.beginPath();
      ctx.moveTo(ox+x*scaleX, oy);
      ctx.lineTo(ox+x*scaleX, oy+MAP_ROWS*scaleY);
      ctx.stroke();
    }
    for(let y=0;y<=MAP_ROWS;y++){
      ctx.beginPath();
      ctx.moveTo(ox, oy+y*scaleY);
      ctx.lineTo(ox+MAP_COLS*scaleX, oy+y*scaleY);
      ctx.stroke();
    }

    // outer frame
    ctx.strokeStyle='rgba(180,200,180,0.5)';
    ctx.lineWidth=2;
    ctx.strokeRect(ox, oy, MAP_COLS*scaleX, MAP_ROWS*scaleY);

    // footer caption
    ctx.fillStyle='rgba(120,150,120,0.7)';
    ctx.font='10px Courier New';
    ctx.textAlign='left';
    ctx.fillText('WORLD NET MAP (NETSPACE) · 21×13 · CP2020', ox, oy+MAP_ROWS*scaleY+16);
    ctx.fillText('5 spaces/turn · LDL LINK spoof · Trace stacks', ox+280, oy+MAP_ROWS*scaleY+16);

    staticCache = off;
    lastDrawKey = key;
    return off;
  }

  function invalidateNetmapCache(){
    staticCache = null;
    lastDrawKey = '';
  }

  function drawWorldNetMap(){
    const cv=document.getElementById('netmap-canvas');
    if(!cv) return;
    const wrap=document.getElementById('netmap-canvas-wrap');
    const dpr=window.devicePixelRatio||1;
    const rw=wrap.clientWidth||800, rh=wrap.clientHeight||500;
    cv.width=Math.floor(rw*dpr); cv.height=Math.floor(rh*dpr);
    cv.style.width=rw+'px'; cv.style.height=rh+'px';
    const ctx=cv.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);

    // 1) blit cached static layer
    const off = ensureStaticLayer(rw, rh, dpr);
    ctx.drawImage(off, 0, 0, rw, rh);

    const M=mapMetrics({width:rw,height:rh});
    const {toS,cell,ox,oy,scaleX,scaleY}=M;

    // 2) dynamic: path + LDL nodes (from S)
    const S = window.S;
    if(!S) return;

    const cur = typeof window.currentLdl==='function' ? window.currentLdl() : null;
    if(cur && S.pathTrace && S.pathTrace.length>1){
      ctx.strokeStyle='rgba(255,170,51,0.55)';
      ctx.lineWidth=2;
      ctx.setLineDash([5,4]);
      ctx.beginPath();
      S.pathTrace.forEach((id,i)=>{
        const l = LDL_DB.find(x=>x.id===id); if(!l) return;
        const s=toS(l.x,l.y);
        if(i===0) ctx.moveTo(s.sx,s.sy); else ctx.lineTo(s.sx,s.sy);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const moveLeft=S.netMoveLeft||0;
    LDL_DB.forEach(l=>{
      const s=toS(l.x,l.y);
      const here=l.id===S.netLoc;
      const dist=cur && typeof window.ldlDist==='function' ? window.ldlDist(cur,l) : 99;
      const inRange=!here && dist<=moveLeft;
      const sz=here?7:5;
      if(here){
        ctx.fillStyle='rgba(51,204,255,0.2)';
        ctx.beginPath(); ctx.arc(s.sx,s.sy,14,0,Math.PI*2); ctx.fill();
      } else if(inRange){
        ctx.fillStyle='rgba(255,170,51,0.15)';
        ctx.beginPath(); ctx.arc(s.sx,s.sy,11,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle=here?'#33ccff':(inRange?'#ffaa33':'#33ff66');
      ctx.strokeStyle=here?'#e0f8ff':'#0a1a0a';
      ctx.lineWidth=1.5;
      ctx.fillRect(s.sx-sz, s.sy-sz, sz*2, sz*2);
      ctx.strokeRect(s.sx-sz, s.sy-sz, sz*2, sz*2);
      ctx.font='9px Courier New';
      ctx.fillStyle='rgba(200,220,200,0.85)';
      ctx.textAlign='center';
      ctx.fillText(l.city, s.sx, s.sy+sz+11);
      ctx.textAlign='left';
    });
  }

  function netmapHitTest(clientX, clientY){
    const cv=document.getElementById('netmap-canvas');
    const wrap=document.getElementById('netmap-canvas-wrap');
    if(!cv||!wrap) return null;
    const rect=cv.getBoundingClientRect();
    const rw=wrap.clientWidth||800, rh=wrap.clientHeight||500;
    const M=mapMetrics({width:rw,height:rh});
    const mx=((clientX-rect.left)/rect.width)*rw;
    const my=((clientY-rect.top)/rect.height)*rh;
    const hitR = Math.max(14, Math.min(M.scaleX, M.scaleY)*0.55);
    let best=null, bestD=hitR*hitR;
    for(const l of LDL_DB){
      const s=M.toS(l.x,l.y);
      const dx=s.sx-mx, dy=s.sy-my;
      const d=dx*dx+dy*dy;
      if(d<=bestD){ bestD=d; best=l; }
    }
    return best;
  }

  // exports
  window.mapMetrics = mapMetrics;
  window.hatchRect = hatchRect;
  window.regionAt = regionAt;
  window.drawWorldNetMap = drawWorldNetMap;
  window.netmapHitTest = netmapHitTest;
  window.invalidateNetmapCache = invalidateNetmapCache;
  window.ensureStaticLayer = ensureStaticLayer;
})();
