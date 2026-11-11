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
    scene.background = new T.Color('#7b9199');
    scene.fog = new T.FogExp2('#7b9199', .011);
    scene.environment = H.art.environment;
    const hemi = new T.HemisphereLight('#b5d4e4', '#4b4d45', 1.05); scene.add(hemi);
    const sun = new T.DirectionalLight('#ffd09a', 4.2); sun.position.set(-45, 26, -90); sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 65, bottom: -65, near: 1, far: 185 });
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.00008; sun.shadow.normalBias = .016; sun.shadow.radius = 3;
    sun.target.position.set(0, 0, -12); scene.add(sun, sun.target); world.sun = sun;
    const unit = new T.BoxGeometry(1, 1, 1), cylinder = new T.CylinderGeometry(1, 1, 1, 12);
    const mat = (color, roughness = .65, metalness = .3, extra = {}) => new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    const metal = mat('#475659', .64, .7, {normalMap:H.art.texture('metal_plate_normal'),normalScale:new T.Vector2(.10,.10),roughnessMap:H.art.texture('metal_plate_roughness')}), iron = mat('#68777a', .58, .7), dark = mat('#26363a', .64, .5), concrete = mat('#75817c', .94, .02);
    const yellow = mat('#cf9c40', .6, .45), rubber = mat('#17232a', .96, .01);
    const orangeGlow = mat('#f7a857', .3, .3, { emissive: '#ff7b26', emissiveIntensity: 2 });
    const cyanGlow = mat('#a9f2e2', .3, .3, { emissive: '#40dccc', emissiveIntensity: 2 });
    world.materials = { metal, iron, dark, orangeGlow, cyanGlow, rubber };
    function box(w, h, d, x, y, z, material, collide = false, shadow = true) {
      const mesh = new T.Mesh(unit, material); mesh.scale.set(w, h, d); mesh.position.set(x, y, z);
      mesh.castShadow = shadow; mesh.receiveShadow = true; scene.add(mesh);
      if (collide) { collisions.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, y: y + h / 2 }); surfaces.push(mesh); }
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
    const asphalt = canvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#59636a'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 52000; i++) { const g = Math.floor(50 + rand() * 100); ctx.fillStyle = `rgba(${g},${g + 5},${g + 9},${.05 + rand() * .3})`; ctx.fillRect(rand() * w, rand() * h, rand() * 2 + .5, rand() * 2 + .5); }
      for (let i = 0; i < 40; i++) { ctx.strokeStyle = '#1a2d3a33'; ctx.lineWidth = rand() + .4; ctx.beginPath(); let x = rand() * w, y = rand() * h; ctx.moveTo(x, y); for (let j = 0; j < 8; j++) { x += rand() * 30 - 15; y += rand() * 15; ctx.lineTo(x, y); } ctx.stroke(); }
    }); asphalt.wrapS = asphalt.wrapT = T.RepeatWrapping; asphalt.repeat.set(35, 55);
    const groundMap = H.art.texture('asphalt_02_color', 48, 62), groundNormal = H.art.texture('asphalt_02_normal', 48, 62), groundRough = H.art.texture('asphalt_02_roughness', 48, 62);
    const groundMaterial = new T.MeshPhysicalMaterial({ color: '#a8b4b7', map: groundMap, normalMap: groundNormal, normalScale: new T.Vector2(.7, .7), roughnessMap: groundRough, roughness: .7, metalness: .04, clearcoat: 1, clearcoatRoughness: .18, envMapIntensity: .9 });
    const ground = new T.Mesh(new T.PlaneGeometry(220, 280), groundMaterial);
    groundMaterial.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vWetWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\n vWetWorld=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 vWetWorld;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      float wetMask=sin(vWetWorld.x*.31+sin(vWetWorld.z*.27))*sin(vWetWorld.z*.23+cos(vWetWorld.x*.47));wetMask=smoothstep(-.3,.6,wetMask);roughnessFactor=mix(max(.5,roughnessFactor),.18,wetMask*.75);`);};groundMaterial.customProgramCacheKey=()=> 'harbor-wet-asphalt-v2';
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.015, -25); ground.receiveShadow = true; scene.add(ground); surfaces.push(ground);
    // 天幕与低角度日光共同构成雨港的冷暖色调。
    const sky = new T.Mesh(new T.SphereGeometry(450, 32, 16), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, uniforms: { sun: { value: new T.Vector3(-.38, .22, -.85).normalize() } }, vertexShader: 'varying vec3 vDir; void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: `varying vec3 vDir;uniform vec3 sun;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
      void main(){vec3 d=normalize(vDir);float h=max(d.y,0.);float s=max(dot(d,sun),0.);vec3 col=mix(vec3(.47,.59,.64),vec3(.13,.25,.34),pow(h,.55));col+=vec3(.65,.30,.10)*pow(s,6.)+vec3(1.5,1.05,.58)*pow(s,180.);vec2 p=d.xz/(h+.2)*2.;float n=noise(p*2.)*.55+noise(p*5.)*.3+noise(p*13.)*.15;col=mix(col,col*.55,smoothstep(.38,.8,n)*smoothstep(0.,.25,h)*.7);gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }` })); scene.add(sky);
    // 低分辨率平面反射只绘制环境，雨水扰动在水洼着色器中完成。
    const reflection = new T.WebGLRenderTarget(768, 432, { minFilter: T.LinearFilter, magFilter: T.LinearFilter });
    const mirror = new T.PerspectiveCamera(74, 1, .1, 240), textureMatrix = new T.Matrix4();
    const puddleMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { reflection: { value: reflection.texture }, textureMatrix: { value: textureMatrix }, time: { value: 0 }, fogColor: { value: scene.fog.color }, camPos: { value: new T.Vector3() } }, vertexShader: `uniform mat4 textureMatrix; varying vec4 vProj;varying vec3 vWorld;varying vec2 vUv;void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;vUv=uv;vProj=textureMatrix*w;gl_Position=projectionMatrix*viewMatrix*w;}`, fragmentShader: `uniform sampler2D reflection;uniform float time;uniform vec3 camPos,fogColor;varying vec4 vProj;varying vec3 vWorld;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(12.989,78.233)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}void main(){vec2 p=vProj.xy/vProj.w;vec2 d=vec2(sin(vWorld.z*2.+time),cos(vWorld.x*2.6-time))*.00045;vec3 c=texture2D(reflection,p+d).rgb;float mask=noise(vWorld.xz*.7)*.3+noise(vWorld.xz*2.1)*.12;float edge=1.-smoothstep(.18+mask,.42+mask,length((vUv-.5)*vec2(1.,1.45)));float fres=pow(1.-abs(normalize(camPos-vWorld).y),2.);float fog=1.-exp(-.00012*pow(length(camPos-vWorld),2.));gl_FragColor=vec4(mix(c*.8+vec3(.015,.025,.03),fogColor,fog),edge*(.1+fres*.5));}` });
    const puddles = new T.Group(); scene.add(puddles);
    for (let i = 0; i < 38; i++) { const mesh = new T.Mesh(new T.PlaneGeometry(2 + rand() * 8, 1 + rand() * 4), puddleMat); mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = rand() * 6; mesh.position.set((rand() - .5) * 65, .009, rand() * 95 - 55); puddles.add(mesh); }
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
      material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
        vec4 wornSample=texture2D(map,vMapUv);float gray=dot(wornSample.rgb,vec3(.299,.587,.114));wornSample.rgb=mix(vec3(gray),wornSample.rgb,.08)*2.7;diffuseColor*=wornSample;
        #endif`);};material.customProgramCacheKey=()=> 'harbor-painted-metal-v2';return material;
    });
    // 波纹板使用连续梯形截面，取代规则箱体上粗大的横竖栅格。
    const corrugation = new T.BufferGeometry(), cp = [], cuv = [], ci = [], step = .285;
    for (let i = 0; i <= 42; i++) for (const phase of [0, .18, .46, .72, 1]) { const z = Math.min(11.8, i * step + phase * step) - 5.9, x = phase < .18 || phase > .72 ? 0 : .065; const u = (z + 5.9) / 11.8; cp.push(x, -1.35, z, x, 1.35, z); cuv.push(u * 3, 0, u * 3, 1); }
    const count = cp.length / 6; for (let i = 0; i < count - 1; i++) { const a = i * 2; ci.push(a,a+1,a+2,a+1,a+3,a+2); } corrugation.setAttribute('position',new T.Float32BufferAttribute(cp,3));corrugation.setAttribute('uv',new T.Float32BufferAttribute(cuv,2));corrugation.setIndex(ci);corrugation.computeVertexNormals();
    const labelTex = canvasTexture(512, 256, ctx => { ctx.fillStyle = '#e5e6ce'; ctx.font = 'bold 72px sans-serif'; ctx.fillText('EASTLINE', 28, 100); ctx.font = '28px monospace'; ctx.fillText('东 岸 货 运 / HBR–07', 30, 145); ctx.font = '19px monospace'; ctx.fillText('MAX GR. 30,480 KG', 30, 203); ctx.fillText('TARE     2,300 KG', 30, 231); });
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
      if (rand() > .3) { const l = new T.Mesh(new T.PlaneGeometry(2.3, 1.15), labelMat); l.position.set(x, y + .28, end + .08); scene.add(l); }
      if (rand() > .5) { const l = new T.Mesh(new T.PlaneGeometry(3.6, 1.8), labelMat); l.rotation.y = Math.PI / 2; l.position.set(x + w / 2 + .08, y + .12, z); scene.add(l); }
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
    const seaMat = new T.MeshStandardMaterial({ color: '#4b717c', metalness: .65, roughness: .27 });
    const sea = new T.Mesh(new T.PlaneGeometry(270, 350, 40, 40), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.set(178, -1.3, -35); scene.add(sea);
    const seaBase = Float32Array.from(sea.geometry.attributes.position.array);
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
    const rainCount = 1700, rainGeo = new T.BufferGeometry(), rainArr = new Float32Array(rainCount * 6);
    for (let i = 0; i < rainCount; i++) { const x = (rand() - .5) * 75, y = rand() * 30, z = (rand() - .5) * 75; rainArr.set([x, y, z, x - .08, y - .7, z + .05], i * 6); }
    rainGeo.setAttribute('position', new T.BufferAttribute(rainArr, 3));
    const rain = new T.LineSegments(rainGeo, new T.LineBasicMaterial({ color: '#bdced0', transparent: true, opacity: .24, depthWrite: false })); rain.frustumCulled = false; scene.add(rain);
    const splash = new T.InstancedMesh(new T.RingGeometry(.88, 1, 16), new T.MeshBasicMaterial({ color: '#bed8d8', transparent: true, opacity: .1, side: T.DoubleSide, depthWrite: false }), 55);
    const splashData = Array.from({length:55}, () => ({x:(rand()-.5)*55,z:rand()*85-48,phase:rand()})); scene.add(splash); const splashDummy = new T.Object3D();
    let reflFrame = 0;
    const dir = new T.Vector3(), up = new T.Vector3(), bias = new T.Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
    world.update = (dt, time, camera) => {
      for (let i = 0; i < rainCount; i++) { const n = i * 6; rainArr[n + 1] -= dt * 17; rainArr[n] -= dt * 1.8; if (rainArr[n + 1] < -2) { rainArr[n + 1] += 32; rainArr[n] = (rand() - .5) * 75; } rainArr[n + 3] = rainArr[n] - .08; rainArr[n + 4] = rainArr[n + 1] - .7; }
      rainGeo.attributes.position.needsUpdate = true; rain.position.set(camera.position.x, 0, camera.position.z);
      splashData.forEach((p,i) => { const phase=(time*.8+p.phase)%1, r=.025+phase*.18; splashDummy.position.set(p.x,.027,p.z); splashDummy.rotation.set(-Math.PI/2,0,0); splashDummy.scale.setScalar(r); splashDummy.updateMatrix(); splash.setMatrixAt(i,splashDummy.matrix); }); splash.instanceMatrix.needsUpdate=true;
      beacons.forEach(b => { b.ring.rotation.y = time * .7; b.light.intensity = b.off ? 2 : 8 + Math.sin(time * 3) * 2; });
      boat.position.y = -.7 + Math.sin(time * 1.3) * .08;
      const a = sea.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) a.setZ(i, Math.sin(seaBase[i * 3] * .2 + time) * .1 + Math.sin(seaBase[i * 3 + 1] * .15 - time) * .1);
      a.needsUpdate = true; puddleMat.uniforms.time.value = time; puddleMat.uniforms.camPos.value.copy(camera.position);
      if (world.quality !== 'low' && reflFrame++ % (world.quality === 'high' ? 2 : 4) === 0) {
        mirror.copy(camera); mirror.position.copy(camera.position); mirror.position.y *= -1;
        camera.getWorldDirection(dir); dir.y *= -1; mirror.up.set(0, -1, 0); mirror.lookAt(mirror.position.clone().add(dir)); mirror.updateMatrixWorld();
        textureMatrix.copy(bias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
        puddles.visible = false; ground.visible = false; rain.visible = false;
        const shadows = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
        renderer.setRenderTarget(reflection); renderer.render(scene, mirror); renderer.setRenderTarget(null);
        renderer.shadowMap.autoUpdate = shadows; puddles.visible = true; ground.visible = true; rain.visible = true;
      }
    };
    world.setQuality = q => { world.quality = q; puddles.visible = q !== 'low'; sun.castShadow = q !== 'low'; renderer.shadowMap.needsUpdate = true; rain.geometry.setDrawRange(0, q === 'low' ? 1100 : 3400); };
    world.setBeacon = (b, off) => { b.off = off; for (const m of [b.screen.material, b.ring.material, b.led.material]) { m.color.set(off ? '#80ddd3' : '#ffad58'); m.emissive.set(off ? '#35b8bd' : '#ff7b26'); } b.light.color.set(off ? '#60d8cc' : '#ff9b50'); };
    return world;
  };
})(window.Harbor);
