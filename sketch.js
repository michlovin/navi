/**
 * ✨ NAVI — Fairy Particle Effect (Zelda-inspired)
 * ─────────────────────────────────────────────────
 * A glowing fairy body floats gently toward the mouse using spring/damper
 * physics, leaving a trail of pixie-dust particles that drift, twinkle,
 * and fade. A halo of tiny orbiting motes circles the core at all times.
 *
 * Behavior layers:
 *  1. Fairy  — spring-chases mouse, bobs on a sine wave, pulses in size
 *  2. Trail  — dust particles shed continuously, steered by Perlin noise
 *  3. Orbiters — small motes circling the fairy body
 *
 * Paste into editor.p5js.org — no extra libraries needed.
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CONFIG = {
  // Spring physics for the fairy chasing the mouse
  springStrength: 0.045,   // how eagerly she accelerates toward the mouse
  damping:        0.88,    // velocity damping each frame (0=instant stop, 1=no drag)
  bobAmplitude:   6,       // px of vertical sine-wave bob
  bobSpeed:       0.04,    // radians per frame for the bob

  // Fairy appearance
  fairyRadius:    20,      // core circle radius
  glowLayers:     5,       // concentric glow rings around the core
  pulseSpeed:     0.07,    // core size pulsing rate
  pulseAmount:    5,       // ± px of size pulse

  // Trail dust particles
  trailRate:      2,       // particles shed per frame while moving
  trailRateIdle:  1,       // particles shed per frame while idle
  maxParticles:   350,     // hard cap on trail particles
  baseLifespan:   140,
  lifespanJitter: 80,
  fadeFrames:     55,
  dustSize:       1.5,
  dustSizeJitter: 1,

  // Perlin drift applied to trail particles (gentle wander, not a strong field)
  noiseScale:     0.006,
  noiseStrength:  0.45,
  noiseZSpeed:    0.001,

  // Orbiting motes around the fairy
  orbitCount:     6,
  orbitRadius:    22,      // distance from fairy centre
  orbitSpeed:     0.032,   // radians per frame
  orbitSize:      2.5,

  // Trail alpha wash (lower = longer ghost trails)
  trailAlpha:     22,

  // Pastel palette [H 0-360, S 0-100, L 0-100]
  // Navi is cyan/blue — palette leans cool but includes warm accents
  palette: [
    [195, 75, 85],   // Navi cyan
    [210, 65, 88],   // soft sky blue
    [270, 60, 87],   // lavender
    [150, 50, 85],   // mint
    [310, 55, 88],   // petal pink (accent)
  ],

  // Navi's own core colour — iconic cyan-white
  naviHue: 195,
  naviSat: 80,
  naviLit: 88,
};

// ─── HSL → RGB ───────────────────────────────────────────────────────────────

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0)*255), Math.round(f(8)*255), Math.round(f(4)*255)];
}

// ─── DUST PARTICLE CLASS ──────────────────────────────────────────────────────
// Shed by the fairy as she moves. Drifts on Perlin noise, then fades out.

class DustParticle {
  constructor(x, y, inheritVelX, inheritVelY) {
    this.pos = createVector(x, y);

    // Inherit a fraction of the fairy's velocity so dust "peels off" naturally
    const spread = random(0.3, 0.9);
    this.vel = createVector(
      inheritVelX * spread + random(-0.6, 0.6),
      inheritVelY * spread + random(-0.6, 0.6)
    );
    this.acc = createVector(0, 0);

    // Colour — pick from palette
    const entry  = CONFIG.palette[floor(random(CONFIG.palette.length))];
    this.hue     = entry[0] + random(-12, 12);
    this.sat     = entry[1];
    this.lit     = entry[2];

    this.size    = max(1.5, CONFIG.dustSize + random(-CONFIG.dustSizeJitter, CONFIG.dustSizeJitter));
    this.maxLife = CONFIG.baseLifespan + random(-CONFIG.lifespanJitter, CONFIG.lifespanJitter);
    this.life    = this.maxLife;

    this.twinkleOffset = random(TWO_PI);
    this.twinkleSpeed  = random(0.06, 0.16);
  }

  applyNoise(zOff) {
    // Gentle Perlin wander — not a strong field, just a soft drift
    const angle = noise(
      this.pos.x * CONFIG.noiseScale,
      this.pos.y * CONFIG.noiseScale,
      zOff
    ) * TWO_PI * 2;
    const f = p5.Vector.fromAngle(angle);
    f.setMag(CONFIG.noiseStrength * 0.04);
    this.acc.add(f);
  }

  update(zOff) {
    this.applyNoise(zOff);
    this.vel.add(this.acc);
    this.vel.limit(1.4);          // dust drifts slowly
    this.pos.add(this.vel);
    this.vel.mult(0.97);          // gentle air drag
    this.acc.set(0, 0);
    this.life--;
  }

  isDead() { return this.life <= 0; }

  getAlpha() {
    // Fade in quickly over first 15 frames, then hold, then fade out
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

    const twinkle  = sin(frameCount * this.twinkleSpeed + this.twinkleOffset);
    const litShift = twinkle * 7;
    const [r, g, b]   = hslToRgb(this.hue, this.sat, this.lit + litShift);
    const [rC,gC,bC]  = hslToRgb(this.hue, this.sat, min(this.lit + litShift + 14, 98));
    const sz = this.getSize();

    noStroke();

    // Soft glow halo
    fill(r, g, b, a * 25);
    circle(this.pos.x, this.pos.y, sz * 5);

    fill(r, g, b, a * 60);
    circle(this.pos.x, this.pos.y, sz * 3);

    // Core disc
    fill(rC, gC, bC, a * 210);
    circle(this.pos.x, this.pos.y, sz * 2);

    // White centre sparkle
    fill(255, 250, 255, a * 180);
    circle(this.pos.x, this.pos.y, sz * 0.7);

    // Tiny cross spokes — scale down for dust
    this.drawSpokes(sz, a, r, g, b);
  }

  drawSpokes(sz, a, r, g, b) {
    const len = sz * 2.2;
    stroke(r, g, b, a * 120);
    strokeWeight(0.6);
    line(this.pos.x - len, this.pos.y, this.pos.x + len, this.pos.y);
    line(this.pos.x, this.pos.y - len, this.pos.x, this.pos.y + len);
    const d = len * 0.55;
    line(this.pos.x-d, this.pos.y-d, this.pos.x+d, this.pos.y+d);
    line(this.pos.x+d, this.pos.y-d, this.pos.x-d, this.pos.y+d);
    noStroke();
  }
}

// ─── FAIRY CLASS ─────────────────────────────────────────────────────────────
// The main Navi character — spring-chases the mouse with a sine-wave bob.

class Fairy {
  constructor() {
    this.pos    = createVector(width / 2, height / 2);
    this.vel    = createVector(0, 0);
    this.acc    = createVector(0, 0);
    this.bobT   = 0;      // phase for vertical bob
    this.pulseT = 0;      // phase for size pulse

    // Navi core RGB — cyan-white
    this.rgb = hslToRgb(CONFIG.naviHue, CONFIG.naviSat, CONFIG.naviLit);

    // Orbiter angles — evenly spaced, then each drifts independently
    this.orbiters = [];
    for (let i = 0; i < CONFIG.orbitCount; i++) {
      this.orbiters.push({
        angle:     (TWO_PI / CONFIG.orbitCount) * i,
        angleOff:  random(TWO_PI),   // phase offset so they're not synchronised
        speed:     CONFIG.orbitSpeed * random(0.7, 1.3),
        dist:      CONFIG.orbitRadius * random(0.8, 1.25),
        size:      CONFIG.orbitSize  * random(0.7, 1.4),
        hue:       CONFIG.palette[floor(random(CONFIG.palette.length))][0],
        sat:       CONFIG.palette[floor(random(CONFIG.palette.length))][1],
        lit:       CONFIG.palette[floor(random(CONFIG.palette.length))][2],
      });
    }
  }

  update(targetX, targetY) {
    // ── Spring toward target ──────────────────────────────────────────────
    // F = k * displacement  (Hooke's law)
    const dx  = targetX - this.pos.x;
    const dy  = targetY - this.pos.y;
    this.acc.set(dx * CONFIG.springStrength, dy * CONFIG.springStrength);

    this.vel.add(this.acc);
    this.vel.mult(CONFIG.damping);    // dampen to prevent oscillation

    // ── Sine-wave bob (perpendicular to travel direction) ─────────────────
    this.bobT   += CONFIG.bobSpeed;
    this.pulseT += CONFIG.pulseSpeed;

    // Add gentle vertical bob on top of the spring motion
    this.vel.y += sin(this.bobT) * 0.25;

    this.pos.add(this.vel);

    // ── Advance orbiters ──────────────────────────────────────────────────
    for (const orb of this.orbiters) {
      orb.angle += orb.speed;
    }
  }

  // How fast is she moving? Used to scale trail emission.
  getSpeed() {
    return this.vel.mag();
  }

  draw() {
    const pulse = sin(this.pulseT) * CONFIG.pulseAmount;
    const R     = CONFIG.fairyRadius + pulse;
    const [r, g, b] = this.rgb;
    const x     = this.pos.x;
    const y     = this.pos.y;

    noStroke();

    // ── Wide ambient glow (several large transparent rings) ───────────────
    for (let i = CONFIG.glowLayers; i >= 1; i--) {
      const glowR = R * (1 + i * 1.1);
      const glowA = 18 * (1 / i);
      fill(r, g, b, glowA);
      circle(x, y, glowR * 2);
    }

    // Mid glow — brighter band just outside the core
    fill(r, g, b, 55);
    circle(x, y, R * 3.5);

    // Core disc — full opacity, slightly brighter
    const [rC,gC,bC] = hslToRgb(CONFIG.naviHue, CONFIG.naviSat, min(CONFIG.naviLit + 8, 98));
    fill(rC, gC, bC, 240);
    circle(x, y, R * 2);

    // Inner white flash
    fill(255, 252, 255, 230);
    circle(x, y, R * 0.85);

    // Bright sparkle spokes — larger than dust particles
    this.drawFairySpokes(R, r, g, b);

    // ── Orbiting motes ────────────────────────────────────────────────────
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
    line(this.pos.x-d, this.pos.y-d, this.pos.x+d, this.pos.y+d);
    line(this.pos.x+d, this.pos.y-d, this.pos.x-d, this.pos.y+d);
    noStroke();
  }

  drawOrbiters() {
    for (const orb of this.orbiters) {
      // Each orbiter bobs at its own phase offset
      const wobble = sin(orb.angle * 2 + orb.angleOff) * 4;
      const ox = this.pos.x + cos(orb.angle) * (orb.dist + wobble);
      const oy = this.pos.y + sin(orb.angle) * (orb.dist + wobble) * 0.6; // flatten orbit

      const [r,g,b] = hslToRgb(orb.hue, orb.sat, orb.lit);
      const sz = orb.size;

      noStroke();
      // Soft halo
      fill(r, g, b, 30);
      circle(ox, oy, sz * 5);
      // Core
      fill(r, g, b, 180);
      circle(ox, oy, sz * 2);
      // White centre
      fill(255, 250, 255, 200);
      circle(ox, oy, sz * 0.8);
    }
  }
}

// ─── PARTICLE SYSTEM CLASS ────────────────────────────────────────────────────

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.zOff      = 0;
  }

  shed(fairy) {
    // Emit more dust when moving fast, fewer when hovering
    const speed = fairy.getSpeed();
    const rate  = speed > 1.0 ? CONFIG.trailRate : CONFIG.trailRateIdle;

    for (let i = 0; i < rate; i++) {
      if (this.particles.length >= CONFIG.maxParticles) {
        this.particles.shift();
      }
      // Spawn just behind the fairy with a tiny scatter
      const ox = random(-6, 6);
      const oy = random(-6, 6);
      this.particles.push(
        new DustParticle(
          fairy.pos.x + ox,
          fairy.pos.y + oy,
          fairy.vel.x,
          fairy.vel.y
        )
      );
    }
  }

  update() {
    this.zOff += CONFIG.noiseZSpeed;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(this.zOff);
      if (p.isDead()) this.particles.splice(i, 1);
    }
  }

  draw() {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw();
    }
  }

  getCount() { return this.particles.length; }
}

// ─── GLOBALS ──────────────────────────────────────────────────────────────────

let fairy;
let system;

// ── "Hey, listen!" repeating timer ───────────────────────────────────────────
// "Hey, listen!" appears on click, fades out after 4 s.
const BUBBLE_SHOW_MS  = 4000;   // visible for 4 s after click
const BUBBLE_FADE_MS  = 500;    // fade in / fade out duration
let   bubbleState     = 'HIDDEN'; // 'HIDDEN' | 'SHOWING'
let   bubbleStateAt   = 0;      // millis() when SHOWING began
let   bubbleAlpha     = 0;      // current rendered opacity 0-255
let   naviCurrentPhrase = 'Hey, listen!'; // updated each click

// ─── P5 LIFECYCLE ─────────────────────────────────────────────────────────────

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255, 255, 255, 255);
  background(12, 8, 22);

  fairy  = new Fairy();
  system = new ParticleSystem();
}

function draw() {
  // Ghost trail wash — lower alpha = longer trails
  noStroke();
  fill(12, 8, 22, CONFIG.trailAlpha);
  rect(0, 0, width, height);

  // ── "Hey, listen!" bubble — shown on click, gone after 4 s ─────────────
  let alphaTarget = 0;
  if (bubbleState === 'SHOWING') {
    const age      = millis() - bubbleStateAt;
    const fadeInT  = min(age / BUBBLE_FADE_MS, 1);
    const fadeOutT = min((BUBBLE_SHOW_MS - age) / BUBBLE_FADE_MS, 1);
    alphaTarget    = min(fadeInT, fadeOutT) * 255;
    if (age >= BUBBLE_SHOW_MS) bubbleState = 'HIDDEN';
  }
  bubbleAlpha = (bubbleState === 'HIDDEN' && alphaTarget < 1)
              ? 0
              : lerp(bubbleAlpha, alphaTarget, 0.12);

  // Update fairy spring toward mouse
  fairy.update(mouseX, mouseY);

  // Shed dust trail
  system.shed(fairy);

  // Update + draw dust first (behind fairy)
  system.update();
  system.draw();

  // Draw fairy on top
  fairy.draw();

  // Speech bubble (above fairy, below HUD)
  if (bubbleAlpha > 1) drawSpeechBubble();

  // HUD
  drawHUD();
}

// ─── INTERACTIVITY ────────────────────────────────────────────────────────────

// ─── NAVI VOICE ──────────────────────────────────────────────────────────────

// Navi's random phrases — add or remove any you like!
const NAVI_PHRASES = [
  'Hey, listen!',
  'Hello!',
  'Watch out!',
  'Did you bring me snacks?',
  'Fooey!',
  'Over here!',
  'Be careful!',
  'Look at that!',
];

let lastPhraseIndex = -1;
let isSpeaking      = false;

function pickNaviPhrase() {
  let idx;
  do { idx = floor(random(NAVI_PHRASES.length)); }
  while (idx === lastPhraseIndex && NAVI_PHRASES.length > 1);
  lastPhraseIndex = idx;
  return NAVI_PHRASES[idx];
}

function naviSpeak() {
  if (!window.speechSynthesis || isSpeaking) return;

  const phrase      = pickNaviPhrase();
  naviCurrentPhrase = phrase;

  window.speechSynthesis.cancel();

  const utter  = new SpeechSynthesisUtterance(phrase);
  utter.pitch  = 2;
  utter.rate   = 0.9;
  utter.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const female = voices.find(v => /samantha|karen|moira|tessa|zira|female/i.test(v.name));
  if (female) utter.voice = female;

  isSpeaking    = true;
  utter.onend   = () => { isSpeaking = false; };
  utter.onerror = () => { isSpeaking = false; };

  setTimeout(() => window.speechSynthesis.speak(utter), 80);
}

// Prime voice list early (some browsers load it async)
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// ─── INTERACTIVITY ────────────────────────────────────────────────────────────

// Click — dust burst + speech bubble + Navi's voice
function mousePressed() {
  for (let i = 0; i < 28; i++) {
    if (system.particles.length >= CONFIG.maxParticles) system.particles.shift();
    const ox = random(-14, 14);
    const oy = random(-14, 14);
    system.particles.push(
      new DustParticle(fairy.pos.x + ox, fairy.pos.y + oy, 0, 0)
    );
  }
  bubbleState   = 'SHOWING';
  bubbleStateAt = millis();
  naviSpeak();
}

function touchStarted() {
  mousePressed();
  return false;
}

function touchMoved() { return false; }

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(12, 8, 22);
}

// ─── SPEECH BUBBLE ───────────────────────────────────────────────────────────

function drawSpeechBubble() {
  const a   = bubbleAlpha;
  const msg = naviCurrentPhrase;

  // Measure text width so the bubble auto-sizes to any phrase
  textSize(14);
  textFont('Georgia, serif');
  textStyle(BOLD);
  const tw  = textWidth(msg);
  const bx  = fairy.pos.x + 18;
  const by  = fairy.pos.y - 58;
  const bw  = max(tw / 2 + 20, 70); // half-width with padding, min 70px
  const bh  = 22;
  const br  = 14;

  // ── Bubble body ──────────────────────────────────────────────────────────
  const [nr, ng, nb] = hslToRgb(CONFIG.naviHue, CONFIG.naviSat, CONFIG.naviLit);
  // Slightly translucent dark fill so the background shows faintly through
  stroke(nr, ng, nb, a * 0.70);
  strokeWeight(1.5);
  fill(18, 12, 32, a * 0.88);
  rect(bx - bw, by - bh, bw * 2, bh * 2, br);

  // ── Tail (small triangle pointing down toward the fairy) ─────────────────
  // Drawn as three lines from tip to the bottom edge of the bubble
  const tipX = fairy.pos.x + 2;
  const tipY = fairy.pos.y - 16;   // just above the fairy glow
  const tailLx = bx - 10;
  const tailRx = bx + 2;
  const tailY  = by + bh;          // bottom edge of bubble

  // Fill triangle
  noStroke();
  fill(18, 12, 32, a * 0.88);
  triangle(tailLx, tailY, tailRx, tailY, tipX, tipY);

  // Stroke the two exposed tail edges (not the shared bubble edge)
  stroke(nr, ng, nb, a * 0.70);
  strokeWeight(1.5);
  line(tailLx, tailY, tipX, tipY);
  line(tailRx, tailY, tipX, tipY);

  // ── Text ─────────────────────────────────────────────────────────────────
  noStroke();

  // Subtle cyan text shadow for depth
  fill(nr, ng, nb, a * 0.35);
  textAlign(CENTER, CENTER);
  textSize(14);
  textStyle(BOLD);
  textFont('Georgia, serif');
  text(msg, bx + 1, by + 1);

  // Main white text
  fill(240, 248, 255, a * 0.95);
  text(msg, bx, by);

  // Reset text style so HUD isn't affected
  textStyle(NORMAL);
}

// ─── HUD ──────────────────────────────────────────────────────────────────────

function drawHUD() {
  fill(255, 255, 255, 65);
  noStroke();
  textSize(11);
  textFont('monospace');
  textAlign(LEFT, TOP);
  text(
    '✨ Navi  |  ' + system.getCount() + ' dust particles  |  ' +
    nf(frameRate(), 1, 0) + ' fps  |  move mouse · click for sparkle burst',
    12, 12
  );
}
