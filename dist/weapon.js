/* 机械守卫模型与浏览器合成音效；枪械位于 rifle.js。 */
(function (H) {
  'use strict';
  const T = THREE;
  H.createEnemyModel = function (type, mats) {
    const root = new T.Group(), parts = [], rotors = [], legs = [];
    const box = (w, h, d, x, y, z, m, parent = root) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); parts.push(o); return o; };
    if (type === 'drone') {
      box(.66, .25, .75, 0, 0, 0, mats.metal); box(.4, .16, .3, 0, -.08, .4, mats.dark); box(.27, .08, .06, 0, -.06, .57, mats.orangeGlow);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const arm = box(.75, .08, .11, x * .42, .02, z * .32, mats.iron); arm.rotation.y = -x * z * .4;
        const ring = new T.Mesh(new T.TorusGeometry(.29, .025, 6, 20), mats.dark); ring.rotation.x = Math.PI / 2; ring.position.set(x * .75, .07, z * .43); root.add(ring); parts.push(ring);
        const rotor = box(.55, .02, .055, x * .75, .10, z * .43, mats.iron); rotors.push(rotor);
        box(.07, .18, .07, x * .75, -.02, z * .43, mats.dark);
      }
      box(.13, .4, .13, 0, -.28, .1, mats.dark); box(.09, .10, .28, 0, -.47, .24, mats.iron); box(.05, .04, .02, 0, -.47, .39, mats.orangeGlow);
    } else {
      box(.7, .46, 1.15, 0, .85, 0, mats.metal); box(.65, .15, .75, 0, 1.13, -.06, mats.iron);
      box(.43, .33, .44, 0, .95, .72, mats.dark); box(.34, .06, .04, 0, 1.01, .96, mats.orangeGlow);
      box(.10, .12, .3, 0, .79, .91, mats.iron);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const pivot = new T.Group(); pivot.position.set(x * .4, .85, z * .39); root.add(pivot); legs.push(pivot);
        const upper = box(.16, .48, .18, 0, -.19, -.08, mats.iron, pivot); upper.rotation.x = -.45 * z;
        const joint = new T.Mesh(new T.SphereGeometry(.13, 8, 6), mats.dark); joint.position.set(0, -.4, 0); pivot.add(joint); parts.push(joint);
        const lower = box(.10, .43, .10, 0, -.57, .03, mats.metal, pivot); lower.rotation.x = .3 * z;
        box(.2, .12, .32, 0, -.78, .11, mats.dark, pivot);
      }
      const antenna = box(.025, .48, .025, -.18, 1.4, -.3, mats.iron); antenna.rotation.x = -.25;
    }
    return { root, parts, rotors, legs };
  };
  H.createAudio = function () {
    let ctx, master, wind, noiseBuffer, enabled = true;
    function init() {
      if (ctx) { ctx.resume().catch(() => {}); return; }
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      ctx = new C(); master = ctx.createGain(); master.gain.value = .35; master.connect(ctx.destination);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const a = noiseBuffer.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer; src.loop = true; const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900; wind = ctx.createGain(); wind.gain.value = .08; src.connect(filter); filter.connect(wind); wind.connect(master); src.start();
    }
    function tone(freq, length, gain = .1, type = 'sine', endFreq = freq) {
      if (!ctx || !enabled) return; const o = ctx.createOscillator(), g = ctx.createGain(), now = ctx.currentTime; o.type = type; o.frequency.setValueAtTime(freq, now); o.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + length); g.gain.setValueAtTime(gain, now); g.gain.exponentialRampToValueAtTime(.001, now + length); o.connect(g); g.connect(master); o.start(); o.stop(now + length);
    }
    function noise(length, volume, frequency) {
      if (!ctx || !enabled) return; const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuffer; f.type = 'lowpass'; f.frequency.value = frequency; g.gain.setValueAtTime(volume, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + length); s.connect(f); f.connect(g); g.connect(master); s.start(); s.stop(ctx.currentTime + length);
    }
    return { init, shot() { noise(.16, .65, 3800); tone(125, .12, .45, 'triangle', 38); }, hit() { tone(1050, .045, .16, 'triangle', 700); }, reload() { noise(.1, .15, 4000); tone(380, .04, .12, 'square', 190); }, empty() { tone(150, .04, .08, 'square'); }, hurt() { noise(.15, .24, 450); }, step() { noise(.09, .08, 650); }, beacon() { tone(660, .3, .2); setTimeout(() => tone(990, .35, .12), 130); }, explosion() { noise(.7, .65, 700); tone(70, .4, .3, 'sawtooth', 25); }, setEnabled(value) { enabled = value; if (master && ctx) master.gain.setTargetAtTime(value ? .35 : 0, ctx.currentTime, .03); }, pause(value) { if (wind && ctx) wind.gain.setTargetAtTime(value ? .015 : .08, ctx.currentTime, .1); } };
  };
})(window.Harbor);
