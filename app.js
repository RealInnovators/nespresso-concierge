'use strict';

// ## Scorciatoie e formattazione
// Funzioni piccole riusate ovunque: cercare elementi, scrivere date ed euro in italiano,
// e "esc", che rende sicuro il testo scritto dall'utente prima di metterlo nella pagina.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CAP = Object.fromEntries(CATALOG.capsules.map(c => [c.id, c]));
const MACH = Object.fromEntries(CATALOG.machines.map(m => [m.id, m]));
const BOX = 50, STORE = 'my-nespresso-pro-v1', AXIS_DAYS = 35;
const dayMs = 864e5;
const startDay = d => { const x = new Date(d); x.setHours(12, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const diffDays = (a, b) => Math.round((startDay(a) - startDay(b)) / dayMs);
const sameDay = (a, b) => diffDays(a, b) === 0;
const isWork = d => d.getDay() !== 0 && d.getDay() !== 6;
const addWork = (d, n) => { let x = new Date(d); while (n > 0) { x = addDays(x, 1); if (isWork(x)) n--; } return x; };
const it = o => new Intl.DateTimeFormat('it-IT', o);
const fLong = d => it({ weekday: 'long', day: 'numeric', month: 'long' }).format(d);
const fDay = d => it({ day: 'numeric', month: 'short' }).format(d);
const fDayW = d => it({ weekday: 'short', day: 'numeric', month: 'short' }).format(d);
const eur = n => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
const int = n => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(n);
const plural = (n, a, b) => `${int(n)} ${n === 1 ? a : b}`;
const today = () => addDays(startDay(new Date()), state.offset);

// ## Dati dimostrativi del cliente
// Crea 60 giorni di storico finto ma credibile per un hotel: piu' caffe' nel weekend,
// un po' di variazione casuale. Il generatore ha un seme fisso: la demo e' sempre uguale.
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const WEEK = [1.12, .9, .92, .95, 1, 1.12, 1.25]; // domenica ... sabato

function seedState() {
  const r = rng(2026), base = startDay(new Date());
  const rates = { ristretto: 38, 'ristretto-intenso': 14, forte: 18, leggero: 8, decaffeinato: 7 };
  const machines = [
    { id: 'm1', model: 'momento-coffee-milk', serial: 'MOM-4821-NA', location: 'Sala colazioni', share: .62, since: addDays(base, -420).toISOString() },
    { id: 'm2', model: 'momento-black', serial: 'MBK-1177-NA', location: 'Lobby bar', share: .38, since: addDays(base, -180).toISOString() },
  ];
  const history = {};
  machines.forEach(m => {
    history[m.id] = {};
    Object.entries(rates).forEach(([cap, rate]) => {
      history[m.id][cap] = Array.from({ length: 60 }, (_, i) => {
        const d = addDays(base, i - 60);
        return Math.max(0, Math.round(rate * m.share * WEEK[d.getDay()] * (.82 + r() * .36)));
      });
    });
  });
  const pastOrder = (ago, list) => {
    const lines = Object.entries(list).map(([cap, boxes]) => ({ cap, boxes }));
    const date = addDays(base, -ago);
    return { id: 'NP-' + (48210 + ago * 7), date: date.toISOString(), arrival: addDays(date, 2).toISOString(), lines, total: lines.reduce((t, l) => t + l.boxes * BOX * CAP[l.cap].price, 0), done: true };
  };
  return {
    seedDay: base.toDateString(), offset: 0,
    customer: 'Hotel Sirena, Posillipo',
    lead: 2, safety: 2, cover: 30,
    occ: 0, event: null, qty: {},
    machines, history,
    stock: { ristretto: 430, 'ristretto-intenso': 210, forte: 360, leggero: 205, decaffeinato: 150 },
    orders: [pastOrder(6, { ristretto: 8 }), pastOrder(11, { forte: 6, decaffeinato: 2 }), pastOrder(17, { ristretto: 10 }), pastOrder(24, { 'ristretto-intenso': 6 }), pastOrder(29, { ristretto: 9, leggero: 3 }), pastOrder(38, { forte: 7 }), pastOrder(45, { ristretto: 11, decaffeinato: 3 })],
  };
}

// ## Salvataggio
// Ricorda lo stato della demo nel browser; se non si puo' salvare, la demo funziona lo stesso.
let state = (() => { try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && s.machines && s.seedDay === startDay(new Date()).toDateString()) return s; } catch (e) { /* si riparte da zero */ } return seedState(); })();
// Salvataggi fatti prima che ci fossero piu' prodotti merch: li porta al formato nuovo.
if (typeof state.merch === 'number') state.merch = state.merch ? { xbox: state.merch } : {};
state.orders.forEach(o => { if (typeof o.merch === 'number') o.merch = o.merch ? [{ id: 'xbox', qty: o.merch }] : []; });
function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* non essenziale */ } }

// ## Il motore "AI": media e previsione
// Media pesata: 60% ultimi 7 giorni + 40% ultimi 30, cosi' reagisce ai cambi senza farsi
// ingannare da un giorno strano. Una macchina nuova usa la stima iniziale per 14 giorni.
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
function machineAvg(m, cap) {
  const h = state.history[m.id]?.[cap] || [];
  const est = m.est && m.mix?.includes(cap) ? m.est / m.mix.length : 0;
  if (m.est && h.length < 14) return est;
  return h.length ? .6 * mean(h.slice(-7)) + .4 * mean(h.slice(-30)) : 0;
}
const avgOf = cap => state.machines.reduce((t, m) => t + machineAvg(m, cap), 0);
const activeCaps = () => Object.keys(state.stock);

// Profilo settimanale reale ricavato dagli ultimi 28 giorni (1 = giorno medio).
function dowProfile() {
  const sum = Array(7).fill(0), cnt = Array(7).fill(0), t = today();
  state.machines.forEach(m => Object.values(state.history[m.id] || {}).forEach(a => {
    a.slice(-28).forEach((v, i, s) => { const dw = addDays(t, i - s.length).getDay(); sum[dw] += v; cnt[dw]++; });
  }));
  const raw = sum.map((v, i) => cnt[i] ? v / cnt[i] : 0), m = mean(raw) || 1;
  return raw.map(v => v ? v / m : 1);
}

function totalAvg() { return activeCaps().reduce((t, c) => t + avgOf(c), 0); }

// Domanda prevista di un caffe' in un giorno: media x giorno della settimana x occupazione + evento.
function demandFn() {
  const prof = dowProfile(), tot = totalAvg() || 1, ev = state.event;
  const evDate = ev && startDay(ev.date);
  return (cap, d) => {
    let v = avgOf(cap) * prof[d.getDay()] * (1 + state.occ / 100);
    if (evDate && sameDay(d, evDate)) v += ev.guests * 1.5 * (avgOf(cap) / tot);
    return v;
  };
}

// Simula la scorta giorno per giorno, contando anche gli ordini in arrivo.
function project(cap, demand) {
  const t = today(); let s = state.stock[cap] || 0, out = null;
  const incoming = state.orders.filter(o => !o.done);
  for (let i = 0; i < 180; i++) {
    const d = addDays(t, i);
    incoming.forEach(o => { if (sameDay(o.arrival, d)) o.lines.forEach(l => { if (l.cap === cap) s += l.boxes * BOX; }); });
    const need = demand(cap, d);
    if (need > 0 && s < need) { out = i + s / need; break; }
    s -= need;
  }
  return out; // giorni di autonomia, null = oltre 6 mesi o nessun consumo
}
function stockAt(cap, arrival, demand) {
  const t = today(); let s = state.stock[cap] || 0;
  const incoming = state.orders.filter(o => !o.done);
  for (let i = 0; ; i++) {
    const d = addDays(t, i);
    incoming.forEach(o => { if (sameDay(o.arrival, d)) o.lines.forEach(l => { if (l.cap === cap) s += l.boxes * BOX; }); });
    if (sameDay(d, arrival)) return s;
    s = Math.max(0, s - demand(cap, d));
  }
}
// Ultimo giorno lavorativo utile: consegna prima della fine scorta meno il margine di sicurezza.
function lastOrderDay(daysLeft) {
  const target = addDays(today(), Math.floor(daysLeft) - state.safety);
  let d = target;
  for (let i = 0; i < 40; i++) { if (isWork(d) && addWork(d, state.lead) <= target) return d; d = addDays(d, -1); }
  return d;
}

// ## Il consiglio d'ordine
// Non un ordine per ogni caffe', ma UNO solo alla data del caffe' piu' urgente:
// ogni riga arriva a coprire i giorni scelti. Da qui nascono le spedizioni risparmiate.
function advise() {
  const demand = demandFn(), t = today();
  const rows = activeCaps().map(cap => {
    const daysLeft = project(cap, demand), by = daysLeft == null ? null : lastOrderDay(daysLeft);
    return { cap, daysLeft, by, avg: avgOf(cap), out: daysLeft == null ? null : addDays(t, Math.floor(daysLeft)) };
  });
  const dated = rows.filter(r => r.by).sort((a, b) => a.by - b.by);
  const first = dated[0] || null;
  const late = first ? first.by < t : false;
  let orderBy = first ? (late ? t : first.by) : null;
  const arrival = orderBy ? addWork(orderBy, state.lead) : addWork(t, state.lead);
  const lines = rows.map(r => {
    let need = 0;
    if (first) {
      need = -stockAt(r.cap, arrival, demand) + r.avg * state.safety;
      for (let i = 0; i < state.cover; i++) need += demand(r.cap, addDays(arrival, i));
    }
    const suggested = Math.max(0, Math.ceil(need / BOX));
    return { ...r, suggested, boxes: state.qty[r.cap] ?? suggested };
  });
  Object.keys(state.qty).forEach(cap => { if (!state.stock[cap] && state.stock[cap] !== 0) lines.push({ cap, suggested: 0, boxes: state.qty[cap], avg: 0, daysLeft: null, by: null, out: null, extra: true }); });
  const buy = lines.filter(l => l.boxes > 0);
  const total = buy.reduce((s, l) => s + l.boxes * BOX * CAP[l.cap].price, 0);
  const boxes = buy.reduce((s, l) => s + l.boxes, 0);
  const separate = new Set(lines.filter(l => l.by && l.suggested > 0).map(l => l.by.toDateString())).size;
  const wd = orderBy ? workDaysBetween(t, orderBy) : 99;
  const level = !first ? 'ok' : wd <= 0 ? 'now' : wd <= 3 ? 'soon' : 'ok';
  return { rows, lines, first, late, orderBy, arrival, total, boxes, separate, level };
}
function workDaysBetween(a, b) { let n = 0, d = new Date(a); while (startDay(d) < startDay(b)) { d = addDays(d, 1); if (isWork(d)) n++; } return n; }
const statusText = a => ({
  ok: ['Hai ancora tempo', '<i></i>'], soon: ['Ordine in avvicinamento', '<i></i>'],
  now: [a.late ? 'Da ordinare subito' : 'Da ordinare oggi', '<i></i>'],
}[a.level]);

// ## Navigazione tra le pagine
const ROUTES = { panoramica: renderHome, macchine: renderMachines, consumi: renderConsumption, ordini: renderOrders, sospeso: renderSospeso, eventi: renderEvents };
function route() {
  const key = ROUTES[location.hash.slice(1)] ? location.hash.slice(1) : 'panoramica';
  $$('.top nav a').forEach(a => a.getAttribute('href') === '#' + key ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  ROUTES[key]();
  $('#demo-today').textContent = 'Demo: oggi è ' + fLong(today());
  window.scrollTo(0, 0);
}
function refresh() { save(); const y = scrollY; route(); window.scrollTo(0, y); }
window.addEventListener('hashchange', route);

// ## Pagina Panoramica
// Scheletro fisso + tre parti aggiornabili: muovendo il cursore cambiano solo frase e barre.
function renderHome() {
  const evDays = Array.from({ length: 21 }, (_, i) => addDays(today(), i + 1));
  $('#view').innerHTML = `
    <div id="hero"></div>
    <section class="sec" aria-labelledby="rw-t">
      <div class="sec-head"><div><h2 class="title" id="rw-t">Quanto ti dura ogni caffè</h2>
        <p>Ogni barra finisce il giorno in cui resti senza quel caffè, al ritmo di consumo attuale.</p></div></div>
      <div id="runway" class="runway"></div>
    </section>
    <section class="sec soft" aria-labelledby="wi-t">
      <div class="sec-head"><div><h2 class="title" id="wi-t">Cosa prevedi per le prossime settimane?</h2>
        <p>Il consiglio si ricalcola subito: date e quantità cambiano mentre sposti i valori.</p></div></div>
      <div class="whatif">
        <div class="field">
          <label for="occ">Occupazione rispetto a oggi</label>
          <div class="occ-val" id="occ-val"></div>
          <input id="occ" type="range" min="-40" max="60" step="5" value="${state.occ}">
          <small>Ad esempio un calo dopo la stagione, o un ponte con la struttura piena.</small>
        </div>
        <div class="field">
          <span class="lab">Evento in programma</span>
          <small id="ev-now"></small>
          <div class="inline">
            <div><label class="sr" for="ev-g">Ospiti</label><input class="inp" id="ev-g" type="number" min="10" max="2000" step="10" value="${state.event?.guests || 120}" aria-label="Ospiti"></div>
            <div><label class="sr" for="ev-d">Data</label><select class="inp" id="ev-d">${evDays.map(d => `<option value="${d.toISOString()}" ${state.event && sameDay(state.event.date, d) ? 'selected' : ''}>${fDayW(d)}</option>`).join('')}</select></div>
            <button class="btn small" id="ev-add" type="button">Aggiungi evento</button>
            <button class="link" id="ev-del" type="button">Rimuovi</button>
          </div>
        </div>
      </div>
    </section>
    <section class="sec" aria-label="Sintesi"><div class="facts" id="facts"></div>${homeEvent()}</section>`;
  updateHome(true);
  $('#occ').addEventListener('input', e => { state.occ = +e.target.value; state.qty = {}; save(); updateHome(); });
  $('#ev-add').onclick = () => { const g = Math.max(0, +$('#ev-g').value || 0); if (!g) return toast('Inserisci il numero di ospiti.'); state.event = { date: $('#ev-d').value, guests: g }; state.qty = {}; save(); updateHome(); toast('Evento aggiunto alla previsione.'); };
  $('#ev-del').onclick = () => { state.event = null; state.qty = {}; save(); updateHome(); };
}
function homeEvent() {
  const e = nextEvents()[0];
  if (!e) return '';
  return `<p class="ev-next">Prossimo evento Caffè sospeso: <b>${esc(e.title)}</b>, ${fLong(e.date)} alle ${e.time}. ${isGoing(e.id) ? 'Partecipazione confermata.' : ''} <a class="link" href="#eventi">Vedi gli eventi</a></p>`;
}
function updateHome(first) {
  const a = advise(), t = today();
  const s = statusText(a);
  const urgent = a.first ? CAP[a.first.cap] : CAP.ristretto;
  const inTransit = state.orders.find(o => !o.done);
  const hero = $('#hero'), had = $('.hero-cap', hero);
  const noMach = !state.machines.length;
  const headline = noMach ? 'Registra la tua prima macchina.' : !a.first ? 'Scorte a posto per i prossimi mesi.'
    : a.level === 'now' ? `Ordina oggi, ${fLong(t)}.` : `Ordina entro ${fLong(a.orderBy)}.`;
  const why = noMach ? 'Ti basta il numero di serie. Poi calcolo quanti caffè usi al giorno e ti dico cosa ordinare e quando.' : !a.first ? 'Non serve nessun ordine per ora. Ti avviso appena cambia qualcosa.'
    : `${esc(urgent.name)} finisce per primo, ${fLong(a.first.out)}. ${a.late ? 'La consegna rischia di arrivare dopo: meglio non aspettare. ' : ''}Un solo ordine da ${plural(a.boxes, 'box', 'box')} copre ${state.cover} giorni per tutti i caffè${a.separate > 1 ? ` e sostituisce ${a.separate} spedizioni separate` : ''}.`;
  const heroHtml = `<div class="hero-inner">
      <p class="who">Nespresso Concierge per ${esc(state.customer)}</p>
      <p class="status ${a.level}">${s[1]}${s[0]}</p>
      <h1>${headline}</h1>
      <p class="why">${why}${inTransit ? ` Ordine ${esc(inTransit.id)} in arrivo ${fLong(new Date(inTransit.arrival))}.` : ''}</p>
      <div class="cta">
        ${noMach ? '<a class="btn primary" href="#macchine">Registra una macchina</a>' : a.first ? '<a class="btn primary" href="#ordini">Rivedi l\'ordine</a>' : ''}
        ${a.first ? '<button class="btn ghost-dark" type="button" id="why-btn">Perché questa data?</button>' : ''}
      </div></div>`;
  // Solo questi due hanno un'immagine ad alta risoluzione: gli altri restano piu' piccoli per non sgranare.
  const hiRes = { ristretto: 'assets/hero/ristretto.png', 'ristretto-intenso': 'assets/hero/ristretto-intenso.png' }[urgent.id];
  const capSrc = hiRes || urgent.img;
  if (had && had.getAttribute('src') === capSrc) { $('.hero-inner', hero).outerHTML = heroHtml; }
  else hero.innerHTML = `<section class="hero">${heroHtml}<img class="hero-cap ${hiRes ? '' : 'lowres'}" src="${capSrc}" alt=""></section>`;
  if ($('#why-btn')) $('#why-btn').onclick = () => { openChat(); ask('Perché questa data?'); };

  drawRunway(a, first);
  $('#occ-val').textContent = (state.occ > 0 ? '+' : '') + state.occ + '%';
  $('#ev-now').textContent = state.event ? `${int(state.event.guests)} ospiti ${fLong(new Date(state.event.date))}, circa ${int(state.event.guests * 1.5)} caffè in più.` : 'Nessun evento. Conto un caffè e mezzo a ospite.';
  const lastMonth = state.orders.filter(o => diffDays(t, o.date) <= 30 && diffDays(t, o.date) >= 0).length;
  $('#facts').innerHTML = `
    <div class="fact"><b>${int(totalAvg())}</b><span>caffè al giorno in media, su ${plural(state.machines.length, 'macchina', 'macchine')}. <a class="link" href="#consumi">Vedi i consumi</a></span></div>
    <div class="fact"><b>${lastMonth} → 1</b><span>spedizioni al mese: quelle degli ultimi 30 giorni e quella che ti serve con l'ordine consigliato. <a class="link" href="#ordini">Vedi l'ordine</a></span></div>
    <div class="fact"><b>${eur(a.total)}</b><span>valore dell'ordine consigliato, ai prezzi di listino del sito. Consegna entro il ${fDay(a.arrival)}.</span></div>`;
}

// ## Calendario delle scorte
function drawRunway(a, animate) {
  const t = today(), box = $('#runway');
  const x = d => Math.max(0, Math.min(1, d / AXIS_DAYS));
  const rows = [...a.rows].sort((p, q) => (p.daysLeft ?? 999) - (q.daysLeft ?? 999));
  const pos = v => `calc(var(--lab) + (100% - var(--lab) - var(--end)) * ${v})`;
  const ticks = [0, 7, 14, 21, 28, 35].map(d => `<span style="left:${d / AXIS_DAYS * 100}%">${d ? fDay(addDays(t, d)) : 'oggi'}</span>`).join('');
  // Sul telefono le linee verticali coprirebbero il testo: la stessa informazione diventa una frase.
  const note = a.orderBy ? `<p class="rw-note">Ordina entro ${fDay(a.orderBy)}, consegna ${fDay(a.arrival)}</p>` : '';
  box.innerHTML = note + rows.map(r => {
    const c = CAP[r.cap], dl = r.daysLeft ?? AXIS_DAYS + 1, over = dl > AXIS_DAYS;
    return `<div class="rw-row rw-hit" data-tip="${esc(c.name)}: ${int(state.stock[r.cap])} capsule in magazzino, ${int(r.avg)} al giorno. ${r.by ? 'Ordine singolo necessario entro ' + fDay(r.by) + '.' : 'Nessun ordine necessario.'}">
      <div class="rw-cof"><img src="${c.img}" alt=""><div><b>${esc(c.name)}</b><small>${int(state.stock[r.cap])} capsule, ${int(r.avg)} al giorno</small></div></div>
      <div class="rw-track"><div class="rw-bar ${over ? 'over' : ''}" data-w="${x(dl) * 100}" style="background:${c.color};width:${animate ? 0 : x(dl) * 100}%"></div></div>
      <div class="rw-end">${r.out ? 'finisce ' + fDay(r.out) : 'oltre 6 mesi'}<small>${r.daysLeft == null ? '' : plural(Math.floor(r.daysLeft), 'giorno', 'giorni')}</small></div>
    </div>`;
  }).join('') + `<div class="rw-axis">${ticks}</div>` + (a.orderBy ? `
    <div class="rw-line order" style="left:${pos(x(diffDays(a.orderBy, t)))}"><span>Ordina entro ${fDay(a.orderBy)}</span></div>
    <div class="rw-line arrive" style="left:${pos(x(diffDays(a.arrival, t)))}"><span>Consegna ${fDay(a.arrival)}</span></div>` : '');
  if (animate) requestAnimationFrame(() => requestAnimationFrame(() => $$('.rw-bar', box).forEach(b => { b.style.width = b.dataset.w + '%'; })));
  $$('.rw-hit', box).forEach(row => {
    row.addEventListener('mousemove', e => showTip(row.dataset.tip, e));
    row.addEventListener('mouseleave', hideTip);
  });
}
let tipEl;
function showTip(text, e) {
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'rw-tip'; document.body.append(tipEl); }
  tipEl.textContent = text; tipEl.hidden = false;
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  tipEl.style.left = Math.min(innerWidth - w - 8, e.clientX + 14) + 'px';
  tipEl.style.top = Math.max(8, e.clientY - h - 12) + 'px';
}
const hideTip = () => { if (tipEl) tipEl.hidden = true; };

// ## Pagina Macchine
function machineDaily(m) { return activeCaps().reduce((t, c) => t + machineAvg(m, c), 0); }
function renderMachines() {
  $('#view').innerHTML = `
    <div class="page-top"><h1>Le mie macchine</h1><p>Ogni macchina registrata entra nel calcolo del consumo e del prossimo ordine.</p></div>
    <section class="sec">
      <div class="sec-head"><h2 class="title">${plural(state.machines.length, 'macchina registrata', 'macchine registrate')}</h2>
        <button class="btn primary" id="add-m" type="button">Registra una macchina</button></div>
      <div class="mach-list">${state.machines.map(m => {
        const mo = MACH[m.model], learning = m.est && Math.max(0, ...Object.values(state.history[m.id] || {}).map(a => a.length)) < 14;
        return `<article class="mach">
          <img src="${mo.img}" alt="${esc(mo.name)}">
          <div><h3>${esc(mo.name)}</h3><p>${esc(m.location)}</p><p>Seriale ${esc(m.serial)}</p>
            ${learning ? '<span class="tag">Sto usando la tua stima: i dati reali arrivano in 14 giorni</span>' : ''}</div>
          <p><span class="num">${int(machineDaily(m))}</span><br>caffè al giorno</p>
          <button class="link" data-del="${esc(m.id)}" type="button">Rimuovi</button>
        </article>`;
      }).join('') || '<p class="sub" style="padding:20px 0">Registra la tua prima macchina per iniziare a calcolare i consumi.</p>'}</div>
    </section>`;
  $('#add-m').onclick = () => openRegister();
  $$('[data-del]').forEach(b => b.onclick = () => {
    state.machines = state.machines.filter(m => m.id !== b.dataset.del); state.qty = {};
    refresh(); toast('Macchina rimossa.');
  });
}

// ## Registrazione macchina: tre passaggi
const reg = { step: 1, model: null, serial: '', location: '', est: 40, mix: [], err: '' };
function openRegister() {
  Object.assign(reg, { step: 1, model: null, serial: '', location: '', est: 40, mix: activeCaps().slice(0, 3), err: '' });
  drawRegister(); $('#reg').showModal();
}
function drawRegister() {
  const d = $('#reg');
  const titles = { 1: 'Scegli il modello', 2: 'Dov\'è la macchina?', 3: 'Quanto la userai?' };
  let body = '';
  if (reg.step === 1) body = `<div class="pick">${CATALOG.machines.map(m => `<button type="button" data-m="${m.id}" aria-pressed="${reg.model === m.id}"><img src="${m.img}" alt="">${esc(m.name)}</button>`).join('')}</div>`;
  if (reg.step === 2) body = `<div class="form-grid">
      <div class="field"><label for="r-s">Numero di serie</label><input class="inp" id="r-s" value="${esc(reg.serial)}" placeholder="Es. GIO-2086-NA"><small>Si trova sull'etichetta sotto la vaschetta.</small></div>
      <div class="field"><label for="r-l">Posizione nella struttura</label><input class="inp" id="r-l" value="${esc(reg.location)}" placeholder="Es. Terrazza, Sala riunioni"></div>
    </div>`;
  if (reg.step === 3) body = `<div class="field"><label for="r-e">Caffè al giorno, stima iniziale</label><div class="occ-val" id="r-ev">${reg.est}</div>
      <input id="r-e" type="range" min="5" max="150" step="5" value="${reg.est}"><small>Serve solo all'inizio: dopo 14 giorni uso i consumi reali.</small></div>
      <div class="field" style="margin-top:20px"><span class="lab">Quali caffè servirai?</span>
      <div class="chips">${CATALOG.capsules.filter(c => activeCaps().includes(c.id) || ['finezzo', 'peru-organic', 'colombia-organic', 'caffe-vanilio'].includes(c.id)).map(c => `<button class="chip" type="button" data-c="${c.id}" aria-pressed="${reg.mix.includes(c.id)}"><img src="${c.img}" alt="">${esc(c.name)}</button>`).join('')}</div></div>`;
  d.innerHTML = `<div class="reg-head"><h2>${titles[reg.step]}</h2><span>Passo ${reg.step} di 3</span></div>
    <div class="reg-body">${body}${reg.err ? `<p class="err" role="alert">${esc(reg.err)}</p>` : ''}</div>
    <div class="reg-foot"><button class="btn" type="button" id="r-back">${reg.step === 1 ? 'Annulla' : 'Indietro'}</button>
    <button class="btn primary" type="button" id="r-next">${reg.step === 3 ? 'Registra macchina' : 'Continua'}</button></div>`;
  $$('[data-m]', d).forEach(b => b.onclick = () => { reg.model = b.dataset.m; reg.err = ''; reg.step = 2; drawRegister(); });
  $$('[data-c]', d).forEach(b => b.onclick = () => { const c = b.dataset.c; reg.mix = reg.mix.includes(c) ? reg.mix.filter(x => x !== c) : [...reg.mix, c]; reg.err = ''; b.setAttribute('aria-pressed', reg.mix.includes(c)); });
  $('#r-e', d)?.addEventListener('input', e => { reg.est = +e.target.value; $('#r-ev').textContent = reg.est; });
  $('#r-back', d).onclick = () => { if (reg.step === 1) return d.close(); keepFields(); reg.err = ''; reg.step--; drawRegister(); };
  $('#r-next', d).onclick = () => {
    keepFields();
    if (reg.step === 1 && !reg.model) { reg.err = 'Scegli un modello per continuare.'; return drawRegister(); }
    if (reg.step === 2 && (!reg.serial.trim() || !reg.location.trim())) { reg.err = 'Inserisci numero di serie e posizione.'; return drawRegister(); }
    if (reg.step === 3) {
      if (!reg.mix.length) { reg.err = 'Scegli almeno un caffè.'; return drawRegister(); }
      const id = 'm' + Date.now();
      state.machines.push({ id, model: reg.model, serial: reg.serial.trim(), location: reg.location.trim(), est: reg.est, mix: reg.mix, since: today().toISOString() });
      state.history[id] = {};
      reg.mix.forEach(c => { if (state.stock[c] === undefined) state.stock[c] = 0; });
      state.qty = {};
      d.close(); location.hash = '#macchine'; refresh();
      return toast(`${MACH[reg.model].name} registrata. Consiglio d'ordine aggiornato.`);
    }
    reg.err = ''; reg.step++; drawRegister();
  };
}
function keepFields() { const s = $('#r-s'), l = $('#r-l'); if (s) reg.serial = s.value; if (l) reg.location = l.value; }

// ## Pagina Consumi
const view = { machine: 'all', coffee: 'all' };
function seriesOf(days) {
  const out = Array(days).fill(0);
  state.machines.filter(m => view.machine === 'all' || m.id === view.machine).forEach(m => {
    Object.entries(state.history[m.id] || {}).filter(([c]) => view.coffee === 'all' || c === view.coffee).forEach(([, a]) => {
      a.slice(-days).forEach((v, i, s) => { out[days - s.length + i] += v; });
    });
  });
  return out;
}
function renderConsumption() {
  const t = today(), days = 30, s = seriesOf(days);
  const avg = mean(s), last7 = mean(s.slice(-7)), prev7 = mean(s.slice(-14, -7));
  const trend = prev7 ? Math.round((last7 / prev7 - 1) * 100) : 0;
  const prof = dowProfile(), names = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'], order = [1, 2, 3, 4, 5, 6, 0];
  const maxP = Math.max(...prof), peak = names[order.indexOf(prof.indexOf(maxP))];
  const a = advise();
  $('#view').innerHTML = `
    <div class="page-top"><h1>In media ${int(view.machine === 'all' && view.coffee === 'all' ? totalAvg() : avg)} caffè al giorno</h1>
      <p>Negli ultimi 7 giorni ${trend === 0 ? 'il consumo è stabile' : `il consumo è ${trend > 0 ? 'salito' : 'sceso'} del ${Math.abs(trend)}%`}. La media dà più peso all'ultima settimana. Il giorno più intenso è ${({ Lun: 'il lunedì', Mar: 'il martedì', Mer: 'il mercoledì', Gio: 'il giovedì', Ven: 'il venerdì', Sab: 'il sabato', Dom: 'la domenica' })[peak]}.</p></div>
    <section class="sec">
      <div class="sec-head"><h2 class="title">Caffè al giorno, ultimi 30 giorni</h2>
        <div class="filters">
          <label class="sr" for="f-m">Macchina</label><select class="inp" id="f-m"><option value="all">Tutte le macchine</option>${state.machines.map(m => `<option value="${esc(m.id)}" ${view.machine === m.id ? 'selected' : ''}>${esc(m.location)}</option>`).join('')}</select>
          <label class="sr" for="f-c">Caffè</label><select class="inp" id="f-c"><option value="all">Tutti i caffè</option>${activeCaps().map(c => `<option value="${c}" ${view.coffee === c ? 'selected' : ''}>${esc(CAP[c].name)}</option>`).join('')}</select>
        </div></div>
      <div class="cons-grid">
        <div>${chartSvg(s, t, avg)}
          <details><summary>Mostra i dati in tabella</summary><div class="table-wrap"><table><thead><tr><th>Giorno</th><th class="n">Caffè</th></tr></thead><tbody>${s.map((v, i) => `<tr><td>${fDayW(addDays(t, i - days))}</td><td class="n">${int(v)}</td></tr>`).reverse().join('')}</tbody></table></div></details>
        </div>
        <div><h3 style="font-weight:400;font-size:23px">Settimana tipo</h3>
          <p class="sub">Rispetto a un giorno medio. Uso questo profilo per prevedere quando finisce ogni caffè.</p>
          <div class="dow">${order.map((d, i) => `<span>${names[i]}</span><div style="width:${prof[d] / maxP * 100}%"></div><span>${Math.round(prof[d] * 100)}</span>`).join('')}</div></div>
      </div>
    </section>
    <section class="sec soft"><div class="sec-head"><h2 class="title">Caffè per caffè</h2></div>
      <div class="table-wrap"><table class="t-cof"><thead><tr><th>Caffè</th><th class="n">Al giorno</th><th class="n">Quota</th><th class="n">In magazzino</th><th class="n">Finisce</th><th class="n">Ordina entro</th></tr></thead><tbody>
      ${[...a.rows].sort((x, y) => y.avg - x.avg).map(r => `<tr><td><div class="cell-cof"><img src="${CAP[r.cap].img}" alt="">${esc(CAP[r.cap].name)}</div></td>
        <td class="n">${int(r.avg)}</td><td class="n">${Math.round(r.avg / (totalAvg() || 1) * 100)}%</td><td class="n">${int(state.stock[r.cap])}</td><td class="n">${r.out ? fDay(r.out) : 'oltre 6 mesi'}</td><td class="n">${r.by ? fDay(r.by < t ? t : r.by) : 'non serve'}</td></tr>`).join('')}
      </tbody></table></div></section>`;
  $('#f-m').onchange = e => { view.machine = e.target.value; const y = scrollY; renderConsumption(); scrollTo(0, y); };
  $('#f-c').onchange = e => { view.coffee = e.target.value; const y = scrollY; renderConsumption(); scrollTo(0, y); };
  $$('.chart .hit').forEach(h => {
    h.addEventListener('mousemove', e => showTip(h.dataset.tip, e));
    h.addEventListener('mouseleave', hideTip);
  });
}
function chartSvg(s, t, avg) {
  const W = 760, H = 300, L = 34, B = 26, T = 22, max = Math.max(10, ...s) * 1.08, n = s.length;
  const y = v => T + (H - T - B) * (1 - v / max), step = (W - L) / n, bw = Math.min(14, step - 4);
  const nice = max > 200 ? 100 : max > 80 ? 40 : max > 30 ? 20 : 5;
  const grid = []; for (let v = 0; v <= max; v += nice) grid.push(v);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Caffè al giorno negli ultimi 30 giorni, in media ${int(avg)}">
    ${grid.map(v => `<line x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="#e4e1dc"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('')}
    ${s.map((v, i) => { const d = addDays(t, i - n), x = L + i * step + (step - bw) / 2, h = Math.max(0, y(0) - y(v)), r = Math.min(4, h);
      return `<rect class="hit" x="${L + i * step}" y="${T}" width="${step}" height="${H - T - B}" fill="transparent" data-tip="${fDayW(d)}: ${int(v)} caffè"/>
      <path class="b" pointer-events="none" fill="#8f7247" d="M${x} ${y(0)}V${y(v) + r}Q${x} ${y(v)} ${x + r} ${y(v)}H${x + bw - r}Q${x + bw} ${y(v)} ${x + bw} ${y(v) + r}V${y(0)}Z"/>
      ${d.getDay() === 1 ? `<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle">${fDay(d)}</text>` : ''}`; }).join('')}
    <line pointer-events="none" x1="${L}" x2="${W}" y1="${y(avg)}" y2="${y(avg)}" stroke="#000" stroke-width="2" stroke-dasharray="5 4"/>
    <text class="big-note" pointer-events="none" x="${W}" y="${y(avg) - 7}" text-anchor="end">media 30 giorni: ${int(avg)}</text></svg>`;
}

// ## Pagina Ordini
function renderOrders() {
  const a = advise(), t = today();
  const open = state.orders.filter(o => !o.done), past = state.orders.filter(o => o.done).sort((x, y) => new Date(y.date) - new Date(x.date));
  const notIn = CATALOG.capsules.filter(c => !a.lines.some(l => l.cap === c.id));
  const edited = Object.keys(state.qty).length > 0;
  const merchLines = Object.entries(state.merch || {}).filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty, ...MERCH[id] }));
  const merch = merchLines.reduce((n, m) => n + m.qty, 0), merchTot = merchLines.reduce((n, m) => n + m.qty * m.price, 0), grand = a.total + merchTot;
  $('#view').innerHTML = `
    <div class="page-top"><h1>${a.first ? (a.level === 'now' ? 'Ordina oggi' : `Ordina entro ${fLong(a.orderBy)}`) : 'Nessun ordine necessario'}</h1>
      <p>${a.first ? `Un solo ordine: confermando entro quella data ricevi tutto al più tardi ${fLong(a.arrival)}. Copre ${state.cover} giorni di consumo${a.separate > 1 ? ` e sostituisce ${a.separate} spedizioni separate` : ''}.` : 'Le scorte e gli ordini in arrivo coprono il consumo previsto.'}</p></div>
    ${open.length ? `<section class="sec soft"><h2 class="title">In arrivo</h2>${open.map(o => {
      const placed = diffDays(t, o.date), total = diffDays(o.arrival, o.date) || 1, st = placed >= total - 1 ? 3 : placed >= 1 ? 2 : 1;
      return `<p class="sub" style="margin-top:10px">Ordine ${esc(o.id)}: ${o.lines.reduce((s, l) => s + l.boxes, 0)} box di caffè${(o.merch || []).length ? ' e selezione Caffè sospeso' : ''}, ${eur(o.total)}. Consegna ${fLong(new Date(o.arrival))}.</p>
      <ol class="track" style="max-width:640px"><li class="done">Confermato</li><li class="${st >= 2 ? 'done' : ''}">Preparazione</li><li class="${st >= 3 ? 'done' : ''}">In consegna</li><li>Consegnato</li></ol>`;
    }).join('')}</section>` : ''}
    <section class="sec"><div class="ord">
      <div>
        <div class="sec-head" style="margin-bottom:6px"><h2 class="title">Cosa ti consiglio</h2>${edited ? '<button class="link" id="q-reset" type="button">Torna al consiglio</button>' : ''}</div>
        ${a.lines.map(l => {
          const c = CAP[l.cap];
          const why = l.extra ? 'Aggiunto da te. Lo terrò d\'occhio dopo la prima consegna.'
            : l.suggested === 0 ? `Non serve: ${l.out ? 'dura fino al ' + fDay(l.out) : 'scorte ampie'}.`
            : `${int(state.stock[l.cap])} capsule oggi, ${int(l.avg)} al giorno${l.out ? ', finisce ' + fDay(l.out) : ''}. Consigliati ${plural(l.suggested, 'box', 'box')}.`;
          return `<article class="line"><img src="${c.img}" alt=""><div><h3>${esc(c.name)}</h3><p>${why}</p></div>
          <div class="step"><button type="button" data-q="${l.cap}" data-d="-1" aria-label="Un box in meno di ${esc(c.name)}">−</button><output>${plural(l.boxes, 'box', 'box')}</output><button type="button" data-q="${l.cap}" data-d="1" aria-label="Un box in più di ${esc(c.name)}">+</button></div>
          <div class="tot">${eur(l.boxes * BOX * c.price)}</div></article>`;
        }).join('')}
        ${merchLines.map(m => `<article class="line"><img class="line-merch" src="${m.img}" alt=""><div><h3>${m.name}</h3><p>Dalla selezione Caffè sospeso. Prezzo stimato.</p></div>
          <div class="step"><button type="button" data-merch="${m.id}" data-d="-1" aria-label="Un pezzo in meno di ${m.name}">−</button><output>${plural(m.qty, 'pezzo', 'pezzi')}</output><button type="button" data-merch="${m.id}" data-d="1" aria-label="Un pezzo in più di ${m.name}">+</button></div>
          <div class="tot">${eur(m.qty * m.price)}</div></article>`).join('')}
        <details style="margin-top:8px"><summary>Aggiungi un altro caffè</summary>
          <div class="catalog">${notIn.map(c => `<button type="button" data-add="${c.id}"><img src="${c.img}" alt="">${esc(c.name)}<small>${eur(c.price * BOX)} al box</small></button>`).join('')}</div></details>
      </div>
      <aside class="summary"><h3>Il tuo ordine</h3><p class="big">${eur(grand)}</p>
        <dl><dt>Box da 50 capsule</dt><dd>${a.boxes}</dd><dt>Capsule</dt><dd>${int(a.boxes * BOX)}</dd>${merchLines.map(m => `<dt>${m.name}</dt><dd>${m.qty}</dd>`).join('')}<dt>Spedizioni</dt><dd>1</dd><dt>Se confermi oggi, arriva</dt><dd>${fDay(addWork(t, state.lead))}</dd></dl>
        <button class="btn primary" id="confirm" type="button" ${a.boxes || merch ? '' : 'disabled'}>Conferma ordine</button>
        <small>Prezzi di listino dal sito Nespresso Professional. Demo: l'ordine resta in questa pagina.</small></aside>
    </div></section>
    <section class="sec soft"><h2 class="title">Come calcolo il consiglio</h2>
      <p class="sub" style="margin-top:6px">Valori modificabili. I tempi di consegna sono un'ipotesi da confermare con Nespresso.</p>
      <div class="params">
        <div class="field"><label for="p-l">Tempi di consegna</label><select class="inp" id="p-l">${[1, 2, 3, 5].map(n => `<option value="${n}" ${state.lead === n ? 'selected' : ''}>${plural(n, 'giorno lavorativo', 'giorni lavorativi')}</option>`).join('')}</select></div>
        <div class="field"><label for="p-s">Margine di sicurezza</label><select class="inp" id="p-s">${[1, 2, 3, 5, 7].map(n => `<option value="${n}" ${state.safety === n ? 'selected' : ''}>${plural(n, 'giorno', 'giorni')}</option>`).join('')}</select></div>
        <div class="field"><label for="p-c">Ogni ordine copre</label><select class="inp" id="p-c">${[14, 21, 30, 45].map(n => `<option value="${n}" ${state.cover === n ? 'selected' : ''}>${n} giorni</option>`).join('')}</select></div>
      </div></section>
    <section class="sec"><h2 class="title">Ordini passati</h2><div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Data</th><th>Ordine</th><th>Contenuto</th><th class="n">Totale</th></tr></thead><tbody>
      ${past.map(o => `<tr><td>${fDay(new Date(o.date))}</td><td>${esc(o.id)}</td><td>${[...o.lines.map(l => `${l.boxes} ${esc(CAP[l.cap].name)}`), ...(o.merch || []).map(m => `${m.qty} ${MERCH[m.id].name}`)].join(', ')}</td><td class="n">${eur(o.total)}</td></tr>`).join('')}
      </tbody></table></div></section>`;
  $$('[data-q]').forEach(b => b.onclick = () => {
    const c = b.dataset.q, line = advise().lines.find(l => l.cap === c);
    state.qty[c] = Math.max(0, line.boxes + (+b.dataset.d)); refresh();
  });
  $$('[data-add]').forEach(b => b.onclick = () => { state.qty[b.dataset.add] = 1; refresh(); });
  $$('[data-merch]').forEach(b => b.onclick = () => { const id = b.dataset.merch; state.merch[id] = Math.max(0, state.merch[id] + (+b.dataset.d)); refresh(); });
  $('#q-reset')?.addEventListener('click', () => { state.qty = {}; refresh(); });
  [['#p-l', 'lead'], ['#p-s', 'safety'], ['#p-c', 'cover']].forEach(([s, k]) => $(s).onchange = e => { state[k] = +e.target.value; state.qty = {}; refresh(); });
  $('#confirm').onclick = () => {
    const f = advise(), buy = f.lines.filter(l => l.boxes > 0);
    const arrival = addWork(t, state.lead);
    const o = { id: 'NP-' + (49000 + state.orders.length * 13), date: t.toISOString(), arrival: arrival.toISOString(), lines: buy.map(l => ({ cap: l.cap, boxes: l.boxes })), merch: merchLines.map(({ id, qty }) => ({ id, qty })), total: f.total + merchTot, done: false };
    state.orders.push(o); state.qty = {}; state.merch = {};
    refresh(); toast(`Ordine confermato. Consegna stimata ${fLong(arrival)}.`);
  };
}

// ## Pagina Caffe' sospeso: il merch per Napoli
// Il prezzo e' una stima: parte dal listino reale delle capsule e somma costi ipotizzati.
const MERCH = {
  xbox: {
    name: 'Christmas box', img: 'assets/merch/box-tavolo.jpg', price: 89,
    views: [
      { src: 'assets/merch/box-tavolo.jpg', label: 'In sala', alt: 'Cofanetto aperto con capsule numerate e cartellone su un tavolo in marmo, in un hotel di Napoli a Natale' },
      { src: 'assets/merch/box-chiusa.jpg', label: 'Chiusa', alt: 'Cofanetto chiuso in blu, oro e maiolica, su sfondo nero' },
      { src: 'assets/merch/box-dettaglio.jpg', label: 'Le capsule', alt: 'Primo piano delle capsule con i numeri della tombola 21, 22, 23 e 24' },
    ],
    text: 'La tombola di Natale, in capsule: 90 cialde personalizzate con i numeri da 1 a 90 e il cartellone per giocare.',
    has: ['90 cialde numerate', 'Cartellone della tombola'],
    build: [
      ['90 capsule, al listino dei caffè di origine (0,62 € l\'una)', 56],
      ['Numero da 1 a 90 stampato su ogni capsula (0,10 € l\'una)', 9],
      ['Cofanetto decorato e cartellone della tombola', 14],
      ['Margine edizione speciale', 10],
    ],
  },
  curniciello: {
    name: 'Il curniciello', img: 'assets/merch/cur-studio.jpg', price: 24,
    views: [
      { src: 'assets/merch/cur-studio.jpg', label: 'Chiuso', alt: 'Cornetto rosso con decori in maiolica, fiocco ed etichetta Il curniciello, su sfondo nero' },
      { src: 'assets/merch/cur-aperto.jpg', label: 'Aperto', alt: 'Cornetto aperto visto dall\'alto su marmo bianco, con capsule oro e blu e nastro rosso' },
      { src: 'assets/merch/cur-dettaglio.jpg', label: 'Con le capsule', alt: 'Primo piano del cornetto rosso pieno di capsule oro e blu' },
    ],
    text: 'Il cornetto portafortuna di Napoli, rosso e decorato a maiolica, con dentro le capsule. Per tradizione porta fortuna solo se è regalato.',
    has: ['10 capsule assortite', 'Contenitore a forma di cornetto, con fiocco'],
    build: [
      ['10 capsule, al listino dei caffè di origine (0,62 € l\'una)', 6],
      ['Contenitore decorato a forma di cornetto, con fiocco', 12],
      ['Margine edizione speciale', 6],
    ],
  },
};
const merchQty = { xbox: 1, curniciello: 1 };
function merchProduct(id, flip) {
  const p = MERCH[id], inOrder = (state.merch || {})[id] || 0;
  return `<div class="merch ${flip ? 'flip' : ''}">
    <div class="gallery" data-gal="${id}">
      <img class="merch-img" src="${p.views[0].src}" alt="${esc(p.views[0].alt)}">
      <div class="thumbs" role="group" aria-label="Altre immagini di ${p.name}">${p.views.map((v, i) => `<button type="button" data-view="${i}" aria-pressed="${i === 0}"><img src="${v.src}" alt=""><span>${v.label}</span></button>`).join('')}</div>
    </div>
    <div class="merch-buy">
      <h2 class="title">${p.name}</h2>
      <p class="sub">${p.text}</p>
      <p class="merch-price">${eur(p.price)}</p>
      <p class="merch-est">Prezzo stimato a pezzo</p>
      <ul class="merch-list">${p.has.map(x => `<li>${x}</li>`).join('')}</ul>
      <div class="merch-act">
        <div class="step"><button type="button" data-m-minus="${id}" aria-label="Un pezzo in meno di ${p.name}">−</button><output data-m-q="${id}">${plural(merchQty[id], 'pezzo', 'pezzi')}</output><button type="button" data-m-plus="${id}" aria-label="Un pezzo in più di ${p.name}">+</button></div>
        <button class="btn primary" type="button" data-m-add="${id}">Aggiungi all'ordine</button>
      </div>
      ${inOrder ? `<p class="sub merch-in">Nel tuo ordine: ${plural(inOrder, 'pezzo', 'pezzi')}. <a class="link" href="#ordini">Vai all'ordine</a></p>` : ''}
    </div>
  </div>`;
}
function priceTable(id) {
  const p = MERCH[id];
  return `<div class="table-wrap" style="margin-top:14px"><table><tbody>
    ${p.build.map(([l, v]) => `<tr><td>${l}</td><td class="n">${eur(v)}</td></tr>`).join('')}
    <tr class="sum"><td>Prezzo stimato</td><td class="n">${eur(p.price)}</td></tr>
  </tbody></table></div>`;
}
function renderSospeso() {
  const nums = Array.from({ length: 90 }, (_, i) => i + 1);
  $('#view').innerHTML = `
    <div class="page-top"><h1>Caffè sospeso</h1><p>L'esperienza del pop-up store Nespresso di Napoli, da portare nella tua struttura. Una selezione solo per le strutture napoletane. <a class="link-dark" href="#eventi">Vedi i prossimi eventi</a></p></div>
    <section class="sec">${merchProduct('xbox')}</section>
    <section class="sec soft"><div class="merch-2">
      <div><h2 class="title">Il cartellone</h2>
        <p class="sub" style="margin-top:6px">Ogni capsula porta un numero. Ne estrai una, la prepari e segni il numero sul cartellone.</p>
        <div class="board" role="img" aria-label="Cartellone della tombola con i numeri da 1 a 90">${nums.map(n => `<span>${n}</span>`).join('')}</div></div>
      <div><h2 class="title">Come nasce il prezzo</h2>
        <p class="sub" style="margin-top:6px">Il listino delle capsule è reale. Le altre voci sono ipotesi da verificare con Nespresso.</p>
        ${priceTable('xbox')}</div>
    </div></section>
    <section class="sec">${merchProduct('curniciello', true)}</section>
    <section class="sec soft"><div class="merch-2">
      <div><h2 class="title">Un portafortuna da regalare</h2>
        <p class="sub" style="margin-top:6px">A Napoli il cornetto non si compra per sé: si riceve in dono. Per questo è pensato per i tuoi ospiti e i tuoi clienti migliori.</p></div>
      <div><h2 class="title">Come nasce il prezzo</h2>
        <p class="sub" style="margin-top:6px">Il listino delle capsule è reale. Numero di capsule e altre voci sono ipotesi da verificare con Nespresso.</p>
        ${priceTable('curniciello')}</div>
    </div></section>`;
  // Miniature: cambiano solo l'immagine grande, senza ridisegnare la pagina.
  $$('[data-gal]').forEach(g => $$('[data-view]', g).forEach(b => b.onclick = () => {
    const v = MERCH[g.dataset.gal].views[+b.dataset.view], main = $('.merch-img', g);
    main.src = v.src; main.alt = v.alt;
    $$('[data-view]', g).forEach(x => x.setAttribute('aria-pressed', x === b));
  }));
  const drawQ = id => { $(`[data-m-q="${id}"]`).textContent = plural(merchQty[id], 'pezzo', 'pezzi'); };
  $$('[data-m-minus]').forEach(b => b.onclick = () => { const id = b.dataset.mMinus; merchQty[id] = Math.max(1, merchQty[id] - 1); drawQ(id); });
  $$('[data-m-plus]').forEach(b => b.onclick = () => { const id = b.dataset.mPlus; merchQty[id]++; drawQ(id); });
  $$('[data-m-add]').forEach(b => b.onclick = () => {
    const id = b.dataset.mAdd; state.merch ||= {};
    state.merch[id] = (state.merch[id] || 0) + merchQty[id];
    refresh(); toast(`Aggiunto all'ordine: ${MERCH[id].name}.`);
  });
}

// ## Pagina Eventi: gli appuntamenti del pop-up store Caffe' sospeso
// Date, orari e zona sono dimostrativi: basta cambiarli in questa lista.
const EVENTS = [
  { id: 'e1', date: new Date(2026, 10, 19, 12), time: '18:30', title: 'Apertura del pop-up store', who: 'Hotel luxury e fine dining', text: 'Prima degustazione della selezione e primo incontro tra i gestori della città.' },
  { id: 'e2', date: new Date(2026, 10, 26, 12), time: '16:00', title: 'Il caffè nell\'esperienza dell\'ospite', who: 'Hotel luxury', text: 'Colazione, lobby e camere: degustazione e confronto tra chi dirige un albergo.' },
  { id: 'e3', date: new Date(2026, 11, 3, 12), time: '16:00', title: 'Il caffè a fine pasto', who: 'Fine dining', text: 'Scelta dei caffè e servizio in sala, con degustazione guidata.' },
  { id: 'e4', date: new Date(2026, 11, 17, 12), time: '18:30', title: 'Tombola di Natale', who: 'Hotel luxury e fine dining', text: 'Si gioca con la Christmas box: ogni numero estratto è un caffè da assaggiare.' },
];
const VENUE = 'Pop-up store Caffè sospeso, Chiaia, Napoli';
const nextEvents = () => EVENTS.filter(e => e.date >= today());
const isGoing = id => (state.rsvp || []).includes(id);
function renderEvents() {
  const list = nextEvents();
  $('#view').innerHTML = `
    <div class="page-top"><h1>Eventi Caffè sospeso</h1><p>Il pop-up store di Nespresso a Napoli. Su invito, per chi gestisce hotel luxury e ristoranti fine dining.</p></div>
    <section class="sec"><div class="sec-head"><h2 class="title">Prossimi eventi</h2></div>
      <div class="ev-list">${list.map(e => `<article class="ev">
        <p class="ev-date"><b>${e.date.getDate()}</b>${it({ month: 'short' }).format(e.date)}</p>
        <div><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p>
          <p class="ev-meta">${it({ weekday: 'long' }).format(e.date)}, ore ${e.time}. ${esc(VENUE)}.</p><span class="tag">${esc(e.who)}</span></div>
        <div class="ev-act">${isGoing(e.id)
          ? `<p class="ev-ok">Partecipazione confermata</p><button class="link" type="button" data-ev="${e.id}">Annulla</button>`
          : `<button class="btn" type="button" data-ev="${e.id}">Conferma partecipazione</button>`}</div>
      </article>`).join('') || '<p class="sub" style="padding:20px 0">Nessun evento in programma. Le nuove date compariranno qui.</p>'}</div>
    </section>
    <section class="sec soft"><h2 class="title">Cosa succede al pop-up</h2>
      <div class="facts ev-why">
        <div><h3>Degusti</h3><p>Assaggi i caffè con calma e scegli quelli giusti per la tua struttura.</p></div>
        <div><h3>Incontri</h3><p>Conosci altri gestori e il team Nespresso, nel cuore di Napoli.</p></div>
        <div><h3>Attivi la fornitura</h3><p>Se vuoi, avvii la partnership con Nespresso direttamente all'evento.</p></div>
      </div></section>`;
  $$('[data-ev]').forEach(b => b.onclick = () => {
    const id = b.dataset.ev, going = isGoing(id);
    state.rsvp = going ? state.rsvp.filter(x => x !== id) : [...(state.rsvp || []), id];
    refresh(); toast(going ? 'Partecipazione annullata.' : 'Partecipazione confermata.');
  });
}

// ## Far passare il tempo nella demo
// Ogni giorno: si consumano capsule secondo la previsione e arrivano gli ordini attesi.
function advance(n) {
  const r = rng(state.offset * 97 + 13);
  for (let k = 0; k < n; k++) {
    const d = today(), demand = demandFn();
    state.orders.filter(o => !o.done && sameDay(o.arrival, d)).forEach(o => {
      o.lines.forEach(l => { state.stock[l.cap] = (state.stock[l.cap] || 0) + l.boxes * BOX; });
      o.done = true; toast(`Ordine ${o.id} consegnato.`);
    });
    const needs = Object.fromEntries(activeCaps().map(c => [c, demand(c, d)]));
    activeCaps().forEach(c => {
      const tot = avgOf(c) || 1; let used = 0;
      state.machines.forEach(m => {
        const a = (state.history[m.id] ||= {})[c] ||= [];
        const v = Math.round(needs[c] * machineAvg(m, c) / tot * (.88 + r() * .24));
        if (machineAvg(m, c) > 0) { a.push(v); used += v; }
      });
      state.stock[c] = Math.max(0, (state.stock[c] || 0) - used);
    });
    state.offset++;
    if (state.event && startDay(state.event.date) < today()) state.event = null;
  }
  const a = advise();
  refresh();
  if (a.level === 'now') toast(`È il momento di ordinare: ${CAP[a.first.cap].name} sta finendo.`);
}
$('#demo-next').onclick = () => advance(1);
$('#demo-week').onclick = () => advance(7);
$('#demo-reset').onclick = () => { state = seedState(); Object.assign(view, { machine: 'all', coffee: 'all' }); chatStarted = false; $('#chat-log').innerHTML = ''; location.hash = '#panoramica'; refresh(); toast('Demo ripristinata.'); };

let toastT;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 4200); }

// ## Assistente
// In questo prototipo risponde con regole fisse, ma ogni numero viene dal motore di calcolo
// sopra: i dati sono sempre coerenti con il resto della pagina.
let chatStarted = false;
const SUGGEST = ['Cosa devo ordinare?', 'Quanto dura il Ristretto?', 'Sabato ho 120 ospiti', 'Come risparmio spedizioni?', 'Qual è il prossimo evento?'];
function openChat() {
  $('#cof').hidden = true; $('#cof-open').hidden = false;
  $('#chat').hidden = false;
  if (!chatStarted) {
    chatStarted = true;
    bot(answerOrder());
    $('#chat-suggest').innerHTML = SUGGEST.map(s => `<button type="button">${esc(s)}</button>`).join('');
    $$('#chat-suggest button').forEach(b => b.onclick = () => ask(b.textContent));
  }
  $('#chat-input').focus();
}
$('#open-chat').onclick = openChat;
$('#close-chat').onclick = () => { $('#chat').hidden = true; $('#open-chat').focus(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#chat').hidden && !$('#reg').open) $('#close-chat').click(); });
$('#chat-form').onsubmit = e => { e.preventDefault(); const i = $('#chat-input'), v = i.value.trim(); if (v) { ask(v); i.value = ''; } };

function addMsg(html, who) {
  const m = document.createElement('div'); m.className = 'msg ' + who; m.innerHTML = html;
  const log = $('#chat-log'); log.append(m); log.scrollTop = log.scrollHeight; return m;
}
function bot(html) { const m = addMsg(html, 'bot'); return m; }
function ask(text) {
  addMsg(esc(text), 'me');
  const w = addMsg('Sto guardando i tuoi consumi…', 'bot typing');
  setTimeout(() => { w.remove(); const res = answer(text); const m = bot(res.html || res); if (res.bind) res.bind(m); $('#chat-log').scrollTop = 1e6; }, 550);
}
function answerOrder() {
  const a = advise();
  if (!a.first) return 'Per ora non serve ordinare: scorte e consegne in arrivo coprono il consumo previsto.';
  const list = a.lines.filter(l => l.boxes > 0).map(l => `<li>${esc(CAP[l.cap].name)}: ${plural(l.boxes, 'box', 'box')}</li>`).join('');
  return `${a.level === 'now' ? 'Ti conviene ordinare oggi' : `Ti conviene ordinare entro ${fLong(a.orderBy)}`}, così ricevi tutto ${fLong(a.arrival)}.<ul>${list}</ul>Totale ${eur(a.total)}. <a class="link" href="#ordini">Apri l'ordine</a>`;
}
const DAYS = { domenica: 0, lunedi: 1, 'lunedì': 1, martedi: 2, 'martedì': 2, mercoledi: 3, 'mercoledì': 3, giovedi: 4, 'giovedì': 4, venerdi: 5, 'venerdì': 5, sabato: 6 };
function answer(text) {
  const q = text.toLowerCase(), a = advise(), t = today();
  // Evento: "sabato ho 120 ospiti"
  const g = q.match(/(\d+)\s*(ospiti|persone|coperti|invitati|clienti)/);
  if (g) {
    const guests = +g[1], name = Object.keys(DAYS).find(n => q.includes(n));
    let date = addDays(t, 7);
    if (q.includes('domani')) date = addDays(t, 1);
    else if (name) { date = addDays(t, 1); while (date.getDay() !== DAYS[name]) date = addDays(date, 1); }
    return {
      html: `${int(guests)} ospiti ${fLong(date)} valgono circa ${int(guests * 1.5)} caffè in più. Li aggiungo alla previsione?<br><button class="btn small primary" type="button">Aggiungi alla previsione</button>`,
      bind: m => { $('button', m).onclick = e => {
        state.event = { date: date.toISOString(), guests }; state.qty = {}; save();
        e.target.disabled = true; const n = advise();
        bot(`Fatto. ${n.first ? `Ora ti consiglio di ordinare ${n.level === 'now' ? 'oggi' : 'entro ' + fLong(n.orderBy)}: ${plural(n.boxes, 'box', 'box')}, ${eur(n.total)}.` : 'Le scorte coprono anche l\'evento.'}`);
        if (['', '#panoramica'].includes(location.hash)) updateHome(); else refresh();
      }; },
    };
  }
  if (/event|pop.?up|sospeso/.test(q)) {
    const e = nextEvents()[0];
    return e ? `Il prossimo evento è «${esc(e.title)}», ${fLong(e.date)} alle ${e.time}, al pop-up store Caffè sospeso. <a class="link" href="#eventi">Vedi gli eventi</a>` : 'Non ci sono eventi in programma al momento.';
  }
  // Durata di un caffe' specifico: controlla prima i nomi piu' lunghi.
  const named = [...CATALOG.capsules].sort((x, y) => y.name.length - x.name.length).find(c => q.includes(c.name.toLowerCase()));
  if (named && !/ordin|compr/.test(q)) {
    const r = a.rows.find(x => x.cap === named.id);
    if (!r) return `${esc(named.name)} non è ancora nelle tue scorte. Puoi aggiungerlo dalla pagina <a class="link" href="#ordini">Ordini</a>.`;
    if (!state.stock[named.id]) return `${esc(named.name)} è finito. Ti conviene ordinarlo oggi. <a class="link" href="#ordini">Apri l'ordine</a>`;
    return `Hai ${int(state.stock[named.id])} capsule di ${esc(named.name)} e ne usi ${int(r.avg)} al giorno. ${r.out ? `Finiscono ${fLong(r.out)}, cioè tra ${plural(Math.floor(r.daysLeft), 'giorno', 'giorni')}.` : 'Ti bastano per oltre 6 mesi.'}`;
  }
  if (/perch|data|quando/.test(q)) {
    if (!a.first) return 'Nessuna data per ora: non serve ordinare.';
    const c = CAP[a.first.cap];
    return `${esc(c.name)} è il caffè più urgente: ${int(state.stock[a.first.cap])} capsule per ${int(a.first.avg)} al giorno, quindi finisce ${fLong(a.first.out)}. Tolgo ${plural(state.safety, 'giorno', 'giorni')} di margine e ${plural(state.lead, 'giorno lavorativo', 'giorni lavorativi')} di consegna: l'ultimo giorno utile è ${fLong(a.first.by)}.${a.late ? ' È già passato, quindi meglio ordinare oggi.' : ''}`;
  }
  if (/spedizion|risparm|logistic|consegn/.test(q)) {
    const last = state.orders.filter(o => diffDays(t, o.date) <= 30 && diffDays(t, o.date) >= 0).length;
    return `Negli ultimi 30 giorni hai ricevuto ${plural(last, 'spedizione', 'spedizioni')}. Ordinando ogni caffè all'ultimo momento ne serviranno ${a.separate || 1}; raggruppando tutto ${a.first ? fLong(a.orderBy) : 'in un unico ordine'} ne basta una per ${state.cover} giorni.`;
  }
  if (/media|consum|al giorno|quant[ie] caff/.test(q)) {
    const top = [...a.rows].sort((x, y) => y.avg - x.avg)[0];
    return `Consumi in media ${int(totalAvg())} caffè al giorno. Il più richiesto è ${top ? esc(CAP[top.cap].name) + ` con ${int(top.avg)} al giorno` : 'ancora da stabilire'}. <a class="link" href="#consumi">Vedi i consumi</a>`;
  }
  if (/macchin/.test(q)) return `Hai ${plural(state.machines.length, 'macchina registrata', 'macchine registrate')}: ${state.machines.map(m => `${esc(MACH[m.model].name)} (${esc(m.location)})`).join(', ') || 'nessuna'}. <a class="link" href="#macchine">Gestisci le macchine</a>`;
  if (/ordin|compr|cosa|quanto/.test(q)) return answerOrder();
  return 'Posso dirti cosa ordinare e quando, quanto dura un caffè, qual è il tuo consumo medio e cosa cambia con un evento. Ad esempio: «sabato ho 120 ospiti».';
}

// ## Chatbot dei caffe'
// Riconosce il nome di un caffe' o cosa cerchi ("fruttato", "con latte") e risponde con le schede
// di data.js. Anche qui sono regole fisse: dice solo cio' che e' scritto nelle schede.
const COF = CATALOG.capsules.map(c => ({ ...c, ...COFFEE_INFO[c.id] }));
const FAM = { origini: 'Caffè di origine', classici: 'Classici: espresso e lungo', variazioni: 'Variazioni e aromatizzati' };
const ALIAS = { 'perù': 'peru-organic', peru: 'peru-organic', colombia: 'colombia-organic', congo: 'congo-organic', vaniglia: 'caffe-vanilio', vanilio: 'caffe-vanilio', caramello: 'caffe-caramello', nocciola: 'caffe-nocciola', amaretti: 'amaretti-decaffeinato', bianco: 'bianco-intenso' };
const COF_SUGGEST = ['Che tipi di caffè avete?', 'Il più intenso', 'Qualcosa di delicato', 'Con il latte', 'Decaffeinati', 'Biologici', 'Differenza tra Forte e Leggero'];
const SEARCH = [
  [/biologic|organic|\bbio\b/, 'biologico', 'I caffè biologici'], [/fruttat|frutti rossi|frutta/, 'fruttato', 'I caffè con note fruttate'],
  [/floreal|fiori/, 'floreale', 'La nota floreale'], [/cacao|cioccolat/, 'cacao', 'I caffè con note di cacao'],
  [/speziat|spezie/, 'speziato', 'I caffè speziati'], [/cereal/, 'cereali', 'I caffè con note di cereali'],
  [/dolc/, 'dolce', 'I caffè più dolci'], [/aromatizzat/, 'aromatizzato', 'I caffè aromatizzati'],
  [/decaf|deca\b|senza caffeina/, 'decaffeinato', 'I decaffeinati'], [/latte|cappuccin|macchiato/, 'latte', 'I caffè adatti al latte'],
  [/caffeina/, 'caffeina', 'Il caffè con caffeina extra'], [/corpos/, 'corposo', 'I caffè più corposi'],
];
function findCoffees(q) {
  const hits = [];
  let rest = q;
  [...COF].sort((a, b) => b.name.length - a.name.length).forEach(c => {
    const n = c.name.toLowerCase();
    if (rest.includes(n)) { hits.push({ c, at: rest.indexOf(n) }); rest = rest.replace(n, ' '.repeat(n.length)); }
  });
  Object.entries(ALIAS).forEach(([w, id]) => { if (rest.includes(w) && !hits.some(h => h.c.id === id)) { hits.push({ c: COF.find(c => c.id === id), at: rest.indexOf(w) }); rest = rest.replace(w, ' '.repeat(w.length)); } });
  return hits.sort((x, y) => x.at - y.at).map(h => h.c); // stesso ordine della domanda
}
const dots = (label, v) => v ? `<div class="cof-scale"><span>${label}</span><span class="dots" role="img" aria-label="${v} su 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span></div>` : '';
const famOf = c => FAM[c.fam];
function coffeeCard(c) {
  return `<article class="cof-card"><div class="cof-top"><img src="${c.img}" alt=""><div><h3>${esc(c.name)}</h3><small>${famOf(c)}${c.intensity ? `, intensità ${c.intensity}` : ''}</small></div></div>
    <p>${esc(c.desc)}</p>
    ${dots('Amaro', c.bit)}${dots('Acidità', c.acid)}${dots('Tostatura', c.roast)}
    <p class="cof-meta">${c.cups.length ? `Da bere: ${c.cups.join(', ')}. ` : ''}Box da 50 a ${eur(c.price * BOX)}.</p>
    <button class="btn small" type="button" data-cof-add="${c.id}">Aggiungi un box all'ordine</button></article>`;
}
function coffeeList(title, list) {
  return `${esc(title)}:<div class="cof-chips">${list.map(c => `<button class="chip" type="button" data-cof-ask="${esc(c.name)}"><img src="${c.img}" alt="">${esc(c.name)}</button>`).join('')}</div>`;
}
function coffeeAnswer(text) {
  const q = text.toLowerCase();
  const byInt = [...COF].filter(c => c.intensity).sort((a, b) => b.intensity - a.intensity);
  if (/ciao|salve|buongiorno|buonasera/.test(q) && q.length < 20) return 'Ciao. Dimmi un caffè o cosa cerchi: ad esempio «fruttato», «con il latte» o «il più intenso».';
  if (/pi[uù] (intens|fort)|caff[eè] forte|qualcosa di forte|molto intens/.test(q)) return coffeeList('Dal più intenso', byInt.slice(0, 4));
  if (/pi[uù] (legger|delicat|morbid)|delicat|morbid|qualcosa di leggero|caff[eè] leggero/.test(q)) return coffeeList('I più delicati, secondo l\'intensità', byInt.slice(-4).reverse());
  if (/cos.?[eè] .*intensit|intensit.* (cos|signific|vuol)/.test(q)) return 'L\'intensità indica quanto è deciso un caffè, non quanta caffeina contiene: dipende soprattutto da tostatura e corpo. In questa gamma arriva a 12, con Ristretto Intenso. Alcuni caffè, come gli aromatizzati, non la indicano.';
  if (/arabica|robusta/.test(q) && !findCoffees(q).length) return 'L\'Arabica di solito è più aromatica e con più acidità. La Robusta è più corposa e amara, e ha più caffeina. Nella gamma, Ristretto Intenso e Guatemala le uniscono.';
  const named = findCoffees(q);
  if (/differenz|confront|meglio|oppure|\bvs\b/.test(q) && named.length >= 2) {
    const [a, b] = named;
    const row = (l, x, y) => `<tr><td>${l}</td><td class="n">${x || 'n.d.'}</td><td class="n">${y || 'n.d.'}</td></tr>`;
    return `<table class="cof-cmp"><thead><tr><th></th><th class="n">${esc(a.name)}</th><th class="n">${esc(b.name)}</th></tr></thead><tbody>${row('Intensità', a.intensity, b.intensity)}${row('Amaro', a.bit, b.bit)}${row('Acidità', a.acid, b.acid)}${row('Tostatura', a.roast, b.roast)}</tbody></table>
      <p class="cof-meta"><b>${esc(a.name)}:</b> ${esc(a.desc)}</p><p class="cof-meta"><b>${esc(b.name)}:</b> ${esc(b.desc)}</p>`;
  }
  if (named.length) return named.slice(0, 2).map(coffeeCard).join('');
  for (const [re, tag, title] of SEARCH) if (re.test(q)) return coffeeList(title, COF.filter(c => c.tags.includes(tag)));
  if (/origin/.test(q)) return coffeeList(FAM.origini, COF.filter(c => c.fam === 'origini'));
  if (/classic|espresso|lungo/.test(q)) return coffeeList(FAM.classici, COF.filter(c => c.fam === 'classici'));
  if (/variazion/.test(q)) return coffeeList(FAM.variazioni, COF.filter(c => c.fam === 'variazioni'));
  if (/colazion/.test(q)) return coffeeList('Un mio suggerimento per la colazione, con e senza latte', ['bianco-intenso', 'caffe-nocciola', 'forte', 'leggero'].map(id => COF.find(c => c.id === id)));
  if (/fine pasto|dopo cena|dessert|fine cena/.test(q)) return coffeeList('Un mio suggerimento per il fine pasto', ['ristretto', 'ristretto-intenso', 'decaffeinato', 'finezzo'].map(id => COF.find(c => c.id === id)));
  if (/tip|tutti|quali|gamma|catalogo|avete|caff/.test(q)) return Object.entries(FAM).map(([k, t]) => coffeeList(t, COF.filter(c => c.fam === k))).join('<br>');
  return 'Non ho trovato questo caffè in gamma. Prova con un nome, come «Ristretto», o con un gusto, come «fruttato», «cacao» o «speziato».';
}
function cofMsg(html, who) {
  const m = document.createElement('div'); m.className = 'msg ' + who; m.innerHTML = html;
  const log = $('#cof-log'); log.append(m); log.scrollTop = log.scrollHeight;
  $$('[data-cof-ask]', m).forEach(b => b.onclick = () => cofAsk(b.dataset.cofAsk));
  $$('[data-cof-add]', m).forEach(b => b.onclick = () => {
    const id = b.dataset.cofAdd, line = advise().lines.find(l => l.cap === id);
    state.qty[id] = (line ? line.boxes : 0) + 1; refresh();
    toast(`${CAP[id].name} aggiunto all'ordine.`);
  });
  return m;
}
function cofAsk(text) {
  cofMsg(esc(text), 'me');
  const w = cofMsg('Sto cercando nella gamma…', 'bot typing');
  setTimeout(() => { w.remove(); cofMsg(coffeeAnswer(text), 'bot'); }, 450);
}
let cofStarted = false;
function openCoffee() {
  $('#chat').hidden = true; hideTip();
  $('#cof').hidden = false; $('#cof-open').hidden = true;
  if (!cofStarted) {
    cofStarted = true;
    cofMsg(`Ciao, conosco tutti i ${COF.length} caffè della gamma. Chiedimi di un caffè, di un gusto o di una differenza.`, 'bot');
    $('#cof-suggest').innerHTML = COF_SUGGEST.map(s => `<button type="button">${esc(s)}</button>`).join('');
    $$('#cof-suggest button').forEach(b => b.onclick = () => cofAsk(b.textContent));
  }
  $('#cof-input').focus();
}
function closeCoffee() { $('#cof').hidden = true; $('#cof-open').hidden = false; $('#cof-open').focus(); }
$('#cof-open').onclick = openCoffee;
$('#cof-close').onclick = closeCoffee;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#cof').hidden && !$('#reg').open) closeCoffee(); });
$('#cof-form').onsubmit = e => { e.preventDefault(); const i = $('#cof-input'), v = i.value.trim(); if (v) { cofAsk(v); i.value = ''; } };
$('#demo-reset').addEventListener('click', () => { cofStarted = false; $('#cof-log').innerHTML = ''; $('#cof-suggest').innerHTML = ''; if (!$('#cof').hidden) closeCoffee(); });

// ## Avvio
route();
