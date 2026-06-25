/**
 * ✨ NAVI — Fairy Particle Effect (Zelda-inspired)
 * Mobile-responsive: all sizes scale from window dimensions.
 * Tap / click to trigger voice + sparkle burst.
 */

// ─── RESPONSIVE SCALE HELPER ─────────────────────────────────────────────────
// One number that shrinks everything proportionally on small screens.
// 1.0 at 800 px wide, smaller on phones, capped at 1.4 on large monitors.
function getScale() {
  return constrain(min(windowWidth, windowHeight) / 700, 0.45, 1.4);
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// All pixel values are BASE values multiplied by scale() at runtime.

const CONFIG = {
  // Spring physics
  springStrength: 0.045,
  damping: 0.88,
  bobSpeed: 0.04,

  // Fairy appearance — base px (scaled at draw time)
  fairyRadius: 20,
  glowLayers: 5,
  pulseSpeed: 0.07,
  pulseAmount: 5,
  orbitCount: 6,
  orbitRadius: 22,
  orbitSpeed: 0.032,
  orbitSize: 2.5,

  // Trail dust
  baseLifespan: 140,
  lifespanJitter: 80,
  fadeFrames: 55,
  dustSize: 1.5,
  dustSizeJitter: 1,
  noiseScale: 0.006,
  noiseStrength: 0.45,
  noiseZSpeed: 0.001,
  trailAlpha: 22,

  // Pastel palette [H, S%, L%]
  palette: [
    [195, 75, 85],
    [210, 65, 88],
    [270, 60, 87],
    [150, 50, 85],
    [310, 55, 88],
  ],
  naviHue: 195,
  naviSat: 80,
  naviLit: 88,
};

// Dynamic values that depend on current screen size — recalculated on resize
let SC = 1; // current scale factor
let maxParticles = 350; // reduced on small screens for perf
let trailRate = 2;
let trailRateIdle = 1;
let isMobile = false;

function updateResponsive() {
  SC = getScale();
  isMobile = windowWidth < 600;
  // Fewer particles on small / low-res screens = better fps
  maxParticles = isMobile ? 180 : 350;
  trailRate = isMobile ? 1 : 2;
  trailRateIdle = 1;
}

// ─── HSL → RGB ───────────────────────────────────────────────────────────────

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255),
  ];
}

// ─── DUST PARTICLE CLASS ──────────────────────────────────────────────────────

class DustParticle {
  constructor(x, y, inheritVelX, inheritVelY) {
    this.pos = createVector(x, y);
    const spread = random(0.3, 0.9);
    this.vel = createVector(
      inheritVelX * spread + random(-0.6, 0.6),
      inheritVelY * spread + random(-0.6, 0.6),
    );
    this.acc = createVector(0, 0);

    const entry = CONFIG.palette[floor(random(CONFIG.palette.length))];
    this.hue = entry[0] + random(-12, 12);
    this.sat = entry[1];
    this.lit = entry[2];

    // Scale dust size with screen
    this.size = max(
      1,
      (CONFIG.dustSize +
        random(-CONFIG.dustSizeJitter, CONFIG.dustSizeJitter)) *
        SC,
    );
    this.maxLife =
      CONFIG.baseLifespan +
      random(-CONFIG.lifespanJitter, CONFIG.lifespanJitter);
    this.life = this.maxLife;
    this.twinkleOffset = random(TWO_PI);
    this.twinkleSpeed = random(0.06, 0.16);
  }

  applyNoise(zOff) {
    const angle =
      noise(
        this.pos.x * CONFIG.noiseScale,
        this.pos.y * CONFIG.noiseScale,
        zOff,
      ) *
      TWO_PI *
      2;
    const f = p5.Vector.fromAngle(angle);
    f.setMag(CONFIG.noiseStrength * 0.04);
    this.acc.add(f);
  }

  update(zOff) {
    this.applyNoise(zOff);
    this.vel.add(this.acc);
    this.vel.limit(1.4);
    this.pos.add(this.vel);
    this.vel.mult(0.97);
    this.acc.set(0, 0);
    this.life--;
  }

  isDead() {
    return this.life <= 0;
  }

  getAlpha() {
    const fadeIn = min(1, (this.maxLife - this.life) / 15);
    if (this.life > CONFIG.fadeFrames) return fadeIn;
    return fadeIn * (this.life / CONFIG.fadeFrames);
  }

  getSize() {
    return this.size * lerp(0.2, 1.0, this.getAlpha());
  }

  draw() {
    const a = this.getAlpha();
    if (a <= 0.01) return;
    const twinkle = sin(frameCount * this.twinkleSpeed + this.twinkleOffset);
    const [r, g, b] = hslToRgb(this.hue, this.sat, this.lit + twinkle * 7);
    const [rC, gC, bC] = hslToRgb(
      this.hue,
      this.sat,
      min(this.lit + twinkle * 7 + 14, 98),
    );
    const sz = this.getSize();

    noStroke();
    fill(r, g, b, a * 25);
    circle(this.pos.x, this.pos.y, sz * 5);
    fill(r, g, b, a * 60);
    circle(this.pos.x, this.pos.y, sz * 3);
    fill(rC, gC, bC, a * 210);
    circle(this.pos.x, this.pos.y, sz * 2);
    fill(255, 250, 255, a * 180);
    circle(this.pos.x, this.pos.y, sz * 0.7);

    const len = sz * 2.2;
    stroke(r, g, b, a * 120);
    strokeWeight(0.6);
    line(this.pos.x - len, this.pos.y, this.pos.x + len, this.pos.y);
    line(this.pos.x, this.pos.y - len, this.pos.x, this.pos.y + len);
    const d = len * 0.55;
    line(this.pos.x - d, this.pos.y - d, this.pos.x + d, this.pos.y + d);
    line(this.pos.x + d, this.pos.y - d, this.pos.x - d, this.pos.y + d);
    noStroke();
  }
}

// ─── FAIRY CLASS ─────────────────────────────────────────────────────────────

class Fairy {
  constructor() {
    this.pos = createVector(width / 2, height / 2);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.bobT = 0;
    this.pulseT = 0;
    this.rgb = hslToRgb(CONFIG.naviHue, CONFIG.naviSat, CONFIG.naviLit);
    this.orbiters = [];
    this._buildOrbiters();
  }

  _buildOrbiters() {
    this.orbiters = [];
    for (let i = 0; i < CONFIG.orbitCount; i++) {
      this.orbiters.push({
        angle: (TWO_PI / CONFIG.orbitCount) * i,
        angleOff: random(TWO_PI),
        speed: CONFIG.orbitSpeed * random(0.7, 1.3),
        dist: CONFIG.orbitRadius * random(0.8, 1.25),
        size: CONFIG.orbitSize * random(0.7, 1.4),
        hue: CONFIG.palette[floor(random(CONFIG.palette.length))][0],
        sat: CONFIG.palette[floor(random(CONFIG.palette.length))][1],
        lit: CONFIG.palette[floor(random(CONFIG.palette.length))][2],
      });
    }
  }

  update(targetX, targetY) {
    const dx = targetX - this.pos.x;
    const dy = targetY - this.pos.y;
    this.acc.set(dx * CONFIG.springStrength, dy * CONFIG.springStrength);
    this.vel.add(this.acc);
    this.vel.mult(CONFIG.damping);
    this.bobT += CONFIG.bobSpeed;
    this.pulseT += CONFIG.pulseSpeed;
    this.vel.y += sin(this.bobT) * 0.25;
    this.pos.add(this.vel);
    for (const orb of this.orbiters) orb.angle += orb.speed;
  }

  getSpeed() {
    return this.vel.mag();
  }

  draw() {
    const R = (CONFIG.fairyRadius + sin(this.pulseT) * CONFIG.pulseAmount) * SC;
    const [r, g, b] = this.rgb;
    const x = this.pos.x,
      y = this.pos.y;

    noStroke();
    for (let i = CONFIG.glowLayers; i >= 1; i--) {
      fill(r, g, b, 18 * (1 / i));
      circle(x, y, R * (1 + i * 1.1) * 2);
    }
    fill(r, g, b, 55);
    circle(x, y, R * 3.5);

    const [rC, gC, bC] = hslToRgb(
      CONFIG.naviHue,
      CONFIG.naviSat,
      min(CONFIG.naviLit + 8, 98),
    );
    fill(rC, gC, bC, 240);
    circle(x, y, R * 2);
    fill(255, 252, 255, 230);
    circle(x, y, R * 0.85);

    this.drawFairySpokes(R, r, g, b);
    this.drawOrbiters();
  }

  drawFairySpokes(R, r, g, b) {
    const len = R * 3.0;
    stroke(r, g, b, 150);
    strokeWeight(1.0);
    line(this.pos.x - len, this.pos.y, this.pos.x + len, this.pos.y);
    line(this.pos.x, this.pos.y - len, this.pos.x, this.pos.y + len);
    const d = len * 0.65;
    stroke(r, g, b, 100);
    strokeWeight(0.7);
    line(this.pos.x - d, this.pos.y - d, this.pos.x + d, this.pos.y + d);
    line(this.pos.x + d, this.pos.y - d, this.pos.x - d, this.pos.y + d);
    noStroke();
  }

  drawOrbiters() {
    for (const orb of this.orbiters) {
      const wobble = sin(orb.angle * 2 + orb.angleOff) * 4 * SC;
      const ox = this.pos.x + cos(orb.angle) * (orb.dist + wobble) * SC;
      const oy = this.pos.y + sin(orb.angle) * (orb.dist + wobble) * SC * 0.6;
      const [r, g, b] = hslToRgb(orb.hue, orb.sat, orb.lit);
      const sz = orb.size * SC;
      noStroke();
      fill(r, g, b, 30);
      circle(ox, oy, sz * 5);
      fill(r, g, b, 180);
      circle(ox, oy, sz * 2);
      fill(255, 250, 255, 200);
      circle(ox, oy, sz * 0.8);
    }
  }
}

// ─── PARTICLE SYSTEM ─────────────────────────────────────────────────────────

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.zOff = 0;
  }

  shed(fairy) {
    const rate = fairy.getSpeed() > 1.0 ? trailRate : trailRateIdle;
    for (let i = 0; i < rate; i++) {
      if (this.particles.length >= maxParticles) this.particles.shift();
      this.particles.push(
        new DustParticle(
          fairy.pos.x + random(-6, 6),
          fairy.pos.y + random(-6, 6),
          fairy.vel.x,
          fairy.vel.y,
        ),
      );
    }
  }

  update() {
    this.zOff += CONFIG.noiseZSpeed;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(this.zOff);
      if (this.particles[i].isDead()) this.particles.splice(i, 1);
    }
  }

  draw() {
    for (const p of this.particles) p.draw();
  }
  getCount() {
    return this.particles.length;
  }
}

// ─── GLOBALS ─────────────────────────────────────────────────────────────────

let fairy, system;

// Speech bubble
const BUBBLE_SHOW_MS = 4000;
const BUBBLE_FADE_MS = 500;
let bubbleState = "HIDDEN";
let bubbleStateAt = 0;
let bubbleAlpha = 0;
let naviCurrentPhrase = "Hey, listen!";

// Music
let musicCtx = null;
let musicGain = null;
let musicVol = 0.18;
let musicStarted = false;
let noteIndex = 0;
let nextNoteTime = 0;

// Volume slider — coordinates computed responsively in draw
let sliderDragging = false;

// ─── FAIRY FOUNTAIN MUSIC ENGINE ─────────────────────────────────────────────

const MELODY = [
  ["A", 4, 0.5],
  ["C#", 5, 0.5],
  ["E", 5, 0.5],
  ["A", 5, 1.0],
  ["G#", 5, 0.5],
  ["E", 5, 0.5],
  ["C#", 5, 0.5],
  ["A", 4, 1.0],
  ["E", 5, 0.5],
  ["F#", 5, 0.5],
  ["G#", 5, 0.5],
  ["A", 5, 1.5],
  ["F#", 5, 0.5],
  ["E", 5, 0.5],
  ["C#", 5, 0.5],
  ["A", 4, 2.0],
  ["C#", 5, 0.5],
  ["B", 4, 0.5],
  ["A", 4, 0.5],
  ["E", 4, 1.0],
  ["F#", 4, 0.5],
  ["G#", 4, 0.5],
  ["A", 4, 0.5],
  ["E", 4, 1.5],
  ["A", 4, 0.5],
  ["E", 5, 0.5],
  ["A", 5, 0.5],
  ["E", 5, 0.5],
  ["C#", 5, 0.5],
  ["A", 4, 0.5],
  ["E", 4, 0.5],
  ["A", 3, 2.0],
];
const BPM = 76;
const BEAT_SEC = 60 / BPM;
const LOOKAHEAD = 0.12;
const NOTE_MAP = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

function noteToHz(name, octave) {
  return (
    440 * Math.pow(2, ((octave - 4) * 12 + NOTE_MAP[name] - NOTE_MAP["A"]) / 12)
  );
}

function startMusic() {
  if (musicStarted) return;
  musicStarted = true;
  musicCtx = new (window.AudioContext || window.webkitAudioContext)();
  musicGain = musicCtx.createGain();
  musicGain.gain.setValueAtTime(musicVol, musicCtx.currentTime);
  musicGain.connect(musicCtx.destination);
  nextNoteTime = musicCtx.currentTime + 0.1;
}

function scheduleMusicFrame() {
  if (!musicStarted || !musicCtx) return;
  while (nextNoteTime < musicCtx.currentTime + LOOKAHEAD) {
    const [name, octave, beats] = MELODY[noteIndex % MELODY.length];
    const freq = noteToHz(name, octave);
    const dur = beats * BEAT_SEC;
    const t = nextNoteTime;

    const osc1 = musicCtx.createOscillator();
    const osc2 = musicCtx.createOscillator();
    const env = musicCtx.createGain();
    const g2 = musicCtx.createGain();

    osc1.type = "sine";
    osc1.frequency.value = freq;
    osc2.type = "triangle";
    osc2.frequency.value = freq * 2.001;
    g2.gain.value = 0.25;

    osc1.connect(env);
    osc2.connect(g2);
    g2.connect(env);
    env.connect(musicGain);

    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.55, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.18, t + dur * 0.4);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.1);

    osc1.start(t);
    osc1.stop(t + dur * 1.2);
    osc2.start(t);
    osc2.stop(t + dur * 1.2);

    nextNoteTime += dur;
    noteIndex++;
  }
}

function setMusicVolume(v) {
  musicVol = constrain(v, 0, 1);
  if (musicGain)
    musicGain.gain.setTargetAtTime(musicVol, musicCtx.currentTime, 0.05);
}

// ─── VOLUME SLIDER HELPERS ────────────────────────────────────────────────────
// Slider lives bottom-left, sized relative to screen width

function sliderMetrics() {
  const pad = isMobile ? 16 : 20;
  const w = isMobile ? min(windowWidth * 0.35, 110) : 120;
  const h = isMobile ? 5 : 4;
  const knob = isMobile ? 11 : 7;
  const x = pad;
  const y = windowHeight - pad - knob;
  return { x, y, w, h, knob };
}

function sliderKnobX() {
  const { x, w } = sliderMetrics();
  return x + musicVol * w;
}

function overSlider(px, py) {
  const { x, y, w, knob } = sliderMetrics();
  const kx = x + musicVol * w;
  return dist(px, py, kx, y) < knob * 2.5; // generous hit area for fat fingers
}

// ─── NAVI VOICE ──────────────────────────────────────────────────────────────

const NAVI_PHRASES = [
  "Hey, listen!",
  "Hello!",
  "Watch out!",
  "Did you bring me snacks?",
  "Fooey!",
  "Over here!",
  "Look at that!",
];
let lastPhraseIndex = -1;
let isSpeaking = false;

function pickNaviPhrase() {
  let idx;
  do {
    idx = floor(random(NAVI_PHRASES.length));
  } while (idx === lastPhraseIndex && NAVI_PHRASES.length > 1);
  lastPhraseIndex = idx;
  return NAVI_PHRASES[idx];
}

function naviSpeak() {
  if (!window.speechSynthesis) return;
  const phrase = pickNaviPhrase();
  naviCurrentPhrase = phrase;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(phrase);
  utter.pitch = 2;
  utter.rate = 0.9;
  utter.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const female = voices.find((v) =>
    /samantha|karen|moira|tessa|zira|female/i.test(v.name),
  );
  if (female) utter.voice = female;
  isSpeaking = true;
  utter.onend = () => {
    isSpeaking = false;
  };
  utter.onerror = () => {
    isSpeaking = false;
  };
  window.speechSynthesis.speak(utter);
}

if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () =>
    window.speechSynthesis.getVoices();
}

// ─── SHARED TAP / CLICK HANDLER ──────────────────────────────────────────────

function handleTap(x, y) {
  // If tapping the slider area, skip the fairy burst
  if (overSlider(x, y)) return;

  for (let i = 0; i < 28; i++) {
    if (system.particles.length >= maxParticles) system.particles.shift();
    system.particles.push(
      new DustParticle(
        fairy.pos.x + random(-14, 14),
        fairy.pos.y + random(-14, 14),
        0,
        0,
      ),
    );
  }
  bubbleState = "SHOWING";
  bubbleStateAt = millis();
  naviSpeak();
  startMusic();
}

// ─── P5 LIFECYCLE ────────────────────────────────────────────────────────────

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255, 255, 255, 255);
  background(12, 8, 22);
  updateResponsive();

  fairy = new Fairy();
  system = new ParticleSystem();

  // Native touchend — iOS Safari loses gesture trust inside p5's wrapper
  const cnv = document.querySelector("canvas");
  cnv.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      const rect = cnv.getBoundingClientRect();
      const tx = t.clientX - rect.left;
      const ty = t.clientY - rect.top;

      // Slider drag end
      if (sliderDragging) {
        sliderDragging = false;
        return;
      }
      handleTap(tx, ty);
    },
    { passive: false },
  );

  cnv.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      const rect = cnv.getBoundingClientRect();
      if (overSlider(t.clientX - rect.left, t.clientY - rect.top)) {
        sliderDragging = true;
        e.preventDefault();
      }
    },
    { passive: false },
  );

  cnv.addEventListener(
    "touchmove",
    (e) => {
      if (!sliderDragging) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      const rect = cnv.getBoundingClientRect();
      const { x, w } = sliderMetrics();
      setMusicVolume((t.clientX - rect.left - x) / w);
    },
    { passive: false },
  );
}

function draw() {
  noStroke();
  fill(12, 8, 22, CONFIG.trailAlpha);
  rect(0, 0, width, height);

  // Bubble alpha
  let alphaTarget = 0;
  if (bubbleState === "SHOWING") {
    const age = millis() - bubbleStateAt;
    const fadeIn = min(age / BUBBLE_FADE_MS, 1);
    const fadeOut = min((BUBBLE_SHOW_MS - age) / BUBBLE_FADE_MS, 1);
    alphaTarget = min(fadeIn, fadeOut) * 255;
    if (age >= BUBBLE_SHOW_MS) bubbleState = "HIDDEN";
  }
  bubbleAlpha =
    bubbleState === "HIDDEN" && alphaTarget < 1
      ? 0
      : lerp(bubbleAlpha, alphaTarget, 0.12);

  // Mouse drag on slider (desktop)
  if (mouseIsPressed && !isMobile) {
    const { x, w } = sliderMetrics();
    if (sliderDragging) setMusicVolume((mouseX - x) / w);
  }

  fairy.update(mouseX, mouseY);
  system.shed(fairy);
  system.update();
  system.draw();
  fairy.draw();
  if (bubbleAlpha > 1) drawSpeechBubble();
  scheduleMusicFrame();
  drawVolumeSlider();
  drawHUD();
}

// ─── INTERACTIVITY ───────────────────────────────────────────────────────────

function mousePressed() {
  const { x, w } = sliderMetrics();
  if (overSlider(mouseX, mouseY)) {
    sliderDragging = true;
    return;
  }
  handleTap(mouseX, mouseY);
}

function mouseReleased() {
  sliderDragging = false;
}

function touchStarted() {
  return false;
} // handled by native listener
function touchMoved() {
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(12, 8, 22);
  updateResponsive();
}

// ─── SPEECH BUBBLE ───────────────────────────────────────────────────────────

function drawSpeechBubble() {
  const a = bubbleAlpha;
  const msg = naviCurrentPhrase;

  const fontSize = isMobile ? 13 : 14;
  textSize(fontSize);
  textFont("Georgia, serif");
  textStyle(BOLD);
  const tw = textWidth(msg);

  // Centre above fairy, clamped so it never goes off-screen edges
  const bh = isMobile ? 18 : 22;
  const bw = max(tw / 2 + 20, 60);
  const br = 12;
  const margin = bw + 8;
  const bx = constrain(fairy.pos.x + 18, margin, width - margin);
  const by = constrain(fairy.pos.y - 52 * SC, bh + 10, height - bh - 10);

  const [nr, ng, nb] = hslToRgb(CONFIG.naviHue, CONFIG.naviSat, CONFIG.naviLit);

  noStroke();
  stroke(nr, ng, nb, a * 0.7);
  strokeWeight(1.5);
  fill(18, 12, 32, a * 0.88);
  rect(bx - bw, by - bh, bw * 2, bh * 2, br);

  // Tail
  const tipX = fairy.pos.x + 2;
  const tipY = constrain(fairy.pos.y - 16 * SC, by + bh + 2, fairy.pos.y);
  const tlx = bx - 10,
    trx = bx + 2;
  const tailY = by + bh;

  noStroke();
  fill(18, 12, 32, a * 0.88);
  triangle(tlx, tailY, trx, tailY, tipX, tipY);
  stroke(nr, ng, nb, a * 0.7);
  strokeWeight(1.5);
  line(tlx, tailY, tipX, tipY);
  line(trx, tailY, tipX, tipY);

  noStroke();
  fill(nr, ng, nb, a * 0.35);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text(msg, bx + 1, by + 1);
  fill(240, 248, 255, a * 0.95);
  text(msg, bx, by);
  textStyle(NORMAL);
}

// ─── VOLUME SLIDER ───────────────────────────────────────────────────────────

function drawVolumeSlider() {
  const { x, y, w, h, knob } = sliderMetrics();
  const kx = x + musicVol * w;
  const [nr, ng, nb] = hslToRgb(CONFIG.naviHue, CONFIG.naviSat, CONFIG.naviLit);

  noStroke();
  // Track background
  fill(255, 255, 255, 30);
  rect(x, y - h / 2, w, h, h);

  // Filled portion
  fill(nr, ng, nb, 120);
  rect(x, y - h / 2, musicVol * w, h, h);

  // Knob
  fill(255, 255, 255, 180);
  circle(kx, y, knob * 2);
  fill(nr, ng, nb, 220);
  circle(kx, y, knob * 1.1);

  // Label
  fill(255, 255, 255, 60);
  textSize(isMobile ? 9 : 9);
  textFont("monospace");
  textAlign(LEFT, BOTTOM);
  noStroke();
  text("♪ vol", x, y - h / 2 - 3);
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function drawHUD() {
  fill(255, 255, 255, 55);
  noStroke();
  textFont("monospace");
  textAlign(LEFT, TOP);

  if (isMobile) {
    // Simple tap hint on mobile — no particle/fps noise
    textSize(10);
    text("✨ tap to wake Navi", 16, 12);
  } else {
    textSize(10);
    text(
      "✨ " +
        system.getCount() +
        " particles  " +
        nf(frameRate(), 1, 0) +
        " fps  ·  move mouse · click to wake Navi",
      16,
      12,
    );
  }
}
