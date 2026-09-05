/* game.js — bootstrap / event wiring (modules loaded before this file) */
(function(){
  // Drop zone
  const wrapEl=document.getElementById('game-wrap');
  const hint=document.getElementById('drop-hint');
  if(wrapEl && hint){
    wrapEl.addEventListener('dragover',e=>{e.preventDefault();hint.classList.add('show')});
    wrapEl.addEventListener('dragleave',()=>hint.classList.remove('show'));
    wrapEl.addEventListener('drop',async e=>{
      e.preventDefault(); hint.classList.remove('show');
      try{ loadFort(JSON.parse(await e.dataTransfer.files[0].text())); }
      catch(err){ log('Drop failed: '+err.message,'bad'); }
    });
  }

  // Keyboard
  window.addEventListener('keydown',e=>{
    if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT') return;
    const k=e.key.toLowerCase();
    if(k==='w'||k==='arrowup'){ e.preventDefault(); tryMove(0,-1); }
    else if(k==='s'||k==='arrowdown'){ e.preventDefault(); tryMove(0,1); }
    else if(k==='a'||k==='arrowleft'){ e.preventDefault(); tryMove(-1,0); }
    else if(k==='d'||k==='arrowright'){ e.preventDefault(); tryMove(1,0); }
    else if(k==='r') runSelectedProgram();
    else if(k==='t') endTurn();
    else if(k==='l') document.getElementById('btn-load')?.click();
    else if(e.key==='F3'){ e.preventDefault(); toggleDebug(); }
    else if(e.key==='F4'){ e.preventDefault(); toggleCrt(); }
  });

  // Deck MU inputs
  ['deck-mu','deck-spd','deck-dw'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('change', updateMu);
  });

  // Buttons
  document.getElementById('btn-sample') && (document.getElementById('btn-sample').onclick=()=>loadFort(SAMPLE_FORT));
  document.getElementById('btn-load') && (document.getElementById('btn-load').onclick=async()=>{
    if(window.netrunAPI && window.netrunAPI.openJsonFile){
      try{
        const res=await window.netrunAPI.openJsonFile();
        if(res&&res.data) loadFort(res.data);
      }catch(e){ log('Load failed: '+e.message,'bad'); }
    } else {
      const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
      inp.onchange=async()=>{
        try{ loadFort(JSON.parse(await inp.files[0].text())); }
        catch(e){ log('Bad JSON: '+e.message,'bad'); }
      };
      inp.click();
    }
  });

  document.getElementById('btn-netmap') && (document.getElementById('btn-netmap').onclick=openNetMap);
  document.getElementById('netmap-close') && (document.getElementById('netmap-close').onclick=closeNetMap);
  document.getElementById('m-ldl') && (document.getElementById('m-ldl').onclick=doLdlLink);
  document.getElementById('m-run') && (document.getElementById('m-run').onclick=runSelectedProgram);
  document.getElementById('m-copy') && (document.getElementById('m-copy').onclick=doCopy);
  document.getElementById('m-read') && (document.getElementById('m-read').onclick=doRead);
  document.getElementById('m-erase') && (document.getElementById('m-erase').onclick=doErase);
  document.getElementById('m-jackout') && (document.getElementById('m-jackout').onclick=doJackout);
  document.getElementById('m-end') && (document.getElementById('m-end').onclick=()=>endTurn());
  document.getElementById('btn-end') && (document.getElementById('btn-end').onclick=()=>endTurn());
  document.getElementById('btn-add-prog') && (document.getElementById('btn-add-prog').onclick=()=>{
    S.programs.push({name:'Custom',cls:'Utility',str:3,mu:1});
    S.selectedProg=S.programs.length-1;
    renderPrograms();
  });

  document.getElementById('btn-rot-cw') && (document.getElementById('btn-rot-cw').onclick=()=>rotateMap(1));
  document.getElementById('btn-rot-ccw') && (document.getElementById('btn-rot-ccw').onclick=()=>rotateMap(-1));
  
  document.getElementById('btn-update') && (document.getElementById('btn-update').onclick=async()=>{
    if(!window.netrunAPI||!window.netrunAPI.applyUpdate){
      log('Offline update API unavailable (browser mode).','bad');
      return;
    }
    log('Select update package (.zip)…','sys');
    const res = await window.netrunAPI.applyUpdate();
    if(res.canceled){ log('Update canceled.','sys'); return; }
    if(!res.ok){ log('Update failed: '+(res.error||'?'),'bad'); return; }
    log('Offline patch installed: v'+res.version+' (was packaged '+res.previous+'). Restarting…','ok');
    setTimeout(()=>window.netrunAPI.relaunch(), 600);
  });

  document.getElementById('btn-gh-update') && (document.getElementById('btn-gh-update').onclick=async()=>{
    if(!window.netrunAPI||!window.netrunAPI.githubCheck){
      log('GitHub update API unavailable.','bad');
      return;
    }
    log('Checking GitHub Releases…','sys');
    const res = await window.netrunAPI.githubCheck();
    if(!res.ok){
      log('GitHub check failed: '+(res.error||'?'),'bad');
      return;
    }
    const st = res.status || await window.netrunAPI.githubStatus();
    if(st.status==='available'){
      log(`Update available: v${st.version||'?'}. Downloading…`,'ok');
      const dl = await window.netrunAPI.githubDownload();
      if(!dl.ok){ log('Download failed: '+(dl.error||'?'),'bad'); return; }
      log('Download complete. Installing & restarting…','ok');
      setTimeout(()=>window.netrunAPI.githubInstall(), 800);
    } else if(st.status==='uptodate'){
      log('Already up to date (GitHub).','ok');
    } else if(st.status==='downloaded'){
      log(st.message||'Update ready. Installing…','ok');
      setTimeout(()=>window.netrunAPI.githubInstall(), 400);
    } else {
      log('GitHub status: '+(st.message||st.status||'unknown'),'sys');
    }
  });

  document.getElementById('btn-rot-reset') && (document.getElementById('btn-rot-reset').onclick=()=>{
    S.mapRot=0; if(S.scene) S.scene.rebuildMap(); log('Map rotation reset.','sys');
  });

  // Boot
  defaultPrograms();
  fillPresetSelect();
  bootPhaser();
  updateLocHud();
  refreshClock();

  if(!S.seed) setSeed(Date.now()>>>0);
  loadSession();
  setInterval(saveSession, 15000);

  log('Netrun Terminal ISO 1.6.6 online.','ok');
  log('CP2020 RAW: 5 spaces + 1 Menu action per net-turn.','info');
  log('Modules: data · core · fort · combat · demons · netmap · ui · scene','sys');
  log('F3 debug · F4 CRT · seed='+S.seed,'sys');
})();
