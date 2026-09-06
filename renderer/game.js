/* game.js — bootstrap / event wiring (modules loaded before this file) */
(function(){
  // Drop zone
  const wrapEl=document.getElementById('game-wrap');
  const hint=document.getElementById('drop-hint');
  async function importFortFile(file){
    if(!file) return false;
    if(typeof window.importFortFile==='function') return window.importFortFile(file);
    log('DataFort importer is not initialized yet.','bad');
    return false;
  }
  if(wrapEl && hint){
    wrapEl.addEventListener('dragover',e=>{e.preventDefault();hint.classList.add('show')});
    wrapEl.addEventListener('dragleave',()=>hint.classList.remove('show'));
    wrapEl.addEventListener('drop',async e=>{
      e.preventDefault(); hint.classList.remove('show');
      await importFortFile(e.dataTransfer.files && e.dataTransfer.files[0]);
    });
  }

  // Keyboard
  window.addEventListener('keydown',e=>{
    if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT') return;
    const k=e.key.toLowerCase();
    if(e.key==='Escape'){
      if(S.programTarget && typeof cancelProgramTarget==='function'){ e.preventDefault(); cancelProgramTarget(); return; }
      const settings=document.getElementById('settings-panel');
      if(settings?.classList.contains('open')) return;
      const mm=document.getElementById('main-menu');
      if(mm?.classList.contains('on')){
        hideMainMenu();
        const shell=document.getElementById('shell'); if(shell) shell.style.visibility='visible';
      }else if(typeof showMainMenu==='function'){
        showMainMenu({overlay:!!S.fort});
      }
      e.preventDefault();
      return;
    }
    const settingsOpen=document.getElementById('settings-panel')?.classList.contains('open');
    const mainMenuOpen=document.getElementById('main-menu')?.classList.contains('on');
    if(settingsOpen || mainMenuOpen) return;
    if(k==='w'||k==='arrowup'){ e.preventDefault(); tryMove(0,-1); }
    else if(k==='s'||k==='arrowdown'){ e.preventDefault(); tryMove(0,1); }
    else if(k==='a'||k==='arrowleft'){ e.preventDefault(); tryMove(-1,0); }
    else if(k==='d'||k==='arrowright'){ e.preventDefault(); tryMove(1,0); }
    else if(k==='r') runSelectedProgram();
    else if(k==='t') endTurn();
    else if(k==='c'||k==='home'){
      e.preventDefault();
      if(S.scene && typeof S.scene.lockCamOnRunner==='function'){
        S.scene.lockCamOnRunner();
        if(typeof log==='function') log('Camera locked on runner. Hold RMB to move the camera independently.','sys');
      }
    }
    else if(k==='l') document.getElementById('btn-load')?.click();
    else if(e.key==='F3'){ e.preventDefault(); toggleDebug(); }
    else if(e.key==='F5'){ e.preventDefault(); if(typeof openSaveMenu==='function') openSaveMenu('save'); }
    else if(e.key==='F9'){ e.preventDefault(); if(typeof openSaveMenu==='function') openSaveMenu('load'); }
  });

  // Deck MU inputs
  ['deck-mu','deck-spd','deck-dw'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('change', updateMu);
  });

  document.getElementById('win-min')?.addEventListener('click',()=>window.netrunAPI?.minimizeWindow?.());
  document.getElementById('win-max')?.addEventListener('click',()=>window.netrunAPI?.toggleMaximizeWindow?.());
  document.getElementById('win-close')?.addEventListener('click',()=>typeof prepareQuitToNetMap==='function' ? prepareQuitToNetMap() : window.netrunAPI?.quitApp?.());

  // Buttons
  document.getElementById('btn-save') && (document.getElementById('btn-save').onclick=()=>{ if(typeof promptSaveUI==='function') promptSaveUI(); });
  document.getElementById('btn-loadsave') && (document.getElementById('btn-loadsave').onclick=()=>{ if(typeof promptLoadUI==='function') promptLoadUI(); });
  document.getElementById('btn-sample') && (document.getElementById('btn-sample').onclick=()=>loadSampleFort());
  document.getElementById('btn-load') && (document.getElementById('btn-load').onclick=async()=>{
    // Prefer the renderer File API. It works both in a fresh Electron binary and
    // in renderer-only patch deployments where main/preload may be older.
    const inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
    inp.onchange=async()=>{ await importFortFile(inp.files && inp.files[0]); };
    inp.click();
  });

  document.getElementById('btn-netmap') && (document.getElementById('btn-netmap').onclick=openNetMap);
  document.getElementById('btn-forts') && (document.getElementById('btn-forts').onclick=()=>openFortLibrary());
  document.getElementById('fort-library-close') && (document.getElementById('fort-library-close').onclick=closeFortLibrary);
  document.getElementById('netmap-close') && (document.getElementById('netmap-close').onclick=closeNetMap);
  document.getElementById('m-ldl') && (document.getElementById('m-ldl').onclick=doLdlLink);
  document.getElementById('m-run') && (document.getElementById('m-run').onclick=()=>runSelectedProgram());
  document.getElementById('target-cancel') && (document.getElementById('target-cancel').onclick=()=>cancelProgramTarget());
  document.getElementById('m-copy') && (document.getElementById('m-copy').onclick=doCopy);
  document.getElementById('m-read') && (document.getElementById('m-read').onclick=doRead);
  document.getElementById('m-erase') && (document.getElementById('m-erase').onclick=doErase);
  document.getElementById('m-jackout') && (document.getElementById('m-jackout').onclick=doJackout);
  document.getElementById('m-end') && (document.getElementById('m-end').onclick=()=>endTurn());
  document.getElementById('btn-end') && (document.getElementById('btn-end').onclick=()=>endTurn());
  document.getElementById('btn-log-clear') && (document.getElementById('btn-log-clear').onclick=()=>clearNetLog());
  document.getElementById('btn-log-copy') && (document.getElementById('btn-log-copy').onclick=()=>copyNetLog());
  document.getElementById('m-disconnect') && (document.getElementById('m-disconnect').onclick=()=>{ if(typeof disconnectFromFort==='function') disconnectFromFort(); });
  document.getElementById('btn-add-prog') && (document.getElementById('btn-add-prog').onclick=()=>{
    S.programs.push({name:'Custom',cls:'Utility',str:3,mu:1});
    S.selectedProg=S.programs.length-1;
    renderPrograms();
  });

  document.getElementById('btn-rot-cw') && (document.getElementById('btn-rot-cw').onclick=()=>rotateMap(1));
  document.getElementById('btn-rot-ccw') && (document.getElementById('btn-rot-ccw').onclick=()=>rotateMap(-1));

  /* ----- UPDATE button: GitHub full update first, offline ZIP fallback ----- */
  let _ghBusy = false;
  function paintUpdateBtn(st){
    const btn = document.getElementById('btn-update');
    if(!btn) return;
    const s = (st && st.status) || 'idle';
    if(s === 'available'){
      btn.textContent = 'UPDATE ' + (st.version || '');
      btn.classList.add('cyan'); btn.classList.remove('amber');
      btn.title = 'Download GitHub update v' + (st.version || '');
    } else if(s === 'downloading'){
      btn.textContent = Math.round(st.percent || 0) + '%';
      btn.title = st.message || 'Downloading…';
    } else if(s === 'downloaded'){
      btn.textContent = 'RESTART';
      btn.classList.add('cyan'); btn.classList.remove('amber');
      btn.title = (st.message || 'Restart to install') + ' — click to install now';
    } else if(s === 'checking'){
      btn.textContent = '…';
      btn.title = 'Checking GitHub Releases…';
    } else {
      btn.textContent = 'UPDATE';
      btn.classList.add('amber'); btn.classList.remove('cyan');
      btn.title = 'Check GitHub update / install offline .zip';
    }
  }
  function onGithubStatus(st){
    if(!st) return;
    paintUpdateBtn(st);
    if(st.status === 'available'){
      log('GitHub update available: v' + (st.version || '?') + ' — click UPDATE to download.', 'ok');
    } else if(st.status === 'downloaded'){
      log(st.message || 'Update downloaded — click RESTART to install.', 'ok');
    } else if(st.status === 'error' && st.message){
      // Quiet errors on auto-check; noisy only if user triggered
      if(_ghBusy) log('GitHub update: ' + st.message, 'bad');
    }
  }
  async function offlineZipUpdate(){
    if(!window.netrunAPI || !window.netrunAPI.applyUpdate){
      log('Offline update API unavailable (browser mode).', 'bad');
      return;
    }
    log('Select offline update package (.zip)…', 'sys');
    const res = await window.netrunAPI.applyUpdate();
    if(res.canceled){ log('Update canceled.', 'sys'); return; }
    if(!res.ok){ log('Update failed: ' + (res.error || '?'), 'bad'); return; }
    log('Offline patch installed: v' + res.version + ' (packaged was ' + res.previous + '). Restarting…', 'ok');
    setTimeout(() => window.netrunAPI.relaunch(), 600);
  }
  document.getElementById('btn-update') && (document.getElementById('btn-update').onclick = async () => {
    if(!window.netrunAPI){
      log('Update API unavailable (browser mode).', 'bad');
      return;
    }
    // Prefer GitHub full-app update when packaged
    if(window.netrunAPI.githubCheck && window.netrunAPI.githubDownload){
      try{
        _ghBusy = true;
        let st = await window.netrunAPI.githubStatus();
        if(st && st.status === 'downloaded'){
          log('Installing downloaded update…', 'ok');
          await window.netrunAPI.githubInstall();
          return;
        }
        if(st && st.status === 'available'){
          log('Downloading update v' + (st.version || '') + '…', 'sys');
          const dl = await window.netrunAPI.githubDownload();
          if(!dl.ok){
            log('Download failed: ' + (dl.error || '?') + ' — falling back to offline ZIP.', 'bad');
            await offlineZipUpdate();
            return;
          }
          st = dl.status || await window.netrunAPI.githubStatus();
          if(st && st.status === 'downloaded'){
            log('Download complete. Installing…', 'ok');
            await window.netrunAPI.githubInstall();
            return;
          }
        }
        // Not available / idle → check first
        log('Checking GitHub Releases…', 'sys');
        const chk = await window.netrunAPI.githubCheck();
        st = (chk && chk.status) || await window.netrunAPI.githubStatus();
        onGithubStatus(st);
        if(chk && chk.ok && st && st.status === 'available'){
          log('Update v' + (st.version || '') + ' found. Downloading…', 'ok');
          const dl = await window.netrunAPI.githubDownload();
          if(dl.ok){
            st = dl.status || await window.netrunAPI.githubStatus();
            if(st && st.status === 'downloaded'){
              log('Download complete. Installing…', 'ok');
              await window.netrunAPI.githubInstall();
              return;
            }
          }
          log('Download failed: ' + ((dl && dl.error) || '?') + ' — offline ZIP fallback.', 'bad');
        } else if(st && st.status === 'uptodate'){
          log('Already up to date on GitHub. Opening offline ZIP dialog…', 'sys');
        } else if(chk && !chk.ok){
          log('GitHub check unavailable: ' + (chk.error || '?') + ' — offline ZIP fallback.', 'sys');
        }
      } catch(e){
        log('GitHub update error: ' + (e.message || e) + ' — offline ZIP fallback.', 'bad');
      } finally {
        _ghBusy = false;
      }
    }
    await offlineZipUpdate();
  });

  if(window.netrunAPI && window.netrunAPI.onGithubStatus){
    window.netrunAPI.onGithubStatus(onGithubStatus);
  }

  document.getElementById('btn-rot-reset') && (document.getElementById('btn-rot-reset').onclick=()=>{
    S.mapRot=0; if(S.scene) S.scene.rebuildMap(); log('Map rotation reset.','sys');
  });

  // Boot
  drawDossierPhoto();
  if(typeof setupDossierPhotoUpload==='function') setupDossierPhotoUpload();
  syncDossierHandle();
  document.getElementById('nr-name')?.addEventListener('input', syncDossierHandle);
  document.getElementById('citygrid-close') && (document.getElementById('citygrid-close').onclick=closeCityGrid);
  document.getElementById('citygrid-enter') && (document.getElementById('citygrid-enter').onclick=()=>{
    closeCityGrid();
    if(typeof loadSampleFort==='function') loadSampleFort();
    log('Sample fort loaded in local city context.','ok');
  });
  defaultPrograms();
  if(typeof setupBootUI==='function') setupBootUI();
  else if(typeof hideBootScreen==='function') hideBootScreen();
  setupIdleNet();
  setupCommandLine();
  aiMsg('SYS','Uplink established. Local grid stable.');

  fillPresetSelect();

  // Apply the persisted native window size BEFORE creating Phaser.  Previously
  // Phaser was created against the BrowserWindow's initial 1400×900 fallback,
  // then Electron changed the window to the saved resolution.  The first fort
  // fit could consequently use a stale viewport until an external resize
  // (e.g. pressing Win and returning to the app) forced a recalculation.
  // Do not use browser fullscreen: the main process owns the native window mode.
  (async()=>{
    try{ await window.NetrunSettings?.applyInitial?.(); }catch(_e){}
    await new Promise(r=>requestAnimationFrame(r));
    await new Promise(r=>requestAnimationFrame(r));
    bootPhaser();
    updateLocHud();
    refreshClock();
  })();

  if(!S.seed) setSeed(Date.now()>>>0);
  // IMPORTANT: do not restore the autosave here. Profile selection must remain the first
  // interactive screen after the Matrix boot. Continue Session restores it explicitly.

  setInterval(saveSession, 15000);

  // Version line + quiet GitHub status paint
  (async () => {
    let verLabel = '1.6.47';
    try{
      if(window.netrunAPI && window.netrunAPI.getVersion){
        const v = await window.netrunAPI.getVersion();
        if(v){
          verLabel = v.active || v.packaged || verLabel;
          if(v.usingPatch) verLabel += ' (patch)';
        }
      }
    }catch(_e){}
    const titleEl = document.querySelector('header .title');
    if(titleEl) titleEl.textContent = 'NETRUN TERMINAL // ISO ' + verLabel;
    log('Netrun Terminal ISO ' + verLabel + ' online.', 'ok');
    log('CP2020 NET TURN: 5 spaces + DECK CPU actions per net-turn.', 'info');
    log('Modules: data · core · fort · combat · demons · saves · netmap · ui · scene', 'sys');
    log('F3 debug · seed=' + S.seed, 'sys');
    // Paint any status already set by main's quiet check
    try{
      if(window.netrunAPI && window.netrunAPI.githubStatus){
        const st = await window.netrunAPI.githubStatus();
        onGithubStatus(st);
      }
    }catch(_e){}
  })();
})();
