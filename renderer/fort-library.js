/* fort-library.js — persistent imported DataFort library + city placement */
(function(){
  const KEY='cp2020.datafort.library.v1';
  function clone(v){
    try{return JSON.parse(JSON.stringify(v));}catch(_e){return v;}
  }
  function load(){
    try{
      const raw=localStorage.getItem(KEY);
      if(!raw) return [];
      const a=JSON.parse(raw);
      return Array.isArray(a)?a.filter(x=>x&&x.id&&x.fort&&x.cityId):[];
    }catch(e){
      console.warn('DataFort library read failed',e);
      return [];
    }
  }
  function save(items){
    localStorage.setItem(KEY,JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('datafort-library-changed'));
  }
  function makeId(){ return 'df_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8); }
  function list(){ return load(); }
  function get(id){ return load().find(x=>x.id===id)||null; }
  function listCity(cityId){ return load().filter(x=>x.cityId===cityId); }
  function at(cityId,x,y){ return listCity(cityId).find(r=>Number(r.x)===Number(x)&&Number(r.y)===Number(y))||null; }
  function add(fort,cityId,x,y){
    const items=load();
    const occupied=items.find(r=>r.cityId===cityId && Number(r.x)===Number(x) && Number(r.y)===Number(y));
    if(occupied) throw new Error('That city-grid cell is already occupied by '+occupied.fort.name+'.');
    const rec={id:makeId(), cityId, x:Number(x), y:Number(y), createdAt:new Date().toISOString(), fort:clone(fort)};
    items.push(rec); save(items); return rec;
  }
  function remove(id){ save(load().filter(x=>x.id!==id)); }
  function update(id,patch){
    const items=load(); const i=items.findIndex(x=>x.id===id); if(i<0) return null;
    items[i]={...items[i],...patch}; save(items); return items[i];
  }
  function move(id,cityId,x,y){
    const items=load();
    const i=items.findIndex(r=>r.id===id); if(i<0) throw new Error('DataFort not found.');
    const nx=Number(x), ny=Number(y);
    const occupied=items.find(r=>r.id!==id && r.cityId===cityId && Number(r.x)===nx && Number(r.y)===ny);
    if(occupied) throw new Error('That city-grid cell is already occupied by '+occupied.fort.name+'.');
    items[i]={...items[i],cityId,x:nx,y:ny,movedAt:new Date().toISOString()};
    save(items); return items[i];
  }
  function clear(){ save([]); }
  function cityName(cityId){ const l=(window.LDL_DB||[]).find(x=>x.id===cityId); return l?l.city:cityId; }
  window.FortLibrary={KEY,list,get,listCity,at,add,remove,update,move,clear,cityName};
})();
