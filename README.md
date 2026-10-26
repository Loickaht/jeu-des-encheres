# Le Jeu des Enchères

Un jeu d'enchères à l'aveugle entre amis : on tire des persos de One Piece, Naruto, Dragon Ball, My Hero Academia ou Jujutsu Kaisen, on mise de l'argent virtuel et on compose la meilleure équipe. À la fin, chaque joueur vote pour la meilleure équipe.

- **Créer une salle / Rejoindre une salle** : de 2 à 4 joueurs, chacun sur son appareil, avec un code de salle.
- **Sur place** : un seul écran que les joueurs se passent.

## Organisation du code

| Dossier | Contenu |
|---|---|
| `shared/engine.js` | Les règles du jeu (tirage, enchères, main, vote). Utilisé par le serveur et par le mode Sur place. |
| `shared/catalog.js` | Les univers : monnaie, noms des boutons, couleurs. |
| `shared/characters.js` | Les persos de chaque univers et leurs photos (AniList). |
| `server/index.js` | Le serveur : salles en ligne en temps réel (Socket.io). |
| `public/` | L'interface : page, styles, script. |
| `test/` | Les tests automatiques des règles. |

## Lancer le jeu sur ton PC

1. Installe Node.js (version « LTS ») depuis [nodejs.org](https://nodejs.org).
2. Ouvre un terminal dans ce dossier, puis installe les dépendances :
   ```bash
   npm install
   ```
3. Lance le jeu :
   ```bash
   npm start
   ```
4. Ouvre [http://localhost:3000](http://localhost:3000). Pour simuler plusieurs joueurs, ouvre une fenêtre de navigation privée par joueur.

Pour lancer les tests des règles : `npm test`.

## Mettre le jeu en ligne sur Render (gratuit)

### Étape 1 : créer un compte GitHub

Va sur [github.com/signup](https://github.com/signup) et crée un compte (gratuit).

### Étape 2 : créer un dépôt vide

1. Sur GitHub, clique sur **+** en haut à droite, puis sur **New repository**.
2. Nom du dépôt : `jeu-des-encheres`.
3. Choisis **Private** si tu ne veux pas que le code soit visible. Render fonctionne aussi avec un dépôt privé.
4. Ne coche rien d'autre (pas de README, pas de .gitignore), puis clique sur **Create repository**.

### Étape 3 : envoyer le code sur GitHub

Ouvre un terminal dans ce dossier et tape ces commandes, une par une. Remplace `TON-PSEUDO` par ton pseudo GitHub.

```bash
git init
git add .
git commit -m "Premier jet du jeu des enchères"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/jeu-des-encheres.git
git push -u origin main
```

À la première commande `git push`, une fenêtre s'ouvre pour te connecter à GitHub : accepte. Si `git commit` demande ton nom et ton e-mail, tape d'abord :

```bash
git config --global user.name "Ton Nom"
git config --global user.email "ton@email.com"
```

### Étape 4 : créer le service sur Render

1. Va sur [render.com](https://render.com) et clique sur **Get Started**. Choisis **GitHub** pour te connecter : c'est le plus simple.
2. Dans le tableau de bord, clique sur **New +**, puis sur **Blueprint**.
3. Autorise Render à accéder à ton dépôt `jeu-des-encheres` et sélectionne-le.
4. Render lit le fichier `render.yaml` du projet et propose un service web gratuit nommé `jeu-des-encheres`. Clique sur **Apply** (ou **Deploy Blueprint**).
5. Attends que le statut passe à **Live**, ce qui prend 2 à 5 minutes.
6. Ton lien est affiché en haut de la page du service, du type `https://jeu-des-encheres.onrender.com`. C'est ce lien que tu partages à tes amis.

Si l'option Blueprint n'apparaît pas, choisis **New +** puis **Web Service**, sélectionne le dépôt et règle :

- **Runtime** : Node
- **Build Command** : `npm install`
- **Start Command** : `npm start`
- **Instance Type** : Free

### Étape 5 : mettre à jour le jeu

À chaque modification, envoie-la sur GitHub :

```bash
git add .
git commit -m "Ce que j'ai changé"
git push
```

Render la remet en ligne automatiquement en quelques minutes.

### Bon à savoir sur l'offre gratuite de Render

- Après environ 15 minutes sans visite, le serveur se met en veille. La première personne qui ouvre ensuite le lien attend 30 à 60 secondes.
- Les salles sont gardées en mémoire. Une mise à jour ou une mise en veille efface les parties en cours.
