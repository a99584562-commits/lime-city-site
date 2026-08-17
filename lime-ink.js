/* ЛАЙМ — ink-reveal на hero-вордмарке (в духе noth.in).
   След мыши — жидкая чёрная клякса («чернила» цвета букв) с гладкими текучими
   краями; внутри неё поверх чёрного проявляется фактурная версия надписи
   (видео на чисто чёрном фоне). Фактуры — случайная на визит, ленивая загрузка;
   если видео нет/не загрузилось — клякса живёт как чистые чернила.
   Только desktop + fine pointer, уважает prefers-reduced-motion. */
(function () {
  var fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
  var noMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || noMotion) return;

  var INK = '#101418'; // цвет чернил = цвет букв вордмарка
  // box — bbox слова в кадре видео [u0, v0, u1, v1]; null = прикидка по центру,
  // после получения файла замерить (ffmpeg negate+cropdetect) и вписать точно
  var VIDEOS = [
    { src: 'reveal/reveal-liquid.mp4', box: null },
    { src: 'reveal/reveal-deflate.mp4', box: null },
    { src: 'reveal/reveal-smoke.mp4', box: null },
    { src: 'reveal/reveal-dots.mp4', box: null }
  ];
  var PICK = VIDEOS[(Math.random() * VIDEOS.length) | 0];
  var SRC = PICK.src;
  var DEF_BOX = [0.1, 0.34, 0.9, 0.66];
  // bbox чёрного слова внутри wordmark-black.png (кроп 2073×530 с паддингом 24px)
  var WORD = { u0: 24 / 2073, v0: 24 / 530, u1: 1 - 24 / 2073, v1: 1 - 24 / 530 };

  function init() {
    var hero = document.getElementById('top');
    var letters = document.getElementById('lime-wordmark');
    if (!hero || !letters) return;

    var cv = document.createElement('canvas');
    cv.id = 'lime-ink';
    cv.setAttribute('aria-hidden', 'true');
    // canvas — replaced-элемент: inset:0 сам по себе НЕ растягивает его, нужны явные width/height
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;';
    if (!/relative|absolute/.test(getComputedStyle(hero).position)) hero.style.position = 'relative';
    hero.appendChild(cv);
    var ctx = cv.getContext('2d');

    var W = 0, H = 0, heroTop = 0;
    var ACC = 6, MSK = 3; // даунсемплы: след копится в 1/6, порогуется в 1/3
    var acc = document.createElement('canvas'), accx = acc.getContext('2d');
    var mid = document.createElement('canvas'), midx = mid.getContext('2d', { willReadFrequently: true });
    var msk = document.createElement('canvas'), mskx = msk.getContext('2d');

    function resize() {
      var r = hero.getBoundingClientRect();
      W = hero.clientWidth; H = hero.clientHeight;
      heroTop = r.top + (window.pageYOffset || 0);
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      acc.width = Math.ceil(W / ACC); acc.height = Math.ceil(H / ACC);
      mid.width = Math.ceil(W / MSK); mid.height = Math.ceil(H / MSK);
      msk.width = mid.width; msk.height = mid.height;
    }

    // ленивое видео; при любой ошибке остаёмся на чистых чернилах
    var video = null, videoReady = false, wanted = false;
    function ensureVideo() {
      if (video || !wanted) return;
      video = document.createElement('video');
      video.muted = true; video.loop = true; video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.preload = 'auto';
      video.src = SRC;
      video.addEventListener('canplay', function () {
        videoReady = true;
        var p = video.play(); if (p && p.catch) p.catch(function () {});
      });
      video.addEventListener('error', function () { videoReady = false; });
      video.load();
    }

    // жидкий след: «голова» кляксы догоняет мышь с инерцией, за ней шлейф-капли
    var px = -1, py = -1, hx = -1, hy = -1, active = false, idleFrames = 0;
    function drop(x, y, r) {
      var mx = x / ACC, my = y / ACC, mr = r / ACC;
      var rg = accx.createRadialGradient(mx, my, 0, mx, my, mr);
      rg.addColorStop(0, 'rgba(255,255,255,0.55)');
      rg.addColorStop(0.65, 'rgba(255,255,255,0.28)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      accx.fillStyle = rg;
      accx.beginPath(); accx.arc(mx, my, mr, 0, 7); accx.fill();
    }
    function blob(x, y, dx, dy) {
      accx.globalCompositeOperation = 'lighter';
      var sp = Math.min(40, Math.hypot(dx, dy));
      drop(x, y, 54 + sp * 1.1 + Math.random() * 18);
      // шлейф по направлению движения + случайные капли-брызги
      for (var i = 1; i <= 3; i++) {
        var t = i / 3.2;
        drop(x - dx * t * 1.4 + (Math.random() - 0.5) * 26, y - dy * t * 1.4 + (Math.random() - 0.5) * 26, (46 - i * 9) * (0.8 + Math.random() * 0.5));
      }
      if (sp > 14 && Math.random() < 0.35) drop(x + (Math.random() - 0.5) * 90, y + (Math.random() - 0.5) * 70, 12 + Math.random() * 14);
    }
    addEventListener('mousemove', function (e) {
      var y = e.clientY + (window.pageYOffset || 0) - heroTop;
      var x = e.clientX;
      if (y < 0 || y > H) { px = -1; py = -1; return; }
      wanted = true; ensureVideo();
      if (video && video.paused && videoReady) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      if (hx < 0) { hx = x; hy = y; }
      px = x; py = y;
      active = true; idleFrames = 0;
    }, { passive: true });

    // кадр: инерция головы → затухание → сглаженный порог с «дышащей» кромкой
    function step(time) {
      if (px >= 0) {
        var dx = px - hx, dy = py - hy;
        hx += dx * 0.3; hy += dy * 0.3;
        if (Math.hypot(dx, dy) > 1.5) blob(hx, hy, dx * 0.3, dy * 0.3);
      }
      accx.globalCompositeOperation = 'destination-out';
      accx.fillStyle = 'rgba(0,0,0,0.011)';
      accx.fillRect(0, 0, acc.width, acc.height);
      accx.globalCompositeOperation = 'source-over';
      // мягкий апскейл следа 1/6 → 1/3: билинейное сглаживание вместо зерна
      midx.clearRect(0, 0, mid.width, mid.height);
      midx.imageSmoothingEnabled = true;
      midx.drawImage(acc, 0, 0, mid.width, mid.height);
      var mw = mid.width, mh = mid.height;
      var id = midx.getImageData(0, 0, mw, mh);
      var d = id.data;
      var out = mskx.createImageData(mw, mh);
      var o = out.data;
      // «водяная» кромка: низкочастотные волны порога, плывущие во времени
      var t1 = time * 0.0011, t2 = time * 0.0007;
      var sx1 = new Float32Array(mw), sx2 = new Float32Array(mw), sy1 = new Float32Array(mh), sy2 = new Float32Array(mh);
      for (var xx = 0; xx < mw; xx++) { sx1[xx] = Math.sin(xx * 0.055 + t1); sx2[xx] = Math.sin(xx * 0.021 - t2); }
      for (var yy = 0; yy < mh; yy++) { sy1[yy] = Math.sin(yy * 0.063 - t1 * 1.3); sy2[yy] = Math.sin(yy * 0.027 + t2 * 1.7); }
      var any = false;
      for (var y = 0; y < mh; y++) {
        var row = y * mw;
        for (var x = 0; x < mw; x++) {
          var a = d[(row + x) * 4 + 3];
          if (a < 60) continue;
          var th = 96 + sx1[x] * sy1[y] * 24 + sx2[x] * sy2[y] * 15;
          if (a > th) {
            any = true;
            var edge = a - th;
            var p4 = (row + x) * 4;
            o[p4 + 3] = edge < 24 ? (edge * 10.6) : 255;
            o[p4] = 255; o[p4 + 1] = 255; o[p4 + 2] = 255;
          }
        }
      }
      mskx.putImageData(out, 0, 0);
      return any;
    }

    function paint() {
      ctx.clearRect(0, 0, W, H);
      var lb = letters.getBoundingClientRect();
      var hb = hero.getBoundingClientRect();
      var bx = lb.left - hb.left, by = lb.top - hb.top, bw = lb.width, bh = lb.height;
      if (!bw) return;
      var pad = bh * 0.3;
      var cx0 = bx - pad, cy0 = by - pad, cw = bw + pad * 2, chh = bh + pad * 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx0, cy0, cw, chh);
      ctx.clip();
      // чернила: клякса — сплошной цвет букв; фактура (чёрный фон видео) ложится поверх бесшовно
      ctx.fillStyle = INK;
      ctx.fillRect(cx0, cy0, cw, chh);
      if (video && videoReady && video.videoWidth) {
        var vw = video.videoWidth, vh = video.videoHeight;
        var box = PICK.box || DEF_BOX;
        // «слово-в-слово»: кегль видео-букв = кегль чёрных, центр в центр
        var wb = { x: bx + bw * WORD.u0, y: by + bh * WORD.v0, w: bw * (WORD.u1 - WORD.u0), h: bh * (WORD.v1 - WORD.v0) };
        var vb = { x: vw * box[0], y: vh * box[1], w: vw * (box[2] - box[0]), h: vh * (box[3] - box[1]) };
        var s = wb.h / vb.h;
        var dx = wb.x + wb.w / 2 - (vb.x + vb.w / 2) * s;
        var dy = wb.y + wb.h / 2 - (vb.y + vb.h / 2) * s;
        ctx.drawImage(video, dx, dy, vw * s, vh * s);
      }
      ctx.restore();
      // мягкое растворение к краям зоны — никаких «стенок» от жёсткого клипа
      var fy = bh * 0.28, fx = bh * 0.35, g;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      g = ctx.createLinearGradient(0, cy0, 0, cy0 + fy);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(cx0, cy0, cw, fy);
      g = ctx.createLinearGradient(0, cy0 + chh, 0, cy0 + chh - fy);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(cx0, cy0 + chh - fy, cw, fy);
      g = ctx.createLinearGradient(cx0, 0, cx0 + fx, 0);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(cx0, cy0, fx, chh);
      g = ctx.createLinearGradient(cx0 + cw, 0, cx0 + cw - fx, 0);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(cx0 + cw - fx, cy0, fx, chh);
      ctx.restore();
      // сама клякса
      ctx.globalCompositeOperation = 'destination-in';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(msk, 0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    var running = false;
    function frame(ts) {
      var any = step(ts || 0);
      paint();
      if (!any) idleFrames++; else idleFrames = 0;
      // след полностью растворился — засыпаем и ставим видео на паузу
      if (idleFrames > 90) {
        running = false; active = false; px = -1; py = -1; hx = -1; hy = -1;
        if (video && !video.paused) video.pause();
        ctx.clearRect(0, 0, W, H);
        return;
      }
      requestAnimationFrame(frame);
    }
    // будим цикл только когда есть след
    setInterval(function () {
      if (active && !running) { running = true; idleFrames = 0; requestAnimationFrame(frame); }
    }, 120);

    resize();
    addEventListener('resize', resize);
    // хуки для headless-верификации (rAF в превью может быть заморожен)
    window.__limeInk = { step: step, paint: paint, blob: blob, resize: resize,
      state: function () { return { hasVideo: !!video, ready: videoReady, src: SRC, playing: !!(video && !video.paused), active: active, running: running }; } };
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
  else init();
})();
