/* AR–07 第三版：微表面、准直分划、分阶段换弹与多轴弹簧动画。 */
(function (H) {
  'use strict';
  const T = THREE;
  H.createWeapon = function () {
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(64, innerWidth / innerHeight, .015, 8), root = new T.Group(); scene.add(root); scene.environment = H.art.environment;
    scene.add(new T.HemisphereLight('#bbd9e4', '#353c3b', 1.3));
    const key = new T.DirectionalLight('#ffd0a0', 3.3); key.position.set(-3, 4, -4); scene.add(key);
    const fill = new T.DirectionalLight('#8cb3c9', .7); fill.position.set(2, .5, 2); scene.add(fill);
    const rough = H.art.texture('metal_plate_roughness', 2, 2), normal = H.art.texture('metal_plate_normal', 2, 2);
    const steel = new T.MeshStandardMaterial({ color: '#4c5559', roughness: .44, metalness: .78, roughnessMap: rough, normalMap: normal, normalScale: new T.Vector2(.065,.065), envMapIntensity: 1.3 });
    const edge = new T.MeshStandardMaterial({ color: '#899294', roughness: .38, metalness: .9, roughnessMap: rough, envMapIntensity: 1.1 });
    const black = new T.MeshStandardMaterial({ color: '#172023', roughness: .68, metalness: .12 });
    const tan = new T.MeshStandardMaterial({ color: '#6d7163', roughness: .84, metalness: .08 });
    const recess = new T.MeshStandardMaterial({ color: '#11191d', roughness: .94, metalness: .25 });
    const rubber = new T.MeshStandardMaterial({ color: '#2c3331', roughness: .95 });
    const glove = new T.MeshStandardMaterial({ color: '#5a5e50', roughness: .9 });
    const cuff = new T.MeshStandardMaterial({ color: '#263632', roughness: .97 });
    const clothCanvas = document.createElement('canvas');clothCanvas.width=256;clothCanvas.height=256;const cx=clothCanvas.getContext('2d');cx.fillStyle='#687468';cx.fillRect(0,0,256,256);
    let seed=22;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<120;i++){cx.fillStyle=['#3e5146','#9a9b7c','#58614f','#2e423c'][i%4];cx.beginPath();const x=random()*256,y=random()*256;cx.ellipse(x,y,random()*25+5,random()*14+4,random()*6,0,Math.PI*2);cx.fill();}
    for(let i=0;i<256;i+=2){cx.strokeStyle=i%4?'#0e241212':'#d9d6a217';cx.beginPath();cx.moveTo(i,0);cx.lineTo(i,256);cx.moveTo(0,i);cx.lineTo(256,i);cx.stroke();}
    const clothTex=new T.CanvasTexture(clothCanvas);clothTex.colorSpace=T.SRGBColorSpace;const sleeve=new T.MeshStandardMaterial({color:'#c0c9bc',map:clothTex,bumpMap:clothTex,bumpScale:.002,roughness:1});
    function add(geo, material, x=0, y=0, z=0, parent=root) {const m=new T.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m;}
    function rounded(w,h,d,x,y,z,m,parent=root,r=.007){r=Math.min(r,w*.2,h*.2);const s=new T.Shape(),a=-w/2,b=-h/2;s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);const geo=new T.ExtrudeGeometry(s,{depth:d,steps:1,bevelEnabled:true,bevelSize:r*.4,bevelThickness:r*.4,bevelSegments:2,curveSegments:3});geo.translate(0,0,-d/2);return add(geo,m,x,y,z,parent);}
    function box(w,h,d,x,y,z,m,parent=root){return add(new T.BoxGeometry(w,h,d),m,x,y,z,parent);}
    function cyl(r,len,x,y,z,m,parent=root,n=20){const mesh=add(new T.CylinderGeometry(r,r,len,n),m,x,y,z,parent);mesh.rotation.x=Math.PI/2;return mesh;}
    function profile(points,w,x,y,z,m,parent=root,bevel=.004){const shape=new T.Shape();points.forEach((p,i)=>i?shape.lineTo(-p[0],p[1]):shape.moveTo(-p[0],p[1]));shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:w,steps:1,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:3});geo.rotateY(Math.PI/2);geo.translate(-w/2,0,0);return add(geo,m,x,y,z,parent);}
    // 枪身不是整块长方体：上机匣、弹匣井、握把座分别塑形。
    profile([[.055,.058],[-.235,.058],[-.30,.025],[-.285,-.031],[-.08,-.045],[.04,-.025]],.077,0,0,-.07,steel);
    profile([[.015,.004],[-.28,.004],[-.30,-.085],[-.185,-.10],[-.15,-.05],[-.01,-.045]],.075,0,0,-.07,steel);
    rounded(.088,.088,.10,0,-.067,-.29,steel);rounded(.094,.009,.10,0,-.112,-.29,edge);
    cyl(.025,.27,0,.015,.125,steel);cyl(.029,.07,0,.015,.027,black);
    const stock=profile([[.03,.055],[.20,.055],[.22,.015],[.19,-.112],[.14,-.123],[.095,-.065],[.03,-.03]],.10,0,0,.045,black);
    rounded(.11,.16,.025,0,-.032,.245,rubber);rounded(.084,.032,.14,0,.055,.13,black);
    profile([[0,-.015],[-.027,-.015],[-.064,-.165],[-.004,-.188],[.03,-.162]],.064,0,-.025,-.055,tan);
    for(let j=0;j<9;j++)rounded(.068,.005,.05,0,-.09-j*.011,-.067+j*.0015,black);
    // 真实空心扳机护圈、保险与机匣销。
    const triggerGuard=new T.Shape();triggerGuard.moveTo(-.06,-.045);triggerGuard.lineTo(-.17,-.045);triggerGuard.quadraticCurveTo(-.175,-.105,-.14,-.105);triggerGuard.lineTo(-.075,-.105);triggerGuard.quadraticCurveTo(-.05,-.10,-.06,-.045);
    const hole=new T.Path();hole.moveTo(-.071,-.057);hole.lineTo(-.151,-.057);hole.lineTo(-.15,-.09);hole.lineTo(-.08,-.09);hole.closePath();triggerGuard.holes.push(hole);const tg=new T.ExtrudeGeometry(triggerGuard,{depth:.014,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1});tg.rotateY(Math.PI/2);tg.translate(-.007,0,0);add(tg,steel);
    const trigger=rounded(.012,.05,.014,0,-.069,-.119,edge);trigger.rotation.x=-.32;
    for(const side of [-1,1]){for(const p of [[-.07,-.005],[-.22,-.036],[.005,.018]]){const pin=cyl(.009,.005,side*.044,p[1],p[0],edge);pin.rotation.z=Math.PI/2;}const safety=rounded(.012,.013,.043,side*.047,-.025,-.07,black);safety.rotation.x=-.35;}
    // 上护木使用八角截面和嵌入式 M-LOK 开槽。
    const handguard=new T.Mesh(new T.CylinderGeometry(.054,.058,.335,8),steel);handguard.rotation.x=Math.PI/2;handguard.rotation.z=Math.PI/8;handguard.position.set(0,.012,-.515);root.add(handguard);
    cyl(.021,.28,0,.009,-.80,steel);cyl(.028,.058,0,.009,-.93,edge);cyl(.029,.07,0,.009,-.977,steel,root,24);cyl(.019,.007,0,.009,-1.016,recess);
    for(let i=0;i<6;i++){const cut=box(.011,.045,.035,0,.009,-.973,recess);cut.rotation.z=i*Math.PI/3;}
    for(const side of [-1,1])for(let j=0;j<7;j++){rounded(.003,.019,.028,side*.053,.005,-.39-j*.041,recess,root,.003);rounded(.003,.005,.021,side*.055,.025,-.39-j*.041,edge,root,.001);}
    rounded(.058,.012,.62,0,.072,-.37,black);
    for(let j=0;j<28;j++){rounded(.058,.009,.011,0,.084,-.68+j*.025,steel,root,.0015);box(.040,.003,.005,0,.092,-.68+j*.025,edge);}
    for(const side of [-1,1])for(let j=0;j<6;j++){rounded(.008,.015,.009,side*.063,-.005,-.45-j*.031,steel,root,.001);}
    const foregrip=rounded(.038,.10,.05,0,-.075,-.50,tan);foregrip.rotation.x=-.15;
    // 弹匣为独立可动组，换弹时脱离枪身并重新插入。
    const magazine=new T.Group();root.add(magazine);magazine.position.set(0,-.1,-.285);
    profile([[.045,0],[-.045,0],[-.057,-.18],[-.019,-.25],[.06,-.238],[.037,-.16]],.067,0,0,0,black,magazine);
    for(const side of [-1,1])for(let j=0;j<4;j++){const rib=rounded(.003,.18,.006,side*.036,-.113,-.027+j*.02,steel,magazine,.001);rib.rotation.x=.12;}
    rounded(.078,.025,.105,0,-.24,.003,tan,magazine);
    rounded(.008,.027,.10,.045,.015,-.18,recess);rounded(.008,.014,.074,.051,.024,-.185,edge);
    const bolt=new T.Group();root.add(bolt);rounded(.012,.018,.048,.061,.022,-.132,steel,bolt);rounded(.021,.014,.018,.072,.022,-.114,edge,bolt);
    const dustCover=rounded(.004,.022,.095,.05,-.014,-.183,black);dustCover.rotation.z=.27;
    // 镂空全息瞄具、玻璃反光、亮度克制的红点。
    rounded(.07,.025,.09,0,.101,-.205,black);rounded(.055,.018,.07,0,.122,-.205,steel);
    const sight=profile([[.032,.005],[.035,.075],[.023,.092],[-.023,.092],[-.035,.075],[-.032,.005]],.011,0,.117,-.205,steel);
    root.remove(sight);sight.geometry.dispose();
    const hoodShape=new T.Shape();hoodShape.moveTo(-.052,-.043);hoodShape.lineTo(.052,-.043);hoodShape.lineTo(.053,.037);hoodShape.quadraticCurveTo(.052,.063,.028,.067);hoodShape.lineTo(-.028,.067);hoodShape.quadraticCurveTo(-.052,.063,-.053,.037);hoodShape.closePath();
    const hoodHole=new T.Path();hoodHole.moveTo(-.039,-.027);hoodHole.lineTo(-.039,.035);hoodHole.quadraticCurveTo(-.037,.052,-.022,.052);hoodHole.lineTo(.022,.052);hoodHole.quadraticCurveTo(.037,.052,.039,.035);hoodHole.lineTo(.039,-.027);hoodHole.closePath();hoodShape.holes.push(hoodHole);
    const hoodGeo=new T.ExtrudeGeometry(hoodShape,{depth:.055,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,curveSegments:8});const hood=add(hoodGeo,steel,0,.165,-.24);
    const lensMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{sun:{value:H.sunDirection}},
      vertexShader:`varying vec3 vEye,vFwd,vRight,vUp;varying vec2 vUv;void main(){vUv=uv;vEye=(modelViewMatrix*vec4(position,1.)).xyz;vFwd=mat3(modelViewMatrix)*vec3(0,0,-1);vRight=mat3(modelViewMatrix)*vec3(1,0,0);vUp=mat3(modelViewMatrix)*vec3(0,1,0);gl_Position=projectionMatrix*vec4(vEye,1.);}`,
      fragmentShader:`varying vec3 vEye,vFwd,vRight,vUp;varying vec2 vUv;void main(){vec3 d=normalize(vEye);float k=max(.001,dot(d,normalize(vFwd)));vec2 a=vec2(dot(d,normalize(vRight)),dot(d,normalize(vUp)))/k;float r=length(a),px=max(fwidth(r),.00012);float dotI=1.-smoothstep(.0011-px,.0011+px,r);float ring=1.-smoothstep(.0004,.0004+px,abs(r-.012));float crossTick=(1.-smoothstep(0.,px*2.,min(abs(a.x),abs(a.y))))*smoothstep(.012,.013,r)*(1.-smoothstep(.016,.018,r));float reticle=dotI+ring*.65+crossTick*.6;
        float fres=pow(1.-abs(normalize(vEye).z),2.);vec3 coat=mix(vec3(.07,.18,.22),vec3(.35,.16,.065),smoothstep(.1,1.,vUv.y+vUv.x*.3));vec3 col=coat*(.15+fres)+vec3(7.,.28,.055)*reticle;float alpha=clamp(.08+fres*.4+reticle,.0,.92);gl_FragColor=vec4(col,alpha);}`});
    const glass=add(new T.PlaneGeometry(.074,.073),lensMaterial,0,.176,-.206);glass.renderOrder=3;
    cyl(.018,.035,.064,.15,-.218,black);cyl(.012,.014,.081,.15,-.218,edge).rotation.z=Math.PI/2;
    for(const side of [-1,1])for(const z of [-.23,-.18]){const screw=cyl(.004,.005,side*.056,.133,z,edge,root,8);screw.rotation.z=Math.PI/2;}
    // 纺织袖口与分节手套使用椭球、胶囊而非方块手臂。
    const handGroup=new T.Group();root.add(handGroup);
    function ellipsoid(x,y,z,sx,sy,sz,m,parent=handGroup){const mesh=add(new T.SphereGeometry(1,12,10),m,x,y,z,parent);mesh.scale.set(sx,sy,sz);return mesh;}
    function limb(a,b,r1,r2,m,parent=handGroup){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);const mesh=add(new T.CylinderGeometry(r2,r1,d.length(),16),m,0,0,0,parent);mesh.position.copy(av.add(bv).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return mesh;}
    limb([.22,-.30,.31],[.075,-.17,-.025],.083,.053,sleeve);limb([.075,-.17,-.025],[.042,-.13,-.06],.057,.049,cuff);
    ellipsoid(.035,-.117,-.065,.047,.06,.065,glove);ellipsoid(.005,-.115,-.056,.033,.065,.035,glove);
    for(let j=0;j<3;j++){const finger=limb([.045,-.105-j*.018,-.092],[.002,-.115-j*.018,-.103],.014,.013,glove);}
    const leftHand=new T.Group();root.add(leftHand);
    limb([-.26,-.29,.23],[-.105,-.145,-.41],.08,.05,sleeve,leftHand);limb([-.105,-.145,-.41],[-.047,-.11,-.48],.052,.046,cuff,leftHand);
    ellipsoid(-.035,-.094,-.48,.052,.039,.071,glove,leftHand);
    for(let j=0;j<4;j++){limb([-.048+j*.025,-.067,-.49],[ -.046+j*.025,-.04,-.51],.013,.012,glove,leftHand);ellipsoid(-.046+j*.025,-.041,-.53,.012,.017,.021,glove,leftHand);}
    // 枪身铭文、警告及检验标记。
    const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=256;const lc=labelCanvas.getContext('2d');lc.fillStyle='#c0c7bd';lc.font='bold 44px monospace';lc.fillText('AR–07',28,62);lc.font='20px monospace';lc.fillText('EAST HARBOR ARMORY',28,99);lc.fillText('CAL. 5.56 × 45',28,132);lc.fillStyle='#84918b';lc.font='16px monospace';lc.fillText('CC / 07–003182',28,167);lc.fillText('SAFE  •  SEMI  •  AUTO',28,202);
    const label=add(new T.PlaneGeometry(.10,.05),new T.MeshStandardMaterial({map:new T.CanvasTexture(labelCanvas),transparent:true,roughness:.8,polygonOffset:true,polygonOffsetFactor:-1}),.044,-.003,-.072);label.rotation.y=Math.PI/2;
    // 在枪身上生成细碎的边缘掉漆与雨滴高光，保持材质而非贴图文字的变化。
    const scuffMat=new T.MeshStandardMaterial({color:'#a6b0ac',metalness:.9,roughness:.43});
    for(let i=0;i<34;i++){const z=-.09-random()*.52,y=.03+random()*.04;const m=box(.001,.001+random()*.002,.002+random()*.01,.047,y,z,scuffMat);m.rotation.x=random()*.4;}
    const dropMat=new T.MeshPhysicalMaterial({color:'#7f9295',roughness:.09,metalness:.3,clearcoat:1});
    for(let i=0;i<24;i++){const drop=add(new T.SphereGeometry(.0014+random()*.0014,6,5),dropMat,.04+random()*.01,.04+random()*.025,-.09-random()*.5);drop.scale.set(1,.3,1);}
    const flash=new T.Group();flash.position.set(0,.009,-1.035);root.add(flash);const flashMat=new T.MeshBasicMaterial({color:'#ffe8a8',transparent:true,opacity:.9,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false});
    const flashCanvas=document.createElement('canvas');flashCanvas.width=128;flashCanvas.height=128;const fc=flashCanvas.getContext('2d');const fg=fc.createRadialGradient(64,64,1,64,64,58);fg.addColorStop(0,'#ffffffff');fg.addColorStop(.15,'#fff2b8ee');fg.addColorStop(.5,'#ff962547');fg.addColorStop(1,'#ff7c0000');fc.fillStyle=fg;fc.fillRect(0,0,128,128);flashMat.map=new T.CanvasTexture(flashCanvas);
    for(let j=0;j<3;j++){const mesh=add(new T.PlaneGeometry(.19,.27),flashMat,0,0,-.035,flash);mesh.rotation.z=j*Math.PI/3;mesh.rotation.x=j%2*Math.PI/2;}
    const flashLight=new T.PointLight('#ffb261',0,3,2);flashLight.position.set(.1,.1,-.85);root.add(flashLight);flash.visible=false;
    // 按材质合并枪身固定零件，提升几何细节时保持绘制调用可控。
    function merge(parent){const groups=new Map();parent.updateMatrixWorld(true);for(const mesh of [...parent.children]){if(!mesh.isMesh||mesh.material.transparent)continue;mesh.updateMatrix();const geo=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geo.applyMatrix4(mesh.matrix);if(!groups.has(mesh.material))groups.set(mesh.material,[]);groups.get(mesh.material).push(geo);parent.remove(mesh);mesh.geometry.dispose();}for(const [material,geos]of groups){const positions=[],normals=[],uvs=[],colors=[];for(const geo of geos){const p=geo.attributes.position,n=geo.attributes.normal,u=geo.attributes.uv;for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));uvs.push(u?u.getX(i):0,u?u.getY(i):0);const grain=.88+random()*.12;colors.push(grain,grain,grain);}geo.dispose();}const merged=new T.BufferGeometry();merged.setAttribute('position',new T.Float32BufferAttribute(positions,3));merged.setAttribute('normal',new T.Float32BufferAttribute(normals,3));merged.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));merged.setAttribute('color',new T.Float32BufferAttribute(colors,3));material.vertexColors=true;parent.add(new T.Mesh(merged,material));}}
    merge(root);merge(magazine);merge(bolt);merge(handGroup);merge(leftHand);
    // 缩窄金属机匣与导轨，保留手掌和袖口的真实尺度。
    for(const group of[root,magazine,bolt])for(const mesh of group.children)if(mesh.isMesh){mesh.geometry.scale(.72,1,1);mesh.position.x*=.72;}
    // 不同微表面共享规则，细节从位置导出；高频项只改变法线与粗糙度。
    for(const [m,kind]of[[steel,0],[edge,0],[black,1],[tan,1]]){
      const old=m.onBeforeCompile;m.onBeforeCompile=shader=>{old?.(shader);shader.uniforms.rain={value:1};m.userData.rain=shader.uniforms.rain;
        shader.vertexShader='varying vec3 vGun;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGun=position;');
        shader.fragmentShader='varying vec3 vGun;uniform float rain;\n'+H.glslNoise+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          float grain=hNoise(vGun.xy*800.)*.12+hNoise(vGun.yz*170.)*.14;float drop=pow(hNoise(vGun.xz*240.),18.)*rain;
          roughnessFactor=clamp(roughnessFactor+grain-.12,.10,1.);roughnessFactor=mix(roughnessFactor,.11,drop*.85);diffuseColor.rgb*=1.-rain*.04;`);
      };m.customProgramCacheKey=()=> 'ar07-micro-v3-'+kind;
    }
    const springs={back:{x:0,v:0,k:430,c:27},pitch:{x:0,v:0,k:330,c:22},yaw:{x:0,v:0,k:280,c:22},roll:{x:0,v:0,k:240,c:20},swayX:{x:0,v:0,k:100,c:16},swayY:{x:0,v:0,k:100,c:16},land:{x:0,v:0,k:150,c:18}};
    function spring(s,dt){const count=Math.max(1,Math.ceil(dt/.008)),h=dt/count;for(let j=0;j<count;j++){s.v+=(-s.x*s.k-s.v*s.c)*h;s.x+=s.v*h;}return s.x;}
    const curve=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
    let fireTime=0,boltTime=1,heat=0,wet=1,step=0,previousSpeed=0,previousGround=true,lastPhase=0,lookX=0,lookY=0;
    const muzzlePoint=new T.Vector3(0,.009,-1.035),ejectPoint=new T.Vector3(.0526,.02,-.15),temp=new T.Vector3();
    const api={scene,camera,root,
      fire(){springs.back.v+=1.6;springs.pitch.v+=1.1;springs.yaw.v+=(Math.random()-.5)*.7;springs.roll.v+=(Math.random()-.5)*1.;fireTime=.035+Math.random()*.02;boltTime=0;heat=Math.min(1,heat+.09);flash.rotation.z=Math.random()*6;},
      reset(){Object.values(springs).forEach(s=>s.x=s.v=0);fireTime=heat=0;boltTime=1;lastPhase=0;previousGround=true;leftHand.position.set(0,0,0);},
      look(dx,dy){lookX+=dx;lookY+=dy;},
      worldPoint(local,worldCamera,out=new T.Vector3()){root.updateMatrix();out.copy(local).applyMatrix4(root.matrix);const f=Math.tan(worldCamera.fov*Math.PI/360)/Math.tan(camera.fov*Math.PI/360);out.x*=f;out.y*=f;return out.applyQuaternion(worldCamera.quaternion).add(worldCamera.position);},
      muzzle(worldCamera,out){return api.worldPoint(muzzlePoint,worldCamera,out);},eject(worldCamera,out){return api.worldPoint(ejectPoint,worldCamera,out);},
      resize(aspect){camera.aspect=aspect;camera.updateProjectionMatrix();},
      update(dt,time,state){const a=state.ads,reload=state.reload,phase=reload>0?curve(reload/.13)*(1-curve((reload-.79)/.21)):0;
        fireTime-=dt;boltTime+=dt;heat=Math.max(0,heat-dt*.13);flash.visible=fireTime>0;flashMat.opacity=fireTime>0?.75:0;flashLight.intensity=fireTime>0?12:0;
        wet=T.MathUtils.damp(wet,state.wet??1,1.,dt);key.intensity=T.MathUtils.damp(key.intensity,state.interior?1.15:3.3,3,dt);fill.intensity=state.interior?.3:.7;scene.environment=state.interior&&state.interiorEnvironment?state.interiorEnvironment:H.art.environment;for(const m of[steel,edge,black,tan])if(m.userData.rain)m.userData.rain.value=wet;
        springs.swayX.v+=T.MathUtils.clamp(lookX,-.2,.2)*1.6;springs.swayY.v+=T.MathUtils.clamp(lookY,-.2,.2)*1.6;lookX=lookY=0;
        if(!previousGround&&state.grounded)springs.land.v-=.38;previousGround=state.grounded;
        Object.values(springs).forEach(s=>spring(s,dt));const move=state.speed,bobAmount=move*(1-a*.9),freq=state.sprint?13:8;step+=dt*freq*move;
        const bobX=Math.sin(step)*.005*bobAmount,bobY=-Math.abs(Math.cos(step))*.007*bobAmount,breath=Math.sin(time*1.7)*.0015;
        root.position.set(T.MathUtils.lerp(.205,0,a)+bobX+springs.swayX.x*.055,T.MathUtils.lerp(-.226,-.176,a)+bobY+breath-phase*.11+springs.land.x,-.55+springs.back.x*.65+phase*.06);
        root.rotation.set(springs.pitch.x*.65-phase*.17+(state.sprint?-.27*(1-a):0)+springs.swayY.x,-springs.yaw.x+phase*.30-springs.swayX.x,-springs.roll.x-phase*.48+Math.sin(step)*.006*bobAmount);
        // 取弹、抽出、插入、压紧、拉机柄各自使用平滑阶段，左手跟随弹匣。
        let magDrop=0,magBack=0,handX=0,handY=0,handZ=0;
        if(reload>0){const reach=curve((reload-.08)/.12),pull=curve((reload-.23)/.18),insert=curve((reload-.49)/.19),returnHand=curve((reload-.76)/.2);magDrop=pull*(1-insert);magBack=Math.sin(Math.PI*magDrop)*.03;handX=.035*reach*(1-returnHand);handY=(-.08*reach-.23*magDrop)*(1-returnHand);handZ=.18*reach*(1-returnHand);}
        magazine.position.set(0,-.1-magDrop*.29,-.285+magBack);magazine.rotation.x=magDrop*.22;leftHand.position.set(handX,handY,handZ);leftHand.rotation.x=magDrop*.12;
        const travel=boltTime<.075?Math.sin(boltTime/.075*Math.PI):state.ammo===0?.8:0;const rack=state.reloadEmpty&&reload>.78&&reload<.95?Math.sin((reload-.78)/.17*Math.PI):0;bolt.position.z=Math.max(travel,rack)*.045;
        if(reload>0&&lastPhase<.24&&reload>=.24)api.onReloadPhase?.('out');if(reload>0&&lastPhase<.68&&reload>=.68)api.onReloadPhase?.('in');if(state.reloadEmpty&&lastPhase<.89&&reload>=.89)api.onReloadPhase?.('bolt');lastPhase=reload;
        camera.fov=T.MathUtils.lerp(64,48,a);camera.updateProjectionMatrix();previousSpeed=move;
      },
      stats(){return{heat:+heat.toFixed(2),wet:+wet.toFixed(2),springs:Object.fromEntries(Object.entries(springs).map(([k,s])=>[k,+s.x.toFixed(4)]))};}
    };return api;
  };
})(window.Harbor);
