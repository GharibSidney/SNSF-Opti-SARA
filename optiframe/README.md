# OptiFrame

Web app mobile: photo d'un verre, contour en mm, monture STL imprimable en 3D.
Cette base couvre la **génération de monture** et la **web app**. La mesure par photo (vision + IA)
se branche dans un seul fichier: `src/vision/measure.ts`.

## Lancer

```bash
npm install
npm run dev        # http://localhost:5173 (--host: testable depuis un téléphone sur le même Wi-Fi)
npm test           # vérifie la géométrie en Node, écrit out/monture-test.stl
npm run build      # tsc + vite build -> dist/
```

La caméra exige HTTPS: déployez `dist/` sur Cloudflare Pages, Netlify, Vercel ou GitHub Pages
(`base: "./"` est déjà configuré). Ouvrez `?demo=1` pour tester sans le module de mesure.

## Structure

```
src/
  types.ts              contrat de données (Contour, conventions d'orientation)
  main.ts               assemblage: photo -> mesure -> monture -> aperçu/export
  engine.ts             chargement WASM de manifold-3d (navigateur)
  geometry/
    contour.ts          normalisation, rééchantillonnage, A/B/périmètre, miroir
    frame.ts            buildFrame(): LA fonction de génération (pure, sans DOM)
    params.ts           paramètres de la monture et valeurs par défaut
    mock.ts             verres simulés (mode démo et tests uniquement)
  vision/
    types.ts            contrat Measurer, VisionError, StepImage
    measure.ts          >>> À REMPLIR par l'équipe vision/IA <<<
    image.ts            chargement EXIF + réduction pour Safari
    demo.ts             mesure simulée (?demo=1)
  export/               stl.ts (binaire), svg.ts (1:1 en mm), download.ts
  ui/                   viewer (three.js), plan 2D, panneaux, caméra, QR
scripts/check-frame.ts  tests de géométrie (maillage fermé, genre, pont, jeu)
```

## Contrat avec la vision / IA

Une seule fonction: `(photo: Blob, { eye, onProgress }) => Promise<{ contour, steps?, confidence? }>`.

- `contour.points`: polygone fermé **en mm**, y vers le haut. L'app le renormalise (200 points, anti-horaire, centré).
- Orientation = **vue du porteur**. Verre droit: côté nasal vers **-x**. Verre gauche: côté nasal vers **+x**.
  Si le verre est photographié de l'autre côté, utiliser `mirror()` de `geometry/contour.ts`.
- Erreurs: `throw new VisionError("no_reference" | "blurry" | "lens_not_found", "message en français avec la solution")`.
- `steps`: images intermédiaires (référence, redressement, masque, contour) pour la page « pas à pas ».
- Test sans l'app: dans la console, `OptiFrame.setContour("R", points)`.

## Monture

Face à plat sur le plateau (z = 0), rainure symétrique en V à faible pente: s'imprime sans supports.
Le verre se retient entre les lèvres avant/arrière (`lip`) avec un jeu (`clearance`) au fond de la rainure.
À régler après un premier essai d'impression avec de vrais verres (ils sont légèrement bombés).
