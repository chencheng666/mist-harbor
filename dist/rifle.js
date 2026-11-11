/* AR–07：按真实尺寸构建的独立视角枪械，镂空护木与多段手部动画。 */
(function(H){
  'use strict';const T=THREE;
  H.createWeapon=function(){
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(68,innerWidth/innerHeight,.012,8),root=new T.Group();scene.add(root);scene.environment=H.art.environment;
    scene.add(new T.HemisphereLight('#aec8dd','#29323a',.9));
    const key=new T.DirectionalLight('#ffd3a8',2.6);key.position.set(-3,4,-4);scene.add(key);
    const fill=new T.DirectionalLight('#8baac9',.45);fill.position.set(2,.5,2);scene.add(fill);
    const steel=new T.MeshStandardMaterial({color:'#414748',roughness:.54,metalness:.82,envMapIntensity:1.1});
    const edge=new T.MeshStandardMaterial({color:'#778283',roughness:.34,metalness:.93,envMapIntensity:1.2});
    const black=new T.MeshStandardMaterial({color:'#242b2c',roughness:.66,metalness:.08});
    const tan=new T.MeshStandardMaterial({color:'#42473f',roughness:.78,metalness:.03});
    const recess=new T.MeshStandardMaterial({color:'#101517',roughness:.87,metalness:.32});
    const rubber=new T.MeshStandardMaterial({color:'#181e20',roughness:.95});
    const glove=new T.MeshStandardMaterial({color:'#343c3b',roughness:.88});
    const cuff=new T.MeshStandardMaterial({color:'#1f2b30',roughness:.98});
    let seed=22;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const clothCanvas=document.createElement('canvas');clothCanvas.width=256;clothCanvas.height=256;const cx=clothCanvas.getContext('2d');
    const pixels=cx.createImageData(256,256);for(let i=0;i<256*256;i++){const x=i%256,y=Math.floor(i/256),n=random()*15+(x%3===0?7:0)+(y%3===0?5:0);pixels.data.set([111+n,121+n,127+n,255],i*4);}cx.putImageData(pixels,0,0);
    const clothTex=new T.CanvasTexture(clothCanvas);clothTex.wrapS=clothTex.wrapT=T.RepeatWrapping;clothTex.repeat.set(3,4);clothTex.colorSpace=T.SRGBColorSpace;clothTex.anisotropy=4;
    const sleeve=new T.MeshStandardMaterial({color:'#46515a',map:clothTex,bumpMap:clothTex,bumpScale:.00035,roughness:.97});
    const stitch=new T.MeshStandardMaterial({color:'#505c61',roughness:1});
    function add(geo,m,x=0,y=0,z=0,parent=root){const o=new T.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o;}
    function shapeRect(w,h,r){const s=new T.Shape(),a=-w/2,b=-h/2;r=Math.min(r,w*.49,h*.49);s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);return s;}
    function rounded(w,h,d,x,y,z,m,parent=root,r=.002){const g=new T.ExtrudeGeometry(shapeRect(w,h,r),{depth:d,steps:1,bevelEnabled:true,bevelSize:r*.35,bevelThickness:r*.35,bevelSegments:2,curveSegments:4});g.translate(0,0,-d/2);return add(g,m,x,y,z,parent);}
    function box(w,h,d,x,y,z,m,parent=root){return add(new T.BoxGeometry(w,h,d),m,x,y,z,parent);}
    function cyl(r,len,x,y,z,m,parent=root,n=24){const o=add(new T.CylinderGeometry(r,r,len,n),m,x,y,z,parent);o.rotation.x=Math.PI/2;return o;}
    function profile(points,w,x,y,z,m,parent=root,bevel=.002){const shape=new T.Shape();points.forEach((p,i)=>i?shape.lineTo(-p[0],p[1]):shape.moveTo(-p[0],p[1]));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:w,steps:1,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:4});g.rotateY(Math.PI/2);g.translate(-w/2,0,0);return add(g,m,x,y,z,parent);}
    function tube(points,r,m,parent=root){return add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,8,false),m,0,0,0,parent);}
    function screw(x,y,z,r=.003,parent=root){const o=cyl(r,.002,x,y,z,edge,parent,12);o.rotation.z=Math.PI/2;box(.0022,.0009,r*1.5,x+Math.sign(x)*.0015,y,z,recess,parent);}
    // 挤压件与锻件分开塑形，保留机匣上下缝、前辅助推机柄与弹匣井斜面。
    profile([[.07,.028],[.04,.043],[-.20,.043],[-.235,.024],[-.231,-.021],[.045,-.023],[.07,-.01]],.054,0,0,0,steel);
    profile([[.056,-.028],[-.225,-.028],[-.231,-.083],[-.132,-.09],[-.11,-.055],[-.02,-.049],[.05,-.055]],.052,0,0,0,steel);
    for(const side of[-1,1]){
      profile([[.04,.02],[-.19,.025],[-.21,.004],[-.12,-.005],[.02,-.003]],.0015,side*.029,0,0,steel);
      rounded(.002,.003,.22,side*.030,-.022,-.075,recess);
      for(const p of[[.022,-.03],[-.108,-.04],[-.209,-.059]])screw(side*.030,p[1],p[0],.0038);
      const lever=rounded(.006,.009,.025,side*.034,-.039,.002,black);lever.rotation.x=-.5;
      cyl(.006,.006,side*.031,-.041,.011,edge).rotation.z=Math.PI/2;
    }
    cyl(.019,.23,0,.002,.16,steel);cyl(.022,.018,0,.002,.065,black);
    profile([[.12,.035],[.30,.035],[.32,.002],[.29,-.095],[.255,-.10],[.21,-.041],[.12,-.025]],.061,0,0,0,black);
    rounded(.066,.116,.018,0,-.025,.30,rubber);rounded(.065,.019,.13,0,.029,.20,black);
    for(const side of[-1,1]){rounded(.003,.017,.09,side*.032,-.015,.20,recess);for(let i=0;i<3;i++)box(.002,.002,.014,side*.033,-.01-i*.005,.22,steel);}
    profile([[.035,-.038],[-.006,-.043],[-.048,-.161],[-.026,-.178],[.025,-.165],[.056,-.08]],.047,0,0,0,tan);
    for(let i=0;i<8;i++)rounded(.049,.003,.037,0,-.080-i*.010,.003+i*.002,black,root,.001);
    const guard=new T.Shape();guard.moveTo(.007,-.051);guard.lineTo(.115,-.051);guard.lineTo(.115,-.096);guard.quadraticCurveTo(.075,-.114,.016,-.096);guard.closePath();const gh=new T.Path();gh.moveTo(.018,-.059);gh.lineTo(.023,-.089);gh.quadraticCurveTo(.075,-.101,.105,-.089);gh.lineTo(.105,-.059);gh.closePath();guard.holes.push(gh);const gg=new T.ExtrudeGeometry(guard,{depth:.008,bevelEnabled:true,bevelThickness:.001,bevelSize:.001,bevelSegments:2});gg.rotateY(Math.PI/2);gg.translate(-.004,0,0);add(gg,steel);
    tube([[0,-.052,-.065],[0,-.077,-.056],[0,-.09,-.064]],.0025,edge);
    // 护木的八个薄壁面有真实通孔；孔内可见枪管、导气管与反向内壁。
    cyl(.013,.49,0,.007,-.43,recess);cyl(.018,.036,0,.007,-.243,steel);cyl(.021,.026,0,.007,-.266,steel);
    for(let k=0;k<8;k++){
      const theta=k*Math.PI/4,r=.039,width=2*r*Math.tan(Math.PI/8),length=.294;
      const panel=shapeRect(width,length,.002);
      if(k!==0){for(let j=0;j<6;j++){const shape=shapeRect(.012,.031,.005);const pts=shape.getPoints(6);const path=new T.Path(pts.map(p=>new T.Vector2(p.x,p.y-.119+j*.046)));panel.holes.push(path);}}
      const g=new T.ExtrudeGeometry(panel,{depth:.0023,bevelEnabled:true,bevelSize:.0006,bevelThickness:.0006,bevelSegments:1,curveSegments:5});g.rotateX(Math.PI/2);g.translate(0,r,0);g.rotateZ(theta);const o=add(g,steel,0,.007,-.40);
    }
    cyl(.006,.30,0,.030,-.40,edge);cyl(.021,.028,0,.007,-.565,black);
    cyl(.014,.09,0,.007,-.606,steel);cyl(.023,.017,0,.007,-.65,edge);cyl(.024,.102,0,.007,-.704,steel);cyl(.016,.006,0,.007,-.758,recess);
    for(const z of[-.661,-.684,-.735])cyl(.025,.004,0,.007,z,black);
    for(let k=0;k<8;k++){const a=k*Math.PI/4,o=rounded(.009,.002,.032,Math.sin(a)*.024,.007+Math.cos(a)*.024,-.710,recess,root,.001);o.rotation.z=-a;}
    rounded(.032,.009,.59,0,.052,-.235,black,root,.001);
    // 导轨横截面的倒角与底部凹槽由几何形成，避免宽厚楼梯状轮廓。
    for(let j=0;j<28;j++){
      const z=-.523+j*.0204;profile([[-.004,0],[.004,0],[.005,.005],[.003,.008],[-.003,.008],[-.005,.005]],.037,0,.055,z,steel,root,.0007);
      if(j%3===0)box(.018,.0007,.001,0,.064,z-.003,edge);
    }
    for(const side of[-1,1])for(const z of[-.254,-.29])screw(side*.039,.004,z,.003);
    const foregrip=profile([[-.034,0],[.034,0],[.027,-.052],[-.014,-.065],[-.031,-.038]],.030,0,-.031,-.41,black);
    // 枪灯灯头、夹具与尾部开关。
    cyl(.014,.084,.048,.006,-.40,black);cyl(.017,.023,.048,.006,-.452,steel);cyl(.012,.002,.048,.006,-.465,edge);rounded(.018,.025,.018,.037,.006,-.386,steel);cyl(.011,.01,.048,.006,-.354,rubber);
    const magazine=new T.Group();magazine.position.set(0,-.078,-.181);root.add(magazine);
    profile([[.041,0],[-.041,0],[-.047,-.105],[-.022,-.193],[.059,-.182],[.039,-.10]],.050,0,0,0,black,magazine);
    for(const side of[-1,1]){for(let j=0;j<3;j++){const rib=rounded(.002,.142,.006,side*.026,-.099,-.022+j*.023,steel,magazine,.001);rib.rotation.x=.1;}for(let i=0;i<5;i++)rounded(.002,.003,.072,side*.028,-.036-i*.028,.001,tan,magazine,.0006);}
    rounded(.057,.016,.088,0,-.187,.015,tan,magazine,.002);
    // 抛壳窗与可动枪机分开，不将高光条贴在整块机匣上。
    rounded(.0015,.021,.088,.030,.002,-.097,recess,root,.003);
    const bolt=new T.Group();root.add(bolt);rounded(.003,.014,.071,.032,.004,-.094,edge,bolt,.002);
    for(let i=0;i<5;i++)box(.001,.008,.001,.034,.003,-.119+i*.004,recess,bolt);
    const dustCover=rounded(.002,.020,.089,.033,-.016,-.097,black);dustCover.rotation.z=.6;
    const forwardAssist=cyl(.008,.035,.039,.016,.021,steel);forwardAssist.rotation.y=.7;
    rounded(.073,.009,.018,0,.036,.058,black);for(const side of[-1,1])rounded(.014,.014,.018,side*.035,.037,.06,steel);
    // 小型全息瞄具：薄壁护罩、独立镀膜镜片与按角度定义的准直分划。
    rounded(.042,.014,.075,0,.073,-.118,black);rounded(.037,.011,.055,0,.084,-.118,steel);
    const hs=shapeRect(.078,.068,.014),hp=shapeRect(.059,.047,.009);hs.holes.push(new T.Path(hp.getPoints(12)));
    const hg=new T.ExtrudeGeometry(hs,{depth:.032,bevelEnabled:true,bevelSize:.002,bevelThickness:.0015,bevelSegments:3,curveSegments:10});add(hg,steel,0,.124,-.138);
    rounded(.060,.015,.035,0,.089,-.121,black);rounded(.073,.005,.042,0,.089,-.122,edge,root,.001);
    const lensMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,
      vertexShader:`varying vec3 vEye,vFwd,vRight,vUp;varying vec2 vUv;void main(){vUv=uv;vEye=(modelViewMatrix*vec4(position,1.)).xyz;vFwd=mat3(modelViewMatrix)*vec3(0,0,-1);vRight=mat3(modelViewMatrix)*vec3(1,0,0);vUp=mat3(modelViewMatrix)*vec3(0,1,0);gl_Position=projectionMatrix*vec4(vEye,1.);}`,
      fragmentShader:`varying vec3 vEye,vFwd,vRight,vUp;varying vec2 vUv;void main(){vec3 d=normalize(vEye);float k=max(.001,dot(d,normalize(vFwd)));vec2 a=vec2(dot(d,normalize(vRight)),dot(d,normalize(vUp)))/k;float r=length(a),px=max(fwidth(r),.0001);float dotI=1.-smoothstep(.0008-px,.0008+px,r),ring=1.-smoothstep(.00022,.00022+px,abs(r-.010));float reticle=dotI+ring*.52;
        float fres=pow(1.-abs(normalize(vEye).z),3.);vec3 coat=mix(vec3(.035,.10,.12),vec3(.15,.10,.04),vUv.y);gl_FragColor=vec4(coat*(.2+fres)+vec3(5.,.12,.015)*reticle,clamp(.035+fres*.28+reticle,0.,.88));}`});
    const glass=add(new T.PlaneGeometry(.058,.046),lensMaterial,0,.124,-.108);glass.renderOrder=3;
    for(const side of[-1,1]){screw(side*.041,.104,-.122,.0025);const dial=cyl(.010,.012,side*.042,.114,-.123,black);dial.rotation.z=Math.PI/2;for(let i=0;i<10;i++){const a=i*Math.PI/5;box(.013,.001,.002,side*.043,.114+Math.sin(a)*.010,-.123+Math.cos(a)*.010,steel);}}
    // 布料沿手臂轮廓起伏，手套由掌心、指节与护垫组合，手指包住护木和握把。
    const handGroup=new T.Group(),leftHand=new T.Group();root.add(handGroup,leftHand);
    function ellipsoid(x,y,z,sx,sy,sz,m,parent=handGroup){const o=add(new T.SphereGeometry(1,16,12),m,x,y,z,parent);o.scale.set(sx,sy,sz);return o;}
    function limb(a,b,r1,r2,m,parent=handGroup,cloth=false){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),g=new T.CylinderGeometry(r2,r1,d.length(),20,cloth?24:1);if(cloth){const p=g.attributes.position;for(let i=0;i<p.count;i++){const t=p.getY(i)/d.length()+.5,a=Math.atan2(p.getZ(i),p.getX(i)),fold=1+Math.sin(t*34+a*2)*.045+Math.sin(t*19-a*3)*.025;p.setX(i,p.getX(i)*fold);p.setZ(i,p.getZ(i)*fold);}g.computeVertexNormals();}const o=add(g,m,0,0,0,parent);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
    limb([.21,-.29,.25],[.063,-.146,.009],.067,.043,sleeve,handGroup,true);limb([.063,-.146,.009],[.036,-.12,-.014],.045,.040,cuff);
    ellipsoid(.029,-.107,-.016,.036,.047,.047,glove);ellipsoid(.049,-.10,.005,.012,.037,.026,rubber);
    for(let j=0;j<3;j++){const y=-.099-j*.018;limb([.035,y,-.040],[.005,y-.004,-.05],.010,.009,glove);limb([.005,y-.004,-.05],[-.016,y-.003,-.027],.009,.008,glove);ellipsoid(.025,y,.026,.013,.010,.008,rubber);}
    tube([[.028,-.069,-.005],[.011,-.064,-.029],[-.005,-.078,-.034]],.010,glove,handGroup);
    tube([[.046,-.071,-.036],[.028,-.066,-.060],[.012,-.068,-.066]],.0085,glove,handGroup);
    limb([-.22,-.29,.18],[-.074,-.108,-.355],.070,.043,sleeve,leftHand,true);limb([-.074,-.108,-.355],[-.043,-.075,-.394],.044,.040,cuff,leftHand);
    ellipsoid(-.027,-.068,-.406,.039,.026,.060,glove,leftHand);ellipsoid(-.056,-.057,-.408,.011,.025,.042,rubber,leftHand);
    for(let j=0;j<4;j++){const z=-.378-j*.022;limb([-.049,-.049,z],[-.035,-.023,z-.005],.010,.009,glove,leftHand);limb([-.035,-.023,z-.005],[-.014,-.022,z-.010],.009,.008,glove,leftHand);ellipsoid(-.043,-.029,z-.003,.011,.008,.009,rubber,leftHand);}
    tube([[-.022,-.068,-.354],[.019,-.054,-.371],[.025,-.025,-.387]],.011,glove,leftHand);
    // 小面积铭文与校验漆，避免整把枪使用亮色条带。
    const labels=document.createElement('canvas');labels.width=512;labels.height=256;const lc=labels.getContext('2d');lc.fillStyle='#8e9997';lc.font='bold 37px monospace';lc.fillText('AR–07',24,55);lc.font='18px monospace';lc.fillText('EAST HARBOR ARMORY',24,88);lc.fillText('5.56 × 45  /  003182',24,119);lc.font='13px monospace';lc.fillText('SAFE    SEMI    AUTO',24,169);lc.fillStyle='#c9ad68';lc.fillRect(28,195,34,6);
    const labelMat=new T.MeshStandardMaterial({map:new T.CanvasTexture(labels),transparent:true,depthWrite:false,roughness:.9,polygonOffset:true,polygonOffsetFactor:-1});
    for(const side of[-1,1]){const label=add(new T.PlaneGeometry(.09,.045),labelMat,side*.030,-.008,-.025);label.rotation.y=side*Math.PI/2;}
    const scuffMat=new T.MeshStandardMaterial({color:'#7e8987',metalness:.92,roughness:.4});
    for(let i=0;i<75;i++){const z=.04-random()*.58;box(.0005,.0006+random()*.0007,.001+random()*.0035,(i%2?1:-1)*.028,.039+random()*.003,z,scuffMat);}
    const dropMat=new T.MeshPhysicalMaterial({color:'#718187',roughness:.06,metalness:.1,clearcoat:1});
    for(let i=0;i<38;i++){const o=add(new T.SphereGeometry(.0006+random()*.0007,6,4),dropMat,(random()-.5)*.027,.066,-random()*.53);o.scale.y=.5;}
    const flash=new T.Group();flash.position.set(0,.007,-.77);root.add(flash);const flashMat=new T.MeshBasicMaterial({color:'#ffe8a8',transparent:true,opacity:.9,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false});
    const flashCanvas=document.createElement('canvas');flashCanvas.width=128;flashCanvas.height=128;const fc=flashCanvas.getContext('2d'),fg=fc.createRadialGradient(64,64,1,64,64,58);fg.addColorStop(0,'#ffffffff');fg.addColorStop(.15,'#fff2b8ee');fg.addColorStop(.5,'#ff962547');fg.addColorStop(1,'#ff7c0000');fc.fillStyle=fg;fc.fillRect(0,0,128,128);flashMat.map=new T.CanvasTexture(flashCanvas);
    for(let j=0;j<3;j++){const o=add(new T.PlaneGeometry(.13,.19),flashMat,0,0,-.02,flash);o.rotation.z=j*Math.PI/3;o.rotation.x=j%2*Math.PI/2;}
    const flashLight=new T.PointLight('#ffb261',0,3,2);flashLight.position.set(.05,.05,-.68);root.add(flashLight);flash.visible=false;
    // 合并固定部件，动画组保持独立；平面内插不再混入随机顶点颜色。
    H.mergeParts(root);H.mergeParts(magazine);H.mergeParts(bolt);H.mergeParts(handGroup);H.mergeParts(leftHand);
    // 不同微表面共享规则，细节从位置导出；高频项只改变法线与粗糙度。
    for(const [m,kind]of[[steel,0],[edge,0],[black,1],[tan,1]]){
      const old=m.onBeforeCompile;m.onBeforeCompile=shader=>{old?.(shader);shader.uniforms.rain={value:1};m.userData.rain=shader.uniforms.rain;
        shader.vertexShader='varying vec3 vGun,vGunN;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGun=position;vGunN=normal;');
        shader.fragmentShader='varying vec3 vGun,vGunN;uniform float rain;\n'+H.glslNoise+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          float grain=hNoise(vGun.xy*1800.)*.06+hNoise(vGun.yz*650.)*.07;float drop=pow(hNoise(vGun.xz*240.),18.)*rain;
          float patina=hFbm(vGun.zy*160.+vGun.x*70.);float scrape=smoothstep(.76,.94,hNoise(vec2(vGun.z*31.,vGun.y*2400.+vGun.x*600.)));
          float curvature=length(fwidth(normalize(vGunN)))/max(.00001,length(fwidth(vGun)));
          float edgeWear=clamp(curvature*.0017,0.,.85)*smoothstep(.36,.70,hFbm(vGun.xy*570.+vGun.z*350.));
          diffuseColor.rgb*=mix(.76,1.16,patina);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.30,.33,.32),edgeWear*${kind===0?'1.':'.12'});
          roughnessFactor=clamp(roughnessFactor+grain-.05+patina*.07-scrape*.12,.16,1.);roughnessFactor=mix(roughnessFactor,.31,edgeWear*.65);roughnessFactor=mix(roughnessFactor,.11,drop*.85);diffuseColor.rgb*=1.-rain*.04;
`);
      };m.customProgramCacheKey=()=> 'ar07-micro-v3-'+kind;
    }
    const springs={back:{x:0,v:0,k:430,c:27},pitch:{x:0,v:0,k:330,c:22},yaw:{x:0,v:0,k:280,c:22},roll:{x:0,v:0,k:240,c:20},swayX:{x:0,v:0,k:100,c:16},swayY:{x:0,v:0,k:100,c:16},land:{x:0,v:0,k:150,c:18}};
    function spring(s,dt){const count=Math.max(1,Math.ceil(dt/.008)),h=dt/count;for(let j=0;j<count;j++){s.v+=(-s.x*s.k-s.v*s.c)*h;s.x+=s.v*h;}return s.x;}
    const curve=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
    let fireTime=0,boltTime=1,heat=0,wet=1,step=0,previousSpeed=0,previousGround=true,lastPhase=0,lookX=0,lookY=0;
    const muzzlePoint=new T.Vector3(0,.007,-.77),ejectPoint=new T.Vector3(.035,.004,-.094),temp=new T.Vector3();
    const api={scene,camera,root,
      fire(){springs.back.v+=1.6;springs.pitch.v+=1.1;springs.yaw.v+=(Math.random()-.5)*.7;springs.roll.v+=(Math.random()-.5)*1.;fireTime=.035+Math.random()*.02;boltTime=0;heat=Math.min(1,heat+.09);flash.rotation.z=Math.random()*6;},
      reset(){Object.values(springs).forEach(s=>s.x=s.v=0);fireTime=heat=0;boltTime=1;lastPhase=0;previousGround=true;leftHand.position.set(0,0,0);},
      look(dx,dy){lookX+=dx;lookY+=dy;},
      worldPoint(local,worldCamera,out=new T.Vector3()){root.updateMatrix();out.copy(local).applyMatrix4(root.matrix);const f=Math.tan(worldCamera.fov*Math.PI/360)/Math.tan(camera.fov*Math.PI/360);out.x*=f;out.y*=f;return out.applyQuaternion(worldCamera.quaternion).add(worldCamera.position);},
      muzzle(worldCamera,out){return api.worldPoint(muzzlePoint,worldCamera,out);},eject(worldCamera,out){return api.worldPoint(ejectPoint,worldCamera,out);},
      resize(aspect){camera.aspect=aspect;camera.updateProjectionMatrix();},
      update(dt,time,state){const a=state.ads,reload=state.reload,phase=reload>0?curve(reload/.13)*(1-curve((reload-.79)/.21)):0;
        fireTime-=dt;boltTime+=dt;heat=Math.max(0,heat-dt*.13);flash.visible=fireTime>0;flashMat.opacity=fireTime>0?.75:0;flashLight.intensity=fireTime>0?12:0;
        wet=T.MathUtils.damp(wet,state.wet??1,1.,dt);key.intensity=T.MathUtils.damp(key.intensity,state.sunVisible?2.6:.2,3,dt);fill.intensity=state.interior?.3:.6;if(state.worldQuaternion)key.position.copy(H.sunDirection).applyQuaternion(state.worldQuaternion.clone().invert()).multiplyScalar(4);scene.environment=state.interior&&state.interiorEnvironment?state.interiorEnvironment:H.art.environment;for(const m of[steel,edge,black,tan])if(m.userData.rain)m.userData.rain.value=wet;
        springs.swayX.v+=T.MathUtils.clamp(lookX,-.2,.2)*1.6;springs.swayY.v+=T.MathUtils.clamp(lookY,-.2,.2)*1.6;lookX=lookY=0;
        if(!previousGround&&state.grounded)springs.land.v-=.38;previousGround=state.grounded;
        Object.values(springs).forEach(s=>spring(s,dt));const move=state.speed,bobAmount=move*(1-a*.9),freq=state.sprint?13:8;step+=dt*freq*move;
        const bobX=Math.sin(step)*.005*bobAmount,bobY=-Math.abs(Math.cos(step))*.007*bobAmount,breath=Math.sin(time*1.7)*.0015;
        root.position.set(T.MathUtils.lerp(.21,0,a)+bobX+springs.swayX.x*.055,T.MathUtils.lerp(-.205,-.124,a)+bobY+breath-phase*.11+springs.land.x,T.MathUtils.lerp(-.22,-.28,a)+springs.back.x*.65+phase*.06);
        root.rotation.set(springs.pitch.x*.65-phase*.17+(state.sprint?-.27*(1-a):0)+springs.swayY.x,(1-a)*.15-springs.yaw.x+phase*.30-springs.swayX.x,-(1-a)*.055-springs.roll.x-phase*.48+Math.sin(step)*.006*bobAmount);
        // 取弹、抽出、插入、压紧、拉机柄各自使用平滑阶段，左手跟随弹匣。
        let magDrop=0,magBack=0,handX=0,handY=0,handZ=0;
        if(reload>0){const reach=curve((reload-.08)/.12),pull=curve((reload-.23)/.18),insert=curve((reload-.49)/.19),returnHand=curve((reload-.76)/.2);magDrop=pull*(1-insert);magBack=Math.sin(Math.PI*magDrop)*.03;handX=.035*reach*(1-returnHand);handY=(-.08*reach-.23*magDrop)*(1-returnHand);handZ=.18*reach*(1-returnHand);}
        magazine.position.set(0,-.078-magDrop*.24,-.181+magBack);magazine.rotation.x=magDrop*.22;leftHand.position.set(handX,handY,handZ);leftHand.rotation.x=magDrop*.12;
        const travel=boltTime<.075?Math.sin(boltTime/.075*Math.PI):state.ammo===0?.8:0;const rack=state.reloadEmpty&&reload>.78&&reload<.95?Math.sin((reload-.78)/.17*Math.PI):0;bolt.position.z=Math.max(travel,rack)*.045;
        if(reload>0&&lastPhase<.24&&reload>=.24)api.onReloadPhase?.('out');if(reload>0&&lastPhase<.68&&reload>=.68)api.onReloadPhase?.('in');if(state.reloadEmpty&&lastPhase<.89&&reload>=.89)api.onReloadPhase?.('bolt');lastPhase=reload;
        camera.fov=T.MathUtils.lerp(68,52,a);camera.updateProjectionMatrix();previousSpeed=move;
      },
      stats(){return{heat:+heat.toFixed(2),wet:+wet.toFixed(2),springs:Object.fromEntries(Object.entries(springs).map(([k,s])=>[k,+s.x.toFixed(4)]))};}
    };return api;
  };
})(window.Harbor);
