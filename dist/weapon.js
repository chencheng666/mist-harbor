/* 机械守卫模型与浏览器合成音效；枪械位于 rifle.js。 */
(function (H) {
  'use strict';
  const T = THREE;
  H.createEnemyModel = function (type, mats) {
    const root=new T.Group(),body=new T.Group(),parts=[],rotors=[],legs=[],feet=[],footStates=[];root.add(body);let lastPos=new T.Vector3(),first=true,stepPhase=0;
    const armor=H.weatherMaterial(new T.MeshStandardMaterial({color:'#9aa6a3',roughness:.58,metalness:.45,map:H.art.texture('rusty_painted_metal_color',1,1),normalMap:H.art.texture('metal_plate_normal'),normalScale:new T.Vector2(.12,.12)}));
    const eye=new T.MeshStandardMaterial({color:'#ffab50',emissive:'#ff6d21',emissiveIntensity:2.5,roughness:.2});
    function add(g,m,x=0,y=0,z=0,parent=body){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);parts.push(o);return o;}
    function rounded(w,h,d,x,y,z,m,parent=body){const shape=new T.Shape(),r=Math.min(w,h)*.15;shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const g=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1,curveSegments:3});g.translate(0,0,-d/2);return add(g,m,x,y,z,parent);}
    function rod(a,b,r,m,parent=body){const from=new T.Vector3(...a),to=new T.Vector3(...b),dir=to.clone().sub(from),mesh=add(new T.CylinderGeometry(r,r,dir.length(),8),m,0,0,0,parent);mesh.position.copy(from.add(to).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return mesh;}
    let sensor;
    if(type==='drone'){
      rounded(.58,.22,.69,0,0,0,armor);rounded(.36,.13,.48,0,.16,0,mats.dark);rounded(.25,.13,.19,0,-.17,.27,mats.dark);
      sensor=add(new T.SphereGeometry(.075,12,8),eye,0,-.16,.39);sensor.scale.z=.35;sensor.userData.weak=true;
      for(const x of[-1,1])for(const z of[-1,1]){rod([x*.2,0,z*.2],[x*.72,.045,z*.57],.034,mats.iron);rod([x*.23,-.05,z*.12],[x*.71,.04,z*.57],.019,mats.dark);
        const ring=add(new T.TorusGeometry(.26,.022,6,22),armor,x*.72,.075,z*.57);ring.rotation.x=Math.PI/2;
        const rotor=new T.Group();rotor.position.set(x*.72,.08,z*.57);body.add(rotor);const blade=rounded(.49,.012,.037,0,0,0,mats.dark,rotor);const second=rounded(.49,.012,.037,0,0,0,mats.dark,rotor);second.rotation.y=Math.PI/2;rotors.push(rotor);
        add(new T.CylinderGeometry(.055,.065,.13,10),mats.dark,x*.72,.025,z*.57);rod([x*.5,-.08,z*.34],[x*.52,-.34,z*.38],.021,mats.iron);
      }
      rod([-.18,-.11,0],[-.22,-.34,.2],.02,mats.iron);rod([.18,-.11,0],[.22,-.34,.2],.02,mats.iron);
    }else{
      body.position.y=.91;rounded(.62,.31,1.02,0,.02,0,armor);rounded(.50,.14,.73,0,.24,-.09,mats.dark);
      for(const x of[-1,1]){rounded(.045,.16,.70,x*.33,.05,-.04,mats.iron);for(let j=0;j<7;j++)rounded(.048,.018,.032,x*.36,.07,-.30+j*.085,mats.dark);}
      const head=new T.Group();head.position.set(0,.06,.57);body.add(head);rounded(.33,.23,.32,0,0,0,mats.dark,head);sensor=rounded(.25,.038,.025,0,.017,.18,eye,head);sensor.userData.weak=true;
      rod([-.13,.23,-.30],[-.16,.72,-.36],.012,mats.iron);rounded(.13,.08,.44,0,.11,.33,mats.iron);
      for(const x of[-1,1])for(const z of[-1,1]){
        const hip=new T.Group();hip.position.set(x*.35,.87,z*.40);root.add(hip);const knee=new T.Group();knee.position.y=-.40;hip.add(knee);
        add(new T.SphereGeometry(.10,10,8),mats.dark,0,0,0,hip);rounded(.105,.34,.13,0,-.19,0,armor,hip);rod([x*.065,-.05,.045],[x*.065,-.36,.045],.018,mats.iron,hip);
        add(new T.SphereGeometry(.085,10,8),mats.dark,0,0,0,knee);rounded(.08,.33,.09,0,-.19,0,mats.iron,knee);const foot=rounded(.16,.07,.23,0,-.425,.025,mats.rubber,knee);
        foot.userData.noMerge=true;legs.push({hip,knee,x,z});feet.push(foot);footStates.push({x:0,z:0,from:new T.Vector3(),to:new T.Vector3(),p:new T.Vector3(),phase:1});
      }
    }
    const groups=[];root.traverse(o=>{if(o.isGroup)groups.push(o);});groups.reverse().forEach(g=>H.mergeParts(g));parts.length=0;root.traverse(o=>{if(o.isMesh)parts.push(o);});
    function animate(dt,time,moving,turn=0,alert=false,hurt=0,telegraph=0){
      eye.emissiveIntensity=telegraph>0?6+Math.sin(time*35)*2:hurt>0?7:alert?3.4:1.6;
      if(type==='drone'){rotors.forEach((r,i)=>r.rotation.y+=dt*(i%2?1:-1)*90);body.rotation.z=Math.sin(time*2.2)*.025+turn*.05;body.rotation.x=Math.min(.15,moving*.045);return;}
      const c=Math.cos(root.rotation.y),s=Math.sin(root.rotation.y);if(first){footStates.forEach((f,i)=>{const l=legs[i];f.p.set(root.position.x+c*l.x*.47+s*l.z*.46,.05,root.position.z-s*l.x*.47+c*l.z*.46);});lastPos.copy(root.position);first=false;}
      const speed=dt>0?Math.min(5,root.position.distanceTo(lastPos)/dt):0;stepPhase+=dt*(2+speed*1.4);const group=Math.floor(stepPhase)%2;
      footStates.forEach((f,i)=>{const l=legs[i],tx=root.position.x+c*l.x*.47+s*(l.z*.46+speed*.12),tz=root.position.z-s*l.x*.47+c*(l.z*.46+speed*.12),pair=(i===0||i===3)?0:1;
        if(f.phase>=1&&pair===group&&Math.hypot(tx-f.p.x,tz-f.p.z)>(speed>.15?.15:.27)){f.from.copy(f.p);f.to.set(tx,.05,tz);f.phase=0;}
        if(f.phase<1){f.phase=Math.min(1,f.phase+dt*(3.8+speed*.8));const t=f.phase*f.phase*(3-2*f.phase);f.p.lerpVectors(f.from,f.to,t);f.p.y+=Math.sin(f.phase*Math.PI)*(.07+speed*.018);}
        const dx=f.p.x-root.position.x,dz=f.p.z-root.position.z,lx=c*dx-s*dz-l.x*.35,lz=s*dx+c*dz-l.z*.40,dy=.87-f.p.y;
        const length=Math.min(.822,Math.max(.12,Math.hypot(dy,lz))),alpha=Math.acos(T.MathUtils.clamp((.4*.4+length*length-.425*.425)/(.8*length),-1,1));
        l.hip.rotation.x=Math.atan2(-lz,dy)-alpha;l.hip.rotation.z=T.MathUtils.clamp(lx/.9,-.22,.22);l.knee.rotation.x=Math.PI-Math.acos(T.MathUtils.clamp((.4*.4+.425*.425-length*length)/(2*.4*.425),-1,1));feet[i].rotation.x=-l.hip.rotation.x-l.knee.rotation.x;
      });
      body.position.y=.91+Math.sin(stepPhase*Math.PI*2)*.012*Math.min(1,speed);body.rotation.z=T.MathUtils.damp(body.rotation.z,turn*.035,8,dt);body.rotation.x=T.MathUtils.damp(body.rotation.x,-moving*.018+(hurt>0?.06:0),8,dt);lastPos.copy(root.position);
    }
    return{root,parts,rotors,legs,animate,dispose(){const geos=new Set();root.traverse(o=>{if(o.isMesh)geos.add(o.geometry);});geos.forEach(g=>g.dispose());armor.dispose();eye.dispose();}};
  };
  H.createAudio=function(){
    let ctx,master,compressor,rainGain,windGain,outReverb,inReverb,outMix,inMix,musicGain,enabled=true,paused=true,intensity=0,interior=0,shotIndex=0,beat=0;const buffers=new Map(),voices=[];
    function synth(name,duration,fn){const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),a=b.getChannelData(0);let seed=3901;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};for(let i=0;i<a.length;i++)a[i]=fn(i/ctx.sampleRate,random,i);buffers.set(name,b);return b;}
    function reverb(seconds,decay){const b=ctx.createBuffer(2,ctx.sampleRate*seconds,ctx.sampleRate);for(let c=0;c<2;c++){const a=b.getChannelData(c);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,decay)*.35;}return b;}
    function init(){if(ctx){ctx.resume().catch(()=>{});return;}const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      try{ctx=new C({latencyHint:'interactive'});master=ctx.createGain();master.gain.value=enabled?.32:0;compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.ratio.value=5;compressor.attack.value=.003;master.connect(compressor);compressor.connect(ctx.destination);
        outReverb=ctx.createConvolver();inReverb=ctx.createConvolver();outReverb.buffer=reverb(.7,4);inReverb.buffer=reverb(1.65,2.6);outMix=ctx.createGain();inMix=ctx.createGain();outMix.gain.value=.13;inMix.gain.value=0;outReverb.connect(outMix);inReverb.connect(inMix);outMix.connect(master);inMix.connect(master);
        for(let v=0;v<4;v++)synth('shot'+v,.28,(t,r)=>{const blast=r()*Math.exp(-t*(35+v*2))*.7,body=Math.sin(t*(175-t*210)*6.283)*Math.exp(-t*31)*.45,crack=r()*Math.exp(-t*220)*.7;return blast+body+crack;});
        synth('noise',2,(t,r)=>r());synth('step',.15,(t,r)=>r()*Math.exp(-t*35)*.7+Math.sin(t*95*6.28)*Math.exp(-t*30)*.2);synth('water',.2,(t,r)=>r()*Math.exp(-t*20)*Math.sin(t*740)*.7);
        synth('metal',.16,(t,r)=>r()*Math.exp(-t*55)*.5+Math.sin(t*1700*6.28)*Math.exp(-t*35)*.3);synth('reload',.13,(t,r)=>r()*Math.exp(-t*40)*.5+Math.sin(t*650*6.28)*Math.exp(-t*60)*.4);
        synth('explosion',.8,(t,r)=>r()*Math.exp(-t*7)*.8+Math.sin(t*(63-t*35)*6.28)*Math.exp(-t*8)*.6);
        function ambient(freq,gain){const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=buffers.get('noise');src.loop=true;f.type='lowpass';f.frequency.value=freq;g.gain.value=gain;src.connect(f);f.connect(g);g.connect(master);src.start();return g;}
        rainGain=ambient(3200,.065);windGain=ambient(240,.035);musicGain=ctx.createGain();musicGain.gain.value=.005;musicGain.connect(master);for(const f of[55,82.4,110.15]){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.value=.19;o.connect(g);g.connect(musicGain);o.start();}
      }catch(error){console.warn('声音不可用，将继续静音运行',error);ctx=null;}
    }
    function play(name,gain=.3,position=null,pitch=1,priority=2){if(!ctx||!enabled||!buffers.has(name))return;const now=ctx.currentTime;for(let i=voices.length-1;i>=0;i--)if(voices[i].end<=now)voices.splice(i,1);
      if(voices.length>=22){const victim=voices.find(v=>v.priority<priority);if(!victim)return;try{victim.source.stop();}catch{}voices.splice(voices.indexOf(victim),1);}
      const source=ctx.createBufferSource(),g=ctx.createGain();source.buffer=buffers.get(name);source.playbackRate.value=pitch*(.975+Math.random()*.05);g.gain.value=gain;source.connect(g);let tail=g,panner;
      if(position){panner=ctx.createPanner();panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=3;panner.rolloffFactor=.75;panner.positionX.value=position.x;panner.positionY.value=position.y;panner.positionZ.value=position.z;g.connect(panner);tail=panner;}
      tail.connect(master);tail.connect(outReverb);tail.connect(inReverb);source.onended=()=>{source.disconnect();g.disconnect();panner?.disconnect();};source.start();voices.push({source,end:now+source.buffer.duration/pitch,priority});
    }
    function tone(freq,length,gain=.1){if(!ctx||!enabled)return;const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=freq;g.gain.setValueAtTime(gain,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+length);o.connect(g);g.connect(master);o.start();o.stop(ctx.currentTime+length);o.onended=()=>{o.disconnect();g.disconnect();};}
    return{init,shot(){play('shot'+shotIndex++%4,.8,null,1,8);},hit(){tone(1100,.045,.08);},reload(phase='out'){play('reload',.25,null,phase==='bolt'?.75:phase==='in'?1.3:1,5);},empty(){play('metal',.1,null,.55,3);},hurt(){play('explosion',.22,null,.9,7);},
      step(surface='concrete',sprint=false){play(surface==='water'?'water':surface==='metal'?'metal':'step',sprint?.17:.11,null,.9+Math.random()*.12,1);},shell(pos){play('metal',.1,pos,1.7,0);},enemy(pos){play('shot2',.28,pos,.8,5);},warning(pos){play('metal',.2,pos,.7,6);},impact(pos,metal=true){play(metal?'metal':'step',.16,pos,1,2);},beacon(){tone(660,.3,.15);setTimeout(()=>tone(990,.4,.1),130);},explosion(pos){play('explosion',.7,pos,1,9);},
      setEnabled(value){enabled=value;if(ctx&&master)master.gain.setTargetAtTime(value?.32:0,ctx.currentTime,.03);},pause(value){paused=value;},
      update(dt,camera,alert,inBuilding){if(!ctx)return;intensity=T.MathUtils.damp(intensity,paused?0:alert,2,dt);interior=T.MathUtils.damp(interior,inBuilding?1:0,2,dt);const now=ctx.currentTime;
        const listener=ctx.listener;if(listener.positionX){listener.positionX.value=camera.position.x;listener.positionY.value=camera.position.y;listener.positionZ.value=camera.position.z;const f=camera.getWorldDirection(new T.Vector3()),u=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);listener.forwardX.value=f.x;listener.forwardY.value=f.y;listener.forwardZ.value=f.z;listener.upX.value=u.x;listener.upY.value=u.y;listener.upZ.value=u.z;}
        rainGain.gain.setTargetAtTime((paused?.025:.065)*(1-interior*.7),now,.2);windGain.gain.setTargetAtTime(.035*(1-interior*.7),now,.2);outMix.gain.setTargetAtTime(.13*(1-interior),now,.1);inMix.gain.setTargetAtTime(.27*interior,now,.1);musicGain.gain.setTargetAtTime(.015+intensity*.05,now,.2);
        beat-=dt;if(!paused&&intensity>.5&&beat<=0){beat=.5;play('step',.13*intensity,null,.55,0);}},
      stats:()=>({state:ctx?.state||'未启动',voices:voices.length,generatedBuffers:buffers.size,interior:+interior.toFixed(2),intensity:+intensity.toFixed(2)})};
  };
})(window.Harbor);
