import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame, addPlayer, setReady, applyAction, normalizeConfig, viewFor, maxBid, GameError,
  wantRematch, removePlayer, maybeRematch,
} from "../shared/engine.js";

const ids = Array.from({ length: 60 }, (_, i) => `c${i}`);

function setup(n = 3, cfg = {}) {
  const s = createGame(normalizeConfig({ universe: "x", mode: "open", budget: 100, teamSize: 2, ...cfg }), ids);
  for (let i = 0; i < n; i++) addPlayer(s, `p${i}`, `Joueur${i}`);
  // rng = 0 : la main va au premier joueur
  for (let i = 0; i < n; i++) setReady(s, `p${i}`, true, () => 0);
  return s;
}

test("la partie démarre quand tout le monde est prêt", () => {
  const s = setup(3);
  assert.equal(s.phase, "draw");
  assert.equal(s.handId, "p0");
});

test("personne ne peut miser avant celui qui a la main, et il ne peut pas laisser", () => {
  const s = setup(3);
  applyAction(s, "p0", { type: "draw" });
  assert.throws(() => applyAction(s, "p1", { type: "bid", amount: 20 }), GameError);
  assert.throws(() => applyAction(s, "p0", { type: "pass" }), GameError);
  assert.throws(() => applyAction(s, "p0", { type: "bid", amount: 5 }), GameError);
  applyAction(s, "p0", { type: "bid", amount: 10 });
  assert.equal(s.current.turnId, "p1");
});

test("tour par tour : le dernier en lice gagne, la main passe au suivant", () => {
  const s = setup(3);
  applyAction(s, "p0", { type: "draw" });
  applyAction(s, "p0", { type: "bid", amount: 10 });
  assert.throws(() => applyAction(s, "p1", { type: "bid", amount: 15 }), GameError); // +10 minimum
  applyAction(s, "p1", { type: "bid", amount: 20 });
  applyAction(s, "p2", { type: "pass" });
  assert.equal(s.current.turnId, "p0");
  applyAction(s, "p0", { type: "pass" });
  assert.equal(s.phase, "draw");
  assert.equal(s.players[1].money, 80);
  assert.equal(s.players[1].team.length, 1);
  assert.equal(s.handId, "p1");
});

test("si tout le monde laisse, celui qui a la main gagne à sa mise", () => {
  const s = setup(3);
  applyAction(s, "p0", { type: "draw" });
  applyAction(s, "p0", { type: "bid", amount: 30 });
  applyAction(s, "p1", { type: "pass" });
  applyAction(s, "p2", { type: "pass" });
  assert.equal(s.players[0].money, 70);
  assert.equal(s.lastSale.winnerId, "p0");
});

test("pas de limite : on peut miser tout son argent", () => {
  const s = setup(2);
  assert.equal(maxBid(s, s.players[0]), 100);
  applyAction(s, "p0", { type: "draw" });
  assert.throws(() => applyAction(s, "p0", { type: "bid", amount: 110 }), GameError);
  applyAction(s, "p0", { type: "bid", amount: 100 });
  // p1 n'a pas de quoi surenchérir : p0 gagne directement.
  assert.equal(s.players[0].money, 0);
  assert.equal(s.lastSale.winnerId, "p0");
});

// Vide le porte-monnaie d'un joueur.
function broke(s, who) {
  const p = s.players.find((x) => x.id === who);
  p.money = 0;
}

test("face-à-face, tireur sans argent : l'adversaire le prend pour 10 M", () => {
  const s = setup(2, { teamSize: 3 });
  broke(s, "p0");
  applyAction(s, "p0", { type: "draw" });
  assert.equal(s.current.turnId, "p1");
  assert.throws(() => applyAction(s, "p0", { type: "bid", amount: 10 }), GameError);
  applyAction(s, "p1", { type: "bid", amount: 80 }); // ramené à 10 M
  assert.equal(s.lastSale.winnerId, "p1");
  assert.equal(s.lastSale.price, 10);
  assert.equal(s.players[1].money, 90);
});

test("face-à-face, tireur sans argent : l'adversaire le lui laisse gratuitement", () => {
  const s = setup(2, { teamSize: 3 });
  broke(s, "p0");
  applyAction(s, "p0", { type: "draw" });
  applyAction(s, "p1", { type: "pass" });
  assert.equal(s.lastSale.winnerId, "p0");
  assert.ok(s.lastSale.free);
  assert.deepEqual(s.players[0].team[0], { charId: s.lastSale.charId, price: 0, free: true });
  assert.equal(s.handId, "p1");
});

test("à plusieurs, tireur sans argent : les autres misent, sinon il le récupère", () => {
  const s = setup(3, { teamSize: 3 });
  broke(s, "p0");
  applyAction(s, "p0", { type: "draw" });
  assert.equal(s.current.turnId, "p1");
  applyAction(s, "p1", { type: "pass" });
  applyAction(s, "p2", { type: "bid", amount: 30 });
  // p1 a laissé : p2 se retrouve en face-à-face et prend le perso pour 10 M.
  assert.equal(s.lastSale.winnerId, "p2");
  assert.equal(s.players[2].money, 90);

  s.handId = "p0"; s.phase = "draw";
  applyAction(s, "p0", { type: "draw" });
  applyAction(s, "p1", { type: "bid", amount: 20 });
  applyAction(s, "p2", { type: "bid", amount: 40 });
  applyAction(s, "p1", { type: "pass" });
  assert.equal(s.lastSale.winnerId, "p2");
  assert.equal(s.lastSale.price, 40);

  s.handId = "p0"; s.phase = "draw";
  applyAction(s, "p0", { type: "draw" });
  applyAction(s, "p1", { type: "pass" });
  applyAction(s, "p2", { type: "pass" });
  assert.equal(s.lastSale.winnerId, "p0");
  assert.ok(s.lastSale.free);
});

test("tireur sans argent, mode indice : il présente son perso avec un indice", () => {
  const s = setup(3, { mode: "blindHint", teamSize: 3 });
  broke(s, "p0");
  applyAction(s, "p0", { type: "draw" });
  assert.equal(s.current.turnId, "p0");
  assert.throws(() => applyAction(s, "p1", { type: "bid", amount: 10 }), GameError);
  applyAction(s, "p0", { type: "offer", hint: "Il vole" });
  assert.equal(s.current.turnId, "p1");
  applyAction(s, "p1", { type: "bid", amount: 10, hint: "ignoré" });
  assert.equal(viewFor(s, "p2").current.hint, "Il vole");
  assert.equal(viewFor(s, "p2").current.charId, null);
});

test("personne n'a d'argent : le tireur récupère son perso", () => {
  const s = setup(2, { teamSize: 3 });
  broke(s, "p0"); broke(s, "p1");
  applyAction(s, "p0", { type: "draw" });
  assert.equal(s.lastSale.winnerId, "p0");
  assert.ok(s.lastSale.free);
});

test("mode aveugle : seul le tireur voit le perso, l'indice s'affiche à l'ouverture", () => {
  const s = setup(2, { mode: "blindHint" });
  applyAction(s, "p0", { type: "draw" });
  assert.ok(viewFor(s, "p0").current.charId);
  assert.equal(viewFor(s, "p1").current.charId, null);
  applyAction(s, "p0", { type: "bid", amount: 10, hint: "Il a un chapeau" });
  assert.equal(viewFor(s, "p1").current.hint, "Il a un chapeau");
  applyAction(s, "p1", { type: "pass" });
  assert.ok(viewFor(s, "p1").lastSale.charId);
});

test("équipe complète : plus de main ; dernier joueur complété gratuitement ; vote", () => {
  const s = setup(3, { teamSize: 2 });
  const buy = (who) => {
    applyAction(s, s.handId, { type: "draw" });
    applyAction(s, s.handId, { type: "bid", amount: 10 });
    while (s.phase === "bidding") {
      const t = s.current.turnId;
      if (t === who) applyAction(s, t, { type: "bid", amount: s.current.high + 10 });
      else applyAction(s, t, { type: "pass" });
    }
  };
  buy("p1"); buy("p1"); // p1 complet
  assert.ok(s.players.every((p) => p.id !== s.handId || p.id !== "p1"));
  buy("p2"); buy("p2"); // p2 complet -> p0 seul restant
  assert.equal(s.phase, "vote");
  assert.equal(s.players[0].team.length, 2);
  assert.ok(s.players[0].team.every((t) => t.free));
  applyAction(s, "p0", { type: "vote", targetId: "p1" });
  applyAction(s, "p1", { type: "vote", targetId: "p1" }); // on peut voter pour soi
  applyAction(s, "p2", { type: "vote", targetId: "p2" });
  assert.equal(s.phase, "end");
  assert.deepEqual(s.results.winners, ["p1"]);
});

// Joue une partie complète (chacun prend le perso qu'il tire) jusqu'à l'écran de fin.
function playToEnd(s) {
  while (s.phase === "draw" || s.phase === "bidding") {
    if (s.phase === "draw") applyAction(s, s.handId, { type: "draw" });
    else if (!s.current.highBidder) applyAction(s, s.current.turnId, { type: "bid", amount: 10 });
    else applyAction(s, s.current.turnId, { type: "pass" });
  }
  for (const p of s.players) applyAction(s, p.id, { type: "vote", targetId: p.id });
}

test("revanche : elle démarre quand tout le monde est partant", () => {
  const s = setup(3);
  playToEnd(s);
  assert.equal(s.phase, "end");
  wantRematch(s, "p0", true);
  wantRematch(s, "p1", true);
  assert.equal(s.phase, "end");
  wantRematch(s, "p2", true);
  assert.equal(s.phase, "draw");
  assert.equal(s.round, 2);
  assert.equal(s.pool.length, ids.length);
  assert.ok(s.players.every((p) => p.money === 100 && p.team.length === 0 && !p.rematch));
  assert.equal(s.history.length, 0);
  assert.equal(viewFor(s, "p0").allIds, undefined);
});

test("revanche : ceux qui partent ou se déconnectent ne bloquent pas les autres", () => {
  const s = setup(3);
  playToEnd(s);
  wantRematch(s, "p0", true);
  wantRematch(s, "p1", true);
  removePlayer(s, "p2");
  assert.equal(s.phase, "draw");
  assert.deepEqual(s.players.map((p) => p.id), ["p0", "p1"]);

  const t = setup(3);
  playToEnd(t);
  wantRematch(t, "p0", true);
  wantRematch(t, "p1", true);
  t.players[2].connected = false;
  maybeRematch(t);
  assert.equal(t.phase, "draw");
  assert.equal(t.players.length, 2);
});

test("revanche : il faut être au moins 2", () => {
  const s = setup(2);
  playToEnd(s);
  wantRematch(s, "p0", true);
  removePlayer(s, "p1");
  assert.equal(s.phase, "end");
  assert.throws(() => applyAction(s, "p0", { type: "draw" }), GameError);
});

test("revanche : on peut changer d'univers, le plus choisi l'emporte", () => {
  const s = setup(3);
  playToEnd(s);
  assert.throws(() => wantRematch(s, "p0", "__proto__"), GameError);
  assert.throws(() => wantRematch(s, "p0", "inconnu"), GameError);
  wantRematch(s, "p0", "naruto");
  wantRematch(s, "p1", "naruto");
  wantRematch(s, "p2", true); // même univers
  assert.equal(s.phase, "draw");
  assert.equal(s.config.universe, "naruto");
  assert.ok(s.pool.length > 50 && s.pool.every((id) => !ids.includes(id)));
  assert.ok(s.players.every((p) => p.money === 100 && !p.rematch));
});

test("revanche : égalité entre univers, on garde l'actuel s'il est parmi les favoris", () => {
  const s = setup(2);
  playToEnd(s);
  wantRematch(s, "p0", "jjk");
  wantRematch(s, "p1", true);
  assert.equal(s.config.universe, "x");
  assert.equal(s.pool.length, ids.length);

  const t = setup(2);
  playToEnd(t);
  wantRematch(t, "p0", "jjk");
  wantRematch(t, "p1", "mha", () => 0.99);
  assert.ok(["jjk", "mha"].includes(t.config.universe));
});
