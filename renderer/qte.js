/* qte.js — Quick Time Events for Black ICE counters and LotF flies
   Type the shown key sequence before the timer runs out.
*/
const QTE = {
  active: null,
  _keys: null,
};

const QTE_ALPHABET = 'ASDFGHJKLQEWRTYUZXCVBNM';

function qteIsBlackIce(name){
  return /hellhound|hellbolt|brainwipe|zombie|firestarter|jack.?attack|bloodhound|pit.?bull|cerebus|black.?ice|killer\s*iv|ldl.?trace|flatline/i.test(name||'');
}

function qteRandomSeq(len){
  len = Math.max(3, Math.min(8, len|0));
  let s = '';
  for(let i=0;i<len;i++) s += QTE_ALPHABET[Math.floor(Math.random()*QTE_ALPHABET.length)];
  return s;
}

function qteEnsureDom(){
  let root = document.getElementById('qte-overlay');
  if(root) return root;
  root = document.createElement('div');
  root.id = 'qte-overlay';
  root.innerHTML = `
    <div class="qte-panel">
      <div class="qte-tag" id="qte-tag">BLACK ICE</div>
      <div class="qte-title" id="qte-title">TRACE OVERRIDE</div>
      <div class="qte-seq" id="qte-seq"></div>
      <div class="qte-input" id="qte-input"></div>
      <div class="qte-bar"><div class="qte-fill" id="qte-fill"></div></div>
      <div class="qte-hint">TYPE THE SEQUENCE · NO MISTAKES</div>
    </div>`;
  document.body.appendChild(root);
  return root;
}

/**
 * Run a typing QTE. Resolves {ok, typed, seq, reason}.
 * @param {object} opts {title, tag, seq, ms, danger}
 */
function runQTE(opts){
  return new Promise((resolve)=>{
    if(QTE.active){
      // already in QTE — auto-fail nested
      resolve({ok:false, reason:'busy'});
      return;
    }
    opts = opts || {};
    const seq = String(opts.seq || qteRandomSeq(opts.len || 4)).toUpperCase().replace(/[^A-Z]/g,'');
    const ms = Math.max(1200, opts.ms || 2800);
    const root = qteEnsureDom();
    const seqEl = root.querySelector('#qte-seq');
    const inpEl = root.querySelector('#qte-input');
    const fill = root.querySelector('#qte-fill');
    const title = root.querySelector('#qte-title');
    const tag = root.querySelector('#qte-tag');
    title.textContent = opts.title || 'TRACE OVERRIDE';
    tag.textContent = opts.tag || 'BLACK ICE';
    root.classList.toggle('danger', !!opts.danger);
    root.classList.toggle('fly', !!opts.fly);

    // render sequence letters
    seqEl.innerHTML = '';
    [...seq].forEach((ch,i)=>{
      const span = document.createElement('span');
      span.className = 'qte-ch';
      span.dataset.i = i;
      span.textContent = ch;
      seqEl.appendChild(span);
    });
    inpEl.textContent = '';
    fill.style.transition = 'none';
    fill.style.width = '100%';
    void fill.offsetWidth;
    fill.style.transition = `width ${ms}ms linear`;
    fill.style.width = '0%';

    root.classList.add('on');
    let typed = '';
    let done = false;

    function finish(ok, reason){
      if(done) return;
      done = true;
      QTE.active = null;
      window.removeEventListener('keydown', onKey, true);
      root.classList.remove('on');
      root.classList.toggle('success', ok);
      root.classList.toggle('fail', !ok);
      setTimeout(()=> root.classList.remove('success','fail'), 400);
      resolve({ok, typed, seq, reason: reason||(ok?'ok':'fail')});
    }

    function onKey(e){
      if(done) return;
      // ignore pure modifiers
      if(e.key==='Shift'||e.key==='Control'||e.key==='Alt'||e.key==='Meta') return;
      e.preventDefault();
      e.stopPropagation();
      const k = (e.key||'').length===1 ? e.key.toUpperCase() : '';
      if(!k || k<'A'||k>'Z'){
        // wrong non-letter — mild penalty: flash
        root.classList.add('shake');
        setTimeout(()=>root.classList.remove('shake'), 120);
        return;
      }
      const need = seq[typed.length];
      if(k === need){
        typed += k;
        const ch = seqEl.querySelector(`.qte-ch[data-i="${typed.length-1}"]`);
        if(ch) ch.classList.add('hit');
        inpEl.textContent = typed;
        if(typed.length >= seq.length){
          finish(true, 'complete');
        }
      } else {
        // mistake: brief shake, do not advance (strict)
        root.classList.add('shake');
        setTimeout(()=>root.classList.remove('shake'), 150);
        if(opts.strictFail){
          finish(false, 'typo');
        }
      }
    }

    QTE.active = { seq, typed:()=>typed, finish };
    window.addEventListener('keydown', onKey, true);
    setTimeout(()=>{
      if(!done) finish(false, 'timeout');
    }, ms);
  });
}

/** Black ICE about to land a hit — QTE to parry/reduce. */
async function qteBlackIceDefense(iceName, hitPayload){
  // hitPayload: function to call on full fail; on success reduce/avoid
  const hard = /hellhound|brainwipe|flatline|firestarter|jack/i.test(iceName||'');
  const len = hard ? 5 : 4;
  const ms = hard ? 2600 : 3200;
  if(typeof log==='function') log(`QTE — ${iceName||'Black ICE'} neural spike! Type the sequence!`,'bad');
  const res = await runQTE({
    tag: 'BLACK ICE',
    title: (iceName||'ICE').toUpperCase().slice(0,18),
    len, ms, danger: true,
  });
  if(res.ok){
    if(typeof log==='function') log('QTE SUCCESS — spike partially deflected.','ok');
    if(typeof aiMsg==='function') aiMsg('QTE', 'Override held.');
    return { mitigated: true, full: false };
  }
  if(typeof log==='function') log('QTE FAILED — Black ICE gets through.','bad');
  return { mitigated: false, full: true };
}

/** Fly latch — QTE to swat before degradation ticks. */
async function qteFlySwat(count){
  count = Math.max(1, count|0);
  // longer pack = slightly longer seq
  const len = Math.min(6, 3 + count);
  const ms = 2200 + count*200;
  if(typeof log==='function') log(`QTE — ${count} Fly(s) diving on the interface!`,'bad');
  const res = await runQTE({
    tag: 'SWARM',
    title: 'SWAT THE FLIES',
    len, ms, danger: true, fly: true,
  });
  if(res.ok){
    if(typeof log==='function') log('QTE SUCCESS — flies scattered before latch.','ok');
    return { swatted: true };
  }
  if(typeof log==='function') log('QTE FAILED — flies latched.','bad');
  return { swatted: false };
}

window.QTE = QTE;
window.runQTE = runQTE;
window.qteIsBlackIce = qteIsBlackIce;
window.qteBlackIceDefense = qteBlackIceDefense;
window.qteFlySwat = qteFlySwat;
window.qteRandomSeq = qteRandomSeq;
