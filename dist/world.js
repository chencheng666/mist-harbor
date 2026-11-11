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
    scene.background = new T.Color('#667785');
    scene.fog = new T.FogExp2('#667785', .009);
    scene.environment = H.art.environment;
    const hemi = new T.HemisphereLight('#a6c6db', '#283039', .78); scene.add(hemi);
    const sun = new T.DirectionalLight('#ffcea0', 3.1); sun.position.copy(H.sunDirection).multiplyScalar(120).add(new T.Vector3(0,0,-12)); sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 40, bottom: -40, near: 1, far: 185 });
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.00008; sun.shadow.normalBias = .016; sun.shadow.radius = 3;
    sun.target.position.set(0, 0, -12); scene.add(sun, sun.target); world.sun = sun;
    const unit = new T.BoxGeometry(1, 1, 1), cylinder = new T.CylinderGeometry(1, 1, 1, 12);
    const materialCache=new Map();
    const mat=(color,roughness=.65,metalness=.3,extra={})=>{const key=color+'|'+roughness+'|'+metalness;if(!Object.keys(extra).length&&materialCache.has(key))return materialCache.get(key);const m=H.weatherMaterial(new T.MeshStandardMaterial({color,roughness,metalness,...extra}));if(!Object.keys(extra).length)materialCache.set(key,m);return m;};
    const metal = mat('#475659', .64, .7, {normalMap:H.art.texture('metal_plate_normal'),normalScale:new T.Vector2(.10,.10),roughnessMap:H.art.texture('metal_plate_roughness')}), iron = mat('#68777a', .58, .7), dark = mat('#26363a', .64, .5), concrete = mat('#a3a59d', .94, .02,{map:H.art.texture('harbor_concrete_color',2,2),normalMap:H.art.texture('harbor_concrete_normal',2,2),normalScale:new T.Vector2(.45,.45),roughnessMap:H.art.texture('harbor_concrete_roughness',2,2)});
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
    function solid(w,h,d,x,y,z,surface='metal') {const o=new T.Mesh(new T.BoxGeometry(w,h,d),dark);o.position.set(x,y,z);o.visible=false;o.userData.surface=surface;scene.add(o);surfaces.push(o);collisions.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,y:y+h/2,minY:y-h/2});}
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
    const containerMats = ['#385953', '#76503c', '#3e5368', '#6a6950', '#505f4e'].map(c => {
      const material=mat(c,.71,.34,{map:wornMetal,normalMap:wornNormal,normalScale:new T.Vector2(.16,.16),roughnessMap:wornRough,envMapIntensity:.65});
      const weatherCompile=material.onBeforeCompile;
      material.onBeforeCompile=shader=>{weatherCompile(shader);shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        float panelHeight=mod(vHWorld.y+.015,2.61);vec3 wn=abs(inverseTransformDirection(normalize(vNormal),viewMatrix));float u=wn.x>wn.z?vHWorld.z:vHWorld.x;
        float streak=hNoise(vec2(u*23.,vHWorld.y*.45));float foot=1.-smoothstep(.04,.44,panelHeight),top=1.-smoothstep(.035,.10,abs(panelHeight-2.48));
        float rustMask=smoothstep(.48,.77,hFbm(vec2(u*9.,vHWorld.y*15.)))*(foot*.65+top*.3);float dirt=foot*.20+pow(streak,4.)*.15;
        diffuseColor.rgb=mix(diffuseColor.rgb*(1.-dirt),vec3(.13,.058,.023),rustMask);roughnessFactor=mix(roughnessFactor,.92,rustMask);
      `);};material.customProgramCacheKey=()=> 'container-weather-1.0';
      return material;
    });
    // ISO 货箱的尺度、角件和锁杆：侧板用真实折弯截面，接缝处留窄阴影。
    const corrugation=new T.BufferGeometry(),cp=[],cuv=[],ci=[];
    const phases=[0,.19,.36,.73,.90,1],depths=[0,0,.037,.037,0,0];
    for(let i=0;i<42;i++)for(let j=0;j<6;j++){const z=(i+phases[j])*12.02/42-6.01,x=depths[j];cp.push(x,-1.16,z,x,1.16,z);cuv.push((z+6.01)/2,0,(z+6.01)/2,1);}
    for(let i=0;i<cp.length/6-1;i++){const a=i*2;ci.push(a,a+1,a+2,a+1,a+3,a+2);}corrugation.setAttribute('position',new T.Float32BufferAttribute(cp,3));corrugation.setAttribute('uv',new T.Float32BufferAttribute(cuv,2));corrugation.setIndex(ci);corrugation.computeVertexNormals();
    const labelTex=canvasTexture(1024,256,ctx=>{ctx.fillStyle='#c1c4b4';ctx.font='bold 88px sans-serif';ctx.fillText('EASTLINE',32,112);ctx.font='26px monospace';ctx.fillText('东岸远洋货运   /   EAST HARBOR SHIPPING',35,160);ctx.globalCompositeOperation='destination-out';for(let i=0;i<3500;i++){ctx.globalAlpha=rand()*.55;ctx.fillRect(rand()*1024,rand()*256,1+rand()*5,1+rand()*8);}});
    const labelGeo=new T.PlaneGeometry(3.4,.85),labelMat=new T.MeshStandardMaterial({map:labelTex,transparent:true,roughness:.87,polygonOffset:true,polygonOffsetFactor:-2,depthWrite:false});
    const idMats=Array.from({length:8},(_,i)=>new T.MeshStandardMaterial({map:canvasTexture(256,256,ctx=>{ctx.fillStyle='#cbd0be';ctx.font='bold 24px monospace';ctx.fillText('EHLU '+(374102+i*718)+' 7',7,35);ctx.font='18px monospace';['22G1','MAX.GR 30,480 KG','TARE    2,280 KG','NET    28,200 KG','CU.CAP 33.2 CUM'].forEach((t,j)=>ctx.fillText(t,7,70+j*30));}),transparent:true,roughness:.9,depthWrite:false}));
    const idGeo=new T.PlaneGeometry(.76,.76),hazardGeo=new T.PlaneGeometry(.23,.23);
    const hazardMat=new T.MeshStandardMaterial({map:canvasTexture(128,128,ctx=>{ctx.fillStyle='#b4a052';ctx.fillRect(0,0,128,128);ctx.fillStyle='#222725';ctx.beginPath();ctx.moveTo(64,14);ctx.lineTo(113,107);ctx.lineTo(15,107);ctx.closePath();ctx.fill();ctx.fillStyle='#c1aa5c';ctx.font='bold 65px sans-serif';ctx.fillText('!',52,95);}),roughness:.9});
    function container(x,z,c,y=1.30,length=12.02){
      const m=containerMats[c%containerMats.length],w=2.44,height=2.59;
      box(w,height,length,x,y,z,m,y<2);
      for(const side of[-1,1]){
        inst(corrugation,m,x+side*1.226,y,z,1,1,length/12.02,0,side<0?Math.PI:0);
        for(const yy of[-1.23,1.23])inst(unit,m,x+side*1.22,y+yy,z,.085,.12,length);
        for(const zz of[-1,1]){inst(unit,m,x+side*1.19,y,z+zz*length/2,.13,2.59,.14);for(const yy of[-1.19,1.19]){inst(unit,iron,x+side*1.16,y+yy,z+zz*(length/2-.06),.20,.21,.20);inst(unit,dark,x+side*1.263,y+yy,z+zz*(length/2-.06),.008,.086,.112);}}
        inst(unit,m,x,y+1.29,z,w,.035,length);
        if(length>9)inst(labelGeo,labelMat,x+side*1.272,y+.22,z+(c%3-1)*1.1,1,1,1,0,side*Math.PI/2);
      }
      const end=z+length/2+.035;
      inst(unit,dark,x,y,end,2.24,2.4,.018);
      for(const side of[-1,1]){
        inst(unit,m,x+side*.575,y,end+.025,1.12,2.30,.035);
        for(const xx of[.25,.91]){pipe(x+side*xx,y-1.12,end+.09,x+side*xx,y+1.12,end+.09,.023,iron);for(const yy of[-1.06,-.48,.53,1.06]){inst(unit,iron,x+side*xx,y+yy,end+.095,.083,.055,.07);}inst(unit,dark,x+side*xx,y-.30,end+.13,.04,.13,.02);inst(unit,iron,x+side*xx-side*.09,y-.27,end+.15,.22,.03,.025);}
        for(const yy of[-.93,0,.93])inst(unit,iron,x+side*1.07,y+yy,end+.065,.16,.05,.04);
      }
      inst(idGeo,idMats[c%8],x+.57,y+.48,end+.053,1,1,1);inst(hazardGeo,hazardMat,x-.6,y-.22,end+.06,1,1,1);
    }
    // 入口是装卸广场；堆垛高低、退让和缺口共同形成可辨认的交叉口。
    const stacks=[
      [-7.5,23,2,1,6.04],[-9.8,11,0,2,12.02],[-7.2,-5,1,3,12.02],[-8.7,-29,4,2,12.02],[-7.2,-44,2,1,6.04],
      [8.2,14,4,3,12.02],[11.1,14,2,2,12.02],[6.8,-5,1,1,12.02],[10.1,-5,2,2,12.02],[7.4,-27,0,3,12.02],[7.4,-44,3,2,6.04],
      [-30,19,4,2,12.02],[-30,1,2,2,12.02],[-30,-20,1,3,12.02],[-30,-40,0,2,12.02],
      [23,14,2,2,12.02],[23,-5,3,1,12.02],[23,-35,1,2,12.02]
    ];
    for(const[x,z,c,layers,length]of stacks)for(let j=0;j<layers;j++)container(x+(j%2)*.08,z+(j%2)*.12,(c+j*2)%5,1.30+j*2.61,length);
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
    function crane(x,z){
      const beam=(ax,ay,az,bx,by,bz,w,d,m=iron)=>{const a=new T.Vector3(ax,ay,az),b=new T.Vector3(bx,by,bz),v=b.clone().sub(a),matrix=new T.Matrix4().compose(a.add(b).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize()),new T.Vector3(w,v.length(),d));const k=unit.uuid+m.uuid;if(!batches.has(k))batches.set(k,{geometry:unit,material:m,list:[]});batches.get(k).list.push(matrix);};
      for(const sx of[-1,1])for(const sz of[-1,1]){
        beam(x+sx*5.2,0,z+sz*3.8,x+sx*3.3,21,z+sz*2.6,.52,.68);
        beam(x+sx*5,2,z+sz*3.8,x+sx*3.3,17,z-sz*2.8,.15,.23);
        inst(unit,metal,x+sx*5.1,.7,z+sz*3.8,1.5,1.0,2.8);solid(1.5,1.2,2.8,x+sx*5.1,.6,z+sz*3.8);
        for(const zz of[-.8,.8])inst(cylinder,dark,x+sx*5.1,.42,z+sz*3.8+zz,.43,1.8,.43,0,0,Math.PI/2);
      }
      for(const sx of[-1,1]){
        for(const yy of[21,24])inst(unit,iron,x+sx*3.4,yy,z-7,.28,.32,34);
        for(let j=-23;j<9;j+=2.6){beam(x+sx*3.4,21,z+j,x+sx*3.4,24,z+j+2.6,.13,.16);beam(x+sx*3.4,24,z+j,x+sx*3.4,21,z+j+2.6,.13,.16);inst(unit,metal,x+sx*3.4,22.5,z+j,.24,3,.22);}
        inst(unit,iron,x+sx*3.8,21.15,z-7,.75,.09,34);
        for(let j=-23;j<10;j+=2){pipe(x+sx*4.1,21.2,z+j,x+sx*4.1,22.1,z+j,.025,iron);}
        pipe(x+sx*4.1,22.1,z-23,x+sx*4.1,22.1,z+10,.025,iron);
      }
      for(let j=-23;j<11;j+=3.4){inst(unit,metal,x,21,z+j,7,.24,.24);beam(x-3.4,24,z+j,x+3.4,24,z+j+3.4,.10,.14);}
      for(const side of[-1,1]){pipe(x+side*1.7,21.2,z-8,x+side*1.7,6.4,z-8,.018,dark);pipe(x+side*1.7,21.2,z-6.8,x+side*1.7,6.4,z-6.8,.018,dark);}
      inst(unit,yellow,x,6.3,z-7.4,4.4,.32,1.7);for(const side of[-1,1])inst(unit,dark,x+side*2.1,6.1,z-7.4,.15,.38,1.6);
      box(2.4,2.1,2.5,x-4.1,20.1,z-5,metal);for(const side of[-1,1])inst(unit,dark,x-4.1+side*1.21,20.3,z-5,.02,1.2,1.8);
      inst(unit,dark,x-4.1,20.3,z-3.74,1.9,1.2,.025);inst(unit,iron,x-4.1,21.2,z-5,2.7,.15,2.8);
      for(let j=0;j<39;j++){inst(unit,iron,x-3.4,2+j*.47,z+3.0,1.0,.045,.07);}
      for(const side of[-1,1])pipe(x-3.4+side*.52,1,z+3,x-3.4+side*.52,21,z+3,.035,iron);
      inst(unit,orangeGlow,x+3.5,24.3,z-22,.12,.14,.12);
    }
    crane(-19, -23); crane(16, -52); crane(54, -40);
    const cityMat=mat('#607981',.9,.1),cityGlass=mat('#66818a',.45,.35);
    for (let i = 0; i < 24; i++) { const x = (i%2?1:-1)*(55+rand()*100), z = -130 - rand() * 55, height = 7 + rand() * 16,w=6+rand()*8; box(w,height,8,x,height/2,z,cityMat,false,false);inst(unit,iron,x,height+.4,z,w*.7,.8,5);for(let yy=3;yy<height-1;yy+=2)inst(unit,cityGlass,x,yy,z+4.02,w*.84,.45,.03); }
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
    const boat=new T.Group();boat.position.set(39,-.55,28);scene.add(boat);
    const hullPaint=mat('#263c46',.46,.3),deckPaint=mat('#79847e',.84,.06),boatRubber=mat('#27302e',.87,.02);
    const boatPart=(g,m,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;boat.add(o);return o;};
    const sections=[[-2.9,1.03,.10],[-1.7,1.1,.08],[.5,1.07,.12],[1.9,.76,.22],[2.8,.05,.38]],hp=[],hi=[];
    for(const[z,w,y]of sections){hp.push(-w,y+.32,z,-w*.75,y-.06,z,0,y-.30,z,w*.75,y-.06,z,w,y+.32,z);}
    for(let j=0;j<sections.length-1;j++)for(let k=0;k<4;k++){const a=j*5+k;hi.push(a,a+5,a+1,a+1,a+5,a+6);}hi.push(0,4,2,0,2,1,2,4,3);
    const hullGeo=new T.BufferGeometry();hullGeo.setAttribute('position',new T.Float32BufferAttribute(hp,3));hullGeo.setIndex(hi);hullGeo.computeVertexNormals();boatPart(hullGeo,hullPaint);
    const deckShape=new T.Shape();deckShape.moveTo(-.91,-2.75);deckShape.lineTo(.91,-2.75);deckShape.lineTo(.94,.5);deckShape.lineTo(.64,1.8);deckShape.lineTo(0,2.55);deckShape.lineTo(-.64,1.8);deckShape.lineTo(-.94,.5);deckShape.closePath();const deckGeo=new T.ExtrudeGeometry(deckShape,{depth:.08,bevelEnabled:false});deckGeo.rotateX(Math.PI/2);boatPart(deckGeo,deckPaint,0,.46,0);
    const tubePath=new T.CatmullRomCurve3([new T.Vector3(-1.05,.39,-2.8),new T.Vector3(-1.12,.43,.2),new T.Vector3(-.79,.50,1.75),new T.Vector3(0,.58,2.65),new T.Vector3(.79,.50,1.75),new T.Vector3(1.12,.43,.2),new T.Vector3(1.05,.39,-2.8)]);boatPart(new T.TubeGeometry(tubePath,64,.20,12,false),boatRubber);
    for(const x of[-1,1]){for(const z of[-2,-.7,.7,1.5]){const band=boatPart(new T.TorusGeometry(.205,.018,6,16),iron,x*(z>1?.86:1.1),z>1?.49:.43,z);band.rotation.y=Math.PI/2;}
      const rope=new T.CatmullRomCurve3([new T.Vector3(x*1.24,.48,-2.5),new T.Vector3(x*1.30,.43,-1.4),new T.Vector3(x*1.26,.48,-.2),new T.Vector3(x*1.05,.51,1.2)]);boatPart(new T.TubeGeometry(rope,24,.018,6,false),boatRubber);
    }
    const consoleGeo=new T.CylinderGeometry(.42,.53,.95,4);consoleGeo.rotateY(Math.PI/4);boatPart(consoleGeo,deckPaint,0,.87,.4);
    const boatGlass=boatPart(new T.PlaneGeometry(.84,.65),new T.MeshPhysicalMaterial({color:'#7d9a9d',metalness:.3,roughness:.13,transparent:true,opacity:.65,side:T.DoubleSide}),0,1.45,.69);boatGlass.rotation.x=-.28;
    for(const x of[-.44,.44]){const rail=boatPart(new T.CylinderGeometry(.025,.025,.8,8),iron,x,1.45,.68);rail.rotation.x=-.28;}
    const wheel=boatPart(new T.TorusGeometry(.17,.022,6,24),dark,0,1.26,-.05);wheel.rotation.x=-.5;
    for(const z of[-.65,-1.7]){boatPart(new T.BoxGeometry(1.40,.18,.42),boatRubber,0,.75,z);for(const x of[-.55,.55])boatPart(new T.BoxGeometry(.065,.3,.28),iron,x,.57,z);}
    boatPart(new T.BoxGeometry(.58,.62,.48),hullPaint,0,.65,-3.10);boatPart(new T.BoxGeometry(.13,.87,.16),iron,0,-.08,-3.13);const prop=boatPart(new T.TorusGeometry(.20,.015,5,18),iron,0,-.43,-3.25);
    boatPart(new T.BoxGeometry(.025,.31,.03),dark,0,-.43,-3.27).rotation.z=.8;
    const lifeRing=boatPart(new T.TorusGeometry(.25,.075,8,32),mat('#ad593a',.8,.02),.95,.73,-1.3);lifeRing.rotation.y=Math.PI/2;
    H.mergeParts(boat);
    const exitMarker = document.createElement('div'); exitMarker.className = 'marker off'; exitMarker.style.display = 'none'; document.querySelector('#markers').appendChild(exitMarker); world.exitMarker = exitMarker;
    // 工业近景：木托盘、缆绳、轮胎、叉车与仓库管线。
    const timber=mat('#b2a28b',.95,.01,{map:H.art.texture('harbor_wood_color'),normalMap:H.art.texture('harbor_wood_normal'),normalScale:new T.Vector2(.4,.4)}),tireGeo=new T.TorusGeometry(.31,.12,8,20);
    for(const p of [[-16,18],[-17,19.3],[17,-10],[-18,-34],[15,-41]]){
      solid(1.5,.62,1.3,p[0],.31,p[1],'wood');
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
    // 遮雨检修棚增加可进入的暗部与遮挡，入口通向补给箱和侧巷。
    const shelterRoof=box(12.5,.20,13.5,-19,5.3,20.5,iron,true);
    box(.16,5.2,13,-25,2.6,20.5,metal,true);
    box(12,5.2,.16,-19,2.6,27,metal,true);
    for(const x of [-24.7,-13.3])for(const z of [14.2,26.7])box(.18,5.2,.18,x,2.6,z,iron,true);
    for(const x of [-23,-20,-17,-14]){pipe(x,5.15,14,x,5.15,27,.045,iron);}
    const shelterLamp=new T.PointLight('#d6ded5',22,16,2);shelterLamp.position.set(-19,4.5,21);scene.add(shelterLamp);
    const tubeLamp=mat('#d9ded3',.4,.1,{emissive:'#d0ddd2',emissiveIntensity:2.8});for(const x of [-22,-17]){box(2.2,.08,.22,x,4.9,20,iron,false);box(2.0,.035,.10,x,4.84,20,tubeLamp,false,false);}
    // 检修棚内的货架、工作台与电气柜为近景提供结构和使用痕迹。
    for(const z of [17,22.5]){
      for(const zz of [-1.5,1.5])for(const x of [-24.6,-23.8])inst(unit,iron,x,1.5,z+zz,.065,3,.065);
      for(const y of [.2,1.2,2.2]){inst(unit,iron,-24.2,y,z,.9,.07,3.2);for(let j=0;j<3;j++){inst(unit,timber,-24.2,y+.3,z-1+j,.58,.53,.70);inst(unit,dark,-23.9,y+.3,z-1+j,.02,.1,.5);}}
    }
    box(3,.16,.95,-20,.95,26,iron,true);for(const x of[-21.3,-18.7])box(.12,.9,.72,x,.45,26,dark,true);
    for(let j=0;j<4;j++){box(.7,2.5,.45,-16.5+j*.78,1.25,26.5,metal,true);inst(unit,dark,-16.5+j*.78,1.8,26.23,.5,.55,.025);inst(unit,cyanGlow,-16.5+j*.78,1.85,26.20,.11,.035,.015);}
    for(let x=-24.5;x<-13.5;x+=.6){const stripe=box(.3,.016,.28,x,.01,14.1,yellow,false,false);stripe.rotation.y=.4;}
    const serviceLabel=canvasTexture(512,128,ctx=>{ctx.fillStyle='#c3c8b8';ctx.font='bold 45px sans-serif';ctx.fillText('维修作业区 / SERVICE',12,52);ctx.font='21px monospace';ctx.fillText('EASTLINE 07   •   注意设备安全',14,97);});
    const serviceSign=new T.Mesh(new T.PlaneGeometry(4.2,1.05),new T.MeshStandardMaterial({map:serviceLabel,transparent:true,roughness:.8}));serviceSign.position.set(-21,3.8,26.73);serviceSign.rotation.y=Math.PI;scene.add(serviceSign);
    // 装卸区近景采用真实斜面、接缝和部件比例，提供脚下到远处连续的尺度参照。
    const trafficPaint=mat('#aa5933',.78,.04),reflective=mat('#b8b7a5',.5,.1),drainMat=mat('#333e40',.74,.67);
    const barrierShape=new T.Shape();barrierShape.moveTo(-.36,0);barrierShape.lineTo(.36,0);barrierShape.lineTo(.36,.17);barrierShape.lineTo(.15,.62);barrierShape.lineTo(.12,.96);barrierShape.lineTo(-.12,.96);barrierShape.lineTo(-.15,.62);barrierShape.lineTo(-.36,.17);barrierShape.closePath();
    const barrierGeo=new T.ExtrudeGeometry(barrierShape,{depth:3.4,bevelEnabled:true,bevelSize:.018,bevelThickness:.018,bevelSegments:2});barrierGeo.translate(0,0,-1.7);
    function barrier(x,z,turn=0){const o=new T.Mesh(barrierGeo,concrete);o.position.set(x,0,z);o.rotation.y=turn;o.castShadow=o.receiveShadow=true;scene.add(o);surfaces.push(o);const w=turn?3.44:.76,d=turn?.76:3.44;collisions.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,y:.98});for(const zz of[-.9,.9]){const torus=new T.TorusGeometry(.055,.008,6,12);const ring=new T.Mesh(torus,iron);ring.position.set(x+Math.sin(turn)*zz,.98,z+Math.cos(turn)*zz);ring.rotation.y=turn;scene.add(ring);} }
    barrier(-3.7,28);barrier(14.8,28,Math.PI/2);barrier(-4.1,-18,Math.PI/2);barrier(3,-36,Math.PI/2);
    const coneGeo=new T.CylinderGeometry(.045,.21,.64,24),coneStripe=new T.CylinderGeometry(.097,.132,.14,24),coneBase=new T.BoxGeometry(.49,.055,.49);
    for(const[x,z]of[[-3.2,30],[-3.15,26],[-13.1,13.2],[16.9,27.5],[11.5,-19],[-22,-4]]){inst(coneBase,rubber,x,.027,z,1,1,1);inst(coneGeo,trafficPaint,x,.365,z,1,1,1);inst(coneStripe,reflective,x,.44,z,1,1,1);}
    // 灯杆底座、检修盖、电缆与门牌使街区具有可读的使用场景。
    const poleX=-3.4,poleZ=15;
    box(.72,.30,.72,poleX,.15,poleZ,concrete,true);
    box(.35,.62,.16,poleX,.84,poleZ+.13,metal,false);for(const dx of[-.26,.26])for(const dz of[-.26,.26])inst(cylinder,iron,poleX+dx,.33,poleZ+dz,.025,.06,.025);
    const notice=canvasTexture(512,512,ctx=>{ctx.fillStyle='#aea694';ctx.fillRect(0,0,512,512);ctx.fillStyle='#343c39';ctx.fillRect(15,15,482,482);ctx.fillStyle='#b9baa7';ctx.font='bold 112px monospace';ctx.fillText('07',45,136);ctx.font='bold 42px sans-serif';ctx.fillText('作业区',45,210);ctx.font='23px monospace';ctx.fillText('LOADING BAY',45,253);ctx.fillStyle='#b49b5e';ctx.fillRect(45,286,410,5);ctx.font='26px sans-serif';ctx.fillText('车辆限速  10 km/h',45,345);ctx.font='22px sans-serif';ctx.fillText('严禁烟火 / 保持通道',45,400);});
    const noticeMesh=new T.Mesh(new T.PlaneGeometry(.68,.68),new T.MeshStandardMaterial({map:notice,roughness:.83}));noticeMesh.position.set(poleX,2.45,poleZ+.11);scene.add(noticeMesh);
    // 路面裂缝与轮胎痕迹只在局部出现，透明边界与地面本身共享受光。
    const crackTex=canvasTexture(1024,1024,ctx=>{ctx.lineCap='round';function branch(x,y,angle,n,width){ctx.beginPath();ctx.moveTo(x,y);for(let j=0;j<n;j++){angle+=(rand()-.5)*1.1;const nx=x+Math.cos(angle)*(9+rand()*18),ny=y+Math.sin(angle)*(9+rand()*18);ctx.lineTo(nx,ny);if(j%7===3&&width>1)branch(nx,ny,angle+(rand()-.5)*2.2,9,width*.45);x=nx;y=ny;}ctx.strokeStyle='#202926b0';ctx.lineWidth=width;ctx.stroke();}for(let i=0;i<8;i++)branch(rand()*1024,rand()*1024,rand()*6.28,30,1.6+rand()*2);});
    const crackMat=new T.MeshStandardMaterial({map:crackTex,transparent:true,depthWrite:false,roughness:.98,opacity:.65,polygonOffset:true,polygonOffsetFactor:-2});
    for(const[x,z,rot]of[[0,27,.3],[-1,13,1.8],[4,-10,.9],[-18,2,2.2],[18,22,0],[-20,19,.8]]){const o=new T.Mesh(new T.PlaneGeometry(7,7),crackMat);o.rotation.set(-Math.PI/2,0,rot);o.position.set(x,.009,z);scene.add(o);}
    const tireTex=canvasTexture(128,1024,ctx=>{const gr=ctx.createLinearGradient(0,0,128,0);gr.addColorStop(0,'#17201d00');gr.addColorStop(.2,'#17201d60');gr.addColorStop(.8,'#17201d60');gr.addColorStop(1,'#17201d00');ctx.fillStyle=gr;ctx.fillRect(0,0,128,1024);ctx.globalCompositeOperation='destination-out';for(let y=0;y<1024;y+=24){ctx.globalAlpha=.25+rand()*.5;ctx.fillRect(0,y,128,6);}for(let i=0;i<1500;i++){ctx.globalAlpha=rand()*.6;ctx.fillRect(rand()*128,rand()*1024,3,6);}});
    const tireMarkMat=new T.MeshStandardMaterial({map:tireTex,transparent:true,depthWrite:false,roughness:.85,opacity:.48,polygonOffset:true,polygonOffsetFactor:-2});
    for(const x of[-1.0,1.0,16,18])for(const z of[-30,-10,10,29]){const o=new T.Mesh(new T.PlaneGeometry(.34,18),tireMarkMat);o.rotation.x=-Math.PI/2;o.position.set(x,.01,z);scene.add(o);}
    const pebbleGeo=new T.IcosahedronGeometry(.035,0),debrisMat=mat('#858b84',.97,.02);
    for(let i=0;i<350;i++){const side=i%2?1:-1,x=side*(4+rand()*7),z=-49+rand()*80;inst(pebbleGeo,debrisMat,x,.018,z,.4+rand()*1.4,.3+rand()*.4,.5+rand()*1.7,rand()*6,rand()*6,0);}
    // 灯具和仓库结构：梁、檩条、瓦楞墙、墙根与泄水管均有几何厚度。
    const steelBeam=mat('#4a5558',.71,.6),wallPaint=mat('#627275',.84,.22,{map:H.art.texture('rusty_painted_metal_color'),normalMap:H.art.texture('rusty_painted_metal_normal'),normalScale:new T.Vector2(.15,.15)});
    for(const z of[14.2,18.4,22.6,26.7]){
      inst(unit,steelBeam,-19,5.08,z,12,.21,.15);
      for(const sx of[-1,1])pipe(-19+sx*5.7,4.0,z,-19+sx*4.6,5.05,z,.055,steelBeam);
    }
    for(let z=14.1;z<27;z+=.22)inst(unit,wallPaint,-24.88,2.8,z,.035,4.6,.055);
    for(let x=-24.8;x<-13.1;x+=.22)inst(unit,wallPaint,x,2.8,26.88,.055,4.6,.035);
    box(12,.45,.23,-19,.22,26.85,concrete,true);box(.23,.45,12.8,-24.84,.22,20.4,concrete,true);
    for(const x of[-24.9,-13.1]){pipe(x,5.4,14,x,5.4,27,.08,iron);pipe(x,5.4,26.6,x,.25,26.6,.055,iron);}
    for(const x of[-23.8,-14.2]){box(.22,1.4,.22,x,.7,14.0,yellow,true);for(let i=0;i<4;i++)inst(unit,dark,x,.25+i*.30,14.12,.23,.12,.02);}
    const shopFloor=new T.Mesh(new T.PlaneGeometry(11.7,12.7),new T.MeshStandardMaterial({color:'#acada4',map:H.art.texture('harbor_concrete_color',4,4),normalMap:H.art.texture('harbor_concrete_normal',4,4),normalScale:new T.Vector2(.25,.25),roughness:.87,metalness:.01}));shopFloor.rotation.x=-Math.PI/2;shopFloor.position.set(-19,.006,20.5);shopFloor.receiveShadow=true;scene.add(shopFloor);surfaces.push(shopFloor);
    for(const x of[-22,-18,-14])inst(unit,dark,x,.008,20.5,.008,.003,12.7);
    for(const z of[17,21,25])inst(unit,dark,-19,.008,z,11.7,.003,.008);
    // 电气面板与工具板有真实小件；一批实例必须在所有构件生成后再提交。
    for(let i=0;i<4;i++){const x=-16.5+i*.78;for(let j=0;j<6;j++)inst(unit,dark,x,2.18-j*.045,26.25,.47,.018,.02);inst(unit,iron,x+.23,1.15,26.24,.025,.18,.025);for(const y of[.25,2.35])inst(unit,iron,x-.26,y,26.23,.035,.08,.024);}
    const toolBoard=box(2.4,1.2,.07,-20,2.1,26.65,dark,false);for(let i=0;i<13;i++)for(let j=0;j<5;j++)inst(cylinder,iron,-21.1+i*.18,1.65+j*.21,26.60,.009,.008,.009,Math.PI/2);
    for(let i=0;i<7;i++){pipe(-21+i*.29,1.8,26.53,-21+i*.29,2.3-i%3*.1,26.53,.014,iron);inst(unit,iron,-21+i*.29,2.27-i%3*.1,26.53,.06,.07,.025);}
    for(let i=0;i<5;i++){const x=-21.0+i*.43;inst(cylinder,metal,x,1.11,26.0,.10,.20,.10);inst(cylinder,yellow,x,1.23,26.0,.09,.025,.09);}
    // 码头真实边缘取代整片平地，船体下方可见海面。
    for(let z=-48;z<34;z+=4){box(1.2,1.3,3.96,35.1,-.53,z,concrete,false);for(const zz of[-1.3,1.3])inst(tireGeo,rubber,35.75,-.32,z+zz,1.5,1.5,1.5,0,Math.PI/2);}
    for(const z of[-38,-20,0,20,32]){inst(cylinder,iron,33.8,.3,z,.15,.58,.15);inst(cylinder,iron,33.8,.61,z,.22,.07,.22);}
    // 将重复小零件合并为实例绘制，控制浏览器开销。
    for (const batch of batches.values()) { const mesh = new T.InstancedMesh(batch.geometry, batch.material, batch.list.length); batch.list.forEach((m, i) => mesh.setMatrixAt(i, m)); mesh.userData.staticInstances=true;mesh.receiveShadow = true; mesh.castShadow = batch.geometry===unit||batch.geometry===corrugation; scene.add(mesh); }
    world.expectedInstances=[...batches.values()].reduce((n,b)=>n+b.list.length,0);
    // 共享箱体按材质和碰撞属性实例化，射击仍检测实际实例的几何。
    // 已实例化的网格不得再次按一个普通 Mesh 合并，否则会丢失整个实例列表。
    const boxGroups=new Map();for(const mesh of [...scene.children])if(mesh.isMesh&&!mesh.isInstancedMesh&&mesh.geometry===unit){const hit=surfaces.includes(mesh),key=mesh.material.uuid+'|'+mesh.castShadow+'|'+hit;if(!boxGroups.has(key))boxGroups.set(key,{material:mesh.material,cast:mesh.castShadow,hit,items:[]});boxGroups.get(key).items.push(mesh);}
    for(const g of boxGroups.values()){if(g.items.length<2)continue;const batch=new T.InstancedMesh(unit,g.material,g.items.length);g.items.forEach((m,i)=>{m.updateMatrix();batch.setMatrixAt(i,m.matrix);scene.remove(m);const j=surfaces.indexOf(m);if(j>=0)surfaces.splice(j,1);});batch.castShadow=g.cast;batch.receiveShadow=true;batch.userData.surface=g.material===concrete?'concrete':'metal';scene.add(batch);if(g.hit)surfaces.push(batch);}
    world.staticInstances=scene.children.filter(o=>o.userData.staticInstances).reduce((n,o)=>n+o.count,0);
    world.update = (dt,time,camera) => {
      // 阴影视野集中在玩家附近，细小托盘、栏杆和设备脚也产生接触阴影。
      const direction=camera.getWorldDirection(new T.Vector3());const sx=Math.round((camera.position.x+direction.x*12)*16)/16,sz=Math.round((camera.position.z+direction.z*12)*16)/16;
      sun.target.position.set(sx,0,sz);sun.position.copy(sun.target.position).addScaledVector(H.sunDirection,120);sun.target.updateMatrixWorld();
      sky.material.uniforms.time.value=time;terrain.update(dt,time,camera);
      beacons.forEach(b=>{b.ring.rotation.y=time*.7;b.light.intensity=b.off?1:5+Math.sin(time*3)*1.5;});
      boat.position.y=-.55+Math.sin(time*1.3)*.055;boat.rotation.z=Math.sin(time*.87)*.018;
    };
    world.setQuality=q=>{world.quality=q;terrain.setQuality(q);sun.castShadow=true;const n=q==='high'?3072:q==='low'?1024:2048;if(sun.shadow.mapSize.x!==n){sun.shadow.mapSize.set(n,n);sun.shadow.map?.dispose();sun.shadow.map=null;}renderer.shadowMap.needsUpdate=true;};
    world.setBeacon = (b, off) => { b.off = off; for (const m of [b.screen.material, b.ring.material, b.led.material]) { m.color.set(off ? '#80ddd3' : '#ffad58'); m.emissive.set(off ? '#35b8bd' : '#ff7b26'); } b.light.color.set(off ? '#60d8cc' : '#ff9b50'); };
    return world;
  };
})(window.Harbor);
