/* =========================================================
   OXFORD INN · interactions
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  // iPhone/iPad (incl. iPadOS, which reports as MacIntel with touch) → Apple Maps; everything else → Google Maps.
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Apple Maps universal links hand off to the Maps app; open in the same tab so Safari doesn't leave a blank tab behind.
  const mapsTarget = isIOS ? '' : ' target="_blank" rel="noopener"';
  if (isIOS) $$('a[data-apple-maps]').forEach(a => { a.href = a.dataset.appleMaps; a.removeAttribute('target'); });

  const BOOKING = {
    base: 'https://booking.hotelkeyapp.com/#/',
    pc: '0158',
    property: '07897f25-45a2-450c-9abd-f0152e16d015',
    site: 'https://oxfordinnhotel.com/'
  };

  /* ---------------- Preloader + split text ---------------- */
  $$('.split').forEach((el, li) => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    let i = 0;
    text.split(/(\s+)/).forEach(word => {
      if (/^\s+$/.test(word)) { el.append(' '); return; }
      const w = document.createElement('span');
      w.style.display = 'inline-block'; w.style.whiteSpace = 'nowrap';
      w.setAttribute('aria-hidden', 'true');
      [...word].forEach(c => {
        const s = document.createElement('span');
        s.className = 'ch'; s.textContent = c; s.style.setProperty('--i', i++);
        w.append(s);
      });
      el.append(w);
    });
    el.style.setProperty('--base', `${0.15 + li * 0.35}s`);
  });

  document.body.classList.add('is-loading');
  const finishLoad = () => {
    const pre = $('#preloader');
    pre.classList.add('is-done');
    document.body.classList.remove('is-loading');
    setTimeout(() => document.body.classList.add('is-ready'), reduced ? 0 : 350);
  };
  const minDelay = reduced ? 0 : 1700;
  const t0 = performance.now();
  const onLoaded = () => setTimeout(finishLoad, Math.max(0, minDelay - (performance.now() - t0)));
  if (document.readyState === 'complete') onLoaded(); else addEventListener('load', onLoaded);
  setTimeout(finishLoad, 4500); // never trap the guest behind the loader

  /* ---------------- Theme lamp ---------------- */
  const root = document.documentElement;
  const lamp = $('#lampToggle');
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const syncLamp = () => lamp.classList.toggle('is-lit', isDark());
  syncLamp();
  lamp.addEventListener('click', () => {
    lamp.classList.add('is-pulled');
    setTimeout(() => lamp.classList.remove('is-pulled'), 260);
    const next = isDark() ? 'light' : 'dark';
    const apply = () => { root.dataset.theme = next; syncLamp(); };
    if (document.startViewTransition && !reduced) document.startViewTransition(apply); else apply();
    try { localStorage.setItem('oi-theme', next); } catch (e) {}
    toast(next === 'dark' ? 'Lights low. Goodnight mode 🌙' : 'Rise and shine ☀️');
    buzz(8);
  });

  /* ---------------- Toast + haptics ---------------- */
  const toastEl = $('#toast');
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  }
  function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

  /* ---------------- Nav: always fixed; solid after scroll (no hide-on-scroll) ---------------- */
  const nav = $('#nav');
  const mbar = $('.mbar');
  const progress = $('#progress');
  const onScrollNav = () => {
    const y = scrollY;
    const heroH = $('#hero').offsetHeight;
    nav.classList.toggle('is-solid', y > 40);
    nav.classList.remove('is-hidden');
    mbar && mbar.classList.toggle('is-on', y > heroH * 0.7);
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  };

  // current section highlight
  const navLinks = $$('.nav__links a');
  const secObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['rooms', 'tour', 'amenities', 'explore', 'contact'].forEach(id => { const s = document.getElementById(id); s && secObs.observe(s); });

  /* ---------------- Mobile menu ---------------- */
  const burger = $('#burger');
  const menu = $('#menu');
  const setMenu = open => {
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
    nav.classList.toggle('is-menu', open);
    nav.style.color = open ? '#f7f1e6' : '';
  };
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------------- Hero slideshow ---------------- */
  const slides = $$('.hero__slide');
  const dotsWrap = $('#heroDots');
  let slideIdx = 0, slideTimer;
  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', `Show photo ${i + 1}`);
    b.addEventListener('click', () => goSlide(i));
    dotsWrap.append(b);
  });
  const dots = $$('button', dotsWrap);
  function goSlide(i) {
    slides[slideIdx].classList.remove('is-active');
    dots[slideIdx].classList.remove('is-active');
    slideIdx = (i + slides.length) % slides.length;
    slides[slideIdx].classList.add('is-active');
    void dots[slideIdx].offsetWidth;
    dots[slideIdx].classList.add('is-active');
    clearTimeout(slideTimer);
    if (!reduced) slideTimer = setTimeout(() => goSlide(slideIdx + 1), 6000);
  }
  goSlide(0);

  // swipe hero on touch
  let hx = null;
  $('#hero').addEventListener('touchstart', e => { if (!e.target.closest('.booking')) hx = e.touches[0].clientX; }, { passive: true });
  $('#hero').addEventListener('touchend', e => {
    if (hx == null) return;
    const dx = e.changedTouches[0].clientX - hx;
    if (Math.abs(dx) > 50) goSlide(slideIdx + (dx < 0 ? 1 : -1));
    hx = null;
  }, { passive: true });

  // mouse parallax on hero
  if (finePointer && !reduced) {
    $('#hero').addEventListener('pointermove', e => {
      const x = (e.clientX / innerWidth - .5) * -24, y = (e.clientY / innerHeight - .5) * -16;
      slides.forEach(s => { s.style.setProperty('--px', x + 'px'); s.style.setProperty('--py', y + 'px'); });
    });
  }

  /* ---------------- Live line: local time + weather ---------------- */
  const liveLine = $('#liveLine');
  const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });
  let weather = '';
  const renderLive = () => { liveLine.textContent = `Ozark, Arkansas · ${timeFmt.format(new Date())}${weather}`; };
  renderLive(); setInterval(renderLive, 30000);
  const wmo = c => c === 0 ? 'clear' : c <= 3 ? 'partly cloudy' : c <= 48 ? 'foggy' : c <= 67 ? 'rainy' : c <= 77 ? 'snowy' : c <= 82 ? 'showers' : 'stormy';
  fetch('https://api.open-meteo.com/v1/forecast?latitude=35.4903&longitude=-93.8439&current=temperature_2m,weather_code&temperature_unit=fahrenheit')
    .then(r => r.ok ? r.json() : null)
    .then(d => { if (d && d.current) { weather = ` · ${Math.round(d.current.temperature_2m)}° & ${wmo(d.current.weather_code)}`; renderLive(); } })
    .catch(() => {});

  /* ---------------- Booking widget ---------------- */
  const inEl = $('#checkin'), outEl = $('#checkout'), gEl = $('#guests');
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  inEl.min = iso(today);
  inEl.value = iso(today);
  outEl.value = iso(addDays(today, 1));
  outEl.min = iso(addDays(today, 1));
  let guests = 1;

  const paint = (which, val) => {
    const d = parse(val);
    $(`[data-day="${which}"]`).textContent = String(d.getDate()).padStart(2, '0');
    $(`[data-mon="${which}"]`).textContent = d.toLocaleString('en-US', { month: 'short' });
    $(`[data-dow="${which}"]`).textContent = d.toLocaleString('en-US', { weekday: 'short' });
    const box = $(`[data-day="${which}"]`).parentElement;
    box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
  };
  const paintNights = () => {
    const n = Math.max(1, Math.round((parse(outEl.value) - parse(inEl.value)) / 864e5));
    $('#nights').textContent = n;
    $('#nightsLabel').textContent = n === 1 ? 'night' : 'nights';
  };
  const syncDates = () => {
    if (!inEl.value || parse(inEl.value) < today) inEl.value = iso(today);
    const minOut = addDays(parse(inEl.value), 1);
    outEl.min = iso(minOut);
    if (!outEl.value || parse(outEl.value) < minOut) outEl.value = iso(minOut);
    paint('in', inEl.value); paint('out', outEl.value); paintNights();
  };
  inEl.addEventListener('change', syncDates);
  outEl.addEventListener('change', syncDates);
  // Open native pickers reliably on desktop browsers
  $$('.booking__field input[type="date"]').forEach(inp => {
    inp.addEventListener('click', () => { try { inp.showPicker && inp.showPicker(); } catch (e) {} });
  });
  syncDates();

  $$('[data-step]').forEach(b => b.addEventListener('click', () => {
    guests = clamp(guests + Number(b.dataset.step), 1, 6);
    gEl.textContent = guests;
    gEl.animate([{ transform: 'scale(1.35)', color: '#f4b55e' }, { transform: 'scale(1)' }], { duration: 350, easing: 'ease-out' });
    buzz(5);
  }));

  const bookingUrl = () =>
    `${BOOKING.base}?pc=${BOOKING.pc}&from=${inEl.value}&to=${outEl.value}&guests=${guests}&skip_search=true&property_id=${BOOKING.property}&url=${BOOKING.site}`;

  $('#book').addEventListener('submit', e => {
    e.preventDefault();
    buzz(12);
    window.open(bookingUrl(), '_blank', 'noopener');
  });

  // "Book" buttons elsewhere scroll to the booking bar and spotlight it
  $$('[data-book]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const form = $('#book');
    form.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => {
      form.animate([
        { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14), 0 0 0 0 rgba(244,181,94,.9)' },
        { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14), 0 0 0 18px rgba(244,181,94,0)' }
      ], { duration: 900, iterations: 2 });
    }, 600);
  }));

  /* ---------------- Rooms ---------------- */
  const ICON = {
    tv: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>',
    wifi: '<svg viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r=".8"/></svg>',
    coffee: '<svg viewBox="0 0 24 24"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/></svg>',
    fridge: '<svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 10h14"/></svg>',
    dryer: '<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="5"/><path d="M13 6.5h7v5h-7"/><path d="M7 14l1.2 7h3L10.5 14"/></svg>',
    desk: '<svg viewBox="0 0 24 24"><path d="M3 10h18"/><path d="M5 10v10M19 10v10"/><path d="M14 10V6h5v4"/></svg>',
    bed: '<svg viewBox="0 0 24 24"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>',
    access: '<svg viewBox="0 0 24 24"><circle cx="16" cy="4" r="1.2"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><path d="M4.24 14.5a5 5 0 0 0 6.88 6"/><path d="M13.76 17.5a5 5 0 0 0-6.88-6"/></svg>'
  };
  const baseChips = [['tv', '42″ LCD TV'], ['wifi', 'Free Wi‑Fi'], ['coffee', 'Coffee in room'], ['fridge', 'Fridge'], ['dryer', 'Hair dryer'], ['desk', 'Work desk & ergonomic chair']];
  const ROOMS = [
    {
      tab: 'King', kicker: 'One king bed', name: 'The King',
      desc: 'Relax with friends and family in a comfortable room with a fresh, clean king‑size bed. For extra comfort there’s a work desk with an ergonomic chair, a 42″ TV and a lounge corner by the window.',
      chips: [['bed', 'King‑size bed'], ...baseChips],
      imgs: [['king-1.jpg', 'King room with a big window and balcony'], ['king-2.jpg', 'King room with lounge sofa'], ['king-3.jpg', 'King room with lantern-lit desk'], ['bath.jpg', 'Vanity with coffee maker and bath']]
    },
    {
      tab: 'Two Doubles', kicker: 'Two double beds', name: 'The Double',
      desc: 'Room for the whole crew: two fresh, clean double beds, a long work desk with an ergonomic chair, and a 42″ TV. Great for families, friends and team trips.',
      chips: [['bed', 'Two double beds'], ...baseChips],
      imgs: [['double-6.jpg', 'Double room with two beds and long desk'], ['double-1.jpg', 'Double room with sunny window'], ['double-7.jpg', 'Double room with walnut headboards'], ['double-2.jpg', 'Double room with long desk'], ['double-5.jpg', 'Double room opening onto the walkway'], ['desk.jpg', 'Lantern-lit work desk'], ['bath.jpg', 'Vanity and bath']]
    },
    {
      tab: 'Accessible Double', kicker: 'Accessible room', name: 'Accessible Double',
      desc: 'All the comfort of our Double, set up for accessibility. You get fresh, clean beds, a work desk with an ergonomic chair and a 42″ TV. Call us and we’ll make sure the room fits your needs.',
      chips: [['access', 'Accessible'], ['bed', 'Fresh, clean beds'], ...baseChips],
      imgs: [['double-8.jpg', 'Double room with lounge sofa'], ['double-4.jpg', 'Double room with desk'], ['double-3.jpg', 'Double room with two beds'], ['bath.jpg', 'Vanity and bath']]
    }
  ];

  const tabsEl = $('#roomTabs'), pill = $('#tabsPill');
  const frames = $('#roomFrames'), thumbs = $('#roomThumbs'), info = $('.room__info');
  let roomI = 0, photoI = 0;

  ROOMS.forEach((r, i) => {
    const b = document.createElement('button');
    b.role = 'tab'; b.textContent = r.tab; b.setAttribute('aria-selected', i === 0);
    b.addEventListener('click', () => { setRoom(i); buzz(6); });
    tabsEl.append(b);
  });
  const tabBtns = $$('button', tabsEl);
  const movePill = () => {
    const b = tabBtns[roomI];
    pill.style.width = b.offsetWidth + 'px';
    pill.style.transform = `translateX(${b.offsetLeft}px)`;
  };

  function setRoom(i) {
    roomI = i; photoI = 0;
    const r = ROOMS[i];
    tabBtns.forEach((b, j) => b.setAttribute('aria-selected', j === i));
    movePill();
    $('#roomKicker').textContent = r.kicker;
    $('#roomName').textContent = r.name;
    $('#roomDesc').textContent = r.desc;
    $('#roomChips').innerHTML = r.chips.map(([ic, t]) => `<li>${ICON[ic]}${t}</li>`).join('');
    const set = src => `../images/${src.replace('.jpg', '-1200.jpg')} 1200w, ../images/${src} 2400w`;
    frames.innerHTML = r.imgs.map(([src, alt], j) => `<img src="../images/${src}" srcset="${set(src)}" sizes="(max-width: 900px) 100vw, 60vw" alt="${alt}" class="${j === 0 ? 'is-active' : ''}" ${j ? 'loading="lazy"' : ''}>`).join('');
    thumbs.innerHTML = r.imgs.map(([src, alt], j) => `<button class="${j === 0 ? 'is-active' : ''}" aria-label="Show photo ${j + 1}"><img src="../images/${src.replace('.jpg', '-1200.jpg')}" alt="" loading="lazy"></button>`).join('');
    $$('button', thumbs).forEach((b, j) => b.addEventListener('click', () => setPhoto(j)));
    $('#roomTotal').textContent = String(r.imgs.length).padStart(2, '0');
    $('#roomIdx').textContent = '01';
    info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
  }
  function setPhoto(j) {
    const imgs = $$('img', frames), tbs = $$('button', thumbs);
    const n = imgs.length;
    j = (j + n) % n;
    if (j === photoI) return;
    imgs.forEach(im => im.classList.remove('is-leaving'));
    imgs[photoI].classList.remove('is-active'); imgs[photoI].classList.add('is-leaving');
    tbs[photoI].classList.remove('is-active');
    photoI = j;
    imgs[j].classList.add('is-active'); tbs[j].classList.add('is-active');
    $('#roomIdx').textContent = String(j + 1).padStart(2, '0');
  }
  $$('.room__arrow').forEach(b => b.addEventListener('click', () => setPhoto(photoI + Number(b.dataset.dir))));
  setRoom(0);
  addEventListener('resize', movePill);
  document.fonts && document.fonts.ready.then(movePill);

  // swipe room photos
  const stage = $('#roomStage');
  let sx = null, sy = null;
  stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { setPhoto(photoI + (dx < 0 ? 1 : -1)); buzz(5); }
    sx = null;
  }, { passive: true });

  // keyboard arrows when rooms in view
  addEventListener('keydown', e => {
    if (!$('#lightbox').hidden) return;
    const r = $('#rooms').getBoundingClientRect();
    if (r.top < innerHeight * .5 && r.bottom > innerHeight * .5) {
      if (e.key === 'ArrowRight') setPhoto(photoI + 1);
      if (e.key === 'ArrowLeft') setPhoto(photoI - 1);
    }
  });

  // 3D tilt + glare
  if (finePointer && !reduced) {
    stage.addEventListener('pointermove', e => {
      const b = stage.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
      stage.style.setProperty('--ry', `${(px - .5) * 6}deg`);
      stage.style.setProperty('--rx', `${(.5 - py) * 6}deg`);
      stage.style.setProperty('--gx', `${px * 100}%`);
      stage.style.setProperty('--gy', `${py * 100}%`);
    });
    stage.addEventListener('pointerleave', () => { stage.style.setProperty('--rx', '0deg'); stage.style.setProperty('--ry', '0deg'); });
  }

  // room booking link → current dates
  $$('[data-book-link]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); window.open(bookingUrl(), '_blank', 'noopener');
  }));

  $('#roomZoom').addEventListener('click', () => {
    const r = ROOMS[roomI];
    openLightbox(r.imgs.map(([s, alt]) => ({ src: '../images/' + s, alt })), photoI);
  });

  /* ---------------- Lightbox ---------------- */
  const lb = $('#lightbox'), lbImg = $('img', lb), lbCap = $('figcaption', lb);
  let lbList = [], lbI = 0, lastFocus;
  function openLightbox(list, i) {
    lbList = list; lbI = i; lastFocus = document.activeElement;
    lb.hidden = false; document.body.style.overflow = 'hidden';
    showLb(); $('.lightbox__close', lb).focus();
  }
  function showLb() {
    const it = lbList[lbI];
    lbImg.style.animation = 'none'; void lbImg.offsetWidth; lbImg.style.animation = '';
    lbImg.src = it.src; lbImg.alt = it.alt; lbCap.textContent = `${it.alt}  ·  ${lbI + 1} / ${lbList.length}`;
  }
  const closeLb = () => { lb.hidden = true; document.body.style.overflow = ''; lastFocus && lastFocus.focus(); };
  const stepLb = d => { lbI = (lbI + d + lbList.length) % lbList.length; showLb(); };
  $('.lightbox__close', lb).addEventListener('click', closeLb);
  $('.lightbox__nav--prev', lb).addEventListener('click', () => stepLb(-1));
  $('.lightbox__nav--next', lb).addEventListener('click', () => stepLb(1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowRight') stepLb(1);
    if (e.key === 'ArrowLeft') stepLb(-1);
  });
  let lx = null;
  lb.addEventListener('touchstart', e => { lx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (lx == null) return; const dx = e.changedTouches[0].clientX - lx; if (Math.abs(dx) > 40) stepLb(dx < 0 ? 1 : -1); lx = null; }, { passive: true });

  const groups = {};
  $$('[data-lightbox]').forEach(fig => {
    const g = fig.dataset.lightbox; (groups[g] ||= []).push(fig);
    fig.tabIndex = 0; fig.setAttribute('role', 'button');
    const open = () => {
      const list = groups[g].map(f => { const im = $('img', f); return { src: im.src, alt: im.alt }; });
      openLightbox(list, groups[g].indexOf(fig));
    };
    fig.addEventListener('click', () => { if (!tourDragged) open(); });
    fig.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });

  /* ---------------- Tour: pinned horizontal scroll ---------------- */
  const tour = $('#tour'), track = $('#tourTrack'), tourBar = $('#tourBar'), tourIntro = $('.tour__intro');
  let tourDragged = false;
  const desktopTour = () => matchMedia('(min-width: 901px)').matches;
  const sizeTour = () => {
    if (!desktopTour()) { tour.style.removeProperty('--tour-h'); tourIntro.style.opacity = ''; tourIntro.style.transform = ''; return; }
    const dist = track.scrollWidth - innerWidth;
    tour.style.setProperty('--tour-h', `${dist + innerHeight}px`);
  };
  const updateTour = () => {
    if (!desktopTour()) return;
    const r = tour.getBoundingClientRect();
    const dist = track.scrollWidth - innerWidth;
    const p = clamp(-r.top / (r.height - innerHeight), 0, 1);
    track.style.transform = `translate3d(${-p * dist}px,0,0)`;
    tourBar.style.transform = `scaleX(${p})`;
    tourIntro.style.opacity = 1 - clamp((p - .04) * 6, 0, 1);
    tourIntro.style.transform = `translateX(${-clamp((p - .04) * 6, 0, 1) * 60}px)`;
    $$('.tour__card img', track).forEach((im, i) => im.style.setProperty('--shift', `${(p * 100 - i * 12) * -0.25}px`));
  };
  addEventListener('resize', sizeTour);
  addEventListener('load', sizeTour);
  sizeTour();

  /* ---------------- Reveal on scroll + counters ---------------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  // stagger siblings
  $$('.reveal').forEach(el => {
    const sibs = $$(':scope > .reveal', el.parentElement);
    const idx = sibs.indexOf(el);
    if (idx > 0) el.style.setProperty('--rd', `${Math.min(idx, 8) * 0.07}s`);
    io.observe(el);
  });

  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target, to = parseFloat(el.dataset.count), dec = +(el.dataset.decimals || 0), suf = el.dataset.suffix || '';
      if (reduced) { el.textContent = to.toFixed(dec) + suf; return; }
      const start = performance.now(), dur = 1600;
      const tick = now => {
        const t = clamp((now - start) / dur, 0, 1), k = 1 - Math.pow(1 - t, 4);
        el.textContent = (to * k).toFixed(dec) + suf;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------------- Parallax ---------------- */
  const parallaxEls = $$('.parallax');
  const updateParallax = () => {
    if (reduced) return;
    parallaxEls.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const mid = r.top + r.height / 2 - innerHeight / 2;
      el.style.transform = `translate3d(0, ${mid * parseFloat(el.dataset.speed)}px, 0)`;
    });
  };

  /* ---------------- Single rAF scroll loop ---------------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { onScrollNav(); updateTour(); updateParallax(); ticking = false; });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------------- Spotlight cards ---------------- */
  $$('.spotlight').forEach(c => c.addEventListener('pointermove', e => {
    const b = c.getBoundingClientRect();
    c.style.setProperty('--mx', `${e.clientX - b.left}px`);
    c.style.setProperty('--my', `${e.clientY - b.top}px`);
  }));

  /* ---------------- Magnetic buttons + cursor ---------------- */
  if (finePointer && !reduced) {
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const b = btn.getBoundingClientRect();
        btn.style.setProperty('--bx', `${(e.clientX - b.left - b.width / 2) * .25}px`);
        btn.style.setProperty('--by', `${(e.clientY - b.top - b.height / 2) * .35}px`);
      });
      btn.addEventListener('pointerleave', () => { btn.style.setProperty('--bx', '0px'); btn.style.setProperty('--by', '0px'); });
    });

    const cur = $('#cursor');
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
    const loop = () => {
      cx = lerp(cx, tx, .2); cy = lerp(cy, ty, .2);
      cur.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('pointerover', e => {
      cur.classList.toggle('is-hover', !!e.target.closest('a, button, [data-lightbox], .place, input, label'));
    });
  }

  /* ---------------- Explore radar ---------------- */
  // Scraped list from the current site, plus a few well-known regional stops (marked approx).
  const PLACES = [
    { name: 'Ozark Area Museum', cat: 'history', tag: 'Museum', addr: '103 E River St, Ozark', mi: 1.1, dir: 160, q: 'Ozark Area Museum, 103 E River St, Ozark, AR 72949' },
    { name: 'Altus City Park', cat: 'outdoors', tag: 'Park · Playground', addr: 'W Park St, Altus', mi: 5.5, dir: 80, q: 'Altus City Park, Altus, AR 72821' },
    { name: 'Post Winery', cat: 'wine', tag: 'Wine tasting', addr: '1700 St Marys Mountain Rd, Altus', mi: 5.5, dir: 70, q: 'Post Winery, 1700 St Marys Mountain Rd, Altus, AR 72821' },
    { name: 'Altus Heritage Museum', cat: 'history', tag: 'Museum', addr: '26 E Main St, Altus', mi: 5.5, dir: 92, q: 'Altus Heritage Museum, 26 E Main St, Altus, AR 72821' },
    { name: 'Wiederkehr Wine Cellars', cat: 'wine', tag: 'Winery · Restaurant', addr: 'Wiederkehr Village, Altus', mi: 6, approx: true, dir: 58, q: 'Wiederkehr Wine Cellars, Altus, AR' },
    { name: 'Deer Mountain Events', cat: 'events', tag: 'Tours · Events', addr: '7717 Contran Rd, Ozark', mi: 8.7, dir: 30, q: 'Deer Mountain Events, 7717 Contran Rd, Ozark, AR 72949' },
    { name: 'Mulberry River', cat: 'outdoors', tag: 'Floating · Kayaking', addr: 'Ozark National Forest', mi: 17, approx: true, dir: -95, q: 'Mulberry River, Arkansas' },
    { name: 'Village Travel', cat: 'travel', tag: 'Tours · Transport', addr: '7517 S Zero St, Fort Smith', mi: 30.7, dir: 190, q: 'Village Travel, 7517 S Zero St, Fort Smith, AR 72903' },
    { name: 'Mount Magazine State Park', cat: 'outdoors', tag: 'Highest point in Arkansas', addr: 'Paris, AR', mi: 37, approx: true, dir: 110, q: 'Mount Magazine State Park, Arkansas' }
  ];
  const R = 190, MAXMI = 40;
  const rad = mi => R * Math.sqrt(mi / MAXMI);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = $('#radarSvg');
  const ringsG = $('#radarRings'), pinsG = $('#radarPins'), list = $('#places');
  const chipsWrap = $('#radarChips'), card = $('#radarCard');
  const small = () => matchMedia('(max-width: 900px)').matches;
  [2, 10, 20, 40].forEach(mi => {
    const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', rad(mi)); ringsG.append(c);
    const t = document.createElementNS(NS, 'text'); t.setAttribute('x', 4); t.setAttribute('y', -rad(mi) - 4); t.textContent = `${mi} mi`; ringsG.append(t);
  });
  const mapsUrl = q => isIOS
    ? `https://maps.apple.com/?saddr=35.490306,-93.84393&daddr=${encodeURIComponent(q)}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&origin=35.490306,-93.84393&destination=${encodeURIComponent(q)}`;
  const num = i => String(i + 1).padStart(2, '0');
  const dist = p => `${p.approx ? '≈' : ''}${p.mi}`;

  PLACES.forEach((p, i) => {
    const a = (p.dir - 90) * Math.PI / 180; // 0 = north
    const r = rad(p.mi);
    p.x0 = Math.cos(a) * r; p.y0 = Math.sin(a) * r;
    // Only the transparent .pin__hit circle takes taps; line/ring/label never do (see layoutPins for sizes/positions).
    const g = document.createElementNS(NS, 'g'); g.classList.add('pin'); g.dataset.i = i; g.dataset.cat = p.cat;
    g.innerHTML = `<line class="pin__line" x1="0" y1="0"/><circle class="ring" r="10"/><circle class="pin__dot" r="7"/><text class="pin__label">${p.name}</text><circle class="pin__hit" r="10"/>`;
    pinsG.append(g);

    const li = document.createElement('li');
    li.className = 'place'; li.dataset.i = i; li.dataset.cat = p.cat; li.tabIndex = 0;
    li.innerHTML = `
      <span class="place__num">${num(i)}</span>
      <div><span class="place__tag">${p.tag}</span><h3>${p.name}</h3><p>${p.addr}</p></div>
      <div class="place__dist"><b>${dist(p)}</b><small>miles</small></div>
      <div class="place__go"><a href="${mapsUrl(p.q)}"${mapsTarget}>Get directions →</a></div>`;
    list.append(li);

    // phones: chip row + detail card under the radar
    const chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'rchip'; chip.dataset.i = i; chip.dataset.cat = p.cat;
    chip.setAttribute('role', 'tab'); chip.setAttribute('aria-selected', 'false');
    chip.innerHTML = `<b>${num(i)}</b>${p.name}`;
    chipsWrap.append(chip);

    const panel = document.createElement('div');
    panel.className = 'rcard__panel'; panel.dataset.i = i;
    panel.innerHTML = `
      <span class="rcard__num">${num(i)}</span>
      <div class="rcard__body"><span class="place__tag">${p.tag}<span class="rcard__mi"> · ${dist(p)} mi</span></span><h3>${p.name}</h3><p>${p.addr}</p></div>
      <a class="rcard__go" href="${mapsUrl(p.q)}"${mapsTarget} tabindex="-1" aria-label="Get directions to ${p.name}"><span class="rcard__goic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg></span>Directions</a>`;
    card.append(panel);
  });
  const prompt = document.createElement('div');
  prompt.className = 'rcard__panel rcard__panel--prompt is-on'; prompt.dataset.i = '-1';
  prompt.innerHTML = `
    <span class="rcard__num" aria-hidden="true">✦</span>
    <div class="rcard__body"><span class="place__tag">Explore nearby</span><h3>Tap a pin on the radar</h3><p>or pick a place above for distance and directions.</p></div>`;
  card.prepend(prompt);

  const pins = $$('.pin', pinsG), items = $$('.place', list), chips = $$('.rchip', chipsWrap), panels = $$('.rcard__panel', card);

  // Place the pins. Desktop: true positions (unchanged). Phones: nudge clustered pins apart so every
  // pin gets its own ≥44px tap circle with no overlap (the Altus pins sit within a few px of each other).
  const layoutPins = () => {
    const sm = small();
    const w = svg.getBoundingClientRect().width || 360;
    const upp = 440 / w; // svg units per CSS px
    const minSep = 48 * upp;
    const pts = PLACES.map(p => ({ x: p.x0, y: p.y0 }));
    if (sm) {
      const homeClear = Math.max(minSep * 0.85, 44);
      const N = 700;
      for (let it = 0; it < N; it++) {
        const k = it < N - 150 ? 0.03 * (1 - it / N) : 0; // gentle pull toward the true spot, off for the last passes
        pts.forEach((P, j) => { P.x += (PLACES[j].x0 - P.x) * k; P.y += (PLACES[j].y0 - P.y) * k; });
        for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
          const A = pts[a], B = pts[b];
          let dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
          if (d < 0.01) { dx = 0.01; dy = 0; d = 0.01; }
          if (d < minSep) { const f = (minSep - d) / 2 / d; A.x -= dx * f; A.y -= dy * f; B.x += dx * f; B.y += dy * f; }
        }
        pts.forEach(P => {
          const d = Math.hypot(P.x, P.y) || 0.01;
          const lim = d < homeClear ? homeClear : d > R - 6 ? R - 6 : 0;
          if (lim) { P.x *= lim / d; P.y *= lim / d; }
        });
      }
    }
    pins.forEach((g, j) => {
      const { x, y } = pts[j];
      let near = Infinity;
      pts.forEach((Q, k) => { if (k !== j) near = Math.min(near, Math.hypot(Q.x - x, Q.y - y)); });
      const hitR = sm ? Math.min(minSep / 2, near / 2 - 0.5) : 10;
      const dotR = sm ? 8.5 * upp : 7;
      const off = sm ? dotR + 6 : 12;
      const [line, ring, dot, label, hit] = g.children;
      line.setAttribute('x2', x); line.setAttribute('y2', y);
      [ring, dot, hit].forEach(c => { c.setAttribute('cx', x); c.setAttribute('cy', y); });
      dot.setAttribute('r', dotR); hit.setAttribute('r', hitR);
      const right = x > 60;
      label.setAttribute('x', x + (right ? -off : off)); label.setAttribute('y', y - off);
      label.setAttribute('text-anchor', right ? 'end' : 'start');
    });
  };
  layoutPins();
  let lw = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== lw) { lw = innerWidth; layoutPins(); } });

  let pinned = null;
  const hot = i => {
    pins.forEach(p => p.classList.toggle('is-hot', +p.dataset.i === i));
    items.forEach(p => p.classList.toggle('is-hot', +p.dataset.i === i));
    chips.forEach(c => { const on = +c.dataset.i === i; c.classList.toggle('is-on', on); c.setAttribute('aria-selected', on); });
    const pg = pins.find(p => +p.dataset.i === i);
    if (pg && pinsG.lastElementChild !== pg) pinsG.append(pg); // bring to front (only when needed)
  };
  const showCard = i => {
    const key = i == null ? -1 : i;
    panels.forEach(p => {
      const on = +p.dataset.i === key;
      p.classList.toggle('is-on', on);
      p.setAttribute('aria-hidden', !on);
      const a = p.querySelector('a'); a && (a.tabIndex = on ? 0 : -1);
    });
  };
  // keep the card fully on screen: never under the fixed nav or the Call / Book bar
  const ensureVisible = el => {
    const r = el.getBoundingClientRect();
    const barH = mbar && getComputedStyle(mbar).display !== 'none' ? mbar.offsetHeight + 24 : 12;
    const top = 84, bottom = innerHeight - barH;
    const dy = r.bottom > bottom ? Math.min(r.bottom - bottom, r.top - top) : r.top < top ? r.top - top : 0;
    if (Math.abs(dy) > 1) scrollBy({ top: dy, behavior: reduced ? 'auto' : 'smooth' });
  };
  const centerChip = i => {
    const c = chips[i]; if (!c) return;
    const left = c.offsetLeft - (chipsWrap.clientWidth - c.offsetWidth) / 2;
    chipsWrap.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' });
  };
  const select = i => {
    pinned = i; hot(i); showCard(i); buzz(5);
    if (small() && i != null) { centerChip(i); ensureVisible(card); }
  };

  items.forEach(li => {
    const i = +li.dataset.i;
    li.addEventListener('pointerenter', e => e.pointerType === 'mouse' && hot(i));
    li.addEventListener('pointerleave', e => e.pointerType === 'mouse' && hot(pinned));
    li.addEventListener('click', e => { if (e.target.closest('a')) return; pinned = pinned === i ? null : i; hot(pinned); showCard(pinned); buzz(5); });
    li.addEventListener('keydown', e => { if (e.key === 'Enter') { pinned = pinned === i ? null : i; hot(pinned); showCard(pinned); } });
  });
  pins.forEach(p => {
    const i = +p.dataset.i;
    // hover preview is for mice only; on touch a tap is one clean click (no hover state, no DOM shuffling mid-tap)
    p.addEventListener('pointerenter', e => e.pointerType === 'mouse' && hot(i));
    p.addEventListener('pointerleave', e => e.pointerType === 'mouse' && hot(pinned));
    p.addEventListener('click', () => select(i));
  });
  chips.forEach(c => c.addEventListener('click', () => select(+c.dataset.i)));

  $$('#filters button').forEach(b => b.addEventListener('click', () => {
    $$('#filters button').forEach(x => x.classList.toggle('is-on', x === b));
    const f = b.dataset.filter;
    items.forEach(li => {
      const show = f === 'all' || li.dataset.cat === f;
      li.classList.toggle('is-hidden', !show);
      if (show && !reduced) li.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.16,1,.3,1)' });
    });
    chips.forEach(c => c.classList.toggle('is-hidden', !(f === 'all' || c.dataset.cat === f)));
    chipsWrap.scrollTo({ left: 0 });
    pins.forEach(p => p.classList.toggle('is-dim', !(f === 'all' || p.dataset.cat === f)));
    pinned = null; hot(null); showCard(null); buzz(5);
  }));

  /* ---------------- Contact helpers ---------------- */
  $('#copyAddr').addEventListener('click', async () => {
    const text = '305 N 18th St, Ozark, AR 72949';
    try { await navigator.clipboard.writeText(text); toast('Address copied ✓'); }
    catch (e) { toast(text); }
  });

  $('#year').textContent = new Date().getFullYear();
})();
