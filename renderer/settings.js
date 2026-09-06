/* settings.js — persistent display/audio/localization settings */
(function(){
  const KEY='cp2020.settings.v1';
  const DEFAULTS={
    display:{mode:'windowed',width:1400,height:900},
    audio:{music:70,sfx:80},
    language:'en'
  };
  const clone=o=>JSON.parse(JSON.stringify(o));
  let settings=clone(DEFAULTS);

  function merge(base, extra){
    if(!extra || typeof extra!=='object') return base;
    Object.keys(extra).forEach(k=>{
      if(extra[k] && typeof extra[k]==='object' && !Array.isArray(extra[k])){
        base[k]=merge(base[k]||{},extra[k]);
      } else if(extra[k]!==undefined) base[k]=extra[k];
    });
    return base;
  }
  function loadSettings(){
    try{ settings=merge(clone(DEFAULTS),JSON.parse(localStorage.getItem(KEY)||'{}')); }
    catch(_e){ settings=clone(DEFAULTS); }
    return settings;
  }
  function saveSettings(){
    try{ localStorage.setItem(KEY,JSON.stringify(settings)); }catch(_e){}
    return settings;
  }
  loadSettings();

  const I18N={};
  async function loadLocale(lang){
    const code=String(lang||'en').toLowerCase();
    try{
      const r=await fetch(`localization/${code}.json`,{cache:'no-store'});
      if(!r.ok) throw new Error('Locale '+code+' not found');
      I18N[code]=await r.json();
    }catch(_e){
      if(code!=='en'){
        try{
          const r=await fetch('localization/en.json',{cache:'no-store'});
          I18N.en=await r.json();
        }catch(__e){}
      }
    }
    settings.language=(I18N[code]?code:'en');
    saveSettings();
    applyLocalization();
    renderSettings();
  }
  function t(key,fallback){
    const dict=I18N[settings.language]||I18N.en||{};
    return dict[key] ?? fallback ?? key;
  }
  function applyLocalization(root=document){
    root.querySelectorAll('[data-i18n]').forEach(el=>{
      const v=t(el.dataset.i18n,el.textContent);
      if(el.dataset.i18nAttr){
        el.setAttribute(el.dataset.i18nAttr,v);
      }else el.textContent=v;
    });
    document.documentElement.lang=settings.language;
    const title=document.querySelector('title');
    if(title) title.textContent=t('app.title','CP2020 NETRUN');
  }

  const resolutions=[
    [1024,700],[1280,720],[1366,768],[1600,900],[1920,1080],[1920,1200],[2560,1440]
  ];
  function resolutionLabel(w,h){return `${w} × ${h}`;}
  function getSettings(){return clone(settings);}

  async function applyDisplay(){
    const d=settings.display;
    if(window.netrunAPI?.setWindowMode){
      const result=await window.netrunAPI.setWindowMode({
        mode:d.mode,width:+d.width,height:+d.height
      });
      if(result?.ok===false) throw new Error(result.error||'Display change failed');
      document.body.dataset.windowMode=d.mode;
    }
  }
  function setDisplay(mode,w,h){
    settings.display.mode=mode;
    if(w) settings.display.width=+w;
    if(h) settings.display.height=+h;
    saveSettings();
    return applyDisplay().catch(e=>{
      if(typeof log==='function') log('Display settings: '+e.message,'bad');
      throw e;
    });
  }

  const audio={
    musicEl:null,sfxReady:false,
    musicVolume(){return Math.max(0,Math.min(100,+settings.audio.music||0))/100},
    sfxVolume(){return Math.max(0,Math.min(100,+settings.audio.sfx||0))/100},
    setMusic(v){settings.audio.music=Math.max(0,Math.min(100,+v||0)); saveSettings(); this.apply();},
    setSfx(v){settings.audio.sfx=Math.max(0,Math.min(100,+v||0)); saveSettings();},
    apply(){
      if(this.musicEl) this.musicEl.volume=this.musicVolume();
    },
    stopMusic(){if(this.musicEl){this.musicEl.pause();this.musicEl.currentTime=0;}},
    playMusic(src,loop=true){
      if(!src) return;
      if(this.musicEl && this.musicEl.dataset.src===src){
        this.musicEl.loop=loop; this.musicEl.volume=this.musicVolume();
        return this.musicEl.play().catch(()=>{});
      }
      this.stopMusic();
      const a=new Audio(src);
      a.dataset.src=src; a.loop=loop; a.volume=this.musicVolume();
      this.musicEl=a;
      return a.play().catch(()=>{});
    },
    playSfx(src){
      if(!src) return;
      const a=new Audio(src);
      a.volume=this.sfxVolume();
      a.play().catch(()=>{});
      return a;
    },
    testMusic(){ return this.playMusic('assets/audio/music/test-tone.wav',false); },
    testSfx(){ return this.playSfx('assets/audio/sfx/test-click.wav'); }
  };

  function renderSettings(){
    const panel=document.getElementById('settings-panel');
    if(!panel) return;
    const mode=document.getElementById('set-display-mode');
    const res=document.getElementById('set-resolution');
    const music=document.getElementById('set-music');
    const sfx=document.getElementById('set-sfx');
    const lang=document.getElementById('set-language');
    if(mode) mode.value=settings.display.mode;
    if(res){
      res.innerHTML='';
      resolutions.forEach(([w,h])=>{
        const o=document.createElement('option'); o.value=`${w}x${h}`; o.textContent=resolutionLabel(w,h);
        if(+settings.display.width===w&&+settings.display.height===h) o.selected=true;
        res.appendChild(o);
      });
    }
    if(music){music.value=settings.audio.music; document.getElementById('set-music-val').textContent=settings.audio.music+'%';}
    if(sfx){sfx.value=settings.audio.sfx; document.getElementById('set-sfx-val').textContent=settings.audio.sfx+'%';}
    if(lang) lang.value=settings.language;
    applyLocalization(panel);
  }

  async function applyInitial(){
    try{
      await applyDisplay();
    }catch(_e){}
  }
  function openSettings(){
    renderSettings();
    document.getElementById('settings-panel')?.classList.add('open');
  }
  function closeSettings(){document.getElementById('settings-panel')?.classList.remove('open');}

  function bind(){
    document.getElementById('btn-settings')?.addEventListener('click',openSettings);
    document.getElementById('settings-close')?.addEventListener('click',closeSettings);
    document.getElementById('settings-back')?.addEventListener('click',closeSettings);

    document.getElementById('set-display-mode')?.addEventListener('change',e=>{
      setDisplay(e.target.value).catch(()=>{});
    });
    document.getElementById('set-resolution')?.addEventListener('change',e=>{
      const [w,h]=e.target.value.split('x'); setDisplay(settings.display.mode,w,h).catch(()=>{});
    });
    document.getElementById('set-music')?.addEventListener('input',e=>{
      settings.audio.music=+e.target.value; saveSettings(); audio.apply();
      document.getElementById('set-music-val').textContent=settings.audio.music+'%';
    });
    document.getElementById('set-sfx')?.addEventListener('input',e=>{
      settings.audio.sfx=+e.target.value; saveSettings();
      document.getElementById('set-sfx-val').textContent=settings.audio.sfx+'%';
    });
    document.getElementById('set-test-music')?.addEventListener('click',()=>audio.testMusic());
    document.getElementById('set-test-sfx')?.addEventListener('click',()=>audio.testSfx());
    document.getElementById('set-language')?.addEventListener('change',e=>loadLocale(e.target.value));

    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){
        const p=document.getElementById('settings-panel');
        if(p?.classList.contains('open')){e.preventDefault();closeSettings();return;}
      }
    });
    renderSettings();
    loadLocale(settings.language);
    audio.apply();
  }

  window.NetrunSettings={
    DEFAULTS, resolutions, get:getSettings, save:saveSettings, applyInitial,
    open:openSettings, close:closeSettings, setDisplay, t, applyLocalization,
    loadLocale, audio
  };
  window.NetrunAudio=audio;
  document.addEventListener('DOMContentLoaded',bind);
})();