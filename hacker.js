/* ==========================================================================
   ARCHIVE-3115 // HACKER TERMINAL LAYER (JS)
   Матричный дождь, boot-последовательность, печатающийся текст,
   терминальные щелчки и глитч-эффекты.
   ========================================================================== */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Мини-синтезатор терминального щелчка ---------------- */
  let audio = null;
  function click() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audio) audio = new AC();
      if (audio.state === 'suspended') audio.resume();
      const now = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1300, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (_) {}
  }

  /* ---------- Матричный дождь из слов ПЫЩ-ПАРАДА ------------------ */
  function initMatrix() {
    if (reduce) return;
    const canvas = document.getElementById('matrix-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const words = [
      '3115', 'ПЫЩ', 'ЫВЫВ', 'ГУРЫЧ', 'РАММ', 'ЗАВУЧ', 'ДЫМ', 'ПОДВАЛ',
      'ГУРИН ДЖИХАД', 'ГУРИНТАЙМ', 'ОЛЕНЕ', 'ГУРИНКОИН', 'СНИКЕРС',
      'ТУРБИНА', 'БАЛАКЛАВА', 'ВАЛЕНОК', 'ГУРИНГОЛУБЬ', 'ДЫМОХЛЮП',
      'БРИТВЕНЬ', 'СИДОРОВ', 'БИГМУК', 'ЕПЫП', 'ХМУРЫЧ', 'ПЫХТЫЧ',
      'ИЗОЛЕНТА', 'КОСЯК ЗНАНИЙ', 'ВЕНТИЛЯЦИЯ', 'АТЛАНТИДА', 'GUR',
      'ЗАВУЧ В ДЫМУ НЕ ВИДИТ', 'ШКОЛА №59', 'КРЫША', 'ПЫЩ-ПАРАД'
    ];
    const fontSize = 14;
    let cols = 0, streams = [], w = 0, h = 0;

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth;
      h = innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(6, Math.floor(w / 150));
      streams = new Array(cols).fill(0).map(() => ({
        y: Math.random() * -h,
        word: words[(Math.random() * words.length) | 0],
        speed: fontSize * (0.5 + Math.random() * 0.6)
      }));
    }
    resize();
    addEventListener('resize', resize);

    let last = 0;
    function draw(t) {
      requestAnimationFrame(draw);
      if (t - last < 90) return;
      last = t;
      ctx.fillStyle = 'rgba(2,6,3,.14)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = fontSize + 'px monospace';
      for (let i = 0; i < cols; i++) {
        const s = streams[i];
        const x = (i + 0.5) * (w / cols);
        const chars = s.word.split('');
        for (let j = 0; j < chars.length; j++) {
          const y = s.y - j * (fontSize + 4);
          if (y < -20 || y > h + 20) continue;
          const head = j === 0;
          ctx.fillStyle = head
            ? '#d8ffb0'
            : `rgba(57,255,120,${Math.max(0.12, 0.75 - j * 0.13)})`;
          ctx.fillText(chars[j], x, y);
        }
        s.y += s.speed;
        if (s.y - chars.length * (fontSize + 4) > h) {
          s.y = -Math.random() * h * 0.5;
          s.word = words[(Math.random() * words.length) | 0];
          s.speed = fontSize * (0.5 + Math.random() * 0.6);
        }
      }
    }
    requestAnimationFrame(draw);
  }

  /* ---------- Терминальные щелчки на UI --------------------------- */
  function initClicks() {
    const handler = (e) => {
      const t = e.target.closest('button, .nav-item, .filter-chip, .search-box, a');
      if (t) click();
    };
    document.addEventListener('click', handler, true);
  }

  /* ---------- Boot-последовательность ----------------------------- */
  function boot() {
    const overlay = document.getElementById('boot-screen');
    const log = document.getElementById('boot-log');
    const bar = document.getElementById('boot-bar-fill');
    if (!overlay || !log) return;

    const finish = () => {
      overlay.classList.add('done');
      document.body.classList.remove('booting');
      setTimeout(() => overlay.remove(), 700);
    };

    if (reduce) { finish(); return; }

    const lines = [
      'BIOS 3115 // СИСТЕМА ПОДВАЛА v3.1.15',
      'ПРОВЕРКА ПАМЯТИ .......... 3115 KB OK',
      'МОНТИРОВАНИЕ /dev/podval ......... OK',
      'ЗАГРУЗКА ДЫМОВОГО ЯДРА ........... OK',
      'КАЛИБРОВКА КАЛЬКУЛЯТОРА РАММ ..... OK',
      'СИНХРОНИЗАЦИЯ ЧАСТОТЫ 3115 ....... OK',
      'ИНИЦИАЛИЗАЦИЯ ПЫЩ-ПРОТОКОЛА ...... OK',
      'ДОСТУП РАЗРЕШЁН. ДОБРО ПОЖАЛОВАТЬ, ОПЕРАТОР.'
    ];

    let i = 0;
    const speed = 130;
    function nextLine() {
      if (i >= lines.length) {
        bar.style.width = '100%';
        setTimeout(finish, 480);
        return;
      }
      const p = document.createElement('div');
      p.className = 'boot-line';
      const txt = lines[i];
      const isOk = /OK$/.test(txt);
      p.innerHTML = isOk
        ? txt.replace(/OK$/, '<span class="ok">OK</span>')
        : txt;
      log.append(p);
      if (bar) bar.style.width = Math.round(((i + 1) / lines.length) * 100) + '%';
      i++;
      setTimeout(nextLine, speed);
    }
    setTimeout(nextLine, 220);
  }

  /* ---------- Печатающийся текст ---------------------------------- */
  function typeText(el, text, speed = 34, done) {
    if (!el) return;
    if (reduce) { el.textContent = text; done && done(); return; }
    el.textContent = '';
    let i = 0;
    (function step() {
      el.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(step, speed);
      else done && done();
    })();
  }

  function initTypewriter() {
    const p = document.querySelector('.hero-copy p');
    const meta = document.querySelector('.hero-meta span:first-child');
    if (p) {
      const text = p.textContent.trim();
      typeText(p, text, 16);
    }
    if (meta) {
      const base = '● ЛОР ЗАГРУЖЕН';
      meta.textContent = base;
    }
  }

  /* ---------- Плавная смена содержимого --------------------------- */
  function initSmoothSwitch() {
    const grid = document.getElementById('card-grid');
    if (!grid || reduce) return;
    const obs = new MutationObserver(() => {
      grid.classList.add('switching');
      requestAnimationFrame(() => requestAnimationFrame(() => grid.classList.remove('switching')));
    });
    obs.observe(grid, { childList: true });
  }

  /* ---------- Скан-волна усиливается при ПЫЩ ---------------------- */
  function initPyshWave() {
    const wave = document.querySelector('.scanwave');
    const btn = document.getElementById('pysh-button');
    if (!wave || !btn) return;
    btn.addEventListener('click', () => {
      wave.style.filter = 'brightness(2.2)';
      setTimeout(() => { wave.style.filter = ''; }, 520);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initMatrix();
    initClicks();
    initTypewriter();
    initSmoothSwitch();
    initPyshWave();
    boot();
  });
})();
