// Moteur du jeu des enchères : logique pure, utilisée par le serveur (salles en ligne)
// et par le navigateur (mode Sur place). Les montants sont exprimés en millions.

import { UNIVERSES } from "./catalog.js";

export const MODES = {
  open: "Tout le monde voit",
  blindHint: "À l'aveugle avec indice",
  blind: "À l'aveugle sans indice",
};

export const MAX_PLAYERS = 4;
export const HINT_MAX = 80;

export class GameError extends Error {}

const fail = (msg) => { throw new GameError(msg); };

export function normalizeConfig(raw, poolSize) {
  const cfg = {
    universe: String(raw.universe || ""),
    mode: MODES[raw.mode] ? raw.mode : "open",
    budget: Math.round(Number(raw.budget) || 1000),
    teamSize: Math.round(Number(raw.teamSize) || 5),
    minBid: 10,
    step: 10,
  };
  if (cfg.teamSize < 1 || cfg.teamSize > 11) fail("La taille d'équipe doit être entre 1 et 11.");
  if (cfg.budget < cfg.minBid * cfg.teamSize) fail(`Le budget doit être d'au moins ${cfg.minBid * cfg.teamSize} M pour ${cfg.teamSize} persos.`);
  if (cfg.budget > 100000) fail("Budget trop élevé (100 000 M maximum).");
  if (poolSize !== undefined && cfg.teamSize * MAX_PLAYERS > poolSize) fail("Pas assez de persos dans le catalogue pour cette taille d'équipe.");
  return cfg;
}

export function createGame(config, charIds) {
  return {
    config,
    phase: "lobby",
    round: 1,
    players: [],
    allIds: [...charIds],
    pool: [...charIds],
    handId: null,
    current: null,
    lastSale: null,
    history: [],
    votes: {},
    log: [],
  };
}

export function addPlayer(state, id, name) {
  if (state.phase !== "lobby") fail("La partie a déjà commencé.");
  if (state.players.length >= MAX_PLAYERS) fail("La salle est pleine (4 joueurs maximum).");
  name = String(name || "").trim().slice(0, 16);
  if (!name) fail("Choisis un pseudo.");
  if (state.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) fail("Ce pseudo est déjà pris dans la salle.");
  const player = { id, name, money: state.config.budget, team: [], ready: false, connected: true };
  state.players.push(player);
  pushLog(state, `${name} rejoint la salle.`);
  return player;
}

// On ne quitte vraiment la salle qu'avant ou après une partie (sinon on reste inscrit et on peut revenir).
export function removePlayer(state, id, rng = Math.random) {
  if (state.phase !== "lobby" && state.phase !== "end") return;
  const p = getPlayer(state, id);
  state.players = state.players.filter((x) => x.id !== id);
  if (p) pushLog(state, `${p.name} quitte la salle.`);
  if (state.phase === "end") maybeRematch(state, rng);
}

// Revanche : chacun dit s'il veut rejouer, et dans quel univers. Pas de meneur : la nouvelle
// partie démarre quand tous les joueurs connectés (2 minimum) sont partants.
export function wantRematch(state, id, want = true, rng = Math.random) {
  if (state.phase !== "end") fail("La partie n'est pas terminée.");
  const p = getPlayer(state, id) || fail("Joueur inconnu.");
  if (want === true) want = state.config.universe;
  if (want && typeof want !== "string") fail("Univers inconnu.");
  if (want && want !== state.config.universe && !Object.hasOwn(UNIVERSES, want)) fail("Univers inconnu.");
  p.rematch = want || false;
  maybeRematch(state, rng);
}

export function maybeRematch(state, rng = Math.random) {
  if (state.phase !== "end") return;
  const here = state.players.filter((x) => x.connected !== false);
  if (here.length < 2 || !here.every((x) => x.rematch)) return;
  restartGame(state, rng, rematchUniverse(state, here, rng));
}

// L'univers le plus demandé ; en cas d'égalité, on garde l'actuel s'il en fait partie, sinon tirage au sort.
function rematchUniverse(state, here, rng) {
  const counts = {};
  for (const p of here) counts[p.rematch] = (counts[p.rematch] || 0) + 1;
  const best = Math.max(...Object.values(counts));
  const top = Object.keys(counts).filter((u) => counts[u] === best);
  if (top.includes(state.config.universe)) return state.config.universe;
  return top[Math.floor(rng() * top.length)];
}

// Nouvelle partie avec les mêmes règles et les joueurs présents, dans le même univers ou un autre.
export function restartGame(state, rng = Math.random, universe = state.config.universe) {
  const same = universe === state.config.universe;
  const ids = same ? state.allIds : (UNIVERSES[universe] || fail("Univers inconnu.")).chars.map((c) => c.id);
  state.players = state.players.filter((x) => x.connected !== false);
  for (const p of state.players) Object.assign(p, { money: state.config.budget, team: [], rematch: false, ready: true });
  Object.assign(state, {
    config: { ...state.config, universe },
    round: state.round + 1,
    allIds: [...ids],
    pool: [...ids],
    current: null,
    lastSale: null,
    history: [],
    votes: {},
    results: null,
    autoFill: null,
    log: [],
  });
  pushLog(state, same ? "Revanche ! Nouvelle partie avec les mêmes joueurs."
    : `Revanche ! Nouvelle partie avec les mêmes joueurs, cette fois dans ${UNIVERSES[universe].name}.`);
  startGame(state, rng);
}

// Pas de meneur : la partie démarre quand tous les joueurs (2 minimum) sont prêts.
export function setReady(state, id, ready, rng = Math.random) {
  if (state.phase !== "lobby") return;
  const p = getPlayer(state, id) || fail("Joueur inconnu.");
  p.ready = !!ready;
  if (state.players.length >= 2 && state.players.every((x) => x.ready)) startGame(state, rng);
}

export function startGame(state, rng = Math.random) {
  if (state.players.length < 2) fail("Il faut au moins 2 joueurs.");
  shuffle(state.pool, rng);
  const first = state.players[Math.floor(rng() * state.players.length)];
  state.handId = first.id;
  state.phase = "draw";
  pushLog(state, `Le sort a parlé : ${first.name} a la main.`);
}

export const getPlayer = (state, id) => state.players.find((p) => p.id === id);
export const slotsLeft = (state, p) => state.config.teamSize - p.team.length;
export const isFull = (state, p) => slotsLeft(state, p) <= 0;

// Pas de réserve : on peut miser tout son argent.
export const maxBid = (state, p) => p.money;
// Sans argent : plus de quoi payer la mise minimum.
export const isBroke = (state, p) => p.money < state.config.minBid;

export function minNextBid(state) {
  const c = state.current;
  return c && c.highBidder ? c.high + state.config.step : state.config.minBid;
}

export function applyAction(state, playerId, action, rng = Math.random) {
  const p = getPlayer(state, playerId) || fail("Joueur inconnu.");
  switch (action && action.type) {
    case "draw": return draw(state, p);
    case "bid": return bid(state, p, action.amount, action.hint);
    case "pass": return pass(state, p);
    case "offer": return offer(state, p, action.hint);
    case "vote": return vote(state, p, action.targetId);
    default: fail("Action inconnue.");
  }
}

function draw(state, p) {
  if (state.phase !== "draw") fail("Ce n'est pas le moment de tirer.");
  if (state.handId !== p.id) fail("Ce n'est pas toi qui as la main.");
  const charId = state.pool.pop();
  // Tireur sans argent : seuls les autres misent. Si personne ne mise, le perso lui revient gratuitement.
  const broke = isBroke(state, p);
  state.current = {
    charId,
    drawerId: p.id,
    broke,
    hint: null,
    high: 0,
    highBidder: null,
    inAuction: state.players.filter((x) => !isFull(state, x) && !(broke && x.id === p.id)).map((x) => x.id),
    turnId: p.id,
    bids: [],
  };
  state.phase = "bidding";
  pushLog(state, `${p.name} tire un perso.`);
  if (broke) {
    pushLog(state, `${p.name} n'a plus d'argent : les autres peuvent miser sur son perso.`);
    // Avec indice, le tireur présente d'abord son perso (action "offer").
    if (state.config.mode !== "blindHint") advance(state);
  }
}

function offer(state, p, hint) {
  const c = state.current;
  if (state.phase !== "bidding" || !c || !c.broke || c.drawerId !== p.id || c.turnId !== p.id) {
    fail("Ce n'est pas le moment de présenter ton perso.");
  }
  c.hint = String(hint || "").trim().slice(0, HINT_MAX) || null;
  advance(state);
}

function bid(state, p, amount, hint) {
  const c = state.current;
  if (state.phase !== "bidding" || !c) fail("Aucune enchère en cours.");
  if (c.turnId !== p.id) fail("Ce n'est pas ton tour.");
  amount = Math.round(Number(amount));
  if (!Number.isFinite(amount)) fail("Montant invalide.");
  const min = minNextBid(state);
  // Face-à-face avec un tireur sans argent : on prend le perso pour la mise minimum.
  if (c.broke && !c.highBidder && c.inAuction.length === 1) amount = min;
  if (amount < min) fail(`La mise doit être d'au moins ${min} M.`);
  if (amount > maxBid(state, p)) fail(`Tu ne peux pas miser plus de ${maxBid(state, p)} M.`);
  if (!c.highBidder && p.id === c.drawerId && state.config.mode === "blindHint") {
    const h = String(hint || "").trim().slice(0, HINT_MAX);
    c.hint = h || null;
  }
  c.high = amount;
  c.highBidder = p.id;
  c.bids.push({ playerId: p.id, amount });
  pushLog(state, `${p.name} mise ${amount} M.`);
  advance(state);
}

function pass(state, p) {
  const c = state.current;
  if (state.phase !== "bidding" || !c) fail("Aucune enchère en cours.");
  if (c.turnId !== p.id) fail("Ce n'est pas ton tour.");
  if (!c.highBidder && !c.broke) fail("Celui qui a la main doit ouvrir l'enchère.");
  c.inAuction = c.inAuction.filter((id) => id !== p.id);
  pushLog(state, `${p.name} laisse.`);
  advance(state);
}

function advance(state) {
  const c = state.current;
  const order = state.players.map((x) => x.id);
  let idx = order.indexOf(c.turnId);
  for (let guard = 0; guard < order.length * 2; guard++) {
    // Ceux qui ne peuvent plus suivre laissent automatiquement.
    for (const id of [...c.inAuction]) {
      const pl = getPlayer(state, id);
      if (id !== c.highBidder && maxBid(state, pl) < minNextBid(state)) {
        c.inAuction = c.inAuction.filter((x) => x !== id);
        pushLog(state, `${pl.name} n'a plus les moyens de suivre.`);
      }
    }
    const done = c.highBidder ? c.inAuction.every((id) => id === c.highBidder) : c.inAuction.length === 0;
    if (done) return resolve(state);
    idx = (idx + 1) % order.length;
    const id = order[idx];
    if (c.inAuction.includes(id) && id !== c.highBidder) { c.turnId = id; return; }
  }
  resolve(state);
}

function resolve(state) {
  const c = state.current;
  // Personne n'a misé (tireur sans argent) : le perso revient gratuitement au tireur.
  const free = !c.highBidder;
  const winner = getPlayer(state, free ? c.drawerId : c.highBidder);
  const price = free ? 0 : c.high;
  winner.money -= price;
  winner.team.push(free ? { charId: c.charId, price, free } : { charId: c.charId, price });
  const sale = { charId: c.charId, winnerId: winner.id, price, free, drawerId: c.drawerId, hint: c.hint };
  state.history.push(sale);
  state.lastSale = sale;
  state.current = null;
  pushLog(state, free
    ? `Personne n'en veut : ${winner.name} récupère son perso gratuitement.`
    : `${winner.name} remporte le perso pour ${price} M !`, { sale: true });
  passHand(state, c.drawerId);
}

function passHand(state, fromId) {
  const remaining = state.players.filter((x) => !isFull(state, x));
  if (remaining.length === 0) return startVote(state);
  if (remaining.length === 1) {
    const last = remaining[0];
    const gifts = [];
    while (!isFull(state, last) && state.pool.length) {
      const charId = state.pool.pop();
      last.team.push({ charId, price: 0, free: true });
      gifts.push(charId);
    }
    state.lastSale = null;
    state.autoFill = { playerId: last.id, charIds: gifts };
    pushLog(state, `${last.name} est le dernier en lice et complète son équipe avec ${gifts.length} perso(s) tiré(s) au hasard.`);
    return startVote(state);
  }
  const order = state.players.map((x) => x.id);
  let idx = order.indexOf(fromId);
  for (let i = 0; i < order.length; i++) {
    idx = (idx + 1) % order.length;
    const pl = getPlayer(state, order[idx]);
    if (!isFull(state, pl)) {
      state.handId = pl.id;
      state.phase = "draw";
      pushLog(state, `${pl.name} a la main.`);
      return;
    }
  }
}

function startVote(state) {
  state.phase = "vote";
  state.handId = null;
  pushLog(state, "Toutes les équipes sont complètes : place au vote !");
}

function vote(state, p, targetId) {
  if (state.phase !== "vote") fail("Le vote n'est pas ouvert.");
  if (!getPlayer(state, targetId)) fail("Équipe inconnue.");
  state.votes[p.id] = targetId;
  if (state.players.every((x) => state.votes[x.id])) {
    state.phase = "end";
    const counts = {};
    for (const t of Object.values(state.votes)) counts[t] = (counts[t] || 0) + 1;
    const best = Math.max(...Object.values(counts));
    state.results = {
      counts,
      winners: state.players.filter((x) => counts[x.id] === best).map((x) => x.id),
    };
    pushLog(state, "Le vote est terminé !");
  }
}

// Vue envoyée à un joueur : le perso tiré reste caché en mode aveugle,
// sauf pour celui qui l'a tiré.
export function viewFor(state, playerId) {
  const v = JSON.parse(JSON.stringify(state));
  v.poolCount = v.pool.length;
  delete v.pool;
  delete v.allIds;
  if (v.current && v.config.mode !== "open" && v.current.drawerId !== playerId) v.current.charId = null;
  if (v.phase !== "end") {
    v.votesCast = Object.keys(v.votes);
    v.myVote = v.votes[playerId] || null;
    v.votes = {};
  }
  v.me = playerId;
  return v;
}

function pushLog(state, text, extra = {}) {
  state.log.push({ t: Date.now(), text, ...extra });
  if (state.log.length > 60) state.log.shift();
}

export function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
