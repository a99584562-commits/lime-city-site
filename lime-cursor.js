/* ЛАЙМ — единый кастомный курсор для всех страниц сайта.
   Точка + догоняющее кольцо; растёт на интерактиве, показывает лейбл через
   data-cursor, инвертируется в светлый над тёмными зонами ([data-cursor-dark]).
   Самодостаточен: сам вставляет стили и DOM, работает только на fine-указателе. */
(function () {
  var fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (!fine) return;

  // ---- стили (инъекция один раз) ----
  var css =
    'html.lime-cur, html.lime-cur *{cursor:none!important;}' +
    '#lime-cur-dot,#lime-cur-ring{display:none;}' +
    'html.lime-cur #lime-cur-dot{display:block;}' +
    'html.lime-cur #lime-cur-ring{display:flex;}' +
    '#lime-cur-dot{position:fixed;left:0;top:0;z-index:9700;width:6px;height:6px;border-radius:50%;background:#15181C;pointer-events:none;will-change:transform;transition:background .3s;}' +
    '#lime-cur-ring{position:fixed;left:0;top:0;z-index:9699;width:36px;height:36px;border-radius:100px;border:1.2px solid rgba(21,24,28,0.35);background:rgba(255,255,255,0);pointer-events:none;align-items:center;justify-content:center;font-family:\'JetBrains Mono\',monospace;font-size:9.5px;letter-spacing:0.08em;text-transform:uppercase;color:#15181C;white-space:nowrap;will-change:transform;transition:width .35s cubic-bezier(.16,1,.3,1),height .35s cubic-bezier(.16,1,.3,1),background .3s,border-color .3s,color .3s;}' +
    '#lime-cur-ring span{opacity:0;transition:opacity .25s;}' +
    '#lime-cur-ring.hov{width:54px;height:54px;border-color:rgba(94,122,0,0.6);}' +
    '#lime-cur-ring.lab{width:78px;height:78px;background:rgba(255,255,255,0.92);border-color:rgba(94,122,0,0.5);}' +
    '#lime-cur-ring.lab span{opacity:1;}' +
    /* инверсия над тёмными поверхностями (футер и пр.) — курсор становится светлым */
    'html.lime-cur #lime-cur-dot.inv{background:#F4F6F7;}' +
    '#lime-cur-ring.inv{border-color:rgba(244,246,247,0.55);color:#F4F6F7;}' +
    '#lime-cur-ring.inv.hov{border-color:rgba(184,224,32,0.8);}';
  var st = document.createElement('style');
  st.id = 'lime-cur-style';
  st.textContent = css;
  document.head.appendChild(st);

  // ---- DOM (точка + кольцо с лейблом) ----
  function make(id) { var d = document.createElement('div'); d.id = id; d.setAttribute('aria-hidden', 'true'); return d; }
  var dot = make('lime-cur-dot');
  var ring = make('lime-cur-ring');
  var lab = document.createElement('span'); lab.id = 'lime-cur-lab';
  ring.appendChild(lab);

  function init() {
    document.documentElement.classList.add('lime-cur');
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      var t = e.target && e.target.closest ? e.target : null;
      var tc = t ? t.closest('a,button,.lime-win,[data-cursor],input,textarea,label') : null;
      var dc = t ? t.closest('[data-cursor]') : null;
      var dk = t ? t.closest('[data-cursor-dark]') : null;
      var l = dc ? dc.getAttribute('data-cursor') : '';
      ring.classList.toggle('lab', !!l);
      ring.classList.toggle('hov', !!tc && !l);
      ring.classList.toggle('inv', !!dk);
      dot.classList.toggle('inv', !!dk);
      if (lab.textContent !== (l || '')) lab.textContent = l || '';
    }, { passive: true });

    (function cur() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
      ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px) translate(-50%,-50%)';
      requestAnimationFrame(cur);
    })();
  }

  if (document.body) init();
  else addEventListener('DOMContentLoaded', init);
})();
