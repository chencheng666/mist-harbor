/* AR–07 第二版：分段机匣、磨损金属、曲面握把与独立换弹动画。 */
(function (H) {
  'use strict';
  const T = THREE;
  H.createWeapon = function () {
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(64, innerWidth / innerHeight, .015, 8), root = new T.Group(); scene.add(root); scene.environment = H.art.environment;
    scene.add(new T.HemisphereLight('#bbd9e4', '#353c3b', 1.3));
    const key = new T.DirectionalLight('#ffd0a0', 3.3); key.position.set(-3, 4, -4); scene.add(key);
    const fill = new T.DirectionalLight('#8cb3c9', .7); fill.position.set(2, .5, 2); scene.add(fill);
    const rough = H.art.texture('metal_plate_roughness', 2, 2), normal = H.art.texture('metal_plate_normal', 2, 2);
    const steel = new T.MeshStandardMaterial({ color: '#4c5559', roughness: .64, metalness: .86, roughnessMap: rough, normalMap: normal, normalScale: new T.Vector2(.065,.065), envMapIntensity: 1.3 });
    const edge = new T.MeshStandardMaterial({ color: '#899294', roughness: .38, metalness: .9, roughnessMap: rough, envMapIntensity: 1.1 });
    const black = new T.MeshStandardMaterial({ color: '#242c2e', roughness: .78, metalness: .12 });
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
    rounded(.089,.012,.62,0,.072,-.37,black);
    for(let j=0;j<28;j++){rounded(.09,.012,.011,0,.084,-.68+j*.025,steel,root,.0015);box(.066,.004,.005,0,.092,-.68+j*.025,edge);}
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
    const glass=add(new T.PlaneGeometry(.074,.073),new T.MeshPhysicalMaterial({color:'#7fb7b5',metalness:.3,roughness:.08,transparent:true,opacity:.16,side:T.DoubleSide,depthWrite:false}),0,.176,-.206);glass.renderOrder=3;
    const redDot=add(new T.SphereGeometry(.0017,10,8),new T.MeshBasicMaterial({color:'#ff5c37'}),0,.176,-.232);redDot.renderOrder=4;
    cyl(.018,.035,.064,.15,-.218,black);cyl(.012,.014,.081,.15,-.218,edge).rotation.z=Math.PI/2;
    for(const side of [-1,1])for(const z of [-.23,-.18]){const screw=cyl(.004,.005,side*.056,.133,z,edge,root,8);screw.rotation.z=Math.PI/2;}
    // 纺织袖口与分节手套使用椭球、胶囊而非方块手臂。
    const handGroup=new T.Group();root.add(handGroup);
    function ellipsoid(x,y,z,sx,sy,sz,m,parent=handGroup){const mesh=add(new T.SphereGeometry(1,12,10),m,x,y,z,parent);mesh.scale.set(sx,sy,sz);return mesh;}
    function limb(a,b,r1,r2,m,parent=handGroup){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);const mesh=add(new T.CylinderGeometry(r2,r1,d.length(),16),m,0,0,0,parent);mesh.position.copy(av.add(bv).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return mesh;}
    limb([.22,-.30,.31],[.075,-.17,-.025],.083,.053,sleeve);limb([.075,-.17,-.025],[.042,-.13,-.06],.057,.049,cuff);
    ellipsoid(.035,-.117,-.065,.047,.06,.065,glove);ellipsoid(.005,-.115,-.056,.033,.065,.035,glove);
    for(let j=0;j<3;j++){const finger=limb([.045,-.105-j*.018,-.092],[.002,-.115-j*.018,-.103],.014,.013,glove);}
    limb([-.26,-.29,.23],[-.105,-.145,-.41],.08,.05,sleeve);limb([-.105,-.145,-.41],[-.047,-.11,-.48],.052,.046,cuff);
    ellipsoid(-.035,-.094,-.48,.052,.039,.071,glove);
    for(let j=0;j<4;j++){limb([-.048+j*.025,-.067,-.49],[ -.046+j*.025,-.04,-.51],.013,.012,glove);ellipsoid(-.046+j*.025,-.041,-.53,.012,.017,.021,glove);}
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
    merge(root);merge(magazine);merge(bolt);merge(handGroup);
    let kick=0,fireTime=0;
    return {scene,camera,root,fire(){kick=Math.min(.09,kick+.055);fireTime=.045;flash.rotation.z=Math.random()*6;},resize(aspect){camera.aspect=aspect;camera.updateProjectionMatrix();},
      update(dt,time,state){kick*=Math.exp(-dt*17);fireTime-=dt;flash.visible=fireTime>0;flashLight.intensity=fireTime>0?5:0;const a=state.ads,reload=state.reload,phase=Math.sin(Math.PI*reload),move=state.speed,bob=Math.sin(time*(state.sprint?13:8));
        root.position.set(T.MathUtils.lerp(.235,0,a)+Math.sin(time*3)*.002*(1-a),T.MathUtils.lerp(-.242,-.176,a)+bob*.005*move*(1-a)-phase*.16,-.48+kick+phase*.045);
        root.rotation.set(kick*.5-phase*.23+(state.sprint?-.22*(1-a):0),phase*.20,-phase*.42+Math.cos(time*4)*.003*move*(1-a));
        magazine.position.set(0,-.1-phase*.18,-.285+phase*.035);magazine.rotation.x=phase*.2;bolt.position.z=fireTime>0?.045:0;handGroup.position.y=-phase*.09;
        camera.fov=T.MathUtils.lerp(64,48,a);camera.updateProjectionMatrix();
      }};
  };
})(window.Harbor);
