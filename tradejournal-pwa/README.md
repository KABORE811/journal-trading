# Journal de Trading — projet prêt à déployer

## Installer et tester en local
```
npm install
npm run dev
```
Ouvre le lien affiché (ex: http://localhost:5173).

## Déployer (étape 6)
Le plus simple : [vercel.com](https://vercel.com) ou [netlify.com](https://netlify.com), compte gratuit.
1. Pousse ce dossier sur GitHub (ou glisse-dépose le dossier directement sur Netlify).
2. Connecte le dépôt sur Vercel/Netlify.
3. Build command : `npm run build` — Output directory : `dist`
4. Déploie. Tu obtiens une vraie URL (https://...).

## Installer l'app sur ton téléphone
Une fois déployée et ouverte dans le navigateur mobile (Chrome/Safari) :
- **Android (Chrome)** : menu ⋮ → "Ajouter à l'écran d'accueil"
- **iPhone (Safari)** : bouton Partager → "Sur l'écran d'accueil"

L'app s'ouvrira alors comme une app native, sans barre d'adresse, et fonctionnera hors-ligne grâce au service worker (`public/sw.js`).

## Note sur les données
Tes trades sont stockés dans le `localStorage` de ton navigateur, sur ton appareil — rien n'est envoyé à un serveur. Si tu vides le cache du navigateur ou changes de téléphone, les données ne suivent pas (pas encore de synchronisation cloud).
