/* 连续湿地、斜裁剪平面反射、GPU 雨线与多频海面。 */
(function(H){
  'use strict';const T=THREE;
  H.createTerrain=function(scene,renderer,world){
    const bounds={minX:-25,maxX:-13,minZ:14,maxZ:27,roof:5.2};world.shelter=bounds;
    const inside=(x,z)=>x>bounds.minX&&x<bounds.maxX&&z>bounds.minZ&&z<bounds.maxZ;
    const wetAt=(x,z)=>{if(inside(x,z))return .12;const v=Math.sin(x*.21+Math.sin(z*.17)*1.7)+Math.sin(z*.27-x*.11)*.65+Math.sin(x*.76+z*.51)*.15;return T.MathUtils.smoothstep(v,-.3,.85);};
    const reflection=new T.WebGLRenderTarget(512,288,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,depthBuffer:true});reflection.texture.generateMipmaps=true;
    const mirror=new T.PerspectiveCamera(),matrix=new T.Matrix4(),bias=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
    const uniforms={hReflection:{value:reflection.texture},hReflectMatrix:{value:matrix},hReflectOn:{value:0},hTime:{value:0}};
    const common=`varying vec3 vTerrain;uniform float hTime,hReflectOn;uniform sampler2D hReflection;uniform mat4 hReflectMatrix;${H.glslNoise}
      float groundWet(vec2 p){float v=sin(p.x*.21+sin(p.y*.17)*1.7)+sin(p.y*.27-p.x*.11)*.65+sin(p.x*.76+p.y*.51)*.15;float dry=step(-25.,p.x)*step(p.x,-13.)*step(14.,p.y)*step(p.y,27.);return mix(smoothstep(-.3,.85,v),.07,dry);}
      vec2 rainSlope(vec2 p){vec2 cell=floor(p*1.6),f=fract(p*1.6)-.5;float phase=fract(hTime*.9+hHash(cell)),r=length(f);float ring=exp(-pow((r-phase*.5)*37.,2.))*(1.-phase);return f/max(r,.01)*ring*sin(phase*6.28)*.06;}
      float wetness=0.;float puddle=0.;
    `;
    const material=new T.MeshPhysicalMaterial({color:'#89918b',map:H.art.texture('asphalt_02_color',38,49),normalMap:H.art.texture('asphalt_02_normal',38,49),normalScale:new T.Vector2(.6,.6),roughness:.85,roughnessMap:H.art.texture('asphalt_02_roughness',38,49),metalness:.015,clearcoat:.45,clearcoatRoughness:.15,envMapIntensity:1.});
    material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying vec3 vTerrain;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTerrain=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader=common+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        wetness=groundWet(vTerrain.xz);puddle=smoothstep(.65,.96,wetness);float macro=hFbm(vTerrain.xz*.8),oil=smoothstep(.65,.86,hFbm(vTerrain.xz*.31+7.));
        float joints=1.-smoothstep(.012,.035,min(abs(mod(vTerrain.x+3.,6.)-3.),abs(mod(vTerrain.z+3.,6.)-3.)));
        diffuseColor.rgb*=mix(.92,1.13,macro)*(1.-wetness*.32)*(1.-oil*.19)*(1.-joints*.32);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        roughnessFactor=mix(max(.62,roughnessFactor),.27,wetness);roughnessFactor=mix(roughnessFactor,.065,puddle);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        normal=normalize(mix(normal,normalize(vNormal),puddle*.92)+mat3(viewMatrix)*vec3(rainSlope(vTerrain.xz).x,0.,rainSlope(vTerrain.xz).y)*puddle);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        if(hReflectOn>.5){vec4 rp=hReflectMatrix*vec4(vTerrain,1.);vec2 uv=rp.xy/max(.001,rp.w);vec2 slope=rainSlope(vTerrain.xz);uv+=slope*.012+hNoise(vTerrain.xz*2.+hTime*.05)*.0003;
          float grazing=pow(1.-abs(normalize(cameraPosition-vTerrain).y),3.);float border=smoothstep(0.,.025,min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y)));
          vec3 reflected=texture2D(hReflection,clamp(uv,.001,.999),mix(3.,.5,puddle)).rgb;float weight=mix(.035,.55,puddle)*mix(.25,1.,grazing)*border;
          outgoingLight=mix(outgoingLight,reflected*.9,weight);}
        #include <opaque_fragment>`);
    };material.customProgramCacheKey=()=> 'harbor-continuous-water-v3';
    const ground=new T.Mesh(new T.PlaneGeometry(220,280),material);ground.rotation.x=-Math.PI/2;ground.position.set(0,-.015,-25);ground.receiveShadow=true;ground.userData.surface='concrete';scene.add(ground);world.surfaces.push(ground);
    const seaMat=new T.MeshStandardMaterial({color:'#395a62',roughness:.2,metalness:.4,envMapIntensity:1.4});
    seaMat.onBeforeCompile=shader=>{shader.uniforms.hTime=uniforms.hTime;shader.vertexShader='uniform float hTime;varying vec3 vSea;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float wave=sin(position.x*.19+hTime*.85)*.11+sin(position.y*.31-hTime*1.3)*.055+sin(position.x*.47+position.y*.2+hTime)*.025;transformed.z+=wave;vSea=position;`);shader.fragmentShader='uniform float hTime;varying vec3 vSea;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      normal=normalize(normal+vec3(sin(vSea.x*.7+hTime)*.12,cos(vSea.y*.9-hTime*.7)*.12,0.));`);};seaMat.customProgramCacheKey=()=> 'harbor-sea-v3';
    const sea=new T.Mesh(new T.PlaneGeometry(270,350,70,70),seaMat);sea.rotation.x=-Math.PI/2;sea.position.set(178,-1.3,-35);scene.add(sea);
    // 随机种子只上传一次，雨线的下落、风偏和近远尺寸在顶点着色器中计算。
    const count=2800,geo=new T.InstancedBufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([-.5,0,0,.5,0,0,-.5,1,0,.5,1,0],3));geo.setIndex([0,1,2,2,1,3]);const seeds=new Float32Array(count*4);let seed=921;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<seeds.length;i++)seeds[i]=rnd();geo.setAttribute('seed',new T.InstancedBufferAttribute(seeds,4));geo.instanceCount=count;
    const rainMat=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{hTime:uniforms.hTime},vertexShader:`attribute vec4 seed;uniform float hTime;varying float vFade;varying vec2 vRain;void main(){vec3 p=vec3(seed.x*56.,seed.y*22.,seed.z*56.);p+=vec3(-1.8,-17.,.8)*hTime;p=mod(p-cameraPosition+vec3(28.,11.,28.),vec3(56.,22.,56.))-vec3(28.,0.,28.)+vec3(cameraPosition.x,0.,cameraPosition.z);
        float roof=step(-25.,p.x)*step(p.x,-13.)*step(14.,p.z)*step(p.z,27.)*step(p.y,5.2);vec3 to=p-cameraPosition;vec3 side=normalize(cross(vec3(-.1,-1.,.04),to));float dist=length(to),width=max(.006,dist*.0006);p+=side*position.x*width+vec3(-.05,-.6,.02)*position.y;
        vFade=(1.-smoothstep(16.,31.,dist))*smoothstep(.6,2.,dist)*(1.-roof)*(.3+seed.w*.6);vRain=position.xy;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`,fragmentShader:`varying float vFade;varying vec2 vRain;void main(){float a=(1.-abs(vRain.x)*2.)*sin(vRain.y*3.14159)*vFade;gl_FragColor=vec4(vec3(.69,.77,.78),a*.24);}`});
    const rain=new T.Mesh(geo,rainMat);rain.frustumCulled=false;scene.add(rain);
    const ringGeo=new T.RingGeometry(.88,1,20),ringMat=new T.MeshBasicMaterial({color:'#c1d6cc',transparent:true,opacity:.12,side:T.DoubleSide,depthWrite:false});const rings=new T.InstancedMesh(ringGeo,ringMat,100),dummy=new T.Object3D();rings.frustumCulled=false;scene.add(rings);
    const ringSeeds=Array.from({length:100},()=>[rnd(),rnd(),rnd()]);let quality='medium',frame=0;const hideList=[ground,sea,rain,rings],clip=new T.Plane(new T.Vector3(0,1,0),0),clipVector=new T.Vector4(),q=new T.Vector4(),look=new T.Vector3(),up=new T.Vector3(),rotation=new T.Matrix4();
    const api={ground,sea,rain,inside,wetAt,reflection,quality:'medium',setQuality(value){quality=value;api.quality=value;geo.instanceCount=value==='low'?650:value==='high'?2800:1500;uniforms.hReflectOn.value=value==='low'?0:1;},
      update(dt,time,camera){uniforms.hTime.value=time;H.weather.time.value=time;ringSeeds.forEach((p,i)=>{const x=Math.floor(camera.position.x/5)*5+(p[0]-.5)*35,z=Math.floor(camera.position.z/5)*5+(p[1]-.5)*35,phase=(time*.9+p[2])%1,r=.025+phase*.16;dummy.position.set(x,.012,z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(inside(x,z)||wetAt(x,z)<.6?0:r*(1-phase*.45));dummy.updateMatrix();rings.setMatrixAt(i,dummy.matrix);});rings.instanceMatrix.needsUpdate=true;
        if(quality==='low'||frame++%(quality==='high'?2:3)!==0||camera.position.y<.04)return;
        const size=renderer.getDrawingBufferSize(new T.Vector2()),factor=quality==='high'?.55:.4,w=Math.max(64,Math.round(size.x*factor/16)*16),h=Math.max(32,Math.round(size.y*factor/8)*8);if(reflection.width!==w||reflection.height!==h)reflection.setSize(w,h);
        camera.updateMatrixWorld();mirror.copy(camera);mirror.position.copy(camera.position);mirror.position.y=-mirror.position.y;rotation.extractRotation(camera.matrixWorld);camera.getWorldDirection(look);look.y=-look.y;up.set(0,1,0).applyMatrix4(rotation);up.y=-up.y;mirror.up.copy(up);mirror.lookAt(look.add(mirror.position));mirror.updateMatrixWorld();mirror.matrixWorldInverse.copy(mirror.matrixWorld).invert();mirror.projectionMatrix.copy(camera.projectionMatrix);
        clip.set(new T.Vector3(0,1,0),.02).applyMatrix4(mirror.matrixWorldInverse);clipVector.set(clip.normal.x,clip.normal.y,clip.normal.z,clip.constant);const p=mirror.projectionMatrix.elements;q.set((Math.sign(clipVector.x)+p[8])/p[0],(Math.sign(clipVector.y)+p[9])/p[5],-1,(1+p[10])/p[14]);clipVector.multiplyScalar(2/clipVector.dot(q));p[2]=clipVector.x;p[6]=clipVector.y;p[10]=clipVector.z+1;p[14]=clipVector.w;mirror.projectionMatrixInverse.copy(mirror.projectionMatrix).invert();matrix.copy(bias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);
        const target=renderer.getRenderTarget(),tone=renderer.toneMapping,shadows=renderer.shadowMap.autoUpdate,states=hideList.map(o=>o.visible);try{hideList.forEach(o=>o.visible=false);renderer.shadowMap.autoUpdate=false;renderer.toneMapping=T.NoToneMapping;renderer.setRenderTarget(reflection);renderer.clear();renderer.render(scene,mirror);uniforms.hReflectOn.value=1;}finally{hideList.forEach((o,i)=>o.visible=states[i]);renderer.setRenderTarget(target);renderer.toneMapping=tone;renderer.shadowMap.autoUpdate=shadows;}
      }};return api;
  };
})(window.Harbor);
