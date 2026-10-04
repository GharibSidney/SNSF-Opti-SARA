OptiFrame - Des verres recyclés à la monture imprimée en 3D
Défi CodeML - Santé Numérique Sans Frontières (SN-SF)
================================================================

Équipe : SaraVision
Membres et rôles :
  - Sidney Gharib - Capture et vision (dispositif, référence, redressement, mesures)
  - Aditya Shetty - Données et IA (jeu de données, entraînement, export du modèle)
  - Rahma Ammari - 3D et interface (monture STL, aperçu 3D, écrans mobiles)
  - Aya Merdjaoui - Intégration (Git, mise en ligne, README)


----------------------------------------------------------------
1. LIEN DE L'APPLICATION
----------------------------------------------------------------
URL publique (HTTPS) : https://snsf-opti-sara-one.vercel.app/

Hébergement          : Vercel, GitHub

Serveur Python       : Oui, le pipeline de mesure tourne en Python.

L'app s'ouvre en un scan de QR code : aucune installation, aucun compte,
aucune clé API. Testé sur Chrome (Android) et Safari (iOS).


----------------------------------------------------------------
2. DESCRIPTION
----------------------------------------------------------------
OptiFrame est une web app mobile qui, à partir d'une photo d'un verre de
lunettes recyclé, mesure sa forme au millimètre près et génère une monture
sur mesure imprimable en 3D, même quand le verre gauche et le verre droit
ont des formes différentes.

Pipeline (de la photo au STL) :
  1. Redresser   : repérer l'objet de taille connue, calculer l'homographie,
                   obtenir l'échelle en pixels par mm.
  2. Segmenter   : isoler le verre dans l'image redressée (Grounding DINO
                   pour détecter le verre, Segment Anything pour son masque).
  3. Mesurer     : convertir le contour en mm, le lisser, calculer
                   A (largeur), B (hauteur) et le périmètre.
  4. Monture     : décaler chaque contour vers l'extérieur, ajouter une
                   rainure ou un jeu de clipsage, relier les deux cercles par
                   un pont, ajouter les tenons des branches. Export STL.
  5. Mise en ligne : page permettant de photographier un verre gauche et un
                   verre droit et d'obtenir le STL de la monture.

Le contour est conservé comme un polygone (liste de points en mm) : il sert
à la fois à la mesure, à l'export SVG et à la génération 3D.


----------------------------------------------------------------
3. MODE D'EMPLOI (UTILISATION DE L'APP)
----------------------------------------------------------------
  1. Ouvrir l'URL (ou scanner le QR code) sur un smartphone.
  2. Monter le dispositif de capture (voir section 4).
  3. Photographier d'abord le verre gauche.
     Convention : le côté nasal du verre est orienté vers le centre de la
     monture.
  4. Prendre la photo avec la caméra intégrée de l'app (import d'un fichier
     en repli si la caméra est refusée).
  5. Vérifier l'image de contrôle (référence, redressement, contour).
  6. Répéter pour le second verre.
  7. Lire les mesures (A, B, périmètre).
  8. Télécharger monture.stl et, si besoin, le contour en SVG 1:1.

Messages d'erreur clairs prévus si : objet de référence manquant, photo
floue, verre mal placé.


----------------------------------------------------------------
4. DISPOSITIF DE CAPTURE
----------------------------------------------------------------
Doit pouvoir être remonté par le jury en moins de 2 minutes.

Description    : Nécessite une feuille US Letter imprimée portant six repères ArUco; le verre est posé sur la feuille. La photo doit être prise de dessus couvrant l'entièreté de la feuille blanche.
Matériel       : téléphone, feuille US Letter imprimée avec repères ArUco.
Objet de référence : les six repères ArUco de la feuille.
Dictionnaire ArUco : DICT_4X4_50 - taille du marqueur : 50 mm (carré noir extérieur, bordure comprise).
Impression     : imprimer à 100 % (sans "ajuster à la page") et vérifier la
                 taille du marqueur au pied à coulisse.
Étapes de montage :
  1. Placer le verre gauche au centre de la feuille de papier avec repères ArUco.
  2. Prendre une photo du dessus, de façon parallèle à la feuille.
  3. Placer le verre droit au centre de la feuille de papier avec repères ArUco.
  4. Prendre une photo du dessus, de façon parallèle à la feuille.
  5. Attendre la génération du fichier .stl de la monture 3D.

Vérification de l'échelle : l'erreur de reprojection des repères est calculée à chaque photo (au-dessus de 1 mm, vérifier l'échelle d'impression).


----------------------------------------------------------------
5. LANCEMENT LOCAL
----------------------------------------------------------------
Prérequis : Node.js 20.19 ou plus (ou 22.12 et plus), Python 3.12, un navigateur récent, le fichier de poids sam_vit_h_4b8939.pth.

  git clone https://github.com/GharibSidney/SNSF-Opti-SARA.git

  cd SNSF-Opti-SARA/optiframe

  npm install

  npm run dev

  -> ouvrir http://localhost:5173

Note : la caméra exige HTTPS (ou localhost). Pour tester sur téléphone en
local, utiliser un tunnel (Cloudflare Tunnel, ngrok) ou déployer en ligne.

----------------------------------------------------------------
6. PAGE "PAS À PAS" (palier 1)
----------------------------------------------------------------
Une photo avec ses images intermediaires :
  - Photo d'origine            : page_pas_a_pas/origine.png
  - Reference detectée         : page_pas_a_pas/ref_detected.png
  - Marqueurs Aruco detect     : page_pas_a_pas/markers_detected.png
  - Image redressee            : page_pas_a_pas/rectified_overlay.png
  - Contour du verre           : page_pas_a_pas/contour_mm_0.png
  - Mesures obtenues           : A = 48.8 mm  B = 44.0 mm

----------------------------------------------------------------
7. DONNÉES ET IA (palier 2)
----------------------------------------------------------------
7.1 Jeux de données utilisés (source, licence, usage)
Le pipeline utilise deux modèles préentraînés.

Sources en section 7.2.

| Jeu de données | Usage |
|---|---|
| 28 photos de verres de l'équipe | Validation du pipeline de vision |


7.2 Modèles utilisés (source, licence)
| Modèle | Source / lien | Licence | Rôle |
|---|---|---|---|
| Grounding DINO tiny (`IDEA-Research/grounding-dino-tiny`) | https://huggingface.co/IDEA-Research/grounding-dino-tiny | Apache 2.0 | Détecter le verre à partir du texte « eyeglass lens. » |
| Segment Anything, ViT-H (`sam_vit_h_4b8939.pth`) | https://github.com/facebookresearch/segment-anything | Apache 2.0 | Masque du verre à partir de la boîte détectée |

7.3 Méthode de constitution des données
  - Collecte réelle : 28 photos de verres de l'équipe.
  - Vérité terrain : mesures au pied à coulisse selon le système "boxing"
    (A = largeur, B = hauteur, ISO 8624).

7.4 Méthode d'entraînement
  Aucun entraînement : les modèles préentraînés sont exécutés sur serveur avec PyTorch.

7.5 Mesures de performance sur nos propres verres
| Métrique | Valeur |
|---|---|
| Photos où un verre est détecté | 28 sur 28 (aucun échec) |
| Erreur moyenne rapportée par le benchmark | 0,333 mm en moyenne (de 0,215 à 0,507 mm selon la photo) |
| Erreur maximale rapportée par le benchmark | 1,269 mm en moyenne par photo (pire cas : 3,016 mm, IMG_93133) |
| Temps de traitement par photo | 0,87 s en moyenne (28 photos en 24,46 s) |
| Temps de traitement par paire de verres | environ 1,7 s (2 × 0,87 s), hors envoi de la photo et génération de la monture |

7.6 Modèle entraîné
  Pas de modèle entraîné par l'équipe. Poids chargés par l'app : sam_vit_h_4b8939.pth
  Lien de téléchargement (si > 100 Mo) : https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth


----------------------------------------------------------------
8. MONTURE 3D (palier 3)
----------------------------------------------------------------
  - Entrées : contour gauche, contour droit (formes éventuellement
    différentes), largeur du pont (défaut 18 mm).
  - Cercles : décalage du contour vers l'extérieur (3 mm, via manifold-3d,
    qui s'appuie sur Clipper2).
  - Jeu de clipsage : 0,2 mm entre le verre et le fond de la rainure
    (un vrai verre est légèrement bombé). Rainure en V à faible pente :
    retenue de 0,3 mm sur les deux faces, 0,5 mm de profondeur, pour une
    épaisseur de monture de 4 mm.
  - Pont et tenons des branches : présents.
  - Bibliothèques : manifold-3d
  - STL valide (maillage fermé), vérifié par `npm test` ; conçu pour
    s'imprimer sans supports.
  - Fichier : monture.stl téléchargeable depuis l'app, généré pour la paire
    de verres de démonstration.
  - Orientation d'impression : face avant à plat sur le plateau (z = 0).


----------------------------------------------------------------
9. EXPORT DU CONTOUR (SVG 1:1)
----------------------------------------------------------------
Un bouton exporte le contour en SVG à l'échelle 1:1. Pour vérifier :
imprimer le SVG à 100 % (sans mise à l'échelle), poser le verre sur le
tracé : il doit l'épouser.


----------------------------------------------------------------
10. VALIDATION ET BONUS (palier 4, facultatif)
----------------------------------------------------------------
Vérification automatique de la monture : voir section 8 (`npm test` : maillage fermé, un seul bloc, pont de 18 mm, jeu de 0,2 mm).


----------------------------------------------------------------
11. CHOIX TECHNIQUES
----------------------------------------------------------------
  Langage / framework : TypeScript (Vite) pour l'app, Python (Flask) pour le serveur de mesure

  Vision : OpenCV (Python) : repères ArUco, homographie, contours

  IA : Grounding DINO tiny et Segment Anything ViT-H (PyTorch), sur serveur

  Traitement : serveur Python pour la mesure ; génération de la monture dans le navigateur.

  Justification des choix : Le modèle SAM ViT-H (environ 2,5 Go) ne peut pas tourner dans un téléphone, donc la mesure passe
  par un serveur Python.


----------------------------------------------------------------
12. LIMITES CONNUES
----------------------------------------------------------------
- Sur nos 28 photos, l'erreur maximale rapportée par le benchmark dépasse 1 mm sur 20 photos (jusqu'à 3,0 mm sur la pire), même si l'erreur moyenne est de 0,333 mm.
- Le temps de 0,87 s par photo est celui du serveur, sans l'envoi de la photo ni la génération de la monture sur le téléphone.
- Le verre doit être posé droit sur la feuille, côté nasal selon la convention ; un verre posé de travers change A et B.
- L'épaisseur du verre au-dessus du plan de la feuille n'est pas corrigée.
- Un verre par photo ; feuille au format Letter uniquement.
- Monture sans branches ; jeu et retenue à ajuster après essai d'impression avec de vrais verres.


----------------------------------------------------------------
13. OUTILS D'IA CITÉS
----------------------------------------------------------------
Assistants de code : Claude (Anthropic), pour le code de l'application web, du générateur de monture et de leurs tests.
Modèles préentraînés : voir section 7.2
Chaque membre sait expliquer le code de sa partie au jury.


----------------------------------------------------------------
14. RAPPEL DES CRITÈRES D'ÉVALUATION (100 points)
----------------------------------------------------------------
  Précision des mesures (A et B, 2 échantillons du jury) ... 30

     (30 pts si erreur moyenne <= 1 mm, dégressif jusqu'à 0 pt à 4 mm)

  Qualité du contour (SVG 1:1) ........................... 5

  Robustesse (angles, éclairages, paire du jury) .......... 10

  Données et IA ........................................... 15

  Web app mobile .......................................... 15

  Monture générée (STL) ................................... 10

  Qualité du code ......................................... 5

  Présentation ............................................ 10


Déroulement de l'évaluation : le jury ouvre l'app via le QR code, remonte
le dispositif, photographie les deux échantillons, compare A et B au pied
à coulisse, puis télécharge le STL. Les échantillons du jury ne doivent
pas être modifiés ni marqués. Aucune annotation manuelle pendant
l'évaluation : le traitement doit être automatique.


----------------------------------------------------------------
15. CONTRAINTES À RESPECTER
----------------------------------------------------------------
  - Pas de service payant ni d'API fermée dans la version finale.
  - Tout modèle et jeu de données public autorisé s'il est cité avec sa
    licence.
  - Aucune donnée personnelle dans les jeux de données.
  - Résultat en moins de 30 secondes par paire de verres (téléphone milieu
    de gamme).
  - Utilisable à une main, interface lisible sur ~6 pouces.


----------------------------------------------------------------
16. LICENCE ET CRÉDITS
----------------------------------------------------------------
Remerciements : Santé Numérique Sans Frontières (SN-SF), Grounding DINO (IDEA-Research), Segment Anything (Meta AI),
OpenCV, manifold-3d, Flask, Vite.
