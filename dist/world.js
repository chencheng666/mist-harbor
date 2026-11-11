/* 雾港：独立构建的程序化港区、美术材质与环境效果。 */
window.Harbor = window.Harbor || {};
(function (H) {
  'use strict';
  const T = THREE;
  let seed = 781;
  const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
  H.rand = rand;
  H.createWorld = function (scene, renderer) {
    const collisions = [], surfaces = [], beacons = [], supplies = [], batches = new Map();
    const world = { collisions, surfaces, beacons, supplies, extraction: new T.Vector3(31, 0, 28) };
    scene.background = new T.Color('#71858b');
    scene.fog = new T.FogExp2('#71858b', .0065);
    scene.environment = H.art.environment;
    const hemi = new T.HemisphereLight('#a6c6db', '#343c3b', .72); scene.add(hemi);
    const sun = new T.DirectionalLight('#ffcf99', 5.6); sun.position.set(-45, 26, -90); sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 65, bottom: -65, near: 1, far: 185 });
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.00008; sun.shadow.normalBias = .016; sun.shadow.radius = 3;
    sun.target.position.set(0, 0, -12); scene.add(sun, sun.target); world.sun = sun;
    const unit = new T.BoxGeometry(1, 1, 1), cylinder = new T.CylinderGeometry(1, 1, 1, 12);
    const materialCache=new Map();
    const mat=(color,roughness=.65,metalness=.3,extra={})=>{const key=color+'|'+roughness+'|'+metalness;if(!Object.keys(extra).length&&materialCache.has(key))return materialCache.get(key);const m=H.weatherMaterial(new T.MeshStandardMaterial({color,roughness,metalness,...extra}));if(!Object.keys(extra).length)materialCache.set(key,m);return m;};
    const metal = mat('#475659', .64, .7, {normalMap:H.art.texture('metal_plate_normal'),normalScale:new T.Vector2(.10,.10),roughnessMap:H.art.texture('metal_plate_roughness')}), iron = mat('#68777a', .58, .7), dark = mat('#26363a', .64, .5), concrete = mat('#75817c', .94, .02);
    const yellow = mat('#cf9c40', .6, .45), rubber = mat('#17232a', .96, .01);
    const orangeGlow = mat('#f7a857', .3, .3, { emissive: '#ff7b26', emissiveIntensity: 2 });
    const cyanGlow = mat('#a9f2e2', .3, .3, { emissive: '#40dccc', emissiveIntensity: 2 });
    world.materials = { metal, iron, dark, orangeGlow, cyanGlow, rubber };
    function box(w, h, d, x, y, z, material, collide = false, shadow = true) {
      const mesh = new T.Mesh(unit, material); mesh.scale.set(w, h, d); mesh.position.set(x, y, z);
      mesh.castShadow = shadow; mesh.receiveShadow = true; scene.add(mesh);
      if (collide) { collisions.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, y: y+h/2,minY:y-h/2 }); surfaces.push(mesh); }
      return mesh;
    }
    function inst(geometry, material, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
      const key = geometry.uuid + material.uuid;
      if (!batches.has(key)) batches.set(key, { geometry, material, list: [] });
      const m = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)), new T.Vector3(sx, sy, sz));
      batches.get(key).list.push(m);
    }
    function pipe(x1, y1, z1, x2, y2, z2, radius, material) {
      const start = new T.Vector3(x1, y1, z1), end = new T.Vector3(x2, y2, z2), dir = end.clone().sub(start);
      const m = new T.Matrix4().compose(start.add(end).multiplyScalar(.5), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().normalize()), new T.Vector3(radius, dir.length(), radius));
      const key = cylinder.uuid + material.uuid;
      if (!batches.has(key)) batches.set(key, { geometry: cylinder, material, list: [] });
      batches.get(key).list.push(m);
    }
    function canvasTexture(w, h, draw) {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); draw(ctx, w, h);
      const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); return tex;
    }
    const sky = H.createSky(); scene.add(sky);
    const terrain = H.createTerrain(scene, renderer, world); world.terrain = terrain;
    const paint = canvasTexture(256, 512, (ctx, w, h) => {
      ctx.fillStyle = '#cbd0c9'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 28000; i++) { const g = Math.floor(90 + rand() * 150); ctx.fillStyle = `rgba(${g},${g},${g},${rand() * .16})`; ctx.fillRect(rand() * w, rand() * h, rand() * 3 + 1, rand() * 5 + 1); }
      for (let i = 0; i < 180; i++) { const x = rand() * w, y = rand() * h; ctx.fillStyle = '#3c28112b'; ctx.fillRect(x, y, 1 + rand() * 3, rand() * 80); ctx.fillStyle = '#d5d8bd50'; ctx.fillRect(x + 1, y, 1, rand() * 25); }
      const gr = ctx.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#45392533'); gr.addColorStop(.25, '#171f2100'); gr.addColorStop(.7, '#171f2100'); gr.addColorStop(1, '#17251f77'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h);
    });
    yellow.color.set('#a38c56');yellow.map=paint;yellow.bumpMap=paint;yellow.bumpScale=.012;yellow.roughnessMap=H.art.texture('metal_plate_roughness');yellow.roughness=.85;yellow.needsUpdate=true;
    const wornMetal = H.art.texture('rusty_painted_metal_color'), wornNormal = H.art.texture('rusty_painted_metal_normal'), wornRough = H.art.texture('rusty_painted_metal_roughness');
    const containerMats = ['#7d9d98', '#be8060', '#6a8c9e', '#ada77d', '#879883'].map(c => {
      const material=mat(c,.79,.3,{map:wornMetal,normalMap:wornNormal,normalScale:new T.Vector2(.24,.24),roughnessMap:wornRough,envMapIntensity:.65});
      return material;
    });
    // 波纹板使用连续梯形截面，取代规则箱体上粗大的横竖栅格。
    const corrugation = new T.BufferGeometry(), cp = [], cuv = [], ci = [], step = .285;
    for (let i = 0; i <= 42; i++) for (const phase of [0, .18, .46, .72, 1]) { const z = Math.min(11.8, i * step + phase * step) - 5.9, x = phase < .18 || phase > .72 ? 0 : .065; const u = (z + 5.9) / 11.8; cp.push(x, -1.35, z, x, 1.35, z); cuv.push(u * 3, 0, u * 3, 1); }
    const count = cp.length / 6; for (let i = 0; i < count - 1; i++) { const a = i * 2; ci.push(a,a+1,a+2,a+1,a+3,a+2); } corrugation.setAttribute('position',new T.Float32BufferAttribute(cp,3));corrugation.setAttribute('uv',new T.Float32BufferAttribute(cuv,2));corrugation.setIndex(ci);corrugation.computeVertexNormals();
    const labelTex = canvasTexture(512, 256, ctx => { ctx.fillStyle = '#e5e6ce'; ctx.font = 'bold 72px sans-serif'; ctx.fillText('EASTLINE', 28, 100); ctx.font = '28px monospace'; ctx.fillText('东 岸 货 运 / HBR–07', 30, 145); ctx.font = '19px monospace'; ctx.fillText('MAX GR. 30,480 KG', 30, 203); ctx.fillText('TARE     2,300 KG', 30, 231); });
    const labelGeoA=new T.PlaneGeometry(2.3,1.15),labelGeoB=new T.PlaneGeometry(3.6,1.8);
    const labelMat = new T.MeshStandardMaterial({ map: labelTex, transparent: true, roughness: .8, polygonOffset: true, polygonOffsetFactor: -2 });
    function container(x, z, c, y = 1.5, length = 11.8) {
      const m = containerMats[c % containerMats.length], w = 3.05, height = 2.95;
      box(w, height, length, x, y, z, m, y < 2);
      for (const side of [-1, 1]) {
        inst(corrugation,m,x+side*1.535,y,z,1,1,length/11.8,0,side<0?Math.PI:0);
        for (const yy of [-1.43,1.43]) inst(unit, m, x + side * 1.55, y + yy, z, .11, .11, length);
        inst(unit, iron, x, y + 1.49 * side, z, w + .06, .07, length + .06);
        for (const zz of [-1, 1]) { inst(unit, iron, x + side * 1.48, y, z + zz * length / 2, .13, 2.94, .14); }
      }
      const end = z + length / 2 + .025;
      for (const side of [-1, 1]) { inst(unit, m, x + side * .76, y, end, 1.46, 2.74, .07); pipe(x + side * .55, y - 1.25, end + .08, x + side * .55, y + 1.25, end + .08, .035, iron); for (const yy of [-.9, .9]) inst(unit, iron, x + side * .76, y + yy, end + .1, .9, .06, .07); }
      for(const sx of [-1,1])for(const yy of [-1.36,1.36]){inst(unit,iron,x+sx*1.42,y+yy,end+.07,.22,.18,.14);inst(unit,dark,x+sx*1.42,y+yy,end+.147,.1,.065,.015);}
      if (rand() > .3) { inst(labelGeoA,labelMat,x,y+.28,end+.08,1,1,1); }
      if (rand() > .5) { inst(labelGeoB,labelMat,x+w/2+.08,y+.12,z,1,1,1,0,Math.PI/2); }
    }
    // 主巷贯穿堆场，左右支路通向信标，碰撞体与可见集装箱一致。
    for (const side of [-1, 1]) for (let row = 0; row < 5; row++) {
      const z = 20 - row * 15, x = side * 5.2;
      container(x, z, row + (side > 0 ? 0 : 2));
      if (row !== 1) container(x + side * .15, z + .1, row + 2, 4.5);
      if (row === 0 || row === 3) container(x + side * 3.25, z, row + 1);
    }
    for (let i = 0; i < 4; i++) { container(-30, 18 - i * 18, i); container(-30, 18 - i * 18, i + 2, 4.5); }
    for (let i = 0; i < 3; i++) { container(23, 15 - i * 17, i + 1); if (i !== 1) container(23, 15 - i * 17, i + 3, 4.5); }
    // 地面车道、轨道、排水沟和防撞墩提供尺度及近景细节。
    for (let z = -50; z < 34; z += 6) for (const x of [-2.4, 2.4, -21, 16]) inst(unit, yellow, x, .012, z, .08, .014, 2.3);
    const roadTex = canvasTexture(512, 1024, (ctx, w, h) => {
      ctx.fillStyle = '#d9d0a2'; ctx.font = 'bold 230px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('07', w / 2, 830);
      ctx.beginPath(); ctx.moveTo(210, 530); ctx.lineTo(210, 220); ctx.lineTo(110, 330); ctx.lineTo(110, 230); ctx.lineTo(256, 65); ctx.lineTo(402, 230); ctx.lineTo(402, 330); ctx.lineTo(302, 220); ctx.lineTo(302, 530); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 8500; i++) { ctx.globalAlpha = .15 + rand() * .6; ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 6, 1 + rand() * 9); }
    });
    const roadMat = new T.MeshStandardMaterial({ map: roadTex, transparent: true, opacity: .38, roughness: .83, depthWrite: false });
    for (const z of [26, 2, -24]) { const mesh = new T.Mesh(new T.PlaneGeometry(2.5, 5), roadMat); mesh.rotation.x = -Math.PI / 2; mesh.position.set(0, .018, z); scene.add(mesh); }
    for (const x of [27, 28.2]) inst(unit, iron, x, .04, -8, .08, .07, 95);
    for (let z = -47; z < 35; z += 12) { inst(unit, dark, -3.4, .022, z, .40, .03, 1.6); for (let j = 0; j < 10; j++) inst(unit, iron, -3.4, .045, z - .7 + j * .14, .40, .03, .045); }
    for (let z = -49; z < 35; z += 7) { box(.5, .6, 1.6, 33, .3, z, concrete, true); inst(unit, yellow, 32.72, .38, z, .02, .13, 1.6); }
    for (let i = 0; i < 15; i++) { const x = (i % 2 ? -1 : 1) * (15 + rand() * 4), z = rand() * 76 - 43; box(1.1, .9, 1.1, x, .45, z, mat('#665c43', .9, .05), true); for (let j = 0; j < 5; j++) inst(unit, iron, x - .48 + j * .24, .93, z, .04, .04, 1.1); }
    const barrelGeo = new T.CylinderGeometry(.37, .37, .94, 16);
    for (let i = 0; i < 18; i++) { const x = (i % 2 ? -1 : 1) * (2.95 + rand()*.3), z = -38 + rand() * 62; const m = new T.Mesh(barrelGeo, i % 3 ? metal : yellow); m.position.set(x, .47, z); m.castShadow = true; scene.add(m); collisions.push({ minX: x - .4, maxX: x + .4, minZ: z - .4, maxZ: z + .4, y: .94 }); surfaces.push(m); for (const y of [.16, .77]) inst(cylinder, iron, x, y, z, .385, .045, .385); }
    // 远景仓库、塔吊、城市天际线。
    box(35, 12, 13, -5, 6, -67, mat('#5a6b70', .85, .25), true);
    box(37, .35, 14, -5, 12.2, -67, iron);
    for (let x = -21; x <= 11; x += 3) { inst(unit, iron, x, 6.3, -60.3, .13, 12, .15); inst(unit, dark, x, 5, -60.3, 2.7, 7.5, .2); inst(unit, cyanGlow, x, 9.9, -60.1, 1.8, .45, .05); }
    const warehouseSign = canvasTexture(512, 128, ctx => { ctx.fillStyle = '#d7dbca'; ctx.font = 'bold 58px sans-serif'; ctx.fillText('东岸 · 七号港', 24, 82); });
    const sign = new T.Mesh(new T.PlaneGeometry(11, 2.75), new T.MeshStandardMaterial({ map: warehouseSign, transparent: true, emissiveMap: warehouseSign, emissive: '#b4c6ba', emissiveIntensity: .15 })); sign.position.set(-5, 11, -60.15); scene.add(sign);
    function crane(x, z) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        pipe(x + sx * 6, 0, z + sz * 4, x + sx * 3.5, 22, z + sz * 2.5, .35, iron);
        pipe(x + sx * 5.4, 5, z + sz * 3.7, x + sx * 3.5, 22, z - sz * 2.5, .12, iron);
      }
      inst(unit, iron, x, 22.5, z - 8, 9.5, 2, 37);
      for (let j = -24; j < 10; j += 3) { pipe(x - 4.5, 22, z + j, x - 4.5, 25, z + j + 3, .09, iron); pipe(x + 4.5, 22, z + j, x + 4.5, 25, z + j + 3, .09, iron); pipe(x - 4.5, 25, z + j, x + 4.5, 25, z + j, .10, iron); }
      for (const xx of [-1.4, 1.4]) pipe(x + xx, 22, z - 13, x + xx, 7, z - 13, .025, dark);
      inst(unit, yellow, x, 7, z - 13, 4, .5, 1.2); inst(unit, orangeGlow, x, 26, z - 22, .2, .2, .2);
      box(2.6, 2.8, 3.5, x - 4.4, 22, z - 4, metal); inst(unit, cyanGlow, x - 4.4, 22.2, z - 2.2, 2, 1.2, .05);
    }
    crane(-23, -32); crane(39, -16); crane(62, -60);
    const cityMat=mat('#607981',.9,.1),cityGlass=mat('#66818a',.45,.35);
    for (let i = 0; i < 24; i++) { const x = -120 + rand() * 245, z = -120 - rand() * 55, height = 9 + rand() * 28,w=6+rand()*8; box(w,height,8,x,height/2,z,cityMat,false,false);inst(unit,iron,x,height+.4,z,w*.7,.8,5);for(let yy=3;yy<height-1;yy+=2)inst(unit,cityGlass,x,yy,z+4.02,w*.84,.45,.03); }
    box(11, 3, 45, 53, -.4, -75, mat('#4c5960', .7, .6)); box(7, 6, 12, 53, 4, -88, iron); box(6, .4, 16, 53, 7.3, -87, dark);
    for (let j = 0; j < 4; j++) inst(unit, containerMats[j], 53, 2.5 + j % 2 * 2.6, -65 - Math.floor(j / 2) * 8, 8, 2.5, 6.5);
    const lampLight = new T.PointLight('#ffb269', 22, 15, 2); lampLight.position.set(-4, 5.8, 15); scene.add(lampLight);
    for (const p of [[-3.4, 15], [15, -18], [-19, -36], [29, 21]]) { pipe(p[0], 0, p[1], p[0], 7, p[1], .09, iron); pipe(p[0], 7, p[1], p[0] + 1.5, 7, p[1], .08, iron); inst(unit, orangeGlow, p[0] + 1.5, 6.95, p[1], 1.2, .07, .35); }
    const beaconPositions = [[-21, -2], [17, -23], [-1, -48]];
    beaconPositions.forEach((p, index) => {
      const group = new T.Group(); group.position.set(p[0], 0, p[1]); scene.add(group);
      function part(w, h, d, x, y, z, m) { const mesh = new T.Mesh(unit, m); mesh.scale.set(w, h, d); mesh.position.set(x, y, z); mesh.castShadow = true; group.add(mesh); return mesh; }
      part(1.4, .25, 1.2, 0, .12, 0, concrete); part(.9, 1.5, .65, 0, .9, 0, metal); part(.75, .65, .07, 0, 1.23, .38, dark);
      const screen = part(.58, .32, .03, 0, 1.29, .43, orangeGlow.clone()); part(.08, 2, .08, 0, 2.6, 0, iron);
      const ring = new T.Mesh(new T.TorusGeometry(.4, .035, 6, 32), orangeGlow.clone()); ring.position.y = 2.65; group.add(ring);
      const led = new T.Mesh(new T.SphereGeometry(.12, 10, 8), orangeGlow.clone()); led.position.y = 3.7; group.add(led);
      const light = new T.PointLight('#ff9b50', 10, 7, 2); light.position.set(0, 1.7, .7); group.add(light);
      const marker = document.createElement('div'); marker.className = 'marker'; document.querySelector('#markers').appendChild(marker);
      beacons.push({ id: 'ABC'[index], pos: group.position, marker, group, screen, ring, led, light, off: false, progress: 0 });
      collisions.push({ minX: p[0] - .5, maxX: p[0] + .5, minZ: p[1] - .4, maxZ: p[1] + .4, y: 1.6 });
    });
    for (const p of [[-16, 21], [16, -5], [-18, -33]]) {
      box(1.3, .65, .8, p[0], .34, p[1], mat('#376a60', .6, .4), true); box(.16, .03, .5, p[0], .68, p[1], cyanGlow, false, false); box(.5, .03, .16, p[0], .685, p[1], cyanGlow, false, false);
      supplies.push({ pos: new T.Vector3(p[0], 0, p[1]), used: false });
    }
    // 蓝色撤离平台与快艇。
    box(7, .18, 6, 31, .01, 28, dark);
    for (const x of [28.1, 33.9]) inst(unit, cyanGlow, x, .13, 28, .08, .025, 5.5);
    for (const z of [25.3, 30.7]) inst(unit, cyanGlow, 31, .13, z, 5.8, .025, .08);
    const boat = new T.Group(); boat.position.set(39, -.7, 28); scene.add(boat);
    const hull = new T.Mesh(new T.SphereGeometry(1, 16, 10), dark); hull.scale.set(2, .8, 4.2); boat.add(hull);
    const deck = new T.Mesh(unit, iron); deck.scale.set(2.7, .3, 5.5); deck.position.y = .65; boat.add(deck);
    const cabin = new T.Mesh(unit, metal); cabin.scale.set(1.8, 1.5, 1.8); cabin.position.set(0, 1.4, .5); boat.add(cabin);
    const boatGlass = new T.Mesh(unit, mat('#9bbdbb', .1, .7)); boatGlass.scale.set(1.6, .7, .02); boatGlass.position.set(0, 1.6, 1.42); boat.add(boatGlass);
    const exitMarker = document.createElement('div'); exitMarker.className = 'marker off'; exitMarker.style.display = 'none'; document.querySelector('#markers').appendChild(exitMarker); world.exitMarker = exitMarker;
    // 工业近景：木托盘、缆绳、轮胎、叉车与仓库管线。
    const timber=mat('#6e6650',.95,.01),tireGeo=new T.TorusGeometry(.31,.12,8,20);
    for(const p of [[-16,18],[-17,19.3],[17,-10],[-18,-34],[15,-41]]){
      for(let layer=0;layer<3;layer++){for(let j=0;j<6;j++)inst(unit,timber,p[0]-.65+j*.26,.12+layer*.2,p[1],.20,.08,1.3);for(const zz of [-.48,0,.48])inst(unit,timber,p[0],.04+layer*.2,p[1]+zz,1.5,.08,.13);}
      for(let j=0;j<2;j++)inst(tireGeo,rubber,p[0]+1.5,.17+j*.22,p[1]+.4,1,1,1,Math.PI/2);
    }
    const ropeMat=mat('#8a846b',.95,.03);
    for(const p of [[-4.4,26],[14,-15],[30,21]])for(let j=0;j<5;j++){const g=new T.TorusGeometry(.35+j*.04,.017,4,32);inst(g,ropeMat,p[0],.035+j*.015,p[1],1,1,1,Math.PI/2);}
    const forklift={x:-18,z:25};
    box(1.3,.8,2.0,forklift.x,.53,forklift.z,yellow,true);inst(unit,dark,forklift.x,.85,forklift.z-.35,1.1,.6,.75);inst(unit,rubber,forklift.x,1.05,forklift.z-.05,.62,.22,.55);inst(unit,rubber,forklift.x,1.4,forklift.z-.28,.62,.75,.18);
    for(const sx of [-.57,.57])for(const zz of [-.65,.65]){inst(cylinder,rubber,forklift.x+sx,.35,forklift.z+zz,.3,.2,.3,0,0,Math.PI/2);inst(cylinder,iron,forklift.x+sx*1.03,.35,forklift.z+zz,.16,.22,.16,0,0,Math.PI/2);}
    for(const sx of [-.57,.57]){inst(unit,iron,forklift.x+sx,1.5,forklift.z,.07,2.4,.07);inst(unit,iron,forklift.x+sx,1.5,forklift.z-.8,.07,2.4,.07);inst(unit,iron,forklift.x+sx*.75,1.3,forklift.z+1.05,.12,2.6,.12);inst(unit,iron,forklift.x+sx*.75,.17,forklift.z+1.65,.12,.08,1.4);}
    inst(unit,metal,forklift.x,2.7,forklift.z-.4,1.4,.1,1.1);inst(unit,iron,forklift.x,2.5,forklift.z+1.05,1.1,.13,.14);
    for(let x=-21;x<10;x+=4){pipe(x,2.4,-59.6,x+4,2.4,-59.6,.10,iron);pipe(x,8.6,-59.6,x+4,8.6,-59.6,.07,iron);for(let zz=0;zz<3;zz++)inst(unit,iron,x+zz,4.9,-59.5,.08,1.0,.1);}
    for(let z=-48;z<17;z+=5){pipe(32.6,0,z,32.6,2.6,z,.035,iron);pipe(32.6,2.55,z,32.6,2.55,z+5,.025,iron);for(let j=0;j<9;j++){pipe(32.6,.15,z+j*.55,32.6,2.45,z+j*.55+.5,.006,iron);pipe(32.6,2.45,z+j*.55,32.6,.15,z+j*.55+.5,.006,iron);}}
    // 将重复小零件合并为实例绘制，控制浏览器开销。
    for (const batch of batches.values()) { const mesh = new T.InstancedMesh(batch.geometry, batch.material, batch.list.length); batch.list.forEach((m, i) => mesh.setMatrixAt(i, m)); mesh.receiveShadow = true; mesh.castShadow = false; scene.add(mesh); }
    // 遮雨检修棚增加可进入的暗部与遮挡，入口通向补给箱和侧巷。
    const shelterRoof=box(12.5,.20,13.5,-19,5.3,20.5,iron,true);
    box(.16,5.2,13,-25,2.6,20.5,metal,true);
    box(12,5.2,.16,-19,2.6,27,metal,true);
    for(const x of [-24.7,-13.3])for(const z of [14.2,26.7])box(.18,5.2,.18,x,2.6,z,iron,true);
    for(const x of [-23,-20,-17,-14]){pipe(x,5.15,14,x,5.15,27,.045,iron);}
    const shelterLamp=new T.PointLight('#b9d9d3',13,12,2);shelterLamp.position.set(-19,4.5,21);scene.add(shelterLamp);
    for(const x of [-22,-17]){box(2.2,.08,.14,x,4.8,20,cyanGlow,false,false);}
    // 检修棚内的货架、工作台与电气柜为近景提供结构和使用痕迹。
    for(const z of [17,22.5]){
      for(const zz of [-1.5,1.5])for(const x of [-24.6,-23.8])inst(unit,iron,x,1.5,z+zz,.065,3,.065);
      for(const y of [.2,1.2,2.2]){inst(unit,iron,-24.2,y,z,.9,.07,3.2);for(let j=0;j<3;j++){inst(unit,timber,-24.2,y+.3,z-1+j,.58,.53,.70);inst(unit,dark,-23.9,y+.3,z-1+j,.02,.1,.5);}}
    }
    box(3,.16,.95,-20,.95,26,iron,true);for(const x of[-21.3,-18.7])box(.12,.9,.72,x,.45,26,dark,true);
    for(let j=0;j<4;j++){box(.7,2.5,.45,-16.5+j*.78,1.25,26.5,metal,true);inst(unit,dark,-16.5+j*.78,1.8,26.23,.5,.55,.025);inst(unit,cyanGlow,-16.5+j*.78,1.85,26.20,.11,.035,.015);}
    for(let x=-24.5;x<-13.5;x+=.6){const stripe=box(.3,.016,.28,x,.01,14.1,yellow,false,false);stripe.rotation.y=.4;}
    const serviceLabel=canvasTexture(512,128,ctx=>{ctx.fillStyle='#c3c8b8';ctx.font='bold 45px sans-serif';ctx.fillText('维修作业区 / SERVICE',12,52);ctx.font='21px monospace';ctx.fillText('EASTLINE 07   •   注意设备安全',14,97);});
    const serviceSign=new T.Mesh(new T.PlaneGeometry(4.2,1.05),new T.MeshStandardMaterial({map:serviceLabel,transparent:true,roughness:.8}));serviceSign.position.set(-21,3.8,26.88);serviceSign.rotation.y=Math.PI;scene.add(serviceSign);
    // 共享箱体按材质和碰撞属性实例化，射击仍检测实际实例的几何。
    const boxGroups=new Map();for(const mesh of [...scene.children])if(mesh.isMesh&&mesh.geometry===unit){const hit=surfaces.includes(mesh),key=mesh.material.uuid+'|'+mesh.castShadow+'|'+hit;if(!boxGroups.has(key))boxGroups.set(key,{material:mesh.material,cast:mesh.castShadow,hit,items:[]});boxGroups.get(key).items.push(mesh);}
    for(const g of boxGroups.values()){if(g.items.length<2)continue;const batch=new T.InstancedMesh(unit,g.material,g.items.length);g.items.forEach((m,i)=>{m.updateMatrix();batch.setMatrixAt(i,m.matrix);scene.remove(m);const j=surfaces.indexOf(m);if(j>=0)surfaces.splice(j,1);});batch.castShadow=g.cast;batch.receiveShadow=true;batch.userData.surface=g.material===concrete?'concrete':'metal';scene.add(batch);if(g.hit)surfaces.push(batch);}
    world.update = (dt,time,camera) => {
      sky.material.uniforms.time.value=time;terrain.update(dt,time,camera);
      beacons.forEach(b=>{b.ring.rotation.y=time*.7;b.light.intensity=b.off?1:5+Math.sin(time*3)*1.5;});
      boat.position.y=-.7+Math.sin(time*1.3)*.08;boat.rotation.z=Math.sin(time*.87)*.018;
    };
    world.setQuality=q=>{world.quality=q;terrain.setQuality(q);sun.castShadow=q!=='low';const n=q==='high'?3072:2048;if(sun.shadow.mapSize.x!==n){sun.shadow.mapSize.set(n,n);sun.shadow.map?.dispose();sun.shadow.map=null;}renderer.shadowMap.needsUpdate=true;};
    world.setBeacon = (b, off) => { b.off = off; for (const m of [b.screen.material, b.ring.material, b.led.material]) { m.color.set(off ? '#80ddd3' : '#ffad58'); m.emissive.set(off ? '#35b8bd' : '#ff7b26'); } b.light.color.set(off ? '#60d8cc' : '#ff9b50'); };
    return world;
  };
})(window.Harbor);
