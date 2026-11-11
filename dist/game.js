/* 雾港：输入、战斗、任务、导航与运行循环。 */
(function () {
  'use strict';
  const T = THREE, H = Harbor, $ = s => document.querySelector(s), clamp = T.MathUtils.clamp;
  const errors = []; window.addEventListener('error', e => { errors.push(e.message); if (!window.__harborReady) { $('#boot-detail').textContent = '启动遇到问题：' + e.message; } });
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(74, innerWidth / innerHeight, .08, 1200);
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); }
  catch (err) { $('#boot-detail').textContent = '当前浏览器无法启动 WebGL，请使用开启硬件加速的 Chrome、Edge 或 Safari。'; return; }
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25)); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  H.installSoftShadows();
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.autoClear = false; renderer.info.autoReset = false;
  renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{const message='着色器编译失败：'+gl.getProgramInfoLog(program)+' '+gl.getShaderInfoLog(fragment);errors.push(message);throw new Error(message);};
  $('#viewport').appendChild(renderer.domElement); renderer.domElement.tabIndex = 0; renderer.domElement.style.outline = 'none';
  H.art = H.createArt(renderer);
  const world = H.createWorld(scene, renderer), weapon = H.createWeapon(), audio = H.createAudio(), post = H.createPost(renderer, camera);
  const fx=H.createEffects(scene,world);fx.onShellBounce=pos=>audio.shell(pos);weapon.onReloadPhase=phase=>audio.reload(phase);
  try{world.interiorEnvironment=H.captureEnvironment(renderer,scene,new T.Vector3(-19,2,20));}catch(error){console.warn('室内反射使用环境后备',error);}
  post.setSun(world.sun);
  post.onAutoQuality=q=>{quality=q;world.setQuality(q);$('#quality').value=q;};
  // 枪灯使用真实聚光与遮挡，光轴随准星，枪口附近的灯座跟随武器动画。
  const lamp=new T.SpotLight('#e4ebdf',65,28,.31,.68,2);lamp.castShadow=true;lamp.shadow.mapSize.set(512,512);lamp.shadow.bias=-.0002;lamp.shadow.normalBias=.012;lamp.shadow.camera.near=.12;lamp.shadow.camera.far=30;scene.add(lamp,lamp.target);
  const lampCanvas=document.createElement('canvas');lampCanvas.width=128;lampCanvas.height=128;const lampCtx=lampCanvas.getContext('2d'),lampGradient=lampCtx.createRadialGradient(64,64,0,64,64,64);lampGradient.addColorStop(0,'#ffffff');lampGradient.addColorStop(.42,'#e9e9e9');lampGradient.addColorStop(.68,'#b0b0b0');lampGradient.addColorStop(.84,'#656565');lampGradient.addColorStop(1,'#000000');lampCtx.fillStyle=lampGradient;lampCtx.fillRect(0,0,128,128);lamp.map=new T.CanvasTexture(lampCanvas);
  let flashlight=false;lamp.visible=false;
  function toggleFlashlight(){if(state!=='playing')return;flashlight=!flashlight;$('#touch-light').classList.toggle('on',flashlight);toast(flashlight?'枪灯开启 · F 关闭':'枪灯关闭',1.4);}
  const viewLightRay=new T.Raycaster();let viewSun=1;
  const keys = new Set(), ray = new T.Raycaster(), direction = new T.Vector3(), temp = new T.Vector3();
  const clock = new T.Clock(), enemies = [], effects = [], projectiles = [], touch = { x: 0, y: 0, fire: false, ads: false, use: false };
  let reloadEmpty=false,jumpBuffer=0,coyote=0,shotBloom=0,landDip=0,attackClock=0;
  let state = 'title', elapsed = 0, time = 0, fireCooldown = 0, reloadLeft = 0, reloadDuration = 1.9, ads = 0, recoil = 0, sensitivity = 1;
  let kills = 0, shots = 0, hits = 0, cut = 0, hitTime = 0, hurtTime = 0, toastTime = 0, radioTime = 0, stepTime = 0, enemyId = 0, guideReturn = 'title';
  let mouseDown = false, aiming = false, locked = false, fallbackDrag = false, lastPointer = null, qAiming = false, quality = 'medium', muted = false, fps = 60;
  let player = { pos: new T.Vector3(0, 0, 31), yaw: 0, pitch: 0, vy: 0, vx:0, vz:0, hp: 100, ammo: 30, reserve: 180, grounded: true, crouch: 0, sprint: false, speed: 0, sinceHurt: 100, invulnerable: false };
  const isTouch = matchMedia('(pointer:coarse)').matches && navigator.maxTouchPoints > 0;
  document.body.classList.toggle('is-touch', isTouch);
  const ammoPips = $('#ammo-pips'); for (let i = 0; i < 30; i++) ammoPips.appendChild(document.createElement('i'));
  const hide = (sel, value = true) => $(sel).classList.toggle('hidden', value);
  const fmt = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function toast(text, duration = 2.5) { $('#toast').textContent = text; toastTime = duration; $('#toast').style.opacity = '1'; }
  function radio(text, duration = 5) { $('#radio-text').textContent = text; radioTime = duration; $('#radio').style.opacity = '1'; }
  function clearInput() { keys.clear(); mouseDown = aiming = fallbackDrag = qAiming = false; touch.x = touch.y = 0; touch.fire = touch.ads = touch.use = false; $('#joystick>b').style.transform = ''; lastPointer = null; }
  function requestLock() {
    if (isTouch || !renderer.domElement.requestPointerLock) return;
    try { const p = renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => { if (state === 'playing') toast('按住鼠标拖动转向，也可用方向键', 4); }); } catch (_) { toast('按住鼠标拖动转向，也可用方向键', 4); }
  }
  function exitLock() { if (document.pointerLockElement) document.exitPointerLock(); }
  function setQuality(q) {
    quality = q; world.setQuality(q);fx.setQuality(q); $('#quality').value = q;
    post.setQuality(q); post.resize();
    try { localStorage.setItem('mist-harbor-quality', q); } catch (_) {}
  }
  try { const q = localStorage.getItem('mist-harbor-quality'); if (['low', 'medium', 'high'].includes(q)) quality = q; } catch (_) {}
  setQuality(isTouch ? 'low' : quality);
  function canStand(x, z, radius = .34, feet = player.pos.y) {
    if (x < -35 || x > 34.5 || z < -54.5 || z > 35.5) return false;
    for (const b of world.collisions) {
      if (feet >= b.y - .08 || feet+1.75 <= (b.minY??0)) continue;
      const dx = x - clamp(x, b.minX, b.maxX), dz = z - clamp(z, b.minZ, b.maxZ);
      if (dx * dx + dz * dz < radius * radius) return false;
    }
    return true;
  }
  function moveBody(pos, dx, dz, radius, feet) {
    if (canStand(pos.x + dx, pos.z, radius, feet)) pos.x += dx;
    if (canStand(pos.x, pos.z + dz, radius, feet)) pos.z += dz;
  }
  // 每秒从玩家位置生成一次距离场；守卫沿可通行网格绕开集装箱。
  const grid = { size: 1.4, minX: -35, minZ: -54, w: 50, h: 65 }, blocked = new Uint8Array(grid.w * grid.h), distances = new Int16Array(grid.w * grid.h);
  const at = (x, z) => ({ x: clamp(Math.round((x - grid.minX) / grid.size), 0, grid.w - 1), z: clamp(Math.round((z - grid.minZ) / grid.size), 0, grid.h - 1) });
  for (let z = 0; z < grid.h; z++) for (let x = 0; x < grid.w; x++) blocked[z * grid.w + x] = canStand(grid.minX + x * grid.size, grid.minZ + z * grid.size, .6, 0) ? 0 : 1;
  let navTime = 0;
  function updateNavigation() {
    distances.fill(-1); let p = at(player.pos.x, player.pos.z), start = p.z * grid.w + p.x;
    if (blocked[start]) { let found = false; for (let r = 1; r < 5 && !found; r++) for (let dz = -r; dz <= r && !found; dz++) for (let dx = -r; dx <= r; dx++) { const nx = p.x + dx, nz = p.z + dz, n = nz * grid.w + nx; if (nx >= 0 && nx < grid.w && nz >= 0 && nz < grid.h && !blocked[n]) { start = n; found = true; break; } } }
    const queue = new Int32Array(distances.length); let head = 0, tail = 0; queue[tail++] = start; distances[start] = 0;
    while (head < tail) { const n = queue[head++], x = n % grid.w, z = Math.floor(n / grid.w); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz, m = nz * grid.w + nx; if (nx < 0 || nz < 0 || nx >= grid.w || nz >= grid.h || blocked[m] || distances[m] >= 0) continue; distances[m] = distances[n] + 1; queue[tail++] = m; } }
  }
  function enemyDirection(e) {
    const p = at(e.root.position.x, e.root.position.z); let best = Infinity, bestX = player.pos.x, bestZ = player.pos.z;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue; const x = p.x + dx, z = p.z + dz;
      if (x < 0 || z < 0 || x >= grid.w || z >= grid.h) continue;
      const n = z * grid.w + x; if (blocked[n] || distances[n] < 0) continue;
      if (dx && dz && (blocked[p.z * grid.w + x] || blocked[z * grid.w + p.x])) continue;
      const px = grid.minX + x * grid.size, pz = grid.minZ + z * grid.size, score = distances[n] + Math.hypot(px - e.root.position.x, pz - e.root.position.z) * .15;
      if (score < best) { best = score; bestX = px; bestZ = pz; }
    }
    return temp.set(bestX - e.root.position.x, 0, bestZ - e.root.position.z).normalize();
  }
  function spawnEnemy(type, x, z) {
    if (!canStand(x, z, .55, 0)) { let ok = false; for (let r = 1; r < 6 && !ok; r++) for (let j = 0; j < 12; j++) { const xx = x + Math.cos(j * Math.PI / 6) * r, zz = z + Math.sin(j * Math.PI / 6) * r; if (canStand(xx, zz, .55, 0)) { x = xx; z = zz; ok = true; break; } } if (!ok) return null; }
    const model = H.createEnemyModel(type, world.materials);
    const e = { ...model, mode:'patrol',senseTime:0,seen:0,lost:0,lastKnown:new T.Vector3(x,0,z),home:new T.Vector3(x,0,z),windup:0,attackToken:false,path:[],pathTime:0,phase:Math.random()*6.28,deadTime:0, id: ++enemyId, type, hp: type === 'drone' ? 66 : 110, maxHp: type === 'drone' ? 66 : 110, cooldown: 1 + Math.random(), alive: true, alert: false, age: 0, hurt: 0 };
    e.root.position.set(x, type === 'drone' ? 3 : 0, z); e.root.rotation.y = Math.random() * 6;
    e.parts.forEach(mesh => { mesh.userData.enemy = e; }); scene.add(e.root); enemies.push(e); return e;
  }
  function initialEnemies() { spawnEnemy('walker', 0, 6); spawnEnemy('drone', 1.5, -9); spawnEnemy('walker', -18, 9); spawnEnemy('drone', 18, -11); spawnEnemy('walker', -17, -29); spawnEnemy('drone', 0, -37); }
  function burst(pos,amount=10,big=false){fx.burst(pos,amount,big);}
  function tracer(from,to){fx.tracer(from,to);}
  function damageEnemy(e, amount, point) {
    if (!e.alive) return; e.hp -= amount;e.mode='engage';e.lastKnown.copy(player.pos); e.alert = true; e.hurt = .15; hits++; hitTime = .16; $('#hitmarker').style.color = '#ffd6a0'; audio.hit(); burst(point, 5);
    if (e.hp <= 0) {
      e.alive = false; kills++; $('#hitmarker').style.color = '#80e2d5'; burst(e.root.position.clone().add(new T.Vector3(0, e.type === 'drone' ? 0 : .7, 0)), 24, true); audio.explosion(e.root.position);e.deadTime=0;e.attackToken=false;
      if(e.type==='walker')e.root.rotation.z=.55;
      if (kills % 3 === 0) { player.reserve = Math.min(300, player.reserve + 30); toast('回收弹药 +30'); }
    }
  }
  function damagePlayer(amount) {
    if (state !== 'playing' || player.invulnerable) return;
    player.hp = Math.max(0, player.hp - amount); player.sinceHurt = 0; hurtTime = .65; audio.hurt();
    if (player.hp <= 0) endGame(false);
  }
  function shoot() {
    if (state !== 'playing' || reloadLeft > 0 || fireCooldown > 0 || player.sprint) return;
    if (player.ammo <= 0) { fireCooldown = .3; audio.empty(); if (player.reserve > 0) reload(); else toast('弹药耗尽，寻找绿色补给箱'); return; }
    player.ammo--; shots++; fireCooldown = .11; weapon.fire(); audio.shot();shotBloom=Math.min(.009,shotBloom+.0018);for(const e of enemies)if(e.alive&&e.root.position.distanceTo(player.pos)<24){e.mode=e.mode==='engage'?'engage':'investigate';e.alert=true;e.lastKnown.copy(player.pos);} recoil = Math.min(.04, recoil + .013);
    camera.getWorldDirection(direction); const spread = Math.max(.001,(ads>.7?.0016:player.speed>.2?.014:.006)+shotBloom+(player.grounded?0:.015)-(player.crouch>.5?.002:0));
    direction.x += (Math.random() - .5) * spread; direction.y += (Math.random() - .5) * spread; direction.z += (Math.random() - .5) * spread; direction.normalize();
    ray.set(camera.position, direction); ray.far = 170;
    const targets = enemies.filter(e => e.alive).flatMap(e => e.parts), results = ray.intersectObjects([...world.surfaces, ...targets], false);
    const hit = results[0], end = hit ? hit.point : camera.position.clone().addScaledVector(direction, 140);
    const muzzle=weapon.muzzle(camera);tracer(muzzle,end);fx.flash(muzzle);const eject=weapon.eject(camera),shellV=new T.Vector3(1.5+Math.random(),1.3,.5).applyQuaternion(camera.quaternion);fx.shell(eject,shellV);if(weapon.stats().heat>.45)fx.smoke(muzzle,.14);
    if (hit) { const e = hit.object.userData.enemy; if (e) { const weak = !!hit.object.userData.weak; damageEnemy(e, weak ? 60 : 34, hit.point); } else{const normal=hit.face?hit.face.normal.clone().transformDirection(hit.object.matrixWorld):new T.Vector3(0,1,0);const surface=hit.object.userData.surface||(normal.y>.7?'concrete':'metal');fx.impact(hit.point,normal,surface);audio.impact(hit.point,surface==='metal');} }
  }
  function reload() {
    if (state !== 'playing' || reloadLeft > 0 || player.ammo === 30) return;
    if (!player.reserve) { toast('没有备用弹药，寻找绿色补给箱'); return; }
    reloadEmpty=player.ammo===0;reloadDuration=reloadEmpty?2.6:2.05;reloadLeft=reloadDuration;
  }
  function resetEffects() { for (const a of [...effects, ...projectiles]) { scene.remove(a.mesh); if (a.owned) { a.mesh.geometry.dispose(); a.mesh.material.dispose(); } } effects.length = 0; projectiles.length = 0; }
  function start() {
    audio.init();clearInput();resetEffects();fx.clear();weapon.reset();jumpBuffer=coyote=shotBloom=landDip=attackClock=0;
    for(const e of enemies){scene.remove(e.root);e.dispose();} enemies.length = 0;
    player.pos.set(0, 0, 31); Object.assign(player, { yaw: 0, pitch: 0, vy: 0, vx:0, vz:0, hp: 100, ammo: 30, reserve: 180, grounded: true, crouch: 0, sprint: false, speed: 0, sinceHurt: 100, invulnerable: false });
    time = kills = shots = hits = cut = fireCooldown = reloadLeft = ads = recoil = hurtTime = hitTime = 0;
    world.beacons.forEach(b => { world.setBeacon(b, false); b.progress = 0; b.marker.className = 'marker'; }); world.supplies.forEach(s => s.used = false);
    world.exitMarker.style.display = 'none'; state = 'playing'; hide('#menu'); hide('#pause'); hide('#end'); hide('#guide'); hide('#hud', false); hide('#touch', !isTouch);
    $('#objective').textContent = '关闭港区三座信标'; [...$('#beacon-pips').children].forEach(p => p.classList.remove('done'));
    initialEnemies(); updateNavigation(); audio.pause(false); updateCamera(); radio('已进入东岸七号港。关闭三座橙色信标，撤离艇会在东侧码头接应。', 6); toast('行动开始 · 靠近信标，按住 E 关闭', 4); renderer.domElement.focus({preventScroll:true}); requestLock(); updateHUD();
  }
  function pause() {
    if (state !== 'playing') return; state = 'paused'; clearInput(); exitLock(); hide('#pause', false); hide('#touch'); audio.pause(true); $('#pause-tip').textContent = `已关闭 ${cut}/3 座信标 · 行动用时 ${fmt(time)}`;
  }
  function resume() { if (state !== 'paused') return; clearInput(); state = 'playing'; hide('#pause'); hide('#touch', !isTouch); audio.init(); audio.pause(false); renderer.domElement.focus({preventScroll:true}); requestLock(); }
  function endGame(win) {
    if (state !== 'playing') return; state = win ? 'complete' : 'dead'; clearInput(); exitLock(); hide('#end', false); hide('#touch'); hide('#interact'); audio.pause(true);
    $('#end-kicker').textContent = win ? '任务完成 / EXTRACTED' : '行动中断 / SIGNAL LOST'; $('#end-title').textContent = win ? '雨幕之后，平安归航。' : '信号中断';
    $('#end-copy').textContent = win ? '三座信标全部关闭，撤离艇已接应。东岸港区恢复静默。' : '机械守卫切断了你的行动。利用集装箱掩护，绿色补给箱可恢复生命与弹药。';
    $('#end-stats').innerHTML = `<div><small>行动时间</small><strong>${fmt(time)}</strong></div><div><small>关闭信标</small><strong>${cut} / 3</strong></div><div><small>击毁守卫</small><strong>${kills}</strong></div><div><small>命中率</small><strong>${shots ? Math.min(100, Math.round(hits / shots * 100)) : 0}%</strong></div>`;
    updateHUD();
  }
  function updateCamera() {
    const eye = T.MathUtils.lerp(1.68, 1.08, player.crouch), bob = player.grounded ? Math.sin(time * (player.sprint ? 14 : 10)) * .018 * player.speed : 0;
    camera.position.copy(player.pos).add(new T.Vector3(0, eye + bob, 0)); camera.rotation.order = 'YXZ'; camera.position.y+=landDip;camera.rotation.set(player.pitch + recoil,player.yaw,-player.vx*.003*(1-ads));camera.fov=T.MathUtils.lerp(player.sprint?79:74,55,ads); camera.updateProjectionMatrix();
  }
  function updatePlayer(dt) {
    const turn = (keys.has('ArrowLeft') || keys.has('KeyJ') ? 1 : 0) - (keys.has('ArrowRight') || keys.has('KeyL') ? 1 : 0);
    player.yaw += turn * dt * 1.65; player.pitch = clamp(player.pitch + ((keys.has('ArrowUp') || keys.has('KeyI') ? 1 : 0) - (keys.has('ArrowDown') || keys.has('KeyK') ? 1 : 0)) * dt * 1.3, -1.35, 1.35);
    let crouching = keys.has('KeyC') || keys.has('ControlLeft') || keys.has('ControlRight');if(!crouching&&player.crouch>.2){for(const b of world.collisions)if((b.minY??0)>player.pos.y+1.05&&(b.minY??0)<player.pos.y+1.8&&player.pos.x>b.minX-.3&&player.pos.x<b.maxX+.3&&player.pos.z>b.minZ-.3&&player.pos.z<b.maxZ+.3)crouching=true;} player.crouch = T.MathUtils.damp(player.crouch, crouching ? 1 : 0, 12, dt);
    let x = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) + touch.x, z = (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0) - touch.y;
    const length = Math.hypot(x, z); if (length > 1) { x /= length; z /= length; }
    player.sprint = (keys.has('ShiftLeft') || keys.has('ShiftRight') || isTouch && touch.y > .85) && z < -.1 && !crouching && ads < .1 && reloadLeft <= 0 && !mouseDown && !touch.fire && !keys.has('Enter');
    const speed = player.sprint ? 7.4 : crouching ? 2.4 : ads > .5 ? 2.8 : 4.6;
    player.speed = T.MathUtils.damp(player.speed, length > .1 ? 1 : 0, 10, dt);
    const dx = (Math.cos(player.yaw) * x + Math.sin(player.yaw) * z) * speed * dt, dz = (-Math.sin(player.yaw) * x + Math.cos(player.yaw) * z) * speed * dt;
    const acceleration=player.grounded?length>.1?14:19:4;player.vx=T.MathUtils.damp(player.vx,dx/dt,acceleration,dt);player.vz=T.MathUtils.damp(player.vz,dz/dt,acceleration,dt);moveBody(player.pos,player.vx*dt,player.vz*dt,.34,player.pos.y);
    coyote=player.grounded?.12:Math.max(0,coyote-dt);jumpBuffer=Math.max(0,jumpBuffer-dt);if(jumpBuffer>0&&coyote>0){player.vy=6.4;player.grounded=false;jumpBuffer=coyote=0;}
    const wasGround=player.grounded,oldVy=player.vy;const oldY = player.pos.y; player.vy -= dt * 18; player.pos.y += player.vy * dt;
    let support = 0;
    if (player.vy <= 0) for (const b of world.collisions) if (player.pos.x > b.minX - .2 && player.pos.x < b.maxX + .2 && player.pos.z > b.minZ - .2 && player.pos.z < b.maxZ + .2 && oldY >= b.y - .08 && player.pos.y <= b.y) support = Math.max(support, b.y);
    player.grounded = false; if (player.pos.y <= support) { player.pos.y = support; player.vy = 0; player.grounded = true; }
    if(!wasGround&&player.grounded){landDip=-Math.min(.13,Math.abs(oldVy)*.012);}landDip=T.MathUtils.damp(landDip,0,9,dt);
    const head=player.pos.y+T.MathUtils.lerp(1.8,1.12,player.crouch);if(player.vy>0)for(const b of world.collisions)if((b.minY??0)>oldY+1.1&&(b.minY??0)<head&&player.pos.x>b.minX-.3&&player.pos.x<b.maxX+.3&&player.pos.z>b.minZ-.3&&player.pos.z<b.maxZ+.3){player.pos.y=(b.minY??0)-T.MathUtils.lerp(1.8,1.12,player.crouch);player.vy=0;}
    if (length > .1 && player.grounded) { stepTime -= dt; if (stepTime <= 0) { audio.step(world.terrain.wetAt(player.pos.x,player.pos.z)>.65?'water':'concrete',player.sprint); stepTime = player.sprint ? .3 : .45; } }
    player.sinceHurt += dt; if (player.sinceHurt > 7 && player.hp < 100) player.hp = Math.min(100, player.hp + dt * 4);
    const aimTarget = (aiming || qAiming || touch.ads) && reloadLeft <= 0 && !player.sprint ? 1 : 0; ads = T.MathUtils.damp(ads, aimTarget, 13, dt); recoil *= Math.exp(-dt * 12);shotBloom=Math.max(0,shotBloom-dt*.012);
    if (reloadLeft > 0) { const previous = reloadLeft; reloadLeft -= dt;  if (reloadLeft <= 0) { const n = Math.min(30 - player.ammo, player.reserve); player.ammo += n; player.reserve -= n; reloadLeft = 0; } }
    fireCooldown = Math.max(0, fireCooldown - dt); updateCamera(); if (mouseDown || touch.fire || keys.has('Enter')) shoot();
  }
  function visibleBetween(from, to) {
    const d = to.clone().sub(from), dist = d.length(); ray.set(from, d.normalize()); ray.far = Math.max(0, dist - .25); return !ray.intersectObjects(world.surfaces, false).length;
  }
  const bulletGeo = new T.SphereGeometry(.075, 6, 5), bulletMat = new T.MeshBasicMaterial({ color: '#ffad68' });
  function enemyShot(e) {
    const start = e.root.position.clone().add(new T.Vector3(0, e.type === 'drone' ? -.25 : 1, .5)), target = camera.position.clone();
    target.x += (Math.random() - .5) * .6; target.z += (Math.random() - .5) * .6;
    const dir = target.sub(start).normalize(), mesh = new T.Mesh(bulletGeo, bulletMat); mesh.position.copy(start); scene.add(mesh);
    projectiles.push({ mesh, velocity: dir.multiplyScalar(22), life: 4, damage: 9, owned: false });
  }
  // 敌人保持最后已知位置，调查与搜索不直接读取玩家的实时坐标。
  function navigate(e,target){
    e.pathTime-=.15;if(e.pathTime>0&&e.path.length)return;e.pathTime=.9+Math.random()*.4;
    const start=at(e.root.position.x,e.root.position.z),goal=at(target.x,target.z),a=start.z*grid.w+start.x,b=goal.z*grid.w+goal.x;
    if(blocked[b]){e.path=[];return;}const costs=new Float32Array(blocked.length);costs.fill(Infinity);const prev=new Int32Array(blocked.length);prev.fill(-1);const closed=new Uint8Array(blocked.length),heap=[];
    const heuristic=n=>Math.hypot(n%grid.w-goal.x,Math.floor(n/grid.w)-goal.z);
    function push(n,f){let j=heap.length;heap.push({n,f});while(j>0){const p=(j-1)>>1;if(heap[p].f<=f)break;heap[j]=heap[p];j=p;}heap[j]={n,f};}
    function pop(){const first=heap[0],last=heap.pop();if(heap.length){let j=0;while(j*2+1<heap.length){let child=j*2+1;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;if(heap[child].f>=last.f)break;heap[j]=heap[child];j=child;}heap[j]=last;}return first.n;}
    costs[a]=0;push(a,heuristic(a));let budget=0;while(heap.length&&budget++<4000){const n=pop();if(n===b)break;if(closed[n])continue;closed[n]=1;const x=n%grid.w,z=Math.floor(n/grid.w);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const xx=x+dx,zz=z+dz,m=zz*grid.w+xx;if(xx<0||zz<0||xx>=grid.w||zz>=grid.h||blocked[m]||closed[m]||dx&&dz&&(blocked[z*grid.w+xx]||blocked[zz*grid.w+x]))continue;const c=costs[n]+(dx&&dz?1.414:1);if(c<costs[m]){costs[m]=c;prev[m]=n;push(m,c+heuristic(m));}}}
    const route=[];if(prev[b]>=0)for(let n=b;n!==a&&n>=0;n=prev[n])route.push(new T.Vector3(grid.minX+n%grid.w*grid.size,0,grid.minZ+Math.floor(n/grid.w)*grid.size));e.path=route.reverse();
  }
  function updateEnemies(dt){
    navTime-=dt;attackClock=Math.max(0,attackClock-dt);if(navTime<0){updateNavigation();navTime=1;}
    let tokens=enemies.filter(e=>e.alive&&e.attackToken).length;
    for(const e of enemies){
      if(!e.alive){e.deadTime+=dt;if(e.deadTime<2.7){if(e.type==='drone'){e.root.position.y=Math.max(.25,e.root.position.y-dt*(1+e.deadTime*5));e.root.rotation.x+=dt*2;e.root.rotation.z+=dt*4;}else e.root.position.y=-Math.max(0,e.deadTime-1.7)*.5;}else e.root.visible=false;continue;}
      e.age+=dt;e.cooldown-=dt;e.hurt=Math.max(0,e.hurt-dt);const pos=e.root.position,old=pos.clone(),dist=Math.hypot(pos.x-player.pos.x,pos.z-player.pos.z);e.senseTime-=dt;
      if(e.senseTime<=0){e.senseTime=.13+Math.random()*.06;const eye=pos.clone().add(new T.Vector3(0,e.type==='drone'?0:1,0)),dx=player.pos.x-pos.x,dz=player.pos.z-pos.z,facing=(dx*Math.sin(e.root.rotation.y)+dz*Math.cos(e.root.rotation.y))/Math.max(.1,dist);
        e.sight=dist<(flashlight?44:37)&&(e.mode==='engage'||facing>-.1||dist<5)&&visibleBetween(eye,camera.position);e.seen=e.sight?e.seen+(flashlight?.22:.16):Math.max(0,e.seen-.1);
        if(e.sight){e.lastKnown.copy(player.pos);e.lost=0;if(e.seen>.28&&e.mode!=='engage'){e.mode='engage';audio.warning(pos);for(const other of enemies)if(other!==e&&other.alive&&other.mode==='patrol'&&other.root.position.distanceTo(pos)<16){other.mode='investigate';other.lastKnown.copy(player.pos);}}}
      }
      if(!e.sight)e.lost+=dt;if(e.mode==='engage'&&e.lost>4){e.mode='search';e.searchLeft=7;e.attackToken=false;e.windup=0;}
      e.alert=e.mode!=='patrol';let target=e.lastKnown.clone(),move=false,speed=e.type==='walker'?2.3+cut*.12:2.2;
      if(e.mode==='engage'){
        if(e.sight){const radius=e.type==='drone'?10:8.5,angle=Math.atan2(pos.x-player.pos.x,pos.z-player.pos.z)+Math.sin(e.age*.55+e.phase)*.28+(e.id%2?1:-1)*.18;target.set(player.pos.x+Math.sin(angle)*radius,0,player.pos.z+Math.cos(angle)*radius);move=dist>radius+1||dist<radius-2||e.type==='drone';}
        else move=true;
      }else if(e.mode==='investigate'||e.mode==='search'){
        move=Math.hypot(pos.x-target.x,pos.z-target.z)>1.8;if(!move){e.mode='search';e.searchLeft=(e.searchLeft??7)-dt;e.root.rotation.y+=dt*.5;if(e.searchLeft<=0){e.mode='patrol';e.home.copy(pos);e.searchLeft=7;}}
      }else{target.set(e.home.x+Math.sin(e.age*.2+e.phase)*2,0,e.home.z+Math.cos(e.age*.2+e.phase)*2);move=pos.distanceTo(target)>1.2;speed=.6;}
      let turn=0;if(move&&e.windup<=0){let dir=target.sub(pos);dir.y=0;if(!e.sight&&e.mode!=='patrol'){if(e.senseTime>.12)navigate(e,e.lastKnown);while(e.path.length&&Math.hypot(e.path[0].x-pos.x,e.path[0].z-pos.z)<.7)e.path.shift();if(e.path.length)dir.copy(e.path[0]).sub(pos).setY(0);}
        if(dir.lengthSq()>.05){dir.normalize();for(const other of enemies)if(other!==e&&other.alive&&other.type===e.type){const x=pos.x-other.root.position.x,z=pos.z-other.root.position.z,d=Math.hypot(x,z);if(d>.01&&d<1.4){dir.x+=x/d*(1.4-d);dir.z+=z/d*(1.4-d);}}dir.normalize();moveBody(pos,dir.x*dt*speed,dir.z*dt*speed,.48,0);const yaw=Math.atan2(dir.x,dir.z);turn=Math.atan2(Math.sin(yaw-e.root.rotation.y),Math.cos(yaw-e.root.rotation.y));e.root.rotation.y+=turn*Math.min(1,dt*6);}}
      if(e.mode==='engage'&&e.sight){const yaw=Math.atan2(player.pos.x-pos.x,player.pos.z-pos.z);e.root.rotation.y+=Math.atan2(Math.sin(yaw-e.root.rotation.y),Math.cos(yaw-e.root.rotation.y))*Math.min(1,dt*4);}
      if(e.mode==='engage'&&e.sight&&e.cooldown<=0&&!e.attackToken&&tokens<2&&attackClock<=0){e.attackToken=true;tokens++;e.windup=e.type==='drone'?.65:.8;attackClock=.42;audio.warning(pos);}
      if(e.attackToken){e.windup-=dt;if(e.windup<=0){if(e.sight&&dist<35){if(dist<2.2&&e.type==='walker')damagePlayer(12);else{enemyShot(e);audio.enemy(pos);}}e.attackToken=false;tokens--;e.cooldown=(e.type==='drone'?1.8:2.4)+Math.random()*.8;}}
      if(e.type==='drone'){pos.y=3.1+Math.sin(e.age*1.7+e.phase)*.35;const roof=world.terrain.inside(pos.x,pos.z);if(roof)pos.y=Math.min(pos.y,3.8);}
      e.animate(dt,e.age,old.distanceTo(pos)/Math.max(dt,.001),turn,e.alert,e.hurt,e.windup);
    }
  }
  function updateEffects(dt) {
    fx.update(dt,camera);
    for (let i = effects.length - 1; i >= 0; i--) { const e = effects[i]; e.life -= dt; if (e.velocity) { e.mesh.position.addScaledVector(e.velocity, dt); if (e.gravity) e.velocity.y -= dt * 10; e.mesh.scale.multiplyScalar(Math.exp(-dt * 2)); } else e.mesh.material.opacity = Math.max(0, e.life / e.max); if (e.life <= 0) { scene.remove(e.mesh); if (e.owned) { e.mesh.geometry.dispose(); e.mesh.material.dispose(); } effects.splice(i, 1); } }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i], before = p.mesh.position.clone(); p.life -= dt; p.mesh.position.addScaledVector(p.velocity, dt);
      const move = p.mesh.position.clone().sub(before), dist = move.length(); ray.set(before, move.normalize()); ray.far = dist;
      const hit = ray.intersectObjects(world.surfaces, false)[0]; let removed = !!hit || p.life <= 0;
      const target = player.pos.clone().add(new T.Vector3(0, 1.05 - player.crouch * .3, 0));
      const segment = new T.Line3(before,hit?hit.point:p.mesh.position), nearest = segment.closestPointToPoint(target, true, new T.Vector3());
      if (state === 'playing' && nearest.distanceTo(target) < .58) { damagePlayer(p.damage); removed = true; }
      if(hit){p.mesh.position.copy(hit.point);fx.impact(hit.point,hit.face?hit.face.normal.clone().transformDirection(hit.object.matrixWorld):new T.Vector3(0,1,0),'metal');}
      if (removed) { scene.remove(p.mesh); projectiles.splice(i, 1); }
    }
  }
  function updateObjectives(dt) {
    let near = null, supply = null;
    for (const b of world.beacons) { const d = Math.hypot(player.pos.x - b.pos.x, player.pos.z - b.pos.z); if (!b.off && d < 2.6) near = b; }
    for (const s of world.supplies) if (!s.used && Math.hypot(player.pos.x - s.pos.x, player.pos.z - s.pos.z) < 2.3) supply = s;
    const using = keys.has('KeyE') || touch.use;
    hide('#interact', !near && !supply);
    if (near) {
      $('#interact-text').textContent = `按住关闭信标 ${near.id}`;
      near.progress = using ? Math.min(1, near.progress + dt / 1.7) : Math.max(0, near.progress - dt * .9); $('#interact-bar').style.width = near.progress * 100 + '%';
      if (near.progress >= 1) {
        world.setBeacon(near, true); cut++; near.marker.classList.add('off'); $('#beacon-pips').children[world.beacons.indexOf(near)].classList.add('done'); audio.beacon(); toast(`信标 ${near.id} 已关闭 · ${cut}/3`, 3);
        if (cut < 3) { radio('检测到机械守卫增援。利用集装箱掩护，继续前往下一座信标。', 4); spawnEnemy('walker', player.pos.x < 0 ? -18 : 17, -37); spawnEnemy('drone', 0, -18); }
        else { $('#objective').textContent = '前往东侧蓝色撤离区'; radio('所有信标已离线！撤离艇抵达东侧码头。沿蓝色标记离开港区。', 6); world.exitMarker.style.display = ''; }
        hide('#interact');
      }
    } else if (supply) {
      $('#interact-text').textContent = '使用补给 · 生命与弹药'; $('#interact-bar').style.width = '0%';
      if (using) { supply.used = true; player.hp = Math.min(100, player.hp + 55); player.reserve = Math.min(300, player.reserve + 90); toast('补给完成 · 生命 +55 / 弹药 +90'); audio.beacon(); }
    }
    if (cut === 3 && Math.hypot(player.pos.x - world.extraction.x, player.pos.z - world.extraction.z) < 3) endGame(true);
  }
  function placeMarker(element, pos, label, off = false) {
    const p = pos.clone().add(new T.Vector3(0, 4.3, 0)), dist = p.distanceTo(camera.position);
    const cameraDir = camera.getWorldDirection(new T.Vector3()); if (p.clone().sub(camera.position).dot(cameraDir) < 0 || dist < 3) { element.style.display = 'none'; return; }
    p.project(camera); if (Math.abs(p.x) > 1.13 || Math.abs(p.y) > 1.1) { element.style.display = 'none'; return; }
    element.style.display = ''; element.style.left = clamp((p.x * .5 + .5) * innerWidth, 25, innerWidth - 25) + 'px'; element.style.top = clamp((-p.y * .5 + .5) * innerHeight, 90, innerHeight - 120) + 'px'; element.innerHTML = `${label}<small>${off ? '已关闭' : Math.round(dist) + ' m'}</small>`;
  }
  function updateHUD() {
    $('#hp').textContent = Math.ceil(player.hp); $('#hp-bar').style.width = player.hp + '%'; $('#hp-bar').style.background = player.hp < 30 ? '#ff876b' : '#80d9db';
    $('#ammo').textContent = String(player.ammo).padStart(2, '0'); $('#reserve').textContent = player.reserve; [...ammoPips.children].forEach((p, i) => p.classList.toggle('used', i >= player.ammo));
    $('#weapon-status').textContent = reloadLeft > 0 ? `装填中 ${Math.ceil(reloadLeft * 10) / 10}s` : 'AR–07 / 突击步枪'; $('#reload-hint').textContent = reloadLeft > 0 ? '正在更换弹匣' : player.ammo < 8 ? '弹药不足 · R 换弹' : (flashlight?'R 换弹 · F 关闭枪灯':'R 换弹 · F 枪灯');
    $('#stance').textContent = player.sprint ? '冲刺 / SPRINTING' : player.crouch > .5 ? '蹲伏 / CROUCHING' : ads > .5 ? '瞄准 / AIMING' : '步行 / STANDING';
    $('#timer').textContent = fmt(time); $('#kills').textContent = '击毁 ' + kills;
    const degrees = ((-player.yaw * 180 / Math.PI) % 360 + 360) % 360, dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']; $('#heading').textContent = `${dirs[Math.round(degrees / 45) % 8]} ${Math.round(degrees).toString().padStart(3, '0')}`;
    $('#crosshair').classList.toggle('ads', ads > .5); $('#crosshair').style.opacity = reloadLeft > 0 || player.sprint ? '.15' : '.9';
    world.beacons.forEach(b => placeMarker(b.marker, b.pos, b.id, b.off)); if (cut === 3) placeMarker(world.exitMarker, world.extraction, '撤离');
    $('#hitmarker').style.opacity = String(Math.min(1, hitTime * 10)); $('#hurt').style.opacity = String(Math.min(.65, hurtTime * .65 + (player.hp < 25 ? .12 : 0)));
  }
  window.addEventListener('keydown', e => {
    if (state !== 'playing' && state !== 'paused') return;
    if (state === 'playing' && ['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    if (e.repeat && ['KeyP', 'Escape', 'KeyQ', 'KeyF', 'Space'].includes(e.code)) return;
    if (e.code === 'KeyP' || e.code === 'Escape') { if (state === 'paused') resume(); else pause(); return; }
    if (state !== 'playing') return; keys.add(e.code);
    if(e.code==='KeyF')toggleFlashlight(); if (e.code === 'KeyR') reload(); if (e.code === 'KeyQ') qAiming = !qAiming;
    if(e.code==='Space')jumpBuffer=.13;
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  document.addEventListener('pointerlockchange', () => { const was = locked; locked = document.pointerLockElement === renderer.domElement; if (was && !locked && state === 'playing') pause(); });
  renderer.domElement.addEventListener('pointerdown', e => { if (state !== 'playing' || isTouch) return; if (e.button === 0) mouseDown = true; if (e.button === 2) aiming = true; fallbackDrag = true; lastPointer = [e.clientX, e.clientY]; renderer.domElement.focus(); });
  window.addEventListener('pointerup', e => { if (e.button === 0) mouseDown = false; if (e.button === 2) aiming = false; fallbackDrag = false; lastPointer = null; });
  window.addEventListener('pointermove', e => {
    if (state !== 'playing' || isTouch) return; let dx = 0, dy = 0;
    if (locked) { dx = e.movementX; dy = e.movementY; } else if (fallbackDrag && lastPointer) { dx = e.clientX - lastPointer[0]; dy = e.clientY - lastPointer[1]; lastPointer = [e.clientX, e.clientY]; }
    weapon.look(dx*.0021,dy*.0021);const aimScale=1-ads*.4;player.yaw -= dx * .0021 * sensitivity*aimScale; player.pitch = clamp(player.pitch - dy * .0021 * sensitivity*aimScale, -1.35, 1.35);
  });
  renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('blur', () => { if (state === 'playing') pause(); }); document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pause(); });
  $('#start').onclick = start; $('#resume').onclick = resume; $('#restart').onclick = start; $('#retry').onclick = start; $('#pause-btn').onclick = pause;
  $('#back-menu').onclick = () => { state = 'title'; clearInput(); exitLock(); hide('#end'); hide('#hud'); hide('#menu', false); audio.pause(true); };
  $('#controls-btn').onclick = () => { guideReturn = state; hide('#guide', false); }; $('#guide-close').onclick = () => { hide('#guide'); state = guideReturn; };
  $('#auto-quality').onchange=e=>post.setAutomatic(e.target.checked);
  $('#quality').onchange = e => setQuality(e.target.value); $('#sensitivity').oninput = e => sensitivity = +e.target.value;
  $('#audio-toggle').onclick = () => { muted = !muted; audio.setEnabled(!muted); $('#audio-toggle').textContent = muted ? '已关闭' : '已开启'; };
  // 触屏输入独立跟踪每个触点，开火时仍可转动视角。
  const joystick = $('#joystick'); let stickId = null, stickStart = null;
  joystick.addEventListener('pointerdown', e => { if (state !== 'playing') return; stickId = e.pointerId; const r = joystick.getBoundingClientRect(); stickStart = [r.left + r.width / 2, r.top + r.height / 2]; joystick.setPointerCapture(stickId); updateStick(e); });
  function updateStick(e) { if (e.pointerId !== stickId) return; let x = (e.clientX - stickStart[0]) / 42, y = (e.clientY - stickStart[1]) / 42; const len = Math.hypot(x, y); if (len > 1) { x /= len; y /= len; } touch.x = x; touch.y = -y; $('#joystick>b').style.transform = `translate(${x * 38}px,${y * 38}px)`; }
  joystick.addEventListener('pointermove', updateStick); const releaseStick = () => { stickId = null; touch.x = touch.y = 0; $('#joystick>b').style.transform = ''; }; joystick.addEventListener('pointerup', releaseStick); joystick.addEventListener('pointercancel', releaseStick);
  function lookSurface(element, fire = false) {
    let id = null, previous;
    element.addEventListener('pointerdown', e => { if (state !== 'playing') return; id = e.pointerId; previous = [e.clientX, e.clientY]; element.setPointerCapture(id); if (fire) touch.fire = true; });
    element.addEventListener('pointermove', e => { if (e.pointerId !== id || state !== 'playing') return; player.yaw -= (e.clientX - previous[0]) * .005 * sensitivity; player.pitch = clamp(player.pitch - (e.clientY - previous[1]) * .005 * sensitivity, -1.35, 1.35); previous = [e.clientX, e.clientY]; });
    const release = () => { id = null; if (fire) touch.fire = false; }; element.addEventListener('pointerup', release); element.addEventListener('pointercancel', release);
  }
  lookSurface($('#look-zone')); lookSurface($('#touch-fire'), true);
  $('#touch-light').onclick=toggleFlashlight;
  $('#touch-ads').onclick = () => touch.ads = !touch.ads; $('#touch-reload').onclick = reload; $('#touch-jump').onclick = () => { if(state==='playing')jumpBuffer=.13; };
  $('#touch-use').addEventListener('pointerdown', e => { touch.use = true; e.target.setPointerCapture(e.pointerId); }); for (const name of ['pointerup', 'pointercancel']) $('#touch-use').addEventListener(name, () => touch.use = false);
  window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); weapon.resize(camera.aspect); post.resize(); });
  let hudAccumulator = 0, frames = 0;
  function frame() {
    requestAnimationFrame(frame); renderer.info.reset(); const realDt = clock.getDelta(), dt = Math.min(.05, realDt); elapsed += dt; fps = T.MathUtils.lerp(fps, 1 / Math.max(.001, realDt), .04);
    if (state === 'title') { camera.position.set(2.6 + Math.sin(elapsed * .08) * 1.1, 2.3, 33 - Math.sin(elapsed * .06) * 1.5); camera.lookAt(-5, 3.7, -28); }
    if (state === 'playing') { time += dt; updatePlayer(dt); updateEnemies(dt); updateObjectives(dt); updateEffects(dt); hitTime = Math.max(0, hitTime - dt); hurtTime = Math.max(0, hurtTime - dt); toastTime -= dt; radioTime -= dt; if (toastTime <= 0) $('#toast').style.opacity = '0'; if (radioTime <= 0) $('#radio').style.opacity = '0'; }
    if (state === 'playing' || state === 'title') world.update(dt, elapsed, camera);
    hudAccumulator += dt; if (hudAccumulator > .05 && state === 'playing') { updateHUD(); hudAccumulator = 0; }
    if(frames%6===0){viewLightRay.set(camera.position,H.sunDirection);viewLightRay.far=90;viewSun=viewLightRay.intersectObjects(world.surfaces,false).length?0:1;}
    if (state !== 'title') weapon.update(dt,time,{ads,speed:player.speed,sprint:player.sprint,reload:reloadLeft>0?1-reloadLeft/reloadDuration:0,grounded:player.grounded,vy:player.vy,wet:world.terrain.inside(player.pos.x,player.pos.z)?.15:1,ammo:player.ammo,reloadEmpty,interior:world.terrain.inside(player.pos.x,player.pos.z),interiorEnvironment:world.interiorEnvironment,worldQuaternion:camera.quaternion,sunVisible:viewSun});
    lamp.visible=flashlight&&state!=='title';if(lamp.visible){weapon.worldPoint(new T.Vector3(.048,.006,-.40),camera,lamp.position);lamp.target.position.copy(camera.position).addScaledVector(camera.getWorldDirection(new T.Vector3()),24);lamp.castShadow=quality!=='low';}
    audio.update(dt,camera,enemies.some(e=>e.alive&&e.mode==='engage')?1:cut>0?.3:.08,world.terrain.inside(camera.position.x,camera.position.z));
    post.updateBudget(realDt,state==='playing'||state==='title');
    renderer.shadowMap.autoUpdate=quality==='high'||frames%2===0;
    post.render(scene,elapsed,state!=='title'?weapon:null,{ads,damage:hurtTime,lowHealth:Math.max(0,1-player.hp/35)});
    if (++frames >= 3 && H.art.ready && !window.__harborReady) { hide('#loading'); window.__harborReady = true; }
  }
  window.__harbor = { snapshot: () => ({ version:'1.0.0', state, flashlight, hp: +player.hp.toFixed(2), ammo: player.ammo, reserve: player.reserve, reloading: reloadLeft > 0, ads: +ads.toFixed(2), cut, kills, shots, hits, time: +time.toFixed(2), player: { x: +player.pos.x.toFixed(2), y: +player.pos.y.toFixed(2), z: +player.pos.z.toFixed(2), yaw: +player.yaw.toFixed(3), pitch: +player.pitch.toFixed(3) }, enemies: enemies.filter(e => e.alive).map(e => ({ id: e.id, type: e.type, hp: e.hp, x: +e.root.position.x.toFixed(2), y: +e.root.position.y.toFixed(2), z: +e.root.position.z.toFixed(2), alert:e.alert,mode:e.mode,windup:+e.windup.toFixed(2) })), quality, fps: Math.round(fps), errors: [...errors], assetsFailed:[...H.art.failed], drawCalls: renderer.info.render.calls, geometries: renderer.info.memory.geometries, rendering:{...post.diagnostics}, materials:H.art.stats(),effects:fx.stats(),weapon:weapon.stats(),audio:audio.stats() }) };
  // 仅显式测试地址提供可控验收接口，正常游戏不启用。
  if (new URLSearchParams(location.search).has('test')) window.__harbor.test = {
    start,pause,resume,reload,shoot,damagePlayer,setQuality,
    setTime(value){elapsed=value;},setAutomatic(value){post.setAutomatic(value);$('#auto-quality').checked=!!value;},
    sceneMeshes:()=>scene.children.filter(o=>o.isInstancedMesh).map(o=>({id:o.id,count:o.count,material:o.material.color?.getHexString(),visible:o.visible,cast:o.castShadow,bounds:o.boundingSphere?{center:o.boundingSphere.center.toArray(),radius:o.boundingSphere.radius}:null})),
    inspectWorld:()=>({staticInstances:world.staticInstances,expectedInstances:world.expectedInstances,collisions:world.collisions.length,shelter:world.shelter,reflection:[world.terrain.reflection.width,world.terrain.reflection.height]}),
    setPlayer(data) { if (data.x != null) player.pos.x = data.x; if (data.z != null) player.pos.z = data.z; if (data.y != null) player.pos.y = data.y; for (const k of ['hp', 'ammo', 'reserve', 'yaw', 'pitch', 'invulnerable']) if (k in data) player[k] = data[k]; updateCamera(); updateHUD(); },
    aimAt(id) { const e = enemies.find(e => e.id === id); if (!e) return; const p = e.root.position.clone().add(new T.Vector3(0, e.type === 'drone' ? 0 : .85, 0)).sub(camera.position); player.yaw = Math.atan2(-p.x, -p.z); player.pitch = Math.atan2(p.y, Math.hypot(p.x, p.z)); recoil = 0; updateCamera(); },
    spawn: spawnEnemy, interact(value) { touch.use = value; }, snapshots: () => world.beacons.map(b => ({ id: b.id, x: b.pos.x, z: b.pos.z, off: b.off, progress: b.progress })), clearEnemies(){enemies.forEach(e=>{scene.remove(e.root);e.dispose();e.alive=false;});enemies.length=0; },
    setKeys(codes) { keys.clear(); codes.forEach(c => keys.add(c)); },
    routes() { updateNavigation(); return [...world.beacons.map(b=>({id:b.id,x:b.pos.x,z:b.pos.z+1.9})),{id:'撤离',x:world.extraction.x,z:world.extraction.z}].map(p=>{const q=at(p.x,p.z);return {id:p.id,reachable:distances[q.z*grid.w+q.x]>=0};}); }
  };
  frame();
})();
