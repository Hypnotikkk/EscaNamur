"use strict";

// ====== MUSIQUE DE FOND EN PORTEE GLOBALE ======
const bgMusic = new Audio('sons/fond.mp3');
bgMusic.loop = true; 
// (On ne lance pas encore la lecture ici ; simplement on configure la boucle)

document.addEventListener('DOMContentLoaded', () => {
  const overlay     = document.getElementById('overlay');
  const startBtnOv  = document.getElementById('start-overlay-btn');

 startBtnOv.addEventListener('click', () => {
    // 1) On lance la musique (si besoin)
    bgMusic.currentTime = 0;
    bgMusic.play().catch(err => console.warn("Playback interdit :", err));

    // 2) On fait disparaître l’overlay, etc.
    overlay.classList.add('fade-out');
    overlay.addEventListener('transitionend', function handler(e) {
      if (e.propertyName === 'opacity') {
        overlay.remove();
        overlay.removeEventListener('transitionend', handler);
        startBubbleTutorial();
      }
    });
  });
});


/* ─── BULLES DE TUTORIEL ─── */

function startBubbleTutorial() {
  // 1) Affiche la première bulle
  const b1 = document.getElementById('bubble1');
  b1.classList.remove('hidden');

  // 2) On attend que l’utilisateur presse Flèche Gauche OU Flèche Droite
  function onFirstKey(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Retirer l’écouteur pour ne pas déclencher plusieurs fois
      document.removeEventListener('keydown', onFirstKey);
      // Masquer la bulle 1
      b1.classList.add('hidden');
      // Enchaîner sur la bulle 2
      showBubble3();
    }
  }
  document.addEventListener('keydown', onFirstKey);
}

function showBubble3() {
  const b2 = document.getElementById('bubble3');
  b2.classList.remove('hidden');

  const btnOk = document.getElementById('bubble3-ok');
  btnOk.addEventListener('click', () => {
    // Masquer définitivement la bulle 2
    b2.classList.add('hidden');
    // À partir d’ici, le joueur peut jouer normalement sans bulle
    showBubble2();
  });
}


function showBubble2() {
  const b2 = document.getElementById('bubble2');
  b2.classList.remove('hidden');

  const btnOk = document.getElementById('bubble2-ok');
  btnOk.addEventListener('click', () => {
    // Masquer définitivement la bulle 2
    b2.classList.add('hidden');
    // À partir d’ici, le joueur peut jouer normalement sans bulle
  });
}


/* ────────────────────────────── */
function showGoToBourseMessage() {
  const info = document.getElementById('info-message');
  info.textContent = "🔔 Clé complétée ! Rendez-vous à la Bourse.";
  info.classList.add('visible');
  setTimeout(() => {
    info.classList.remove('visible');
  }, 4000);
}


// Références DOM
const startBtn       = document.getElementById('start-btn');
const gameContainer  = document.getElementById('game-container');
const grid           = document.querySelector('.js-grid');
const cells          = document.querySelectorAll('.js-cell');
const btns           = document.querySelectorAll('.js-cell-action');
const snailContainer = document.getElementById('snail-container');
const snailElem      = document.getElementById('snail');
let victoryMusic = null;

// État du mini-jeu
let gameActive = false;
let hits = 0;
let animatingObjects = false;

// === Timer de survie ===
const survivalTime = 30000; // durée en ms
let remainingTime, timerInterval;
const timerElem = document.createElement('div');
timerElem.id = 'timer';
timerElem.style.position = 'absolute';
timerElem.style.top = '1rem';
timerElem.style.right = '1rem';
timerElem.style.color = 'white';
timerElem.style.fontSize = '1.5rem';
timerElem.style.zIndex = '1000';
gameContainer.appendChild(timerElem);

// Position initiale sur la grille
let coordX = 2, coordY = 2;
startBtn.style.display = 'none';
grid.style.transition = 'none';
updateCell(coordX, coordY);
setTimeout(() => grid.style.transition = 'all 1s ease', 100);

// Variables mouvement escargot
let posX = 100, posY = 450;
let velocityX = 0;
const constantSpeed = 4.5;
let lastTrailTime = 0, trailInterval = 1000/60;
const threshold = 50;
let thresholdCrossed = false;

// Variables mini-jeu
const maxHits = 3;
const fallingObjects = [];       // contiendra toutes les briques en cours
const spawnInterval = 550;      // création d'une nouvelle brique toutes les 1000ms
const fallSpeed = 2;             // vitesse de chute (px/frame)
let spawnTimer = null;
let successTimer = null;



// — Fonctions grille/escargot —
function updateCell(x, y) {
  // 1) Mise à jour visuelle de la case active
  document.querySelector('.js-cell.active')?.classList.remove('active');
  cells.forEach(c => {
    if (+c.dataset.x === x && +c.dataset.y === y) {
      c.classList.add('active');
    }
  });
  grid.style.transform = `translate(${-100*x}vw, ${-100*y}vh)`;

  // 2) GESTION DE LA MUSIQUE DE FOND
  if (x === 0 && y === 3) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  } else {
    if (bgMusic.paused) {
      bgMusic.currentTime = 0;
      bgMusic.play().catch(err => console.warn("Erreur lors de bgMusic.play() :", err));
    }
  }

  // 3) arrêter victoryMusic si on quitte (0,3)
  if (!(x === 0 && y === 3) && typeof victoryMusic !== 'undefined' && victoryMusic) {
    victoryMusic.pause();
    victoryMusic.currentTime = 0;
  }

  // 4) afficher/cacher le bouton “Start mini-jeu” si on est sur (0,1)
  startBtn.style.display = (!gameActive && x === 0 && y === 1) ? 'block' : 'none';

  // ─── NOUVEAU : si on arrive en (1,0), on affiche “Cliquez sur les particules”
  if (x === 1 && y === 0) {
    const info = document.getElementById('info-message');
    info.textContent = "🔔 Cliquez sur les particules pour réparer les câbles électriques !";
    info.classList.add('visible');
    setTimeout(() => {
      info.classList.remove('visible');
    }, 4000);
  }

   if (x === 0 && y === 1) {
    const info = document.getElementById('info-message');
    info.textContent = "🔔 Esquivez les chutes de briques !";
    info.classList.add('visible');
    setTimeout(() => {
      info.classList.remove('visible');
    }, 10000);
  }

  // ─── EXISTANT : si on arrive en (2,1), message de victoire
  if (x === 2 && y === 1) {
    const info = document.getElementById('info-message');
    info.textContent = "🎉 Succès ! Vous avez libéré votre ami !";
    info.classList.add('visible');
    setTimeout(() => {
      info.classList.remove('visible');
    }, 10000);
  }
}





function flashFade() {
  const fo = document.createElement('div');
  fo.className = 'fade-overlay';
  document.body.appendChild(fo);
  fo.addEventListener('animationend', () => fo.remove());
}

function performMove(d, wrapDir = 0) {
  if (gameActive) return;
  // Calcul des coordonnées cibles
  const targetX = coordX + (+d.actionX || 0);
  const targetY = coordY + (+d.actionY || 0);

  // —————————————————————————————
  //  NOUVEAU : Afficher un message dans #info-message au lieu de alert()
  if (targetX === 2 && targetY === 1 && keyStep < imagesCycle.length - 1) {
    const info = document.getElementById('info-message');
    info.textContent = "🔒 Vous devez d'abord compléter la clé avant d'accéder à cette case !";
    info.classList.add('visible');
    // Après 3 secondes, masquer progressivement le message
    setTimeout(() => {
      info.classList.remove('visible');
    }, 3000);
    return;
  }
  // —————————————————————————————

  // Empêche d'aller dans une case noire
  const targetCell = [...cells].find(c => +c.dataset.x === targetX && +c.dataset.y === targetY);
  if (targetCell?.classList.contains('cell--black')) return;

  // Si tout est ok, on fait l'animation de transition habituelle
  if (gameActive) return;
  gameContainer.classList.add('fade-out');
  const onEnd = e => {
    if (e.propertyName !== 'opacity') return;
    gameContainer.removeEventListener('transitionend', onEnd);
    document.querySelectorAll('.trail').forEach(el => el.remove());
    if ('actionX' in d) coordX += +d.actionX;
    if ('actionY' in d) coordY += +d.actionY;
    updateCell(coordX, coordY);
    const maxX = window.innerWidth - snailContainer.offsetWidth;
    if (wrapDir > 0) posX = 100;
    else if (wrapDir < 0) posX = maxX - 100;
    snailContainer.style.left = posX + 'px';
    requestAnimationFrame(() => gameContainer.classList.remove('fade-out'));
  };
  gameContainer.addEventListener('transitionend', onEnd);
}


btns.forEach(btn =>
  btn.addEventListener('click', e => performMove(e.currentTarget.dataset, 0))
);

// — Effet skid/flame —
function spawnFlame() {
  const flame = document.createElement('div');
  flame.className = 'flame';
  const rect = snailContainer.getBoundingClientRect();
  const offsetX = velocityX > 0 ? -10 : 10;
  flame.style.left = rect.left + rect.width / 2 + offsetX + 'px';
  flame.style.top  = rect.top + rect.height - 8 + 'px';
  document.body.appendChild(flame);
  flame.addEventListener('animationend', () => flame.remove());
}

// — Animation du personnage (vitesse constante) —
function animateCharacter(ts) {
  if (velocityX < 0) {
    snailContainer.style.transform = 'scaleX(-1)';
  } else if (velocityX > 0) {
    snailContainer.style.transform = 'scaleX(1)';
  }

  const maxX = window.innerWidth - snailContainer.offsetWidth;
  posX = Math.min(Math.max(posX + velocityX, 0), maxX);
  snailContainer.style.left = posX + 'px';
  snailContainer.style.top  = posY + 'px';

  if (velocityX !== 0 && ts - lastTrailTime > trailInterval) {
    const trail = document.createElement('div');
    trail.className = 'trail';
    const rect = snailElem.getBoundingClientRect();
    trail.style.left = rect.left + rect.width / 2 - 10 + 'px';
    trail.style.top  = rect.bottom + 4 + 'px';
    document.body.appendChild(trail);
    setTimeout(() => trail.remove(), 6000);
    lastTrailTime = ts;
  }

  const atL = velocityX < 0 && !thresholdCrossed && posX < threshold;
  const atR = velocityX > 0 && !thresholdCrossed && posX > (maxX - threshold);
  if (atL) { thresholdCrossed = true; performMove({ actionX: -1 }, -1); }
  if (atR) { thresholdCrossed = true; performMove({ actionX: 1 }, 1); }

  requestAnimationFrame(animateCharacter);
}


document.addEventListener('DOMContentLoaded', () => {
  const bubble = document.querySelector('.beffroi-jeu-fleche');
  if (bubble) {
    bubble.addEventListener('click', () => {
      flashFade(); 
      coordX = 0;
      coordY = 1;
      updateCell(coordX, coordY);
    });
  }
});


// — Pluie d’objets & collisions —
function randomX() {
  return Math.random() * (window.innerWidth - 30);
}

function spawnObject() {
  if (!gameActive) return;
  const obj = document.createElement('img');
  obj.src = "img jeux/brique.png";
  obj.className = 'falling-object';
  obj.style.position = 'absolute';
  obj.style.top  = '-30px';
  obj.style.left = randomX() + 'px';
  document.body.appendChild(obj);
  fallingObjects.push(obj);
}


function animateObjects() {
  if (!gameActive) {
    animatingObjects = false; // on arrête la boucle si le jeu est fini
    return;
  }

  animatingObjects = true; // flag pour indiquer que la boucle est active

  const charR = snailElem.getBoundingClientRect();
  for (let i = fallingObjects.length - 1; i >= 0; i--) {
    const obj = fallingObjects[i];
    // fait tomber la brique
    obj.style.top = parseFloat(obj.style.top) + fallSpeed + 'px';
    const oR = obj.getBoundingClientRect();
    // collision avec l'escargot ?
    if (
      charR.left < oR.right && charR.right > oR.left &&
      charR.top  < oR.bottom && charR.bottom > oR.top
    ) {
      hits++;
      snailElem.classList.add('flash-hold');
      setTimeout(() => snailElem.classList.remove('flash-hold'), 200);
      obj.remove();
      fallingObjects.splice(i, 1);
      if (hits >= maxHits) endGame(false);
      continue;
    }
    // si la brique est sortie en bas de l'écran, on la supprime
    if (oR.top > window.innerHeight) {
      obj.remove();
      fallingObjects.splice(i, 1);
    }
  }

  requestAnimationFrame(animateObjects);
}


// — Démarrage & fin du mini-jeu —
function startGame() {
  // ───────────> 1. Nettoyage des anciennes briques (pour éviter toute "stack")
  fallingObjects.forEach(o => o.remove());
  fallingObjects.length = 0;

  // ───────────> 2. On coupe TOUS les anciens timers (au cas où), avant de repartir
  if (spawnTimer !== null)   clearInterval(spawnTimer);
  if (successTimer !== null) clearTimeout(successTimer);
  if (timerInterval !== null) clearInterval(timerInterval);

  if (coordX !== 0 || coordY !== 1) {
    alert("Positionnez-vous sur (0,1) pour démarrer !");
    return;
  }
  if (gameActive) return;

  // ───────────> 3. Réinitialisation de l'état
  gameActive = true;
  if (!animatingObjects) requestAnimationFrame(animateObjects);
  hits = 0;
  startBtn.style.display = 'none';

  coordX = 0; coordY = 1;
  posX = 200; posY = 450;
  velocityX = 0;
  updateCell(coordX, coordY);
  snailContainer.style.left = posX + 'px';
  snailContainer.style.top  = posY + 'px';

  // ───────────> 4. Lancement des timers (survie + spawn)
  remainingTime = survivalTime;
  timerElem.textContent = Math.ceil(remainingTime / 1000) + 's';
  timerInterval = setInterval(() => {
    remainingTime -= 1000;
    timerElem.textContent = Math.ceil(Math.max(remainingTime, 0) / 1000) + 's';
  }, 1000);

  spawnTimer   = setInterval(spawnObject, spawnInterval);
  successTimer = setTimeout(() => endGame(true), survivalTime);
  requestAnimationFrame(animateObjects);
}

function endGame(won) {
  gameActive = false;

  // Arrêt des timers en cours
  if (spawnTimer !== null)   clearInterval(spawnTimer);
  if (successTimer !== null) clearTimeout(successTimer);
  if (timerInterval !== null) clearInterval(timerInterval);

  timerElem.textContent = '';
  // Suppression de toutes les briques restantes
  fallingObjects.forEach(o => o.remove());
  fallingObjects.length = 0;

  if (!won) {
    coordX = 1; coordY = 1;
    posX = 100; posY = 450;
    velocityX = 0;
    updateCell(coordX, coordY);
    snailContainer.style.left = posX + 'px';
    snailContainer.style.top  = posY + 'px';

    const cell = document.querySelector('.js-cell[data-x="1"][data-y="1"]');
    cell.querySelector('.death-msg')?.remove();
    const msg = document.createElement('div');
    msg.className = 'death-msg';
    msg.innerHTML = `
      <p>Vous êtes mort !</p>
      <button class="death-ok">OK</button>
      <button class="death-restart">Recommencer</button>
    `;
    cell.appendChild(msg);

    msg.querySelector('.death-ok').addEventListener('click', () => msg.remove());
    msg.querySelector('.death-restart').addEventListener('click', () => {
      msg.remove();
      coordX = 0; coordY = 1;
      posX = 100; posY = 450;
      velocityX = 0;
      updateCell(coordX, coordY);
      snailContainer.style.left = posX + 'px';
      snailContainer.style.top  = posY + 'px';
      startGame();
    });
 } else {
  coordX = 1; coordY = 1;
  posX = 100; posY = 450;
  velocityX = 0;
  updateCell(coordX, coordY);
  snailContainer.style.left = posX + 'px';
  snailContainer.style.top  = posY + 'px';

  // Remplacer image beffroi cassé par version normale
  /*const beffroiCassé = document.querySelector('img.beffroi');
  if (beffroiCassé) beffroiCassé.src = "img batiment/beffroi.png";*/

  // Supprimer ancien message si existant
  const cell = document.querySelector('.js-cell[data-x="1"][data-y="1"]');
  cell.querySelector('.death-msg')?.remove();

// Changer l'apparence du beffroi (comme pour la gare)
const beffroiBrisé = document.querySelector('img.beffroi1');
const beffroiNormal = document.querySelector('img.beffroi');
if (beffroiBrisé)  beffroiBrisé.style.opacity = '0';
if (beffroiNormal) beffroiNormal.style.opacity = '1';

// Ajouter message de victoire
const msg = document.createElement('div');
msg.className = 'death-msg';
msg.innerHTML = `
  <p>🎉 Tu as réussi le mini-jeu !</p>
  <button class="death-ok">OK</button>
`;
cell.appendChild(msg);
msg.querySelector('.death-ok').addEventListener('click', () => msg.remove());

// — Avancer la clé d’une image (global) —
/*if (keyStep < imagesCycle.length - 1) {
  keyStep++;
  // Met à jour toutes les images .cycle-img en leur attribuant la nouvelle source
  document.querySelectorAll('.cycle-img').forEach(img => {
    img.src = imagesCycle[keyStep];
    img.dataset.step = keyStep;
  });*/
  // Si on est à la dernière étape, on supprime tous les boutons des bâtiments
 if (keyStep < imagesCycle.length - 1) {
   keyStep++;
   document.querySelectorAll('.cycle-img').forEach(img => {
     img.src = imagesCycle[keyStep];
     img.dataset.step = keyStep;
   });
   if (keyStep === imagesCycle.length - 1) {
     document.querySelectorAll('.batiment-btn').forEach(b => b.remove());
   }
  if (keyStep === imagesCycle.length - 1) {
    showGoToBourseMessage();
  }
 }

}

}


// — Contrôles clavier : vitesse instantanée —
let isHolding = false;
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); return; }

  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !isHolding && !e.repeat) {
    isHolding = true;
    thresholdCrossed = false;
    snailElem.classList.add('accordion');
    snailElem.classList.remove('flash');
    snailElem.classList.add('flash-hold');
  }

  if (e.key === 'ArrowLeft') {
    velocityX = -constantSpeed;
  } else if (e.key === 'ArrowRight') {
    velocityX = constantSpeed;
  }
});

document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    isHolding = false;
    velocityX = 0;
    snailElem.classList.remove('accordion');
    snailElem.classList.remove('flash-hold');
    snailElem.classList.add('flash');
    snailElem.addEventListener('animationend', function h() {
      snailElem.classList.remove('flash');
      snailElem.removeEventListener('animationend', h);
    });
  }
});

// — Lancement initial des boucles d’animation —
startBtn.addEventListener('click', startGame);
requestAnimationFrame(animateCharacter);
requestAnimationFrame(animateObjects);

// — Mini-jeu « particules » (rotations & vérification de victoire) —
const directionMap = [0, 90, 180, 270]; 
let gameWon = false;

const targetCombinations = {
  bleu: [0, 180, 0, 180, 90, 0, 180, 270],      
  vert: [90, 270, 0, 180],          
  rouge: [0, 180, 90, 270],      
  jaune: [90, 270, 90, 270, 90, 270]         
};
document.querySelectorAll(".particule").forEach(el => {
  el.addEventListener("click", () => rotateParticule(el));
});
const rotationState = {};
let jeuVerrouille = false;

function rotateParticule(el) {
  if (jeuVerrouille) return;

  const classes = el.className.split(" ");
  const colorClass = classes.find(c => c.startsWith("particule-")).split("-");
  const color = colorClass[1];
  const index = colorClass[2];

  const key = `${color}-${index}`;
  rotationState[key] = (rotationState[key] || 0) + 1;
  const rotationIndex = rotationState[key] % 4;
  const angle = directionMap[rotationIndex];

  el.style.transform = `rotate(${angle}deg)`;

  checkVictory();
}

function checkVictory() {
  let gagné = true;

  Object.keys(targetCombinations).forEach(couleur => {
    const combinaison = targetCombinations[couleur];
    for (let i = 1; i <= combinaison.length; i++) {
      const key = `${couleur}-${i}`;
      const element = document.querySelector(`.particule-${couleur}-${i}`);
      const expected = combinaison[i - 1];
      const state = directionMap[(rotationState[key] || 0) % 4];
      if (state !== expected) {
        gagné = false;
        break;
      }
    }
  });

  if (gagné && !jeuVerrouille) {
  console.log("🎉 Condition de victoire atteinte !");
  jeuVerrouille = true;

  // Sélecteurs des éléments à animer
  const train = document.querySelector('.train');
  const panneau = document.querySelector('.panneau-allumé');
  const textGare = document.querySelector('.txt-gare');

  // Déclenche l'animation train
  if (train) {
    train.classList.add('train-slide');
  }

  // Affiche le panneau avec opacité 1
  if (panneau) {
    panneau.classList.add('panneau-on');
  }

  if (textGare){
    textGare.classList.add('panneau-on');
  }
      // ––– Avancer la clé d’une image –––
     if (keyStep < imagesCycle.length - 1) {
    keyStep++;
    document.querySelectorAll('.cycle-img').forEach(img => {
      img.src = imagesCycle[keyStep];
      img.dataset.step = keyStep;
    });
    if (keyStep === imagesCycle.length - 1) {
      document.querySelectorAll('.batiment-btn').forEach(b => b.remove());
    }
   if (keyStep === imagesCycle.length - 1) {
     showGoToBourseMessage();
   }
  }


}
}


/* === PARTIE « clé » : progression GLOBALE au lieu de locale === */

// 1) On centralise le pas dans une variable globale
let keyStep = 0; // valeur initiale : première image du cycle

const imagesCycle = [
  'img cle/cle0.png',
  'img cle/cle1.png',
  'img cle/cle2.png',
  'img cle/cle3.png',
  'img cle/cle4.png',
  'img cle/cle5.png',
  'img cle/cle6.png',
  'img cle/cle7.png'
];
const imagesBtn = 'img cle/cle7.png';

const preloadedImages = imagesCycle.map(src => {
  const tmp = new Image();
  tmp.src = src;
  return tmp;
});

// 3) Parcours de toutes les cellules non-noires
document.querySelectorAll('.js-cell:not(.cell--black)').forEach(cell => {
  // (A) Création de l'<img> pour la clé
  const imgElem = document.createElement('img');
  imgElem.src = imagesCycle[keyStep];
  imgElem.dataset.step = keyStep;
  imgElem.classList.add('cycle-img');
  imgElem.style.pointerEvents = 'none';
  imgElem.style.opacity = '1';
  cell.appendChild(imgElem);

  // (B) Si c’est un bâtiment, on crée l’image-bouton
  if (cell.classList.contains('batiment')) {
    const btnImg = document.createElement('img');
    btnImg.src = imagesBtn;
    btnImg.classList.add('batiment-btn');
    btnImg.style.position = 'absolute';
    btnImg.style.zIndex = '2001';

    // 1) Récupère les coordonnées x et y de la cellule
    const x = +cell.dataset.x;
    const y = +cell.dataset.y;

    // 2) Cas particulier pour (4,2) et (2,2)
    if (x === 4 && y === 2) {
      btnImg.style.top = '62%';
      btnImg.style.left = '89.5%';
      btnImg.style.transform = 'translateX(-50%)';
      btnImg.style.zIndex = '3';
    } else if (x === 1 && y === 3) {
      btnImg.style.top = '35%';
      btnImg.style.left = '93.8%';
      btnImg.style.transform = 'translateX(-50%)';
    } else if (x === 3 && y === 3){
      btnImg.style.top = '36%';
      btnImg.style.left = '35%';
      btnImg.style.transform = 'translateX(-50%)';
    } else if (x === 2 && y === 4){
      btnImg.style.top = '87%';
      btnImg.style.left = '88%';
      btnImg.style.transform = 'translateX(-50%)';
      btnImg.style.zIndex = '3';
    } else {
      // Position par défaut pour les autres bâtiments
      btnImg.style.bottom = '5px';
      btnImg.style.left = '5px';
    }

    cell.appendChild(btnImg);

    // 3) Événement clic sur l’image-bouton
    btnImg.addEventListener('click', () => {
      btnImg.style.pointerEvents = 'none';
      if (keyStep < imagesCycle.length - 1) {
        keyStep++;
        document.querySelectorAll('.cycle-img').forEach(img => {
          img.src = imagesCycle[keyStep];
          img.dataset.step = keyStep;
        });
        if (keyStep < imagesCycle.length - 1) {
          setTimeout(() => {
            btnImg.style.pointerEvents = 'auto';
          }, 100);
        } else {
          document.querySelectorAll('.batiment-btn').forEach(b => b.remove());
        }
      } else {
        document.querySelectorAll('.batiment-btn').forEach(b => b.remove());
      }
    });
  }
});

console.log("Cycle de la clé initialisé, étape courante =", keyStep);
console.log(imagesCycle);

// ─── A) INSÉRER LE CODE GSAP APRÈS TOUT VOTRE JS PRÉCÉDENT ─────────────────────
// ─── Sélection de tous les boutons/éléments "batiment-btn" ─────────────────────
const batimentBtns = document.querySelectorAll('.batiment-btn');

batimentBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // 1) On récupère la position et la taille réelles de l’élément dans la fenêtre :
    const rect = btn.getBoundingClientRect();

    // 2) On rattache immédiatement l’élément au <body> pour pouvoir le positionner en fixed.
    document.body.appendChild(btn);

    // 3) On force position:fixed + on fixe son width/height à ce qu’il occupait dans le DOM d’origine
    btn.style.position = 'fixed';
    btn.style.left     = rect.left + 'px';
    btn.style.top      = rect.top  + 'px';
    btn.style.width    = rect.width  + 'px';
    btn.style.height   = rect.height + 'px';
    btn.style.zIndex   = '9999';

    // 3.1) On s’assure que le scale se fait depuis le centre de l’image
    btn.style.transformOrigin = 'center center';

    // 4) Calcul du point central exact de la fenêtre (viewport)
    const centreX = window.innerWidth  / 2 - rect.width  / 2;
    const centreY = window.innerHeight / 2 - rect.height / 2;

    // 5) On crée la timeline GSAP en mode defaults
    const tl = gsap.timeline({
      defaults: {
        duration: 0.8,
        ease: "power2.out"
      }
    });

    // 5.1) On demande d’abord le déplacement + scale simultanément
    tl.to(btn, {
      x: centreX - rect.left,   // on translate jusqu’à left = centreX
      y: centreY - rect.top,    // on translate jusqu’à top  = centreY
      scale: 10                  // zoom 3× depuis le centre
    });

    // 5.2) En parallèle, on superpose un shake horizontal (yoyo + repeat)
    //      Grâce à "<", ce tween démarre exactement en même temps que le scale+move.
    tl.to(btn, {
      x: "+=10",         // amplitude du tremblement en pixels
      yoyo: true,        // GSAP repasse au x initial à chaque cycle
      repeat: 3,         // 5 aller-retours → termine au x initial
      ease: "power1.inOut",
      duration: 0.3      // durée d’un mini tremblement
    }, "<");

    // 5.3) Quand scale+shake sont finis, on fait un fade-out puis un remove()
    tl.to(btn, {
      opacity: 0,
      duration: 0.4,
      onComplete: () => btn.remove()
    }, ">");
  });
});


/* cathedrale */



document.addEventListener('DOMContentLoaded', () => {
  const bubble = document.querySelector('.pnj-dialogue');
  if (bubble) {
    bubble.addEventListener('click', () => {
      flashFade(); 
      coordX = 0;
      coordY = 3;
      updateCell(coordX, coordY);
    });
  }
});

// Piano

// Séquences de notes à jouer
const sequences = [
  ['si', 'la', 'sol', 'mi'],
  ['la', 'fa', 're', 'mi'],
  ['re', 'do', 'mi', 're']
];

let currentSequenceIndex = 0;
let playerSequence = [];
function playNote(note) {
  const audio = new Audio(`sons/${note}.mp3`);
  audio.play();
}
function playVictoryMusic() {
  victoryMusic = new Audio('sons/victoire.mp3');
  victoryMusic.play();
}


const dialogueBoxJeu = document.getElementById('dialogue-box-jeu');

// Affiche une séquence pendant 1.5 sec
function showSequence() {
  const sequence = sequences[currentSequenceIndex];
  dialogueBoxJeu.textContent = sequence.join(', ');
  dialogueBoxJeu.style.display = 'block';

  
  setTimeout(() => {
    dialogueBoxJeu.style.display = 'none';
  }, 2500);

  console.log("Suite affichée :", sequence);
}

// Vérifie les clics du joueur
function handleNoteClick(note) {
  playerSequence.push(note);

  const currentExpected = sequences[currentSequenceIndex];
  for (let i = 0; i < playerSequence.length; i++) {
    if (playerSequence[i] !== currentExpected[i]) {
      // Mauvaise note : reset la saisie et réaffiche la suite
      playerSequence = [];
      showSequence();
      return;
    }
  }

  if (playerSequence.length === currentExpected.length) {
    currentSequenceIndex++;
    playerSequence = [];

    if (currentSequenceIndex < sequences.length) {
      setTimeout(() => {
        showSequence();
      }, 500); // Petite pause avant la suite suivante
    } else {
      dialogueBoxJeu.textContent = 'Félicitations !';
      dialogueBoxJeu.style.display = 'block';
      playVictoryMusic();
      // — Avancer la clé d’une image (mini-jeu en (0,3)) —
             if (keyStep < imagesCycle.length - 1) {
        keyStep++;
        document.querySelectorAll('.cycle-img').forEach(img => {
          img.src = imagesCycle[keyStep];
          img.dataset.step = keyStep;
        });
        if (keyStep === imagesCycle.length - 1) {
          document.querySelectorAll('.batiment-btn').forEach(b => b.remove());
        }
      if (keyStep === imagesCycle.length - 1) {
        showGoToBourseMessage();
      }
      }

    }
  }
}

// ? Réinitialise le mini-jeu (appelé quand on entre dans la case)
function resetMemoryGame() {
  currentSequenceIndex = 0;
  playerSequence = [];
  showSequence();
}

document.querySelectorAll('.piano-touch').forEach(touch => {
  touch.addEventListener('click', () => {
    const note = touch.dataset.note;
    playNote(note);
    handleNoteClick(note); // cette fonction vient du jeu mémoire
  });
});
