(() => {
  const CN = window.CN || {};
  const en = CN.lang === 'en';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Newark time + open status ---------- */
  function nyNow() {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
    const g = (t) => p.find((x) => x.type === t).value;
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday'));
    return { day: wd, h: +g('hour') + +g('minute') / 60, year: +g('year'), month: +g('month') };
  }
  const fmt = (h) => {
    const hh = Math.floor(h) % 24;
    if (en) return hh === 0 ? '12 AM' : hh === 12 ? '12 PM' : hh < 12 ? hh + ' AM' : (hh - 12) + ' PM';
    return hh + 'h';
  };
  function status() {
    const H = CN.hours; const S = CN.status;
    if (!H) return null;
    const n = nyNow();
    const prev = (n.day + 6) % 7;
    // still open from yesterday's late close?
    if (H[prev][1] > 24 && n.h < H[prev][1] - 24) return { open: true, text: `${S.open} · ${S.closes} ${fmt(H[prev][1])}`, day: n.day };
    const [o, c] = H[n.day];
    if (n.h >= o && n.h < c) return { open: true, text: `${S.open} · ${S.closes} ${fmt(c)}`, day: n.day };
    if (n.h < o) return { open: false, text: `${S.closed} · ${S.opens} ${fmt(o)}`, day: n.day };
    const nx = (n.day + 1) % 7;
    return { open: false, text: `${S.closed} · ${S.opens} ${S.tomorrow} ${fmt(H[nx][0])}`, day: n.day };
  }
  const st = status();
  if (st) {
    $$('[data-status], [data-status-big]').forEach((el) => { el.textContent = st.text; el.classList.toggle('is-open', st.open); if (el.matches('[data-status-big]')) el.classList.add('status'); });
    $$('[data-day]').forEach((el) => { if (+el.dataset.day === st.day) { el.classList.add('is-today'); el.dataset.today = en ? 'Today' : 'Hoje'; } });
  }

  /* ---------- header + drawer ---------- */
  const hdr = $('[data-hdr]');
  const onScroll = () => hdr && hdr.classList.toggle('is-solid', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('[data-burger]'); const drawer = $('[data-drawer]');
  if (burger && drawer) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', open); drawer.hidden = !open;
      document.body.style.overflow = open ? 'hidden' : '';
      hdr.classList.toggle('is-menu', open);
    });
  }

  /* ---------- hero video ---------- */
  const vid = $('.hero__video');
  if (vid && !reduce) {
    const small = matchMedia('(max-width: 800px)').matches || (navigator.connection && navigator.connection.saveData);
    vid.src = small ? vid.dataset.srcSmall : vid.dataset.srcLarge;
    vid.play().catch(() => {});
  }

  /* ---------- years since Nov 1992 ---------- */
  const n = nyNow();
  const years = n.year - 1992 - (n.month < 11 ? 1 : 0);
  $$('[data-years-text]').forEach((el) => { el.textContent = years; });
  const yEl = $('[data-years]');
  if (yEl) yEl.textContent = years;

  /* ---------- rodízio card + parade ---------- */
  const sig = $('[data-signal]'); const parade = $('[data-parade]'); const counter = $('[data-counter]'); const hint = $('[data-signal-hint]');
  if (sig && parade) {
    let green = true; let count = 0; let visible = false;
    const track = $('[data-track]');
    const cut = track.children.length / 2;
    const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0.2 });
    io.observe(parade);
    sig.addEventListener('click', () => {
      green = !green;
      sig.setAttribute('aria-pressed', green);
      parade.classList.toggle('is-red', !green);
      hint.textContent = green ? (en ? 'Green: the skewers keep coming' : 'Verde: os espetos continuam vindo') : (en ? 'Red: the passadores wait for you' : 'Vermelho: os passadores esperam você');
    });
    if (!reduce) {
      const per = 70000 / cut; // ms per skewer passing
      setInterval(() => { if (green && visible && !document.hidden) { count++; counter.textContent = count; } }, per);
    }
  }

  /* ---------- menu: filter, search, call list ---------- */
  const search = $('[data-search]');
  if (search) {
    const chips = $$('.chip'); const secs = $$('[data-sec]'); const empty = $('[data-empty]');
    let filter = 'all';
    const apply = () => {
      const q = search.value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      let shown = 0;
      secs.forEach((s) => {
        const okSec = filter === 'all' || s.dataset.sec === filter;
        let any = 0;
        $$('.dish', s).forEach((d) => {
          const hay = d.dataset.search.normalize('NFD').replace(/[̀-ͯ]/g, '');
          const ok = okSec && (!q || hay.includes(q));
          d.hidden = !ok; if (ok) any++;
        });
        s.hidden = !any; shown += any;
      });
      empty.hidden = shown > 0;
    };
    chips.forEach((c) => c.addEventListener('click', () => {
      filter = c.dataset.filter; chips.forEach((x) => x.classList.toggle('is-on', x === c)); apply();
      const tools = $('.alc__tools'); const top = $('#alacarte').getBoundingClientRect().top + scrollY + ($('.alc__head h2').offsetHeight);
      if (scrollY > top + 200) scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    }));
    search.addEventListener('input', apply);

    const KEY = 'cn-list-' + CN.lang;
    const sheet = $('[data-sheet]'); const list = $('[data-list]'); const countEl = $('[data-count]'); const toggle = $('[data-sheet-toggle]');
    let picks = [];
    try { picks = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { picks = []; }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(picks)); } catch (e) {} };
    const render = () => {
      $$('.dish').forEach((d) => d.querySelector('.dish__add').setAttribute('aria-pressed', picks.some((p) => p.id === d.dataset.id)));
      list.innerHTML = '';
      picks.forEach((p) => {
        const li = document.createElement('li');
        li.innerHTML = `<b></b> <span>× ${p.qty}</span>`;
        li.querySelector('b').textContent = p.name;
        const minus = document.createElement('button'); minus.type = 'button'; minus.className = 'sheet__clear'; minus.textContent = '−'; minus.setAttribute('aria-label', (en ? 'Less ' : 'Menos ') + p.name);
        const plus = document.createElement('button'); plus.type = 'button'; plus.className = 'sheet__clear'; plus.textContent = '+'; plus.setAttribute('aria-label', (en ? 'More ' : 'Mais ') + p.name);
        minus.onclick = () => { p.qty--; if (p.qty < 1) picks = picks.filter((x) => x !== p); save(); render(); };
        plus.onclick = () => { p.qty++; save(); render(); };
        li.append(' ', minus, plus);
        list.append(li);
      });
      const total = picks.reduce((a, p) => a + p.qty, 0);
      countEl.textContent = total;
      sheet.hidden = total === 0;
      if (!total) { sheet.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
    };
    $$('.dish__add').forEach((b) => b.addEventListener('click', () => {
      const d = b.closest('.dish'); const id = d.dataset.id;
      const has = picks.find((p) => p.id === id);
      if (has) picks = picks.filter((p) => p !== has); else picks.push({ id, name: d.dataset.name, qty: 1 });
      save(); render();
    }));
    toggle.addEventListener('click', () => { const o = !sheet.classList.contains('is-open'); sheet.classList.toggle('is-open', o); toggle.setAttribute('aria-expanded', o); });
    $('[data-clear]').addEventListener('click', () => { picks = []; save(); render(); });
    $('[data-copy]').addEventListener('click', async () => {
      const name = $('[data-oname]').value.trim();
      const txt = (en ? 'Takeout order, Casa Nova Grill' : 'Pedido para viagem, Casa Nova Grill') + (name ? ` (${name})` : '') + '\n' + picks.map((p) => `${p.qty} × ${p.name}`).join('\n');
      const out = $('[data-copied]');
      try { await navigator.clipboard.writeText(txt); out.textContent = en ? 'Copied. Read it out when you call.' : 'Copiado. É só ler ao ligar.'; } catch (e) { out.textContent = en ? 'Could not copy; the list stays on screen.' : 'Não deu para copiar; a lista fica na tela.'; }
    });
    render();
  }

  /* ---------- party planner ---------- */
  const form = $('[data-planner]');
  if (form) {
    const g = $('[data-guests]'); const gOut = $('[data-guests-out]'); const fit = $('[data-fit]'); const msg = $('[data-msg]'); const mail = $('[data-mail]');
    const fitText = (v) => {
      if (v < 30) return en ? 'Smaller group? Reserve a table on OpenTable or call; the private rooms start at 30.' : 'Grupo menor? Reserve mesa pelo OpenTable ou ligue; os salões privativos começam em 30.';
      if (v <= 100) return en ? 'Fits a private room (30 to 100 guests).' : 'Cabe num salão privativo (30 a 100 convidados).';
      return en ? 'Over 100: call to talk about larger setups in the 250-seat restaurant.' : 'Mais de 100: ligue para conversar sobre montagens maiores no restaurante de 250 lugares.';
    };
    const update = () => {
      const v = +g.value; gOut.textContent = v + (v >= 150 ? '+' : '');
      fit.textContent = fitText(v);
      const occ = (form.querySelector('input[name="occasion"]:checked') || {}).value || '';
      const date = $('[data-date]').value; const meal = $('[data-meal]').value; const name = $('[data-pname]').value.trim(); const notes = $('[data-notes]').value.trim();
      let dStr = '';
      if (date) { const [y, m, d] = date.split('-').map(Number); dStr = new Date(y, m - 1, d).toLocaleDateString(en ? 'en-US' : 'pt-BR', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
      const lines = en
        ? [`Hello Casa Nova Grill,`, ``, `I'd like to plan an event in your party room.`, `Occasion: ${occ}`, `Guests: about ${v}${v >= 150 ? '+' : ''}`, `Date: ${dStr || 'to be decided'}`, `Meal: ${meal}`, notes ? `Notes: ${notes}` : '', ``, `Thank you${name ? ',\n' + name : ''}`]
        : [`Olá, Casa Nova Grill,`, ``, `Gostaria de planejar um evento no salão de festas.`, `Ocasião: ${occ}`, `Convidados: cerca de ${v}${v >= 150 ? '+' : ''}`, `Data: ${dStr || 'a definir'}`, `Refeição: ${meal}`, notes ? `Observações: ${notes}` : '', ``, `Obrigado${name ? ',\n' + name : ''}`];
      const body = lines.filter((l, i) => l !== '' || lines[i - 1] !== '').join('\n');
      msg.textContent = body;
      const subject = en ? `Party inquiry: ${occ}, ${v} guests` : `Festa: ${occ}, ${v} convidados`;
      mail.href = `mailto:jm@cngrill.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };
    form.addEventListener('input', update); form.addEventListener('change', update);
    form.addEventListener('submit', (e) => e.preventDefault());
    update();
  }

  /* ---------- motion ---------- */
  window.addEventListener('load', () => {
    if (reduce || !window.gsap) return;
    const { gsap } = window; gsap.registerPlugin(window.ScrollTrigger);
    if (window.Lenis && matchMedia('(min-width: 1000px) and (pointer: fine)').matches) {
      const lenis = new window.Lenis({ lerp: 0.12 });
      lenis.on('scroll', window.ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
    }
    gsap.from('.hero__title, .hero__lede, .hero__actions, .hero__facts', { y: 30, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out' });
    const sel = '.h2, .lede, .since__text p, .day, .fire__text p, .party__text p, .party__photos figure, .cuts li, .vcard, .mhero__opt, .since__photo, .rod__img, .fire__thumb, .gallery figure';
    $$(sel).forEach((el) => {
      if (el.closest('.hero')) return;
      gsap.from(el, { y: 26, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    if (yEl) {
      const o = { v: 0 };
      gsap.to(o, { v: years, duration: 1.8, ease: 'power2.out', onUpdate: () => { yEl.textContent = Math.round(o.v); }, scrollTrigger: { trigger: yEl, start: 'top 80%', once: true } });
      yEl.textContent = '0';
    }
    const fireImg = $('.fire__img img');
    if (fireImg) gsap.fromTo(fireImg, { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.fire', start: 'top bottom', end: 'bottom top', scrub: true } });
    window.ScrollTrigger.refresh();
  });
})();
