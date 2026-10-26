import express from "express";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Server } from "socket.io";
import { UNIVERSES } from "../shared/catalog.js";
import {
  GameError, normalizeConfig, createGame, addPlayer, removePlayer,
  setReady, applyAction, getPlayer, viewFor,
} from "../shared/engine.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const app = express();
app.use(express.static(path.join(root, "public")));
app.use("/shared", express.static(path.join(root, "shared")));
app.get("/healthz", (_req, res) => res.send("ok"));

const http = createServer(app);
const io = new Server(http);

// code -> { state, tokens: Map(token -> playerId), touched }
const rooms = new Map();
const LOBBY_GRACE_MS = 20_000;
const ROOM_IDLE_MS = 3 * 60 * 60 * 1000;

function newCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code;
  do {
    code = Array.from(randomBytes(5), (b) => letters[b % letters.length]).join("");
  } while (rooms.has(code));
  return code;
}

async function broadcast(code) {
  const room = rooms.get(code);
  if (!room) return;
  room.touched = Date.now();
  for (const s of await io.in(code).fetchSockets()) {
    s.emit("state", viewFor(room.state, s.data.playerId));
  }
}

function guard(ack, fn) {
  try {
    const result = fn();
    if (typeof ack === "function") ack({ ok: true, ...result });
  } catch (err) {
    if (!(err instanceof GameError)) console.error(err);
    if (typeof ack === "function") ack({ error: err instanceof GameError ? err.message : "Erreur du serveur." });
  }
}

function attach(socket, code, playerId) {
  socket.data.code = code;
  socket.data.playerId = playerId;
  socket.join(code);
}

io.on("connection", (socket) => {
  socket.on("create", ({ name, config } = {}, ack) => guard(ack, () => {
    const universe = UNIVERSES[config?.universe];
    if (!universe) throw new GameError("Choisis un univers.");
    const cfg = normalizeConfig(config, universe.chars.length);
    const code = newCode();
    const state = createGame(cfg, universe.chars.map((c) => c.id));
    const playerId = randomUUID();
    addPlayer(state, playerId, name);
    const token = randomUUID();
    rooms.set(code, { state, tokens: new Map([[token, playerId]]), touched: Date.now() });
    attach(socket, code, playerId);
    broadcast(code);
    return { code, token, playerId };
  }));

  socket.on("join", ({ code, name, token } = {}, ack) => guard(ack, () => {
    code = String(code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) throw new GameError("Aucune salle avec ce code.");
    let playerId = token && room.tokens.get(token);
    if (playerId && getPlayer(room.state, playerId)) {
      getPlayer(room.state, playerId).connected = true;
    } else {
      playerId = randomUUID();
      addPlayer(room.state, playerId, name);
      token = randomUUID();
      room.tokens.set(token, playerId);
    }
    attach(socket, code, playerId);
    broadcast(code);
    return { code, token, playerId };
  }));

  socket.on("ready", (ready, ack) => withRoom(ack, (room) => setReady(room.state, socket.data.playerId, ready)));
  socket.on("action", (action, ack) => withRoom(ack, (room) => applyAction(room.state, socket.data.playerId, action)));

  socket.on("leave", (_arg, ack) => withRoom(ack, (room) => {
    removePlayer(room.state, socket.data.playerId);
    socket.leave(socket.data.code);
  }));

  socket.on("disconnect", () => {
    const { code, playerId } = socket.data;
    const room = rooms.get(code);
    const p = room && getPlayer(room.state, playerId);
    if (!p) return;
    p.connected = false;
    broadcast(code);
    if (room.state.phase === "lobby") {
      setTimeout(() => {
        if (!p.connected && room.state.phase === "lobby") {
          removePlayer(room.state, playerId);
          broadcast(code);
        }
      }, LOBBY_GRACE_MS);
    }
  });

  function withRoom(ack, fn) {
    const code = socket.data.code;
    const room = rooms.get(code);
    guard(ack, () => {
      if (!room) throw new GameError("Tu n'es dans aucune salle.");
      fn(room);
      broadcast(code);
    });
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const someoneHere = room.state.players.some((p) => p.connected);
    if (!someoneHere && now - room.touched > 30 * 60 * 1000) rooms.delete(code);
    else if (now - room.touched > ROOM_IDLE_MS) rooms.delete(code);
  }
}, 5 * 60 * 1000).unref();

const port = Number(process.env.PORT) || 3000;
http.listen(port, () => console.log(`Le jeu des enchères tourne sur http://localhost:${port}`));
