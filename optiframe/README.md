OptiFrame - Des verres recycles a la monture imprimee en 3D
Defi CodeML - Sante Numerique Sans Frontieres (SN-SF)
================================================================

Équipe : SaraVision
Membres et roles :
  - Sidney Gharib - Capture et vision (dispositif, reference, redressement, mesures)
  - Aditya Shetty - Donnees et IA (jeu de donnees, entrainement, export du modele)
  - Rahma Ammari - 3D et interface (monture STL, apercu 3D, ecrans mobiles)
  - Aya Merdjaoui - Integration (Git, mise en ligne, README)


----------------------------------------------------------------
1. LIEN DE L'APPLICATION
----------------------------------------------------------------
URL publique (HTTPS) : [https://...]

QR code de l'URL     : [chemin du fichier, ex. docs/qrcode.png]

Hebergement          : [GitHub Pages / Netlify / Vercel / Cloudflare Pages / Hugging Face Spaces / Render]

Serveur Python       : [Non / Oui - URL active jusqu'a la fin des deliberations]

L'app s'ouvre en un scan de QR code : aucune installation, aucun compte,
aucune cle API. Testee sur Chrome (Android) et Safari (iOS) recents.


----------------------------------------------------------------
2. DESCRIPTION
----------------------------------------------------------------
OptiFrame est une web app mobile qui, a partir d'une photo d'un verre de
lunettes recycle, mesure sa forme au millimetre pres et genere une monture
sur mesure imprimable en 3D, meme quand le verre gauche et le verre droit
ont des formes differentes.

Pipeline (de la photo au STL) :
  1. Redresser   : reperer l'objet de taille connue, calculer l'homographie,
                   obtenir l'echelle en pixels par mm.
  2. Segmenter   : isoler le verre dans l'image redressee (seuillage et
                   contours, puis modele entraine pour les cas difficiles).
  3. Mesurer     : convertir le contour en mm, le lisser, calculer
                   A (largeur), B (hauteur) et le perimetre.
  4. Monture     : decaler chaque contour vers l'exterieur, ajouter une
                   rainure ou un jeu de clipsage, relier les deux cercles par
                   un pont, ajouter les tenons des branches. Apercu 3D + STL.
  5. Mise en ligne : page permettant de photographier un verre gauche et un
                   verre droit, regler le pont (18 mm par defaut), obtenir
                   mesures, apercu 3D et STL.

Le contour est conserve comme un polygone (liste de points en mm) : il sert
a la fois a la mesure, a l'export SVG et a la generation 3D.


----------------------------------------------------------------
3. MODE D'EMPLOI (UTILISATION DE L'APP)
----------------------------------------------------------------
  1. Ouvrir l'URL (ou scanner le QR code) sur un smartphone.
  2. Monter le dispositif de capture (voir section 4).
  3. Choisir l'oeil (gauche ou droit) pour le premier verre.
     Convention : le cote nasal du verre est oriente vers le centre de la
     monture.
  4. Prendre la photo avec la camera integree de l'app (import d'un fichier
     en repli si la camera est refusée).
  5. Verifier l'image de controle (reference, redressement, contour).
  6. Repeter pour le second verre.
  7. Regler la largeur du pont (18 mm par defaut).
  8. Lire les mesures (A, B, périmètre), consulter l'aperçu 3D.
  9. Télécharger monture.stl et, si besoin, le contour en SVG 1:1.

Messages d'erreur clairs prévus si : objet de référence manquant, photo
floue, verre mal placé.


----------------------------------------------------------------
4. DISPOSITIF DE CAPTURE
----------------------------------------------------------------
Doit pouvoir etre remonté par le jury en moins de 2 minutes.

Description    : [ex. portable en ecran blanc plein ecran, feuille de papier
                 calque pour diffuser, feuille A4 avec marqueurs ArUco]
Materiel       : [liste]
Objet de reference : [marqueur ArUco / carte bancaire 85,60 x 53,98 mm /
                 feuille A4 / piece de monnaie]
Dictionnaire ArUco : [ex. DICT_4X4_50] - taille reelle du marqueur : [xx,x mm]
Impression     : imprimer a 100 % (sans "ajuster a la page") et verifier la
                 taille du marqueur au pied a coulisse.
Etapes de montage :
  1. [...]
  2. [...]
  3. [...]
Photo du dispositif : [chemin, ex. docs/dispositif.jpg]

Verification de l'echelle : l'objet de reference mesure dans l'image
redressee doit faire sa taille reelle en mm.


----------------------------------------------------------------
5. LANCEMENT LOCAL
----------------------------------------------------------------
Prerequis : [Node.js xx / Python 3.x / navigateur recent]

  git clone [URL DU DEPOT]
  
  cd [NOM DU DEPOT]
  
  [npm install]
  
  [npm run dev]  
  
  -> ouvrir http://localhost:[port]

Note : la camera exige HTTPS (ou localhost). Pour tester sur telephone en
local, utiliser un tunnel (Cloudflare Tunnel, ngrok) ou deployer en ligne.

----------------------------------------------------------------
6. PAGE "PAS A PAS" (palier 1)
----------------------------------------------------------------
Une photo avec ses images intermediaires :
  - Photo d'origine            : [chemin]
  - Reference detectee         : [chemin]
  - Image redressee (vue de dessus) : [chemin]
  - Contour du verre           : [chemin]
  - Mesures obtenues           : A = [xx,x] mm  B = [xx,x] mm  P = [xxx] mm

(Disponible aussi dans l'app : [menu / page])


----------------------------------------------------------------
7. DONNEES ET IA (palier 2)
----------------------------------------------------------------
7.1 Jeux de donnees utilises (source, licence, usage)
  | Jeu de donnees | Source / lien | Licence | Usage |
  |----------------|---------------|---------|-------|
  | [ex. Trans10K] | [lien]        | [...]   | [pre-entrainement] |
  | [Images synthetiques maison] | [script] | [...] | [entrainement] |
  | [Photos de verres de l'equipe] | [-] | [...] | [validation] |


7.2 Modeles utilises (source, licence)
  | Modele | Source / lien | Licence | Role |
  |--------|---------------|---------|------|
  | [ex. Segment Anything / U-Net] | [lien] | [...] | [...] |

7.3 Methode de constitution des donnees
  - Collecte reelle : [nb de verres, nb de photos, conditions]
  - Donnees synthetiques : [methode : rendu 3D, compositing, reflets
    simules, fonds et eclairages varies]
  - Augmentation : [rotations, perspective, bruit, luminosite, flou...]
  - Verite terrain : mesures au pied a coulisse selon le systeme "boxing"
    (A = largeur, B = hauteur, ISO 8624), [3] mesures par dimension,
    moyenne retenue.

7.4 Methode d'entrainement
  - Architecture : [...]
  - Plateforme : [Google Colab / Kaggle]  Framework : [PyTorch / TF]
  - Hyperparametres : [epochs, lr, taille d'image, batch]
  - Decoupage train/val/test : [...]
  - Export : [ONNX / TensorFlow.js]  Execution : [navigateur / serveur]
  - Notebook : [chemin]

7.5 Mesures de performance sur nos propres verres
  | Metrique | Valeur |
  |----------|--------|
  | IoU / Dice du masque | [..] |
  | Erreur absolue moyenne sur A | [.. mm] |
  | Erreur absolue moyenne sur B | [.. mm] |
  | Ecart entre prises (meme verre) | [.. mm] |
  | Temps de traitement par paire (telephone milieu de gamme) | [.. s] |

7.6 Modele entraine
  Poids charges par l'app : [chemin]
  Lien de telechargement (si > 100 Mo) : [URL]


----------------------------------------------------------------
8. MONTURE 3D (palier 3)
----------------------------------------------------------------
  - Entrees : contour gauche, contour droit (formes eventuellement
    differentes), largeur du pont (defaut 18 mm).
  - Cercles : decalage du contour vers l'exterieur ([x] mm, via Clipper).
  - Jeu de clipsage : [0,1 a 0,3 mm] entre le verre et le cercle
    (un vrai verre est legerement bombe), rainure : [profondeur / largeur].
  - Pont et tenons des branches : presents.
  - Bibliotheques : [three.js, manifold-3d / JSCAD]
  - STL valide (maillage ferme), imprimable sans supports excessifs.
  - Fichier : monture.stl telechargeable depuis l'app, genere pour la paire
    de verres de demonstration.
  - Parametres d'impression conseilles : [materiau, hauteur de couche,
    remplissage, orientation]


----------------------------------------------------------------
9. EXPORT DU CONTOUR (SVG 1:1)
----------------------------------------------------------------
Un bouton exporte le contour en SVG a l'echelle 1:1. Pour verifier :
imprimer le SVG a 100 % (sans mise a l'echelle), poser le verre sur le
trace : il doit l'epouser.


----------------------------------------------------------------
10. VALIDATION ET BONUS (palier 4, facultatif)
----------------------------------------------------------------


----------------------------------------------------------------
11. CHOIX TECHNIQUES
----------------------------------------------------------------
Langage / framework : TypeScript
Vision : OpenCV.js, js-aruco2
Geometrie : Clipper, manifold-3d / JSCAD
3D : three.js
IA dans le navigateur : [ONNX Runtime Web / TensorFlow.js]
Traitement : [dans le navigateur (donnees gardees sur le telephone,
              fonctionne avec peu ou pas de connexion) / serveur Python]
Justification des choix : [...]


----------------------------------------------------------------
12. LIMITES CONNUES (a reconnaitre honnetement)
----------------------------------------------------------------
  - [ex. verres teintes ou antireflet : contour moins fiable]
  - [ex. photo tres inclinee : erreur d'echelle]
  - [ex. verres tres bombes : biais sur le bord]
  - [ex. temps de traitement sur telephone d'entree de gamme]
  - [ex. non teste sur iOS < xx]


----------------------------------------------------------------
13. OUTILS D'IA CITES
----------------------------------------------------------------
Assistants de code (Claude, ChatGPT, Copilot, ...) : [lesquels, pour quoi]
Modeles preentraines : voir section 7.2
Chaque membre sait expliquer le code de sa partie au jury.


----------------------------------------------------------------
14. LIVRABLES (CHECKLIST DE REMISE)
----------------------------------------------------------------
  [ ] Web app en ligne : URL HTTPS + QR code, ouverte sur un telephone neuf
  [ ] Code source : depot Git public (ou partage avec le jury) + ce README
  [ ] Dossier "donnees et IA" : section 7 (ou notebook)
  [ ] Modele entraine : poids charges par l'app (+ lien si > 100 Mo)
  [ ] Page "pas a pas" : section 6
  [ ] Fichier 3D monture.stl telechargeable depuis l'app
  [ ] Dispositif de capture remontable en 2 minutes
  [ ] Demonstration : 5 min sur telephone en direct + 2 min de questions
  [ ] Video de secours de la demo
  [ ] Demo repetee, chaque membre sait expliquer sa partie


----------------------------------------------------------------
15. RAPPEL DES CRITERES D'EVALUATION (100 points)
----------------------------------------------------------------
  Precision des mesures (A et B, 2 echantillons du jury) ... 30
  
     (30 pts si erreur moyenne <= 1 mm, degressif jusqu'a 0 pt a 4 mm)
     
  Qualite du contour (SVG 1:1) ........................... 5
  
  Robustesse (angles, eclairages, paire du jury) .......... 10
  
  Donnees et IA ........................................... 15
  
  Web app mobile .......................................... 15
  
  Monture generee (STL) ................................... 10
  
  Qualite du code ......................................... 5
  
  Presentation ............................................ 10
  

Deroulement de l'evaluation : le jury ouvre l'app via le QR code, remonte
le dispositif, photographie les deux echantillons, compare A et B au pied
a coulisse, puis telecharge le STL. Les echantillons du jury ne doivent
pas etre modifies ni marques. Aucune annotation manuelle pendant
l'evaluation : le traitement doit etre automatique.


----------------------------------------------------------------
16. CONTRAINTES A RESPECTER
----------------------------------------------------------------
  - Pas de service payant ni d'API fermee dans la version finale.
  - Tout modele et jeu de donnees public autorise s'il est cite avec sa
    licence.
  - Aucune donnee personnelle dans les jeux de donnees.
  - Resultat en moins de 30 secondes par paire de verres (telephone milieu
    de gamme).
  - Utilisable a une main, interface lisible sur ~6 pouces.


----------------------------------------------------------------
17. LICENCE ET CREDITS
----------------------------------------------------------------
Licence du code : [MIT / Apache-2.0 / ...]
Remerciements : Sante Numerique Sans Frontieres (SN-SF), [mentors],
                [bibliotheques et jeux de donnees cites ci-dessus]
