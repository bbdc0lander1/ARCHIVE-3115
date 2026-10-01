/* ==========================================================================
   ARCHIVE-3115 // ENHANCE LAYER (JS)
   Палитра команд, досье, терминал, таймлайн, избранное, темы, звук,
   HUD, тикер лора, тосты и пасхалка.
   Требует: lore.js, app.js (window.ARCHIVE3115), hacker.js
   ========================================================================== */
(() => {
  const A = window.ARCHIVE3115;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ====================================================================
     1. ЗВУКОВОЙ ДВИЖОК (глобальный — hacker.js делегирует сюда)
     ==================================================================== */
  class SoundEngine {
    constructor() { this.ctx = null; this.enabled = localStorage.getItem('archive3115.sound') !== '0'; }
    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return !!this.ctx;
    }
    setEnabled(v) { this.enabled = v; localStorage.setItem('archive3115.sound', v ? '1' : '0'); }
    tone(freq, dur, type = 'square', vol = 0.05, slideTo) {
      if (!this.enabled || !this.init()) return;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, now);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(now); o.stop(now + dur + 0.02);
    }
    playClick() { this.tone(1300, 0.045, 'square', 0.045, 420); }
    playBeep() { this.tone(760, 0.09, 'square', 0.05); }
    playOpen() { this.tone(320, 0.16, 'triangle', 0.06, 880); }
    playError() { this.tone(180, 0.22, 'sawtooth', 0.07, 90); }
    playToggle() { this.tone(520, 0.07, 'square', 0.05, 1040); }
    playPysh() {
      if (!this.enabled || !this.init()) return;
      const now = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, now);
      o.frequency.exponentialRampToValueAtTime(32, now + 0.6);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(now); o.stop(now + 1.05);
    }
  }
  window.soundEngine = window.soundEngine || new SoundEngine();
  const sound = window.soundEngine;

  /* ====================================================================
     2. ТОСТЫ
     ==================================================================== */
  function toast(text, ms = 2600) {
    const wrap = $('#toast-wrap'); if (!wrap) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    wrap.append(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
  }

  /* ====================================================================
     3. ТЕМЫ
     ==================================================================== */
  const THEMES = ['green', 'amber', 'cyan', 'red', 'magenta', 'mono'];
  function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem('archive3115.theme', name);
    document.querySelectorAll('.wc-chip').forEach(c => c.classList.toggle('active', c.dataset.theme === name));
  }
  function nextTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'green';
    const i = (THEMES.indexOf(cur) + 1) % THEMES.length;
    applyTheme(THEMES[i]);
    return THEMES[i];
  }
  applyTheme(localStorage.getItem('archive3115.theme') || 'green');

  /* ====================================================================
     4. ИЗБРАННОЕ
     ==================================================================== */
  const FAV_KEY = 'archive3115.favs.v1';
  const favs = new Set((() => { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (_) { return []; } })());
  const saveFavs = () => { try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])) } catch (_) {} };
  const itemByTitle = new Map();
  if (A) A.allItems.forEach(it => {
    itemByTitle.set(it.title, it);
    const stripped = it.title.replace(/\s*\([^)]*\)/g, '').trim();
    if (!itemByTitle.has(stripped)) itemByTitle.set(stripped, it);
  });

  function updateFavCount() {
    const c = $('#fav-count'); if (!c) return;
    c.textContent = favs.size;
    c.hidden = favs.size === 0;
  }
  function toggleFav(title) {
    if (favs.has(title)) { favs.delete(title); toast('− Убрано из избранного: ' + title); }
    else { favs.add(title); toast('★ В избранном: ' + title); }
    saveFavs(); updateFavCount(); decorateCards();
    sound.playToggle();
  }

  function decorateCards() {
    const grid = $('#card-grid'); if (!grid) return;
    $$('.lore-card', grid).forEach(card => {
      const h3 = card.querySelector('.card-heading h3');
      if (!h3) return;
      const title = h3.textContent.trim();
      const item = itemByTitle.get(title);
      const key = item ? item.title : title;
      if (card.querySelector('.card-fav')) {
        const b = card.querySelector('.card-fav');
        b.classList.toggle('on', favs.has(key));
        b.dataset.title = key;
        card.classList.toggle('is-fav', favs.has(key));
        return;
      }
      const b = document.createElement('button');
      b.className = 'card-fav' + (favs.has(key) ? ' on' : '');
      b.type = 'button';
      b.textContent = '★';
      b.title = 'В избранное';
      b.dataset.title = key;
      b.addEventListener('click', (e) => { e.stopPropagation(); toggleFav(key); });
      card.append(b);
      card.classList.toggle('is-fav', favs.has(key));
      card.addEventListener('click', (e) => {
        if (e.target.closest('.expand-btn') || e.target.closest('.card-fav') || e.target.closest('a')) return;
        openDossier(key);
      });
    });
  }
  function initFavDecorator() {
    const grid = $('#card-grid'); if (!grid) return;
    const obs = new MutationObserver(() => decorateCards());
    obs.observe(grid, { childList: true });
    decorateCards();
    updateFavCount();
  }

  /* ====================================================================
     5. ДОСЬЕ
     ==================================================================== */
  const dossier = $('#dossier');
  const dossierPanel = $('#dossier-panel');
  let dossierList = [];
  let dossierIdx = 0;

  function portraitFor(item) {
    const char = item.section === 'Персонажи';
    if (!char) return '';
    const key = item.title.replace(/\s*\([^)]*\)/g, '').trim().toLocaleUpperCase('ru');
    const file = A && A.photoMap[key];
    if (!file) return '<div class="no-photo"><span>▧</span>ФОТОГРАФИИ<br>ПОКА НЕТ</div>';
    return `<img src="${encodeURI(file)}" alt="Портрет: ${A.escapeHtml(item.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=&quot;no-photo&quot;><span>▧</span>ФОТОГРАФИИ<br>ПОКА НЕТ</div>'">`;
  }

  function renderDossier(item) {
    if (!item) return;
    const char = item.section === 'Персонажи';
    const subtitle = char ? (item.title.match(/\(([^)]+)\)/)?.[1] || '') : '';
    const photo = portraitFor(item);
    const body = A ? A.bodyHtml(item.body) : '';
    const isFav = favs.has(item.title);
    dossierPanel.innerHTML = `
      <button class="dossier-close" aria-label="Закрыть">✕</button>
      <div class="dossier-head">
        ${char ? `<div class="dossier-portrait">${photo}</div>` : ''}
        <div class="dossier-titles">
          <div class="dossier-index">${A ? A.escapeHtml(item.section.toUpperCase()) : ''} // ЗАПИСЬ 3115</div>
          <h2>${A ? A.escapeHtml(item.title.replace(/\s*\([^)]*\)/g, '').trim()) : item.title}</h2>
          ${subtitle ? `<p class="subtitle">${A ? A.escapeHtml(subtitle) : subtitle}</p>` : ''}
          <div class="dossier-badges">
            <span class="dossier-badge">${A ? A.escapeHtml(item.section) : item.section}</span>
            <span class="dossier-badge">${item.icon || '⌁'}</span>
            <span class="dossier-badge">${item.body.length} СИМВ.</span>
          </div>
        </div>
      </div>
      <div class="dossier-body">${body}</div>
      <div class="dossier-actions">
        <button id="dos-fav" class="${isFav ? 'on' : ''}">${isFav ? '★ В ИЗБРАННОМ' : '☆ В ИЗБРАННОЕ'}</button>
        <button id="dos-copy">⧉ КОПИРОВАТЬ</button>
        <button id="dos-cat">→ В РАЗДЕЛ</button>
      </div>
      <div class="dossier-nav">
        <button id="dos-prev" ${dossierIdx <= 0 ? 'disabled' : ''}>◀ ПРЕД.</button>
        <button id="dos-next" ${dossierIdx >= dossierList.length - 1 ? 'disabled' : ''}>СЛЕД. ▶</button>
      </div>`;

    dossierPanel.querySelector('.dossier-close').addEventListener('click', closeDossier);
    const favBtn = dossierPanel.querySelector('#dos-fav');
    favBtn.addEventListener('click', () => { toggleFav(item.title); renderDossier(item); });
    dossierPanel.querySelector('#dos-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(`${item.title}\n\n${item.body}`); toast('Запись скопирована'); sound.playBeep(); }
      catch (_) { toast('Не удалось скопировать'); }
    });
    dossierPanel.querySelector('#dos-cat').addEventListener('click', () => {
      closeDossier();
      if (A) A.selectCategory(item.section);
      sound.playOpen();
    });
    dossierPanel.querySelector('#dos-prev').addEventListener('click', () => { dossierIdx = Math.max(0, dossierIdx - 1); renderDossier(dossierList[dossierIdx]); });
    dossierPanel.querySelector('#dos-next').addEventListener('click', () => { dossierIdx = Math.min(dossierList.length - 1, dossierIdx + 1); renderDossier(dossierList[dossierIdx]); });
  }

  function buildDossierList() {
    if (!A) return [];
    const st = A.getState();
    return (A.groups.get(st.current) || []).filter(it => st.currentFilter === 'Все' || it.section === st.currentFilter);
  }

  function openDossier(title) {
    const item = itemByTitle.get(title);
    if (!item) return;
    dossierList = buildDossierList();
    let i = dossierList.findIndex(x => x.title === title);
    if (i < 0) { dossierList = [item]; i = 0; }
    dossierIdx = i;
    renderDossier(dossierList[dossierIdx]);
    dossier.classList.add('open');
    document.body.style.overflow = 'hidden';
    sound.playOpen();
  }
  function closeDossier() {
    dossier.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ====================================================================
     6. ПАЛИТРА КОМАНД
     ==================================================================== */
  const cmdk = $('#cmdk'), cmdkInput = $('#cmdk-input'), cmdkList = $('#cmdk-list');
  let cmdItems = [], cmdActive = 0;

  function buildCommands() {
    const cmds = [];
    cmds.push({ group: 'ДЕЙСТВИЯ', icon: '☄', title: 'ПЫЩ!', sub: 'выпустить дым', run: () => { $('#pysh-button')?.click(); } });
    cmds.push({ group: 'ДЕЙСТВИЯ', icon: '◐', title: 'Сменить тему', sub: 'green → amber → cyan → red → magenta → mono', run: () => { const t = nextTheme(); toast('Тема: ' + t); } });
    cmds.push({ group: 'ДЕЙСТВИЯ', icon: '♪', title: sound.enabled ? 'Выключить звук' : 'Включить звук', sub: 'терминальные щелчки', run: () => { sound.setEnabled(!sound.enabled); toast('Звук: ' + (sound.enabled ? 'ВКЛ' : 'ВЫКЛ')); } });
    cmds.push({ group: 'ДЕЙСТВИЯ', icon: '★', title: 'Показать избранное', sub: `${favs.size} записей`, run: () => { $('#card-grid')?.classList.toggle('favs-only'); toast('Фильтр избранного переключён'); } });
    cmds.push({ group: 'ДЕЙСТВИЯ', icon: '▚', title: 'Открыть терминал', sub: 'Ctrl+`', run: () => openTerminal() });
    cmds.push({ group: 'ДЕЙСТВИЯ', icon: '☰', title: 'Пульт управления', sub: 'команды кнопками (Ctrl+У)', run: () => openWebControl() });
    cmds.push({ group: 'ДЕЙСТВИЯ', icon: '◷', title: 'Хронология ПЫЩ-ПАРАДА', sub: 'эпохи 1990 → настоящее', run: () => openTimeline() });
    cmds.push({ group: 'ДЕЙСТВИЯ', icon: '◉', title: 'О системе + поиск по лору', sub: 'описание архива и глобальный поиск', run: () => { A && A.selectCategory('О системе'); } });
    cmds.push({ group: 'ДЕЙСТВИЯ', icon: '⌫', title: 'Сбросить поиск', sub: 'очистить запрос', run: () => { A && A.setQuery(''); } });

    if (A) {
      A.categories.forEach(cat => {
        cmds.push({ group: 'РАЗДЕЛЫ', icon: A.icons[cat] || '⌁', title: cat, sub: `${(A.groups.get(cat) || []).length} записей`, run: () => A.selectCategory(cat) });
      });
      A.allItems.forEach(it => {
        cmds.push({ group: 'ЗАПИСИ', icon: it.icon || '⌁', title: it.title, sub: it.section, run: () => openDossier(it.title) });
      });
    }
    return cmds;
  }

  function renderCmdk(q) {
    const all = buildCommands();
    const ql = (q || '').trim().toLocaleLowerCase('ru');
    cmdItems = ql
      ? all.filter(c => (c.title + ' ' + c.sub + ' ' + c.group).toLocaleLowerCase('ru').includes(ql))
      : all;
    cmdActive = 0;
    cmdkList.innerHTML = '';
    let lastGroup = '';
    cmdItems.slice(0, 200).forEach((c, i) => {
      if (c.group !== lastGroup) {
        lastGroup = c.group;
        const g = document.createElement('div');
        g.className = 'cmdk-group';
        g.textContent = '// ' + c.group;
        cmdkList.append(g);
      }
      const el = document.createElement('div');
      el.className = 'cmdk-item' + (i === cmdActive ? ' active' : '');
      el.dataset.idx = i;
      el.innerHTML = `<span class="ci-icon">${c.icon}</span><span class="ci-main"><span class="ci-title"></span><span class="ci-sub"></span></span>`;
      el.querySelector('.ci-title').textContent = c.title;
      el.querySelector('.ci-sub').textContent = c.sub || '';
      el.addEventListener('click', () => runCmd(i));
      cmdkList.append(el);
    });
    if (!cmdItems.length) {
      cmdkList.innerHTML = '<div class="cmdk-group">// НИЧЕГО НЕ НАЙДЕНО. СИГНАЛ ПУСТ.</div>';
    }
  }

  function highlightCmd() {
    $$('.cmdk-item', cmdkList).forEach(el => el.classList.toggle('active', +el.dataset.idx === cmdActive));
    const active = cmdkList.querySelector('.cmdk-item.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }
  function runCmd(i) {
    const c = cmdItems[i]; if (!c) return;
    closeCmdk();
    sound.playBeep();
    try { c.run(); } catch (e) { toast('Ошибка команды'); }
  }
  function openCmdk() {
    cmdk.classList.add('open');
    cmdkInput.value = '';
    renderCmdk('');
    document.body.style.overflow = 'hidden';
    setTimeout(() => cmdkInput.focus(), 40);
    sound.playOpen();
  }
  function closeCmdk() {
    cmdk.classList.remove('open');
    if (!document.body.style.overflow) return;
    document.body.style.overflow = '';
  }

  /* ====================================================================
     7. РЕЕСТР КОМАНД (общий для терминала и веб-пульта)
     ==================================================================== */
  const term = $('#terminal'), termOut = $('#terminal-out'), termForm = $('#terminal-form'), termInput = $('#terminal-input');
  const termHistory = [];
  let histIdx = -1;
  let logTarget = termOut;

  function print(html, cls) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.innerHTML = html;
    const t = logTarget || termOut;
    if (!t) return;
    t.append(d);
    t.scrollTop = t.scrollHeight;
  }
  function findItems(q) {
    if (!A || !q) return [];
    const ql = q.toLocaleLowerCase('ru');
    return A.allItems.filter(it => (it.title + ' ' + it.body).toLocaleLowerCase('ru').includes(ql)).slice(0, 12);
  }
  const esc = (s) => A ? A.escapeHtml(s) : String(s);

  const COMMANDS = {
    help: {
      usage: 'help', desc: 'список команд', group: 'СИСТЕМА',
      run() {
        print('<span class="ok">ДОСТУПНЫЕ КОМАНДЫ 3115:</span>');
        const groups = {};
        Object.entries(COMMANDS).forEach(([k, c]) => { (groups[c.group] = groups[c.group] || []).push(c); });
        Object.entries(groups).forEach(([g, arr]) => {
          print('  <span class="dim">[' + g + ']</span>');
          arr.forEach(c => print('    <span class="cmd">' + esc(c.usage) + '</span> — ' + esc(c.desc)));
        });
      }
    },
    ls: {
      usage: 'ls [раздел]', desc: 'список записей', group: 'НАВИГАЦИЯ',
      run(arg) {
        if (!A) { print('Архив не загружен', 'err'); return; }
        const cats = arg ? A.categories.filter(x => x.toLocaleLowerCase('ru').includes(arg.toLocaleLowerCase('ru'))) : A.categories;
        if (!cats.length) { print('Раздел не найден', 'err'); sound.playError(); return; }
        cats.forEach(cat => {
          print('<span class="ok">[' + esc(cat) + ']</span>');
          (A.groups.get(cat) || []).forEach(it => print('  • ' + esc(it.title)));
        });
      }
    },
    cat: {
      usage: 'cat <название>', desc: 'открыть запись', group: 'НАВИГАЦИЯ',
      run(arg) {
        if (!arg) { print('Укажи название записи', 'warn'); return; }
        const item = A && (A.allItems.find(it => it.title.toLocaleLowerCase('ru') === arg.toLocaleLowerCase('ru'))
          || A.allItems.find(it => it.title.toLocaleLowerCase('ru').includes(arg.toLocaleLowerCase('ru'))));
        if (!item) { print('Запись не найдена: ' + esc(arg), 'err'); sound.playError(); return; }
        print('<span class="ok">' + esc(item.title) + '</span> — ' + esc(item.section));
        openDossier(item.title);
      }
    },
    find: {
      usage: 'find <слово>', desc: 'поиск по лору', group: 'НАВИГАЦИЯ',
      run(arg) {
        const res = findItems(arg);
        if (!res.length) { print('Ничего не найдено', 'warn'); sound.playError(); return; }
        res.forEach(it => print('  <span class="cmd">' + esc(it.title) + '</span> <span class="dim">— ' + esc(it.section) + '</span>'));
      }
    },
    go: {
      usage: 'go <раздел>', desc: 'перейти в раздел', group: 'НАВИГАЦИЯ',
      run(arg) {
        if (!arg) { print('Укажи раздел', 'warn'); return; }
        const cat = A && A.categories.find(x => x.toLocaleLowerCase('ru').includes(arg.toLocaleLowerCase('ru')));
        if (!cat) { print('Раздел не найден', 'err'); sound.playError(); return; }
        A.selectCategory(cat);
        print('Переход: ' + esc(cat), 'ok');
      }
    },
    fav: {
      usage: 'fav <название>', desc: 'добавить в избранное', group: 'ИЗБРАННОЕ',
      run(arg) {
        const item = A && A.allItems.find(it => it.title.toLocaleLowerCase('ru').includes((arg || '').toLocaleLowerCase('ru')));
        if (!item) { print('Запись не найдена', 'err'); sound.playError(); return; }
        if (!favs.has(item.title)) toggleFav(item.title);
        print('★ ' + esc(item.title), 'ok');
      }
    },
    favs: {
      usage: 'favs', desc: 'показать избранное', group: 'ИЗБРАННОЕ',
      run() {
        if (!favs.size) { print('Избранное пусто', 'warn'); return; }
        [...favs].forEach(t => print('  ★ ' + esc(t)));
      }
    },
    theme: {
      usage: 'theme <имя>', desc: 'сменить тему', group: 'НАСТРОЙКИ',
      run(arg) {
        const t = (arg || '').toLocaleLowerCase('ru');
        if (!THEMES.includes(t)) { print('Темы: ' + THEMES.join(', '), 'warn'); return; }
        applyTheme(t); print('Тема применена: ' + t, 'ok');
      }
    },
    sound: {
      usage: 'sound', desc: 'вкл/выкл звук', group: 'НАСТРОЙКИ',
      run() { sound.setEnabled(!sound.enabled); print('Звук: ' + (sound.enabled ? 'ВКЛ' : 'ВЫКЛ'), 'ok'); }
    },
    stats: {
      usage: 'stats', desc: 'статистика архива', group: 'СИСТЕМА',
      run() {
        if (!A) return;
        print('Разделов: <span class="ok">' + A.categories.length + '</span>');
        print('Записей: <span class="ok">' + A.allItems.length + '</span>');
        print('В избранном: <span class="ok">' + favs.size + '</span>');
        print('Символов лора: <span class="ok">' + A.allItems.reduce((s, i) => s + i.body.length, 0) + '</span>');
      }
    },
    pysh: {
      usage: 'pysh', desc: 'ПЫЩ!', group: 'СИСТЕМА',
      run() { $('#pysh-button')?.click(); print('ПЫЩ! ☄', 'ok'); }
    },
    whoami: { usage: 'whoami', desc: 'кто я', group: 'СИСТЕМА', run() { print('root@podval-59 // оператор 3115'); } },
    date: { usage: 'date', desc: 'текущее время', group: 'СИСТЕМА', run() { print(new Date().toLocaleString('ru-RU')); } },
    lore: { usage: 'lore', desc: 'мантра', group: 'СИСТЕМА', run() { print('ПЫЩ-ПАРАД 3115 — ЭТО НЕ ИСТОРИЯ. ЭТО СОСТОЯНИЕ.', 'ok'); } },
    about: {
      usage: 'about', desc: 'о системе + поиск', group: 'НАВИГАЦИЯ',
      run(arg) {
        closeTerminal(); closeWebControl();
        A && A.selectCategory('О системе');
        if (arg && A && A.searchAll) {
          const res = A.searchAll(arg);
          setTimeout(() => {
            const inp = $('#about-input');
            if (inp) { inp.value = arg; inp.dispatchEvent(new Event('input', { bubbles: true })); }
            print('Глобальный поиск: «' + esc(arg) + '» — найдено ' + res.length, 'ok');
          }, 60);
        }
      }
    },
    timeline: { usage: 'timeline', desc: 'хронология', group: 'НАВИГАЦИЯ', run() { closeTerminal(); closeWebControl(); openTimeline(); } },
    clear: { usage: 'clear', desc: 'очистить вывод', group: 'СИСТЕМА', run() { const t = logTarget || termOut; if (t) t.innerHTML = ''; } },
    exit: { usage: 'exit', desc: 'закрыть', group: 'СИСТЕМА', run() { closeTerminal(); closeWebControl(); } }
  };

  function runCommand(name, arg) {
    const c = COMMANDS[name];
    if (!c) {
      print('Неизвестная команда: ' + esc(name) + '. Введи <span class="cmd">help</span>.', 'err');
      sound.playError();
      return false;
    }
    try { c.run(arg); } catch (e) { print('Ошибка выполнения: ' + esc(String(e)), 'err'); }
    return true;
  }

  function runTerminal(raw) {
    const line = raw.trim();
    if (!line) return;
    logTarget = termOut;
    print('<span class="cmd">root@3115:~#</span> ' + esc(line));
    termHistory.push(line); histIdx = termHistory.length;
    const [cmd, ...rest] = line.split(/\s+/);
    runCommand(cmd.toLocaleLowerCase('ru'), rest.join(' '));
  }

  function openTerminal() {
    term.classList.add('open');
    document.body.style.overflow = 'hidden';
    logTarget = termOut;
    if (!termOut.dataset.booted) {
      print('ARCHIVE-3115 TERMINAL v3.1.15');
      print('Подключение к /dev/podval ... <span class="ok">OK</span>');
      print('Введи <span class="cmd">help</span> для списка команд.', 'dim');
      termOut.dataset.booted = '1';
    }
    setTimeout(() => termInput.focus(), 40);
    sound.playOpen();
  }
  function closeTerminal() {
    term.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ====================================================================
     8b. ПОИСКОВИК ПО ВСЕМУ ЛОРУ + РАЗДЕЛ «О СИСТЕМЕ»
     ==================================================================== */
  const PAGES = A ? A.allItems.map(it => ({ title: it.title, section: it.section, body: it.body })) : [];
  const corpus = PAGES.map(p => `${p.title} ${p.body} ${p.section}`.toLocaleLowerCase('ru'));

  function normQ(q) { return (q || '').trim().toLocaleLowerCase('ru'); }
  function snippets(text, q, max = 3) {
    const out = [];
    const low = text.toLocaleLowerCase('ru');
    let i = 0;
    while (out.length < max) {
      const idx = low.indexOf(q, i);
      if (idx < 0) break;
      const a = Math.max(0, idx - 55);
      const b = Math.min(text.length, idx + q.length + 65);
      out.push((a > 0 ? '…' : '') + text.slice(a, b).replace(/\s+/g, ' ') + (b < text.length ? '…' : ''));
      i = idx + q.length + 40;
    }
    return out;
  }
  function globalSearch(q) {
    const ql = normQ(q);
    if (!ql) return [];
    const res = [];
    corpus.forEach((c, i) => {
      let score = 0;
      const titleLow = PAGES[i].title.toLocaleLowerCase('ru');
      if (titleLow === ql) score += 100;
      else if (titleLow.startsWith(ql)) score += 60;
      else if (titleLow.includes(ql)) score += 40;
      if (c.includes(ql)) score += 20;
      const hits = snippets(PAGES[i].body, ql, 9).length;
      score += hits * 6;
      if (PAGES[i].section.toLocaleLowerCase('ru').includes(ql)) score += 8;
      if (score > 0) res.push({ page: PAGES[i], score, hits });
    });
    return res.sort((a, b) => b.score - a.score);
  }

  function buildAbout() {
    const about = $('#about'), out = $('#about-out');
    if (!about || !A) return;
    const cats = A.categories;
    const total = A.allItems.length;
    const chars = A.allItems.reduce((s, i) => s + i.body.length, 0);
    const aboutGroup = A.groups.get('О системе') || [];
    const desc = aboutGroup.map(it => `<h4>${A.escapeHtml(it.title)}</h4>${A.bodyHtml(it.body)}`).join('');
    out.innerHTML = `
      <div class="about-desc">
        ${desc || '<p>Цифровой архив вселенной ПЫЩ-ПАРАД 3115: персонажи, хроники, места силы и артефакты.</p>'}
      </div>
      <div class="about-stats">
        <div class="about-stat"><b>${cats.length}</b><span>РАЗДЕЛОВ</span></div>
        <div class="about-stat"><b>${total}</b><span>ЗАПИСЕЙ</span></div>
        <div class="about-stat"><b>${favs.size}</b><span>В ИЗБРАННОМ</span></div>
        <div class="about-stat"><b>${chars.toLocaleString('ru-RU')}</b><span>СИМВОЛОВ ЛОРА</span></div>
      </div>
      <div class="about-search">
        <div class="about-search-head"><span>⌕ ГЛОБАЛЬНЫЙ ПОИСК ПО ВСЕМУ ЛОРУ (${total} ЗАПИСЕЙ)</span><span class="about-hint">Enter / клик по результату открывает досье</span></div>
        <input class="about-input" id="about-input" type="search" placeholder="Ищи по персонажам, местам, артефактам, хроникам…" autocomplete="off">
        <div class="about-results" id="about-results">
          <div class="about-empty">НАЧНИ ВВОДИТЬ — АРХИВ ОТВЕТИТ.</div>
        </div>
      </div>`;
    const input = $('#about-input'), results = $('#about-results');
    function doSearch() {
      const q = input.value;
      const list = globalSearch(q);
      if (!normQ(q)) { results.innerHTML = '<div class="about-empty">НАЧНИ ВВОДИТЬ — АРХИВ ОТВЕТИТ.</div>'; return; }
      if (!list.length) { results.innerHTML = '<div class="about-empty">СИГНАЛ НЕ НАЙДЕН. ПОПРОБУЙ ДРУГОЙ ЗАПРОС.</div>'; return; }
      results.innerHTML = `<div class="about-count">НАЙДЕНО: <b>${list.length}</b></div>`;
      list.slice(0, 40).forEach(({ page, hits }) => {
        const item = document.createElement('div');
        item.className = 'about-result';
        item.innerHTML = `
          <div class="ar-top"><span class="ar-title">${A.escapeHtml(page.title)}</span><span class="ar-sec">${A.escapeHtml(page.section)} · ${hits} совпад.</span></div>
          <div class="ar-snips">${snippets(page.body, normQ(q)).map(s => '<span class="ar-snip">' + A.escapeHtml(s) + '</span>').join('')}</div>`;
        item.addEventListener('click', () => openDossier(page.title));
        results.append(item);
      });
    }
    input.addEventListener('input', doSearch);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = results.querySelector('.about-result');
        if (first) first.click();
      }
    });
  }

  function ensureAbout() {
    const grid = $('#card-grid');
    if (!grid || !A) return;
    const isAbout = A.getState().current === 'О системе';
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) toolbar.style.display = isAbout ? 'none' : '';
    let about = $('#about');
    if (!isAbout) {
      if (about) about.remove();
      return;
    }
    // описание уже в модуле — убираем дублирующие карточки раздела
    $$('.lore-card', grid).forEach(c => c.remove());
    if (!about) {
      about = document.createElement('section');
      about.id = 'about';
      about.className = 'about';
      about.innerHTML = '<div id="about-out"></div>';
      grid.append(about);
      buildAbout();
    } else if (about.parentElement !== grid) {
      grid.append(about);
    }
  }

  /* ====================================================================
     8c. ВЕБ-ПУЛЬТ УПРАВЛЕНИЯ (те же команды кнопками)
     ==================================================================== */
  const web = $('#web-control'), webOut = $('#web-out');
  let webBuilt = false;

  function webRun(name, arg) {
    logTarget = webOut;
    runCommand(name, arg);
  }

  function buildWebControl() {
    if (webBuilt || !web || !A) return;
    webBuilt = true;
    const catSel = $('#wc-cat'), itemSel = $('#wc-item'), findInp = $('#wc-find');
    catSel.innerHTML = A.categories.map(c => `<option>${A.escapeHtml(c)}</option>`).join('');
    itemSel.innerHTML = A.categories.map(cat =>
      `<optgroup label="${A.escapeHtml(cat)}">` +
      (A.groups.get(cat) || []).map(it => `<option>${A.escapeHtml(it.title)}</option>`).join('') +
      '</optgroup>').join('');
    const themeWrap = $('#wc-themes');
    themeWrap.innerHTML = THEMES.map(t => `<button class="wc-chip" data-theme="${t}">${t}</button>`).join('');
    themeWrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-theme]'); if (!b) return;
      webRun('theme', b.dataset.theme);
      sound.playToggle();
    });
    $$('#web-control [data-cmd]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.cmd;
        let arg = '';
        if (btn.dataset.arg === 'cat') arg = itemSel.value;
        else if (btn.dataset.arg === 'go') arg = catSel.value;
        else if (btn.dataset.arg === 'find') arg = findInp.value;
        else if (btn.dataset.arg === 'fav') arg = itemSel.value;
        webRun(name, arg);
        sound.playBeep();
      });
    });
    findInp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); webRun('find', findInp.value); } });
    $('#wc-open-term')?.addEventListener('click', () => { closeWebControl(); openTerminal(); });
    $('#wc-open-cmdk')?.addEventListener('click', () => { closeWebControl(); openCmdk(); });
  }

  function openWebControl() {
    if (!web) return;
    buildWebControl();
    web.classList.add('open');
    document.body.style.overflow = 'hidden';
    logTarget = webOut;
    if (!webOut.dataset.booted) {
      print('ПУЛЬТ УПРАВЛЕНИЯ 3115 // ONLINE', 'ok');
      print('Выбирай действие или жми <span class="cmd">help</span>.', 'dim');
      webOut.dataset.booted = '1';
    }
    sound.playOpen();
  }
  function closeWebControl() {
    if (!web) return;
    web.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ====================================================================
     8. ТАЙМЛАЙН
     ==================================================================== */
  const ERAS = [
    { year: '1990–2000', title: 'ЗАРОЖДЕНИЕ', text: 'Скука, первый дым, рождение Гурыча. Основание школы №59, первый бой с Рамм и рождение Термина.' },
    { year: '2000–2015', title: 'РАСЦВЕТ, ТУРБИНА И УЧЕНИК', text: 'Рейв-турбина набирает обороты, появляются ученики и первые ритуалы подвала.' },
    { year: '2015–2025', title: 'ВЕЛИКАЯ ВОЙНА С РАММ', text: 'Звуковой шторм, Гурин Джихад и битва за подвал. Дым становится оружием.' },
    { year: '2025–…', title: 'ЦИФРОВОЙ ПЫЩ', text: 'Архив 3115 оцифрован. Теперь это не история — это состояние.' },
    { year: '∞', title: 'КОНЕЦ И НАЧАЛО', text: 'ПЫЩ-ПЫЩ-ПЫЩ. АГА. ЫВЫВ. ГУРИН ДЖИХАД НАВСЕГДА.' }
  ];
  const timeline = $('#timeline'), timelinePanel = $('#timeline-panel');
  function openTimeline() {
    const nodes = ERAS.map(e => `<div class="tl-node"><div class="tl-year">${e.year}</div><h3>${e.title}</h3><p>${e.text}</p></div>`).join('');
    const nav = Object.entries(COMMANDS).map(([k, c]) => `<span class="tl-cmd">${c.usage}</span>`).join(' ');
    timelinePanel.innerHTML = `<button class="dossier-close tl-close" aria-label="Закрыть">✕</button><h2>ХРОНОЛОГИЯ ПЫЩ-ПАРАДА</h2><div class="timeline-track">${nodes}</div><div class="tl-commands"><div class="tl-cmd-title">// КОМАНДЫ ТЕРМИНАЛА (все доступны в пульте ☰)</div>${nav}</div>`;
    timelinePanel.querySelector('.tl-close').addEventListener('click', closeTimeline);
    timeline.classList.add('open');
    document.body.style.overflow = 'hidden';
    sound.playOpen();
  }
  function closeTimeline() {
    timeline.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ====================================================================
     9. ТИКЕР ЛОРА
     ==================================================================== */
  function initTicker() {
    const track = $('#tick-track'); if (!track || !A) return;
    const bits = [
      '3115 — ЭТО НЕ ГОД. ЭТО СОСТОЯНИЕ.',
      'ГУРИН ДЖИХАД НАВСЕГДА',
      'ПОДВАЛ №59 // УРОВЕНЬ ДЫМА: 3115',
      'ЗАВУЧ В ДЫМУ НЕ ВИДИТ',
      'ПЫЩ-ПЫЩ-ПЫЩ. АГА. ЫВЫВ.',
      'РЕЙВ-ТУРБИНА НА МАКСИМУМЕ',
      'ГУРИНКОИН (GUR) — ВАЛЮТА ПОДПОЛЬЯ',
      'СКУКА — ГЛАВНЫЙ ВРАГ. ДЫМИ.'
    ];
    const entries = A.allItems.slice(0, 20).map(it => `★ ${it.title}`);
    const all = [...bits, ...entries];
    track.innerHTML = all.map(t => `<b>${A.escapeHtml(t)}</b><span class="sep">//</span>`).join('') + all.map(t => `<b>${A.escapeHtml(t)}</b><span class="sep">//</span>`).join('');
  }

  /* ====================================================================
     10. СТАТУС-БАР, ЧАСЫ, FPS, ПОСЕЩЕНИЯ
     ==================================================================== */
  function initStatusbar() {
    const clock = $('#sb-clock');
    const tick = () => { if (clock) clock.textContent = new Date().toLocaleTimeString('ru-RU'); };
    tick(); setInterval(tick, 1000);

    const fpsEl = $('#sb-fps');
    if (fpsEl) {
      let frames = 0, last = performance.now();
      (function loop(t) {
        frames++;
        if (t - last >= 1000) { fpsEl.textContent = frames; frames = 0; last = t; }
        requestAnimationFrame(loop);
      })(performance.now());
    }

    const visitedEl = $('#sb-visited');
    if (visitedEl) {
      const v = new Set((() => { try { return JSON.parse(localStorage.getItem('archive3115.visited')) || []; } catch (_) { return []; } })());
      const grid = $('#card-grid');
      const obs = new MutationObserver(() => {
        $$('.lore-card .card-heading h3', grid).forEach(h => v.add(h.textContent.trim()));
        visitedEl.textContent = v.size;
        try { localStorage.setItem('archive3115.visited', JSON.stringify([...v])); } catch (_) {}
      });
      if (grid) obs.observe(grid, { childList: true });
    }

    const smokeBar = $('#sb-smoke');
    const densEl = $('#smoke-density-val');
    if (smokeBar) setInterval(() => {
      const n = parseInt((densEl?.textContent || '0'), 10) || 0;
      smokeBar.style.width = Math.min(100, n / 31.15) + '%';
    }, 250);
  }

  function syncStatusbar() {
    if (!A) return;
    const st = A.getState();
    const s = $('#sb-section'), c = $('#sb-count');
    if (s) s.textContent = st.current;
    if (c) c.textContent = (A.groups.get(st.current) || []).length;
    ensureAbout();
  }

  /* ====================================================================
     11. КОНФЕТТИ / ПАСХАЛКА
     ==================================================================== */
  const confetti = $('#confetti-canvas');
  let cctx, cparts = [], cran = 0;
  function resizeConfetti() {
    if (!confetti) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    confetti.width = innerWidth * dpr; confetti.height = innerHeight * dpr;
    confetti.style.width = innerWidth + 'px'; confetti.style.height = innerHeight + 'px';
    cctx = confetti.getContext('2d'); cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function burstConfetti() {
    if (!confetti || reduce) return;
    resizeConfetti();
    const colors = ['#39ff78', '#a2ffb6', '#d8ff71', '#00fff0', '#ffffff'];
    for (let i = 0; i < 180; i++) {
      cparts.push({
        x: innerWidth / 2 + (Math.random() - .5) * 200,
        y: innerHeight / 2 + (Math.random() - .5) * 80,
        vx: (Math.random() - .5) * 14, vy: Math.random() * -14 - 4,
        s: 3 + Math.random() * 5, c: colors[(Math.random() * colors.length) | 0],
        a: 1, rot: Math.random() * 6
      });
    }
    if (!cran) cran = requestAnimationFrame(confettiLoop);
  }
  function confettiLoop() {
    cctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = cparts.length - 1; i >= 0; i--) {
      const p = cparts[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.4; p.vx *= 0.99; p.rot += 0.2; p.a -= 0.008;
      if (p.a <= 0 || p.y > innerHeight + 40) { cparts.splice(i, 1); continue; }
      cctx.save(); cctx.globalAlpha = p.a; cctx.translate(p.x, p.y); cctx.rotate(p.rot);
      cctx.fillStyle = p.c; cctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 1.6); cctx.restore();
    }
    if (cparts.length) cran = requestAnimationFrame(confettiLoop);
    else { cran = 0; cctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  let pyshStreak = 0, pyshTimer = 0;
  function notePyshKey() {
    pyshStreak++;
    clearTimeout(pyshTimer);
    pyshTimer = setTimeout(() => { pyshStreak = 0; }, 900);
    if (pyshStreak >= 3) { pyshStreak = 0; burstConfetti(); toast('☄ ПАСХАЛКА: ПЫЩ-ПЫЩ-ПЫЩ! ГУРИН ДЖАХАД ОДОБРЯЕТ'); sound.playPysh(); }
  }
  addEventListener('resize', resizeConfetti);

  /* ====================================================================
     12. ГОРЯЧИЕ КЛАВИШИ И СОБЫТИЯ
     ==================================================================== */
  function topOverlay() {
    if (cmdk.classList.contains('open')) return closeCmdk;
    if (dossier.classList.contains('open')) return closeDossier;
    if (term.classList.contains('open')) return closeTerminal;
    if (web && web.classList.contains('open')) return closeWebControl;
    if (timeline.classList.contains('open')) return closeTimeline;
    return null;
  }

  function initUI() {
    $('#cmd-btn')?.addEventListener('click', openCmdk);
    $('#term-btn')?.addEventListener('click', openTerminal);
    $('#ctl-btn')?.addEventListener('click', openWebControl);
    $('#theme-btn')?.addEventListener('click', () => { const t = nextTheme(); toast('Тема: ' + t); sound.playToggle(); });
    const soundBtn = $('#sound-btn');
    if (soundBtn) {
      soundBtn.classList.toggle('active', !sound.enabled);
      soundBtn.textContent = sound.enabled ? '♪' : '✕';
      soundBtn.addEventListener('click', () => {
        sound.setEnabled(!sound.enabled);
        soundBtn.classList.toggle('active', !sound.enabled);
        soundBtn.textContent = sound.enabled ? '♪' : '✕';
        toast('Звук: ' + (sound.enabled ? 'ВКЛ' : 'ВЫКЛ'));
        if (sound.enabled) sound.playBeep();
      });
    }
    $('#fav-btn')?.addEventListener('click', () => {
      $('#card-grid')?.classList.toggle('favs-only');
      const on = $('#card-grid')?.classList.contains('favs-only');
      toast(on ? '★ Только избранное' : 'Показаны все записи');
      sound.playToggle();
    });

    cmdkInput?.addEventListener('input', () => renderCmdk(cmdkInput.value));
    cmdkInput?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); cmdActive = Math.min(cmdItems.length - 1, cmdActive + 1); highlightCmd(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cmdActive = Math.max(0, cmdActive - 1); highlightCmd(); }
      else if (e.key === 'Enter') { e.preventDefault(); runCmd(cmdActive); }
    });
    cmdk?.addEventListener('click', (e) => { if (e.target === cmdk) closeCmdk(); });
    dossier?.addEventListener('click', (e) => { if (e.target === dossier) closeDossier(); });
    term?.addEventListener('click', (e) => { if (e.target === term) closeTerminal(); });
    web?.addEventListener('click', (e) => { if (e.target === web) closeWebControl(); });
    $('#wc-close')?.addEventListener('click', closeWebControl);
    timeline?.addEventListener('click', (e) => { if (e.target === timeline) closeTimeline(); });

    termForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      runTerminal(termInput.value);
      termInput.value = '';
    });
    termInput?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') { if (histIdx > 0) { histIdx--; termInput.value = termHistory[histIdx] || ''; } e.preventDefault(); }
      if (e.key === 'ArrowDown') { if (histIdx < termHistory.length - 1) { histIdx++; termInput.value = termHistory[histIdx] || ''; } else { histIdx = termHistory.length; termInput.value = ''; } e.preventDefault(); }
    });

    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
      if ((e.ctrlKey || e.metaKey) && e.key.toLocaleLowerCase('ru') === 'k') { e.preventDefault(); cmdk.classList.contains('open') ? closeCmdk() : openCmdk(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === '`' || e.key === 'ё' || e.key === '~')) { e.preventDefault(); term.classList.contains('open') ? closeTerminal() : openTerminal(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLocaleLowerCase('ru') === 'у' || e.key.toLocaleLowerCase('ru') === 'e')) { e.preventDefault(); web && web.classList.contains('open') ? closeWebControl() : openWebControl(); return; }
      if (e.key === 'Escape') { const fn = topOverlay(); if (fn) { fn(); return; } }
      if (typing) { if (e.key.toLocaleLowerCase('ru') === 'п' || e.key.toLocaleLowerCase('ru') === 'g') notePyshKey(); return; }
      const k = e.key.toLocaleLowerCase('ru');
      if (k === 'g') { $('#card-grid')?.classList.toggle('favs-only'); toast('★ Фильтр избранного'); }
      if (k === 'f') { $('#fav-btn')?.click(); }
      if (k === 't') { const t = nextTheme(); toast('Тема: ' + t); }
      if (k === 'm') { $('#sound-btn')?.click(); }
      if (k === 'п' || k === 'p') notePyshKey();
    });

    const grid = $('#card-grid');
    if (grid) new MutationObserver(syncStatusbar).observe(grid, { childList: true });
    syncStatusbar();
  }

  /* ====================================================================
     13. СТАРТ
     ==================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    if (A) {
      A.onRender = (current) => { if (current === 'О системе') setTimeout(ensureAbout, 0); };
      A.searchAll = globalSearch;
    }
    initTicker();
    initStatusbar();
    initFavDecorator();
    initUI();
    syncStatusbar();
    if (sound.enabled) {
      const once = () => { sound.init(); removeEventListener('pointerdown', once); };
      addEventListener('pointerdown', once);
    }
  });
})();
