import { CHARACTERS } from "./characters.js";

// Chaque univers : nom, monnaie, ambiance et noms des boutons.
// Le petit texte « sub » rappelle l'action sous le nom stylé.
export const UNIVERSES = {
  onepiece: {
    name: "One Piece",
    currency: "฿",
    tile: "linear-gradient(135deg, #0b2a4f, #1f5a8f 55%, #f2c14e)",
    ribbon: "WANTED",
    team: "Équipage",
    labels: {
      draw: "Hisser le pavillon",
      open: "Lancer la prime",
      raise: "Faire grimper la prime",
      pass: "Larguer les amarres",
      vote: "Rejoindre cet équipage",
      sold: "Recruté dans l'équipage !",
      ready: "Prêt à lever l'ancre",
    },
    chars: CHARACTERS.onepiece,
  },
  naruto: {
    name: "Naruto",
    currency: "Ryō",
    tile: "linear-gradient(135deg, #1a120c, #b23a1a 55%, #ff7a1a)",
    ribbon: "忍",
    team: "Escouade",
    labels: {
      draw: "Kuchiyose no jutsu !",
      open: "Engager mes Ryō",
      raise: "Multiclonage de la mise",
      pass: "Disparaître en fumée",
      vote: "Désigner le futur Hokage",
      sold: "Mission accomplie !",
      ready: "Bandeau noué, prêt",
    },
    chars: CHARACTERS.naruto,
  },
  dragonball: {
    name: "Dragon Ball",
    currency: "Zénis",
    tile: "linear-gradient(135deg, #0e1d5c, #2448b0 50%, #ff8c1a)",
    ribbon: "Z",
    team: "Escouade Z",
    labels: {
      draw: "Ouvrir une capsule",
      open: "Concentrer le Ki",
      raise: "Passer Super Saiyan",
      pass: "Quitter le tournoi",
      vote: "Couronner ce champion",
      sold: "Fusion réussie !",
      ready: "Ki chargé, prêt",
    },
    chars: CHARACTERS.dragonball,
  },
  mha: {
    name: "My Hero Academia",
    currency: "¥",
    tile: "linear-gradient(135deg, #11291d, #1f8a5b 50%, #e63946)",
    ribbon: "U.A.",
    team: "Agence",
    labels: {
      draw: "Repérer un talent",
      open: "Smash !",
      raise: "Plus Ultra !",
      pass: "Retour en classe",
      vote: "Élire le héros n°1",
      sold: "Recrue signée !",
      ready: "Costume enfilé, prêt",
    },
    chars: CHARACTERS.mha,
  },
  jjk: {
    name: "Jujutsu Kaisen",
    currency: "¥",
    tile: "linear-gradient(135deg, #0d0a18, #3b1a66 55%, #3fd0ff)",
    ribbon: "呪",
    team: "Clan",
    labels: {
      draw: "Briser le sceau",
      open: "Conclure un pacte",
      raise: "Libérer l'énergie occulte",
      pass: "Battre en retraite",
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
