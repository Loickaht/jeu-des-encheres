import { CHARACTERS } from "./characters.js";

// Chaque univers : nom, monnaie, ambiance et noms des boutons.
// Le petit texte « sub » rappelle l'action sous le nom stylé.
export const UNIVERSES = {
  onepiece: {
    name: "One Piece",
    currency: "฿",
    tile: "linear-gradient(135deg, #8f2420, #c9413a)",
    ribbon: "WANTED",
    cardSub: "DEAD OR ALIVE",
    team: "Équipage",
    labels: {
      draw: "Hisser le pavillon",
      vote: "Rejoindre cet équipage",
      sold: "Recruté dans l'équipage !",
      ready: "Prêt à lever l'ancre",
    },
    chars: CHARACTERS.onepiece,
  },
  naruto: {
    name: "Naruto",
    currency: "Ryō",
    tile: "linear-gradient(135deg, #b54c0a, #e8742a)",
    ribbon: "忍",
    team: "Escouade",
    labels: {
      draw: "Kuchiyose no jutsu !",
      vote: "Désigner le futur Hokage",
      sold: "Mission accomplie !",
      ready: "Bandeau noué, prêt",
    },
    chars: CHARACTERS.naruto,
  },
  dragonball: {
    name: "Dragon Ball",
    currency: "Zénis",
    tile: "linear-gradient(135deg, #c27c00, #eeaa2a)",
    ribbon: "Z",
    team: "Escouade Z",
    labels: {
      draw: "Ouvrir une capsule",
      vote: "Couronner ce champion",
      sold: "Fusion réussie !",
      ready: "Ki chargé, prêt",
    },
    chars: CHARACTERS.dragonball,
  },
  mha: {
    name: "My Hero Academia",
    currency: "¥",
    tile: "linear-gradient(135deg, #176b40, #2a9d60)",
    ribbon: "U.A.",
    team: "Agence",
    labels: {
      draw: "Repérer un talent",
      vote: "Élire le héros n°1",
      sold: "Recrue signée !",
      ready: "Costume enfilé, prêt",
    },
    chars: CHARACTERS.mha,
  },
  jjk: {
    name: "Jujutsu Kaisen",
    currency: "¥",
    tile: "linear-gradient(135deg, #3f2a8c, #6a4bd6)",
    ribbon: "呪",
    team: "Clan",
    labels: {
      draw: "Briser le sceau",
      vote: "Désigner le plus fort",
      sold: "Pacte scellé !",
      ready: "Énergie occulte prête",
    },
    chars: CHARACTERS.jjk,
  },
};

export function findChar(universe, id) {
  return UNIVERSES[universe]?.chars.find((c) => c.id === id) || null;
}
