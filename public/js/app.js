import { UNIVERSES, findChar } from "/shared/catalog.js";
import * as E from "/shared/engine.js";

const app = document.getElementById("app");
const overlay = document.getElementById("overlay");

// session : null (accueil) | { kind: "online", state, code } | { kind: "local", state }
let session = null;
let socket = null;

const ui = {
  tab: "create",
  howto: false,
  form: {
    name: localStorage.getItem("jde:name") || "",
    code: new URLSearchParams(location.search).get("salle") || "",
    universe: "onepiece",
    mode: "open",
    budget: 1000,
    teamSize: 5,
    localNames: ["", ""],
  },
  error: "",
  bid: null,
  bidKey: null,
  hint: "",
  seenSales: 0,
  seenAutoFill: false,
  peek: false,          // Sur place, mode aveugle : le tireur regarde son perso
  secretFor: null,      // Sur place : écran « passe l'appareil à … »
};

if (ui.form.code) ui.tab = "join";

// ---------- Utilitaires ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uni = () => UNIVERSES[session.state.config.universe];
const money = (n) => `${Number(n).toLocaleString("fr-FR")} M ${session ? uni().currency : ""}`.trim();
const player = (id) => session.state.players.find((p) => p.id === id);
const pname = (id) => esc(player(id)?.name || "?");

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function store(code, data) {
  try { data ? localStorage.setItem(`jde:room:${code}`, JSON.stringify(data)) : localStorage.removeItem(`jde:room:${code}`); } catch {}
}
function stored(code) {
  try { return JSON.parse(localStorage.getItem(`jde:room:${code}`) || "null"); } catch { return null; }
}

// ---------- Réseau ----------
function getSocket() {
  if (socket) return socket;
  if (typeof io !== "function") throw new Error("Le serveur de jeu est injoignable.");
  socket = io();
  let connectedOnce = false;
  socket.on("state", (state) => {
    if (!session || session.kind !== "online") return;
    session.state = state;
    render();
  });
  socket.on("connect", () => {
    // Reconnexion automatique après une coupure.
    const again = connectedOnce;
    connectedOnce = true;
    if (again && session?.kind === "online" && session.code) {
      const saved = stored(session.code);
      socket.emit("join", { code: session.code, token: saved?.token }, (res) => {
        if (res.error) { toast(res.error); leaveToHome(); }
      });
    }
  });
  return socket;
}

function enterOnline(res) {
  store(res.code, { token: res.token });
  history.replaceState(null, "", `/?salle=${res.code}`);
  session = { kind: "online", code: res.code, state: session?.state || null };
}

function emit(event, payload) {
  return new Promise((resolve) => {
    getSocket().emit(event, payload, (res) => {
      if (res?.error) toast(res.error);
      resolve(res);
    });
  });
}

// ---------- Actions ----------
function act(action) {
  if (session.kind === "online") return emit("action", action);
  const s = session.state;
  const actor = localActor();
  try {
    E.applyAction(s, actor, action);
  } catch (err) {
    if (err instanceof E.GameError) return toast(err.message);
    throw err;
  }
  if (action.type === "draw" && s.config.mode !== "open") ui.secretFor = actor;
  if (action.type === "bid" || action.type === "pass" || action.type === "offer") ui.peek = false;
  render();
}

function localActor() {
  const s = session.state;
  if (s.phase === "draw") return s.handId;
  if (s.phase === "bidding") return s.current.turnId;
  if (s.phase === "vote") return s.players.find((p) => !s.votes[p.id])?.id;
  return null;
}

function me() {
  return session.kind === "online" ? session.state.me : localActor();
}

function leaveToHome() {
  if (session?.kind === "online") store(session.code, null);
  session = null;
  overlay.innerHTML = "";
  history.replaceState(null, "", "/");
  render();
}

// ---------- Accueil ----------
function renderHome() {
  const f = ui.form;
  const tabs = [
    ["create", "🏛️", "Créer une salle", "Ouvre une salle et invite jusqu'à 3 amis avec un code."],
    ["join", "🗝️", "Rejoindre une salle", "Entre le code reçu et prends place à la table."],
    ["local", "📺", "Sur place", "Un seul écran, l'appareil passe de main en main."],
  ];
  return `
  <div class="wrap">
    <header class="hero">
      <span class="hammer">🔨</span>
      <h1>Le Jeu des Enchères</h1>
      <p>Tire un perso, mise, bluffe, laisse filer… et compose la meilleure équipe avec ton budget.</p>
    </header>
    <nav class="tabs">
      ${tabs.map(([id, icon, title, desc]) => `
        <button class="tab ${ui.tab === id ? "active" : ""}" data-action="tab" data-value="${id}">
          <div class="icon">${icon}</div><h2>${title}</h2><p>${desc}</p>
        </button>`).join("")}
    </nav>
    <section class="panel">
      ${ui.tab === "join" ? joinForm(f) : rulesForm(f)}
      <div class="error">${esc(ui.error)}</div>
    </section>
    <footer class="footer">
      <button class="btn ghost" data-action="howto">📜 Comment jouer</button>
    </footer>
  </div>
  ${ui.howto ? howtoModal() : ""}`;
}

function nameField(f) {
  return `<label for="f-name">Ton pseudo</label>
    <input id="f-name" type="text" maxlength="16" data-field="name" value="${esc(f.name)}" placeholder="Ex. : Roi des Pirates">`;
}

function joinForm(f) {
  return `
    <h2 class="display" style="font-size:2rem">Rejoindre une salle</h2>
    ${nameField(f)}
    <label for="f-code">Code de la salle</label>
    <input id="f-code" type="text" maxlength="5" data-field="code" value="${esc(f.code)}" placeholder="ABCDE" style="text-transform:uppercase;letter-spacing:6px;font-weight:800">
    <div style="margin-top:18px"><button class="btn big" data-action="join">Entrer dans l'arène<span class="sub">Rejoindre</span></button></div>`;
}

function rulesForm(f) {
  const local = ui.tab === "local";
  return `
    <h2 class="display" style="font-size:2rem">${local ? "Partie sur place" : "Créer une salle"}</h2>
    ${local ? "" : nameField(f)}
    <label>Univers</label>
    <div class="choices">
      ${Object.entries(UNIVERSES).map(([id, u]) => `
        <button class="choice uni-choice ${f.universe === id ? "selected" : ""}" data-action="pick" data-key="universe" data-value="${id}">
          <div class="uni-bg" style="background:${u.tile}"></div><span>${u.name}</span>
        </button>`).join("")}
    </div>
    <label>Mode de jeu</label>
    <div class="choices">
      ${[["open", "Tout le monde voit", "Le perso tiré s'affiche pour tous."],
         ["blindHint", "À l'aveugle + indice", "Seul le tireur le voit, il donne un indice en misant."],
         ["blind", "À l'aveugle total", "Seul le tireur le voit. Aucun indice."]].map(([id, t, d]) => `
        <button class="choice ${f.mode === id ? "selected" : ""}" data-action="pick" data-key="mode" data-value="${id}">
          <strong>${t}</strong><small>${d}</small>
        </button>`).join("")}
    </div>
    <div class="row">
      <div><label for="f-budget">Budget de départ (en millions)</label>
        <input id="f-budget" type="number" min="10" step="10" data-field="budget" value="${f.budget}"></div>
      <div><label for="f-team">Persos par équipe</label>
        <input id="f-team" type="number" min="1" max="11" data-field="teamSize" value="${f.teamSize}"></div>
    </div>
    <p class="muted" style="font-size:.85rem;margin:8px 0 0">Mise minimum : 10 M. On surenchérit d'au moins 10 M.</p>
    ${local ? localPlayersForm(f) : ""}
    <div style="margin-top:18px">
      ${local
        ? `<button class="btn big" data-action="start-local">Que les enchères commencent !<span class="sub">Lancer la partie</span></button>`
        : `<button class="btn big" data-action="create">Ouvrir la salle<span class="sub">Créer</span></button>`}
    </div>`;
}

function localPlayersForm(f) {
  return `
    <label>Joueurs (2 à 4)</label>
    ${f.localNames.map((n, i) => `
      <div class="row" style="margin-bottom:8px;align-items:center">
        <input type="text" maxlength="16" data-field="localName" data-index="${i}" value="${esc(n)}" placeholder="Joueur ${i + 1}">
        ${f.localNames.length > 2 ? `<button class="btn ghost small" style="flex:0 0 auto" data-action="remove-local" data-index="${i}">✕</button>` : ""}
      </div>`).join("")}
    ${f.localNames.length < 4 ? `<button class="btn ghost small" data-action="add-local">+ Ajouter un joueur</button>` : ""}`;
}

function howtoModal() {
  return `
  <div class="modal-back" data-action="close-howto">
    <div class="panel modal howto" data-stop>
      <div class="modal-head"><h2>Comment jouer</h2><button class="btn ghost small" data-action="close-howto">Fermer</button></div>
      <h3>Le but</h3>
      <p>Avec ton budget virtuel, remporte des persos aux enchères pour composer la meilleure équipe. À la fin, chacun vote pour la meilleure équipe (la sienne compte aussi).</p>
      <h3>Un tour</h3>
      <ul>
        <li>Au début, le hasard désigne qui a la main. Ensuite, la main tourne joueur par joueur.</li>
        <li>Celui qui a la main tire un perso et <b>doit</b> ouvrir l'enchère (10 M minimum). Personne ne peut miser avant lui.</li>
        <li>Ensuite, chacun son tour : <b>miser</b> plus haut (au moins +10 M) ou <b>laisser</b>. Qui laisse ne revient plus sur ce perso.</li>
        <li>Le dernier encore en lice remporte le perso au prix de sa mise. Si tout le monde laisse, c'est celui qui a ouvert qui l'emporte.</li>
      </ul>
      <h3>Les modes</h3>
      <ul>
        <li><b>Tout le monde voit :</b> le perso tiré s'affiche pour tous.</li>
        <li><b>À l'aveugle + indice :</b> seul le tireur voit le perso. Il écrit un indice qui s'affiche avec sa première mise.</li>
        <li><b>À l'aveugle total :</b> seul le tireur voit le perso, sans indice. Bluff garanti.</li>
        <li>Dans les deux modes à l'aveugle, le perso est révélé à tous dès qu'il est remporté.</li>
      </ul>
      <h3>Les règles du budget</h3>
      <ul>
        <li>Pas de limite : tu peux miser tout ton argent.</li>
        <li>Si tu n'as plus d'argent (moins de 10 M) et que tu tires un perso, ce sont les autres qui misent dessus. Si personne ne mise, il te revient gratuitement.</li>
        <li>En face-à-face, ton adversaire choisit : le prendre pour 10 M, ou te le laisser gratuitement.</li>
        <li>Une équipe complète ne reçoit plus la main et ne mise plus.</li>
        <li>Quand il ne reste qu'un joueur incomplet, il reçoit gratuitement des persos tirés au hasard pour finir son équipe.</li>
      </ul>
      <h3>Pas de meneur</h3>
      <p>Chaque joueur décide pour lui-même. En ligne, la partie démarre dès que tous les joueurs (2 minimum) sont prêts. À la fin, chacun peut cliquer sur « Rejouer » : la revanche démarre avec les mêmes règles quand tout le monde est partant.</p>
    </div>
  </div>`;
}

// ---------- Salle d'attente ----------
function renderLobby() {
  const s = session.state;
  const u = uni();
  const mine = player(s.me);
  const link = `${location.origin}/?salle=${session.code}`;
  return `
  <div class="wrap">
    ${topbar()}
    <div class="lobby-grid">
      <section class="panel">
        <p class="muted" style="margin:0">Code de la salle</p>
        <div class="code-box">${session.code}</div>
        <div class="row" style="margin-top:8px">
          <button class="btn small" data-action="copy" data-value="${esc(link)}">Copier le lien d'invitation</button>
        </div>
        <h3 style="font-size:1.6rem;margin-top:22px">Joueurs (${s.players.length}/${E.MAX_PLAYERS})</h3>
        ${s.players.map((p) => `
          <div class="player-line">
            <span><span class="dot ${p.connected ? "" : "off"}"></span>${esc(p.name)}${p.id === s.me ? " <span class='pill'>toi</span>" : ""}</span>
            ${p.ready ? `<span class="ready">Prêt ✔</span>` : `<span class="muted">En attente…</span>`}
          </div>`).join("")}
        <div style="margin-top:18px" class="actions">
          <button class="btn big ${mine?.ready ? "ghost" : ""}" data-action="ready" data-value="${mine?.ready ? "0" : "1"}">
            ${mine?.ready ? "Je ne suis plus prêt" : esc(u.labels.ready)}<span class="sub">${mine?.ready ? "Annuler" : "Je suis prêt"}</span>
          </button>
        </div>
        <p class="muted" style="font-size:.9rem">La partie démarre toute seule quand tous les joueurs sont prêts (2 minimum). Pas de meneur : personne ne lance à la place des autres.</p>
      </section>
      <section class="panel">
        <h3 style="font-size:1.6rem">Règles de la salle</h3>
        ${rulesSummary()}
        <div style="margin-top:18px"><button class="btn ghost small" data-action="leave">Quitter la salle</button></div>
      </section>
    </div>
  </div>`;
}

function rulesSummary() {
  const c = session.state.config;
  return `<div style="display:grid;gap:8px;margin-top:10px">
    <div><span class="pill">Univers</span> ${uni().name}</div>
    <div><span class="pill">Mode</span> ${E.MODES[c.mode]}</div>
    <div><span class="pill">Budget</span> ${money(c.budget)}</div>
    <div><span class="pill">Équipe</span> ${c.teamSize} persos</div>
    <div><span class="pill">Mise</span> 10 M minimum, +10 M pour surenchérir</div>
  </div>`;
}

function topbar() {
  const s = session.state;
  return `
  <div class="topbar">
    <div>
      <div class="title display">${uni().name} · Le Jeu des Enchères</div>
      <div class="muted" style="font-size:.85rem">${E.MODES[s.config.mode]} · ${s.config.teamSize} persos · ${s.poolCount ?? s.pool?.length ?? ""} persos dans la pioche</div>
    </div>
    <div class="topbar-actions">
      ${session.kind === "online" ? `<span class="pill">Salle ${session.code}</span>` : `<span class="pill">Sur place</span>`}
      <button class="btn ghost small" data-action="howto">Règles</button>
      ${s.phase !== "lobby" ? `<button class="btn ghost small" data-action="quit">Quitter</button>` : ""}
    </div>
  </div>`;
}

// ---------- Partie ----------
function renderGame() {
  const s = session.state;
  return `
  <div class="wrap">
    ${topbar()}
    ${playersStrip()}
    <div class="stage">
      <div>
        ${stageCard()}
        ${auctionInfo()}
      </div>
      <div class="side">
        <section class="panel action-panel">${actionPanel()}</section>
        <section class="panel"><h3 style="font-size:1.4rem">Journal</h3>${logBox()}</section>
      </div>
    </div>
    <h2 style="font-size:2rem;margin:26px 0 10px">Les ${esc(uni().team)}s</h2>
    ${teamsGrid()}
  </div>`;
}

function playersStrip() {
  const s = session.state;
  const c = s.current;
  const turn = s.phase === "bidding" ? c.turnId : s.handId;
  return `<div class="players">
    ${s.players.map((p) => {
      const full = p.team.length >= s.config.teamSize;
      const out = s.phase === "bidding" && !c.inAuction.includes(p.id);
      const tags = [];
      if (s.handId === p.id) tags.push(`<span class="tag hand">a la main</span>`);
      if (c?.highBidder === p.id) tags.push(`<span class="tag high">en tête · ${c.high} M</span>`);
      if (out && !full) tags.push(`<span class="tag">${c.broke && c.drawerId === p.id ? "sans argent" : "a laissé"}</span>`);
      if (full) tags.push(`<span class="tag">équipe complète</span>`);
      if (session.kind === "online" && !p.connected) tags.push(`<span class="tag">hors ligne</span>`);
      if (session.kind === "online" && p.id === s.me) tags.push(`<span class="tag">toi</span>`);
      return `<div class="pcard ${turn === p.id ? "turn" : ""} ${out ? "out" : ""}">
        <div class="name">${esc(p.name)}</div>
        <div class="money">${money(p.money)}</div>
        <div class="muted" style="font-size:.8rem">${p.team.length}/${s.config.teamSize} persos</div>
        <div class="tags">${tags.join("")}</div>
      </div>`;
    }).join("")}
  </div>`;
}

function visibleCharId() {
  const s = session.state;
  const c = s.current;
  if (!c) return null;
  if (session.kind === "online") return c.charId;
  return s.config.mode === "open" || ui.peek ? c.charId : null;
}

function charCard(charId, { price, caption, flip } = {}) {
  const u = uni();
  const ch = charId && findChar(session.state.config.universe, charId);
  if (!ch) {
    return `<div class="char-card mystery ${flip ? "flip" : ""}">
      <div class="ribbon">${esc(u.ribbon)}</div>
      <div class="photo">?</div>
      <div class="cname">${esc(caption || "Perso mystère")}</div>
      <div class="cprice">${price != null ? money(price) : "&nbsp;"}</div>
    </div>`;
  }
  return `<div class="char-card ${flip ? "flip" : ""}">
    <div class="ribbon">${esc(u.ribbon)}</div>
    <div class="photo"><img src="${esc(ch.img)}" alt="${esc(ch.name)}" referrerpolicy="no-referrer"></div>
    <div class="cname">${esc(ch.name)}</div>
    <div class="cprice">${price != null ? money(price) : "&nbsp;"}</div>
  </div>`;
}

function stageCard() {
  const s = session.state;
  if (s.phase === "bidding") {
    const id = visibleCharId();
    const caption = id ? null : (s.config.mode === "open" ? "" : "Perso mystère");
    return charCard(id, { price: s.current.highBidder ? s.current.high : null, caption });
  }
  if (s.lastSale) return charCard(s.lastSale.charId, { price: s.lastSale.free ? null : s.lastSale.price, caption: "Dernier achat" });
  return charCard(null, { caption: "La pioche attend…" });
}

function auctionInfo() {
  const s = session.state;
  const c = s.current;
  if (s.phase !== "bidding") {
    if (!s.lastSale) return "";
    return `<div class="auction-info muted">${s.lastSale.free
      ? `Dernier perso : récupéré gratuitement par ${pname(s.lastSale.winnerId)}`
      : `Dernier achat : ${pname(s.lastSale.winnerId)} pour ${money(s.lastSale.price)}`}</div>`;
  }
  const secret = s.config.mode !== "open";
  return `<div class="auction-info">
    ${c.highBidder
      ? `<div class="muted">Mise actuelle</div><div class="high">${money(c.high)}</div><div>par <b>${pname(c.highBidder)}</b></div>`
      : c.broke
        ? `<div class="muted">${pname(c.drawerId)} n'a plus d'argent : aux autres de miser. Si personne ne mise, il récupère ce perso gratuitement.</div>`
        : `<div class="muted">${pname(c.drawerId)} doit ouvrir l'enchère</div>`}
    ${secret ? `<div class="muted" style="margin-top:6px;font-size:.85rem">Seul ${pname(c.drawerId)} connaît ce perso.</div>` : ""}
    ${c.hint ? `<div class="hint-box"><b>Indice de ${pname(c.drawerId)} :</b> ${esc(c.hint)}</div>` : ""}
  </div>`;
}

function actionPanel() {
  const s = session.state;
  const u = uni();
  const L = u.labels;
  const myId = me();
  const mine = player(myId);
  const c = s.current;
  const who = session.kind === "local" ? `<span class="pill">Au tour de ${pname(myId)}</span>` : "";

  if (s.phase === "draw") {
    const mineHand = s.handId === myId;
    if (!mineHand) return `<h2>En attente</h2><p class="status">${pname(s.handId)} a la main et va tirer un perso.</p>`;
    return `${who}<h2>${session.kind === "local" ? pname(myId) + ", à toi !" : "Tu as la main !"}</h2>
      <p class="status">${E.isBroke(s, mine)
        ? "Tu n'as plus d'argent : tire un perso, les autres pourront miser dessus. Si personne ne mise, il est pour toi, gratuitement."
        : "Tire un perso au hasard dans la pioche. Tu devras ouvrir l'enchère à 10 M minimum."}</p>
      <button class="btn big" data-action="draw">${esc(L.draw)}<span class="sub">Tirer un perso</span></button>`;
  }

  if (s.phase === "bidding") {
    if (!mine || mine.team.length >= s.config.teamSize) {
      return `<h2>Spectateur</h2><p class="status">Ton équipe est complète : tu regardes les autres s'affronter.</p>`;
    }
    const secret = s.config.mode !== "open";
    const drawer = c.drawerId === myId;
    const peekBtn = session.kind === "local" && secret && drawer && !c.highBidder
      ? `<button class="btn ghost small" data-action="peek">${ui.peek ? "Cacher le perso" : `Revoir mon perso (${pname(myId)} seulement)`}</button>` : "";
    if (c.broke && drawer && c.turnId === myId) {
      // Tireur sans argent, mode avec indice : il présente son perso aux autres.
      const key = `offer-${s.history.length}`;
      if (ui.bidKey !== key) { ui.bidKey = key; ui.hint = ""; }
      return `${who}<h2>Présente ton perso</h2>
        <p class="status">Tu n'as plus d'argent : les autres vont miser sur ce perso. Si personne ne mise, il est pour toi, gratuitement.</p>
        <label for="f-hint">Ton indice</label>
        <input id="f-hint" type="text" maxlength="${E.HINT_MAX}" data-field="hint" value="${esc(ui.hint)}" placeholder="Ex. : Il ne sait pas nager">
        <div class="actions"><button class="btn big" data-action="offer">Présenter mon perso<span class="sub">Aux autres de miser</span></button></div>
        <div style="margin-top:10px">${peekBtn}</div>`;
    }
    if (c.turnId !== myId) {
      const out = !c.inAuction.includes(myId);
      const status = c.broke && drawer
        ? "Tu n'as plus d'argent : les autres décident. Si personne ne mise, ce perso est pour toi, gratuitement."
        : out ? "Tu ne participes plus à cette enchère." : "";
      return `<h2>${c.broke && drawer ? "Les autres décident" : out ? "Tu as laissé" : "Patience…"}</h2>
        <p class="status">${status} Au tour de <b>${pname(c.turnId)}</b>${c.highBidder ? "" : " d'ouvrir l'enchère"}.</p>`;
    }
    const opening = !c.highBidder;
    const min = E.minNextBid(s);
    const max = E.maxBid(s, mine);
    if (c.broke && opening && c.inAuction.length === 1) {
      // Face-à-face avec un tireur sans argent : prendre pour la mise minimum, ou lui laisser.
      return `${who}<h2>À toi de choisir</h2>
        <p class="status">${pname(c.drawerId)} n'a plus d'argent. Tu prends ce perso pour <b>${money(min)}</b>, ou tu le lui laisses gratuitement.</p>
        <div class="actions">
          <button class="btn big" data-action="take">Le prendre<span class="sub">Pour ${min} M</span></button>
          <button class="btn big danger" data-action="pass">Le laisser<span class="sub">Gratuit pour ${pname(c.drawerId)}</span></button>
        </div>`;
    }
    const key = `${s.history.length}-${c.bids.length}-${myId}`;
    if (ui.bidKey !== key) { ui.bidKey = key; ui.bid = min; ui.hint = ""; }
    return `${who}<h2>${opening ? "Ouvre l'enchère" : "À toi de jouer"}</h2>
      <p class="status">${opening
        ? (c.broke ? `${pname(c.drawerId)} n'a plus d'argent : mise sur son perso, ou laisse. Si personne ne mise, il le récupère gratuitement.`
          : secret ? "Toi seul sais qui est ce perso. Fais monter les autres… ou pas." : "Fixe la mise de départ.")
        : `Mise actuelle : <b>${money(c.high)}</b> par ${pname(c.highBidder)}.`}
        Ta mise maximum : <b>${money(max)}</b>.</p>
      ${opening && drawer && s.config.mode === "blindHint" ? `
        <label for="f-hint">Ton indice (affiché avec ta mise)</label>
        <input id="f-hint" type="text" maxlength="${E.HINT_MAX}" data-field="hint" value="${esc(ui.hint)}" placeholder="Ex. : Il ne sait pas nager">` : ""}
      <label for="f-bid">Montant (en millions)</label>
      <div class="bid-row"><input id="f-bid" type="number" min="${min}" max="${max}" step="10" data-field="bid" value="${ui.bid}"></div>
      <div class="quick">
        <button class="btn ghost small" data-action="bid-set" data-value="${min}">Min ${min}</button>
        ${[10, 50, 100].map((d) => `<button class="btn ghost small" data-action="bid-add" data-value="${d}">+${d}</button>`).join("")}
        <button class="btn ghost small" data-action="bid-set" data-value="${max}">Tapis ${max}</button>
      </div>
      <div class="actions">
        <button class="btn big" data-action="bid" ${max < min ? "disabled" : ""}>${esc(opening ? L.open : L.raise)}<span class="sub">Miser</span></button>
        ${opening && !c.broke ? "" : `<button class="btn big danger" data-action="pass">${esc(L.pass)}<span class="sub">Laisser</span></button>`}
      </div>
      <div style="margin-top:10px">${peekBtn}</div>`;
  }
  return "";
}

function logBox() {
  const items = [...session.state.log].reverse().slice(0, 25);
  return `<div class="log">${items.map((l) => `<div class="${l.sale ? "sale" : ""}">${esc(l.text)}</div>`).join("")}</div>`;
}

function teamThumbs(p) {
  const s = session.state;
  const slots = [];
  for (let i = 0; i < s.config.teamSize; i++) {
    const t = p.team[i];
    const ch = t && findChar(s.config.universe, t.charId);
    slots.push(ch
      ? `<div class="thumb"><img src="${esc(ch.img)}" alt="${esc(ch.name)}" referrerpolicy="no-referrer" loading="lazy">
          <div>${esc(ch.name)}</div><div class="price">${t.free ? "offert" : `${t.price} M`}</div></div>`
      : `<div class="thumb"><div class="empty"></div></div>`);
  }
  return `<div class="thumbs">${slots.join("")}</div>`;
}

function teamsGrid() {
  return `<div class="teams">${session.state.players.map((p) => `
    <section class="panel team">
      <h3><span>${esc(p.name)}</span><span class="muted" style="font-size:1rem">${p.team.length}/${session.state.config.teamSize}</span></h3>
      ${teamThumbs(p)}
    </section>`).join("")}</div>`;
}

// ---------- Vote et résultats ----------
function renderVote() {
  const s = session.state;
  const u = uni();
  const myId = me();
  const local = session.kind === "local";
  const myVote = local ? null : s.myVote;
  const cast = local ? Object.keys(s.votes).length : s.votesCast.length;
  return `
  <div class="wrap">
    ${topbar()}
    <section class="panel" style="text-align:center;margin-bottom:16px">
      <h2 style="font-size:2.6rem">Place au vote !</h2>
      <p class="muted">${local ? `Vote de <b>${pname(myId)}</b> (les autres ne regardent pas).` : "Vote pour la meilleure équipe, la tienne compte aussi."} ${cast}/${s.players.length} votes.</p>
    </section>
    <div class="teams">${s.players.map((p) => `
      <section class="panel team vote-team ${p.id === myId ? "mine" : ""}">
        <h3><span>${esc(p.name)}</span><span class="muted" style="font-size:1rem">reste ${money(p.money)}</span></h3>
        ${teamThumbs(p)}
        <div style="margin-top:12px">
          <button class="btn ${myVote === p.id ? "" : "ghost"}" data-action="vote" data-value="${p.id}">
            ${myVote === p.id ? "Ton vote ✔" : esc(u.labels.vote)}<span class="sub">${p.id === myId ? (local ? "Voter pour son équipe" : "Voter pour ton équipe") : "Voter"}</span></button>
        </div>
      </section>`).join("")}</div>
  </div>`;
}

function renderEnd() {
  const s = session.state;
  const r = s.results;
  const names = r.winners.map((id) => pname(id)).join(" et ");
  return `
  <div class="wrap">
    ${topbar()}
    <section class="panel" style="text-align:center;margin-bottom:16px">
      <div class="crown">👑</div>
      <h2 style="font-size:2.8rem">${r.winners.length > 1 ? `Égalité : ${names}` : `${names} l'emporte !`}</h2>
      <p class="muted">Résultat du vote des joueurs.</p>
      ${rematchBox()}
    </section>
    <div class="teams">${[...s.players].sort((a, b) => (r.counts[b.id] || 0) - (r.counts[a.id] || 0)).map((p) => `
      <section class="panel team vote-team ${r.winners.includes(p.id) ? "winner" : ""}">
        <h3><span>${r.winners.includes(p.id) ? "👑 " : ""}${esc(p.name)}</span><span class="votes-count">${r.counts[p.id] || 0} vote${(r.counts[p.id] || 0) > 1 ? "s" : ""}</span></h3>
        ${teamThumbs(p)}
        <p class="muted" style="font-size:.85rem;margin-bottom:0">Voté par : ${Object.entries(s.votes).filter(([, t]) => t === p.id).map(([v]) => pname(v)).join(", ") || "personne"}</p>
      </section>`).join("")}</div>
  </div>`;
}

// Rejouer avec les mêmes joueurs et les mêmes règles.
function rematchBox() {
  const s = session.state;
  if (session.kind === "local") {
    return `<div class="actions" style="justify-content:center">
      <button class="btn big" data-action="rematch" data-value="1">Rejouer<span class="sub">Mêmes joueurs, mêmes règles</span></button>
      <button class="btn big ghost" data-action="quit">Accueil<span class="sub">Changer les règles</span></button>
    </div>`;
  }
  const mine = player(s.me);
  const here = s.players.filter((p) => p.connected);
  return `<div class="actions" style="justify-content:center">
      <button class="btn big ${mine?.rematch ? "ghost" : ""}" data-action="rematch" data-value="${mine?.rematch ? "0" : "1"}">
        ${mine?.rematch ? "Je ne rejoue plus" : "Rejouer"}<span class="sub">${mine?.rematch ? "Annuler" : "Mêmes joueurs, mêmes règles"}</span></button>
      <button class="btn big ghost" data-action="quit">Quitter la salle<span class="sub">Retour à l'accueil</span></button>
    </div>
    <p class="muted" style="font-size:.9rem;margin-bottom:0">
      Partants : ${here.map((p) => `${esc(p.name)} ${p.rematch ? "✔" : "(en attente)"}`).join(" · ")}.
      La nouvelle partie démarre quand tout le monde est partant.</p>`;
}

// ---------- Superpositions ----------
function renderOverlay() {
  if (!session?.state || session.state.phase === "lobby") { overlay.innerHTML = ""; return; }
  const s = session.state;
  const u = uni();
  if (!ui.secretFor && overlay.querySelector(".secret-back")) overlay.innerHTML = "";

  // Sur place, mode aveugle : on passe l'appareil au tireur.
  if (session.kind === "local" && ui.secretFor) {
    const c = s.current;
    overlay.innerHTML = `<div class="secret-back"><div class="panel">
      ${ui.peek
        ? `${charCard(c.charId, { flip: true })}
           <p>Mémorise bien ton perso, ${pname(ui.secretFor)}.</p>
           <button class="btn big" data-action="secret-done">J'ai vu, cacher<span class="sub">Revenir au jeu</span></button>`
        : `<h2>Passe l'appareil à ${pname(ui.secretFor)}</h2>
           <p class="muted">Les autres, détournez les yeux ! Seul ${pname(ui.secretFor)} doit voir le perso tiré.</p>
           <button class="btn big" data-action="secret-show">Je suis ${pname(ui.secretFor)}, montrer<span class="sub">Voir le perso</span></button>`}
    </div></div>`;
    return;
  }

  // Révélation après une vente.
  if (s.history.length > ui.seenSales) {
    ui.seenSales = s.history.length;
    const sale = s.lastSale || s.history[s.history.length - 1];
    showReveal(sale.free ? `
      <div class="sold">Personne n'en veut !</div>
      ${charCard(sale.charId, { flip: true })}
      <div class="who"><b>${pname(sale.winnerId)}</b> récupère son perso gratuitement</div>` : `
      <div class="sold">${esc(u.labels.sold)}</div>
      ${charCard(sale.charId, { price: sale.price, flip: true })}
      <div class="who"><b>${pname(sale.winnerId)}</b> remporte le perso pour <b>${money(sale.price)}</b></div>`);
    return;
  }
  if (s.autoFill && !ui.seenAutoFill) {
    ui.seenAutoFill = true;
    const chars = s.autoFill.charIds.map((id) => findChar(s.config.universe, id)).filter(Boolean);
    showReveal(`
      <div class="sold">Dernier en lice !</div>
      <div class="who"><b>${pname(s.autoFill.playerId)}</b> complète gratuitement son équipe avec :</div>
      <div class="thumbs" style="max-width:520px;width:100%">${chars.map((ch) => `<div class="thumb"><img src="${esc(ch.img)}" alt="" referrerpolicy="no-referrer"><div>${esc(ch.name)}</div></div>`).join("")}</div>`, 5000);
  }
}

let revealTimer = null;
function showReveal(html, ms = 3800) {
  overlay.innerHTML = `<div class="reveal-back" data-action="close-reveal">${html}<div class="muted" style="font-size:.8rem">Touche pour continuer</div></div>`;
  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => { if (overlay.querySelector(".reveal-back")) overlay.innerHTML = ""; }, ms);
}

// ---------- Rendu ----------
function render() {
  const focused = document.activeElement;
  const focusId = focused?.id;
  const caret = focused && "selectionStart" in focused ? focused.selectionStart : null;

  const s = session?.state;
  // Sur l'accueil, le thème suit l'univers choisi (neutre pour rejoindre une salle).
  document.body.dataset.theme = s ? s.config.universe : ui.tab === "join" ? "home" : ui.form.universe;
  if (!session) app.innerHTML = renderHome();
  else if (!s) app.innerHTML = `<div class="wrap"><p class="muted">Connexion à la salle…</p></div>`;
  else if (s.phase === "lobby") app.innerHTML = renderLobby();
  else if (s.phase === "vote") app.innerHTML = renderVote();
  else if (s.phase === "end") app.innerHTML = renderEnd();
  else app.innerHTML = renderGame();
  if (s && ui.howto) app.innerHTML += howtoModal();

  if (session?.kind === "online" && s && ui.seenSales === Infinity) {
    ui.seenSales = s.history.length;
    ui.seenAutoFill = !!s.autoFill;
  }
  // Revanche : nouvelle manche, on repart de zéro côté affichage.
  if (s && ui.round != null && s.round !== ui.round) {
    Object.assign(ui, { seenSales: 0, seenAutoFill: false, peek: false, secretFor: null, bidKey: null });
    overlay.innerHTML = "";
    window.scrollTo(0, 0);
  }
  ui.round = s ? s.round : null;
  if (s && !overlay.querySelector(".reveal-back")) renderOverlay();
  else if (session?.kind === "local" && ui.secretFor) renderOverlay();

  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) {
      el.focus();
      try { if (caret != null) el.setSelectionRange(caret, caret); } catch {}
    }
  }
}

// ---------- Événements ----------
document.addEventListener("input", (e) => {
  const el = e.target;
  const field = el.dataset?.field;
  if (!field) return;
  if (field === "localName") ui.form.localNames[Number(el.dataset.index)] = el.value;
  else if (field === "bid") ui.bid = Number(el.value);
  else if (field === "hint") ui.hint = el.value;
  else if (field === "code") ui.form.code = el.value.toUpperCase();
  else ui.form[field] = el.value;
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const field = e.target.dataset?.field;
  if (field === "bid" || field === "hint") document.querySelector('[data-action="bid"], [data-action="offer"]')?.click();
  if (field === "code" || (field === "name" && ui.tab === "join")) document.querySelector('[data-action="join"]')?.click();
});

document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  if (el.dataset.action.startsWith("close") && e.target.closest("[data-stop]") && !e.target.closest("button")) return;
  const a = el.dataset.action;
  const v = el.dataset.value;
  ui.error = "";

  switch (a) {
    case "tab": ui.tab = v; break;
    case "howto": ui.howto = true; break;
    case "close-howto": ui.howto = false; break;
    case "pick": ui.form[el.dataset.key] = v; break;
    case "add-local": ui.form.localNames.push(""); break;
    case "remove-local": ui.form.localNames.splice(Number(el.dataset.index), 1); break;
    case "create": return createRoom();
    case "join": return joinRoom();
    case "start-local": return startLocal();
    case "ready": await emit("ready", v === "1"); return;
    case "leave": await emit("leave"); return leaveToHome();
    case "quit":
      if (session.state.phase === "end" || confirm("Quitter la partie ?")) {
        if (session.kind === "online" && ["lobby", "end"].includes(session.state.phase)) await emit("leave");
        return leaveToHome();
      }
      return;
    case "rematch":
      if (session.kind === "online") { await emit("rematch", v === "1"); return; }
      E.restartGame(session.state);
      break;
    case "copy":
      try { await navigator.clipboard.writeText(v); toast("Lien copié !"); } catch { prompt("Copie ce lien :", v); }
      return;
    case "draw": return act({ type: "draw" });
    case "bid": return act({ type: "bid", amount: ui.bid, hint: ui.hint });
    case "pass": return act({ type: "pass" });
    case "offer": return act({ type: "offer", hint: ui.hint });
    case "take": return act({ type: "bid", amount: E.minNextBid(session.state) });
    case "vote": return act({ type: "vote", targetId: v });
    case "bid-set": ui.bid = Number(v); break;
    case "bid-add": ui.bid = Math.max(Number(ui.bid) || 0, E.minNextBid(session.state) - Number(v)) + Number(v); break;
    case "peek": ui.peek = !ui.peek; break;
    case "secret-show": ui.peek = true; break;
    case "secret-done": ui.peek = false; ui.secretFor = null; break;
    case "close-reveal": overlay.innerHTML = ""; break;
  }
  render();
});

function readRules() {
  const f = ui.form;
  return { universe: f.universe, mode: f.mode, budget: Number(f.budget), teamSize: Number(f.teamSize) };
}

function rememberName() {
  try { localStorage.setItem("jde:name", ui.form.name.trim()); } catch {}
}

async function createRoom() {
  if (!ui.form.name.trim()) { ui.error = "Choisis un pseudo."; return render(); }
  try {
    E.normalizeConfig(readRules(), UNIVERSES[ui.form.universe].chars.length);
    rememberName();
    ui.seenSales = Infinity; // fixé au premier état reçu
    session = { kind: "online", code: null, state: null };
    const res = await emit("create", { name: ui.form.name, config: readRules() });
    if (res?.error) { session = null; ui.error = res.error; return render(); }
    enterOnline(res);
    render();
  } catch (err) {
    session = null;
    ui.error = err.message;
    render();
  }
}

async function joinRoom() {
  const code = ui.form.code.trim().toUpperCase();
  if (!code) { ui.error = "Entre le code de la salle."; return render(); }
  const saved = stored(code);
  if (!ui.form.name.trim() && !saved) { ui.error = "Choisis un pseudo."; return render(); }
  try {
    rememberName();
    ui.seenSales = Infinity; // fixé au premier état reçu
    session = { kind: "online", code, state: null };
    const res = await emit("join", { code, name: ui.form.name, token: saved?.token });
    if (res?.error) { session = null; ui.error = res.error; return render(); }
    enterOnline(res);
    render();
  } catch (err) {
    session = null;
    ui.error = err.message;
    render();
  }
}

function startLocal() {
  try {
    const names = ui.form.localNames.map((n) => n.trim());
    if (names.some((n) => !n)) throw new E.GameError("Donne un nom à chaque joueur.");
    const u = UNIVERSES[ui.form.universe];
    const cfg = E.normalizeConfig(readRules(), u.chars.length);
    const state = E.createGame(cfg, u.chars.map((c) => c.id));
    names.forEach((n, i) => E.addPlayer(state, `local-${i}`, n));
    E.startGame(state);
    session = { kind: "local", state };
    Object.assign(ui, { seenSales: 0, seenAutoFill: false, peek: false, secretFor: null, bidKey: null });
    render();
    window.scrollTo(0, 0);
  } catch (err) {
    ui.error = err.message;
    render();
  }
}

// Reprise automatique d'une salle en ligne après un rechargement de page.
window.addEventListener("load", () => {
  const code = ui.form.code.toUpperCase();
  if (code && stored(code)) joinRoom();
});

render();
