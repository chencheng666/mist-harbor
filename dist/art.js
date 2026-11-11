/* 0.3 画质核心：程序化 PBR、天空环境、接触软阴影和分辨率自适应 HDR 管线。 */
window.Harbor = window.Harbor || {};
(function (H) {
  'use strict';
  const T = THREE;
  H.sunDirection = new T.Vector3(-.38, .255, -.85).normalize();
  H.glslNoise = `
    float hHash(vec2 p){return fract(sin(dot(p,vec2(137.13,269.57)))*43758.5453);}
    float hNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hHash(i),hHash(i+vec2(1,0)),f.x),mix(hHash(i+vec2(0,1)),hHash(i+1.),f.x),f.y);}
    float hFbm(vec2 p){return hNoise(p)*.53+hNoise(p*2.07+5.7)*.27+hNoise(p*4.13+13.4)*.13+hNoise(p*8.21)*.07;}
  `;
  H.createSky = function () {
    const material = new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{time:{value:0},sun:{value:H.sunDirection},environment:{value:0}},
      vertexShader:'varying vec3 vSky;void main(){vSky=position;vec4 p=projectionMatrix*mat4(mat3(viewMatrix))*vec4(position,1.);gl_Position=p.xyww;}',
      fragmentShader:`varying vec3 vSky;uniform vec3 sun;uniform float time,environment;${H.glslNoise}
      void main(){vec3 d=normalize(vSky);float y=max(0.,d.y),mu=max(0.,dot(d,sun));float facing=pow(max(0.,dot(normalize(d.xz+.001),normalize(sun.xz))),5.);
        vec3 horizon=mix(vec3(.33,.43,.48),vec3(1.25,.67,.29),facing);vec3 clear=mix(horizon,vec3(.055,.105,.17),smoothstep(0.,.85,y));
        vec2 p=d.xz/(y+.12)*1.45+vec2(time*.003,-time*.0013);float n=hFbm(p+hNoise(p*.5)*1.8),edge=.10+.16*facing;
        float cloud=smoothstep(.40,.66,n)*smoothstep(edge-.09,edge+.14,y);cloud*=1.-smoothstep(.97,.999,mu)*.85;
        float relief=clamp((n-hFbm(p+sun.xz*.23))*4.+.5,0.,1.);vec3 cold=mix(vec3(.10,.16,.21),vec3(.027,.045,.07),n);
        vec3 rim=vec3(1.9,.87,.32)*facing*(.14+relief*relief)*exp(-abs(y-edge)*4.);vec3 col=mix(clear,cold*(.65+relief)+rim,cloud*.94);
        col+=vec3(1.,.75,.43)*pow(mu,40.)*.8;col+=vec3(1.,.86,.64)*smoothstep(.9995,.99988,mu)*32.*(1.-environment);
        if(d.y<0.)col=mix(horizon*.4,vec3(.025,.035,.04),smoothstep(0.,.25,-d.y));gl_FragColor=vec4(max(col,vec3(0)),1.);
      }`});
    const mesh=new T.Mesh(new T.SphereGeometry(450,24,12),material);mesh.frustumCulled=false;mesh.renderOrder=-1000;return mesh;
  };
  H.createArt = function (renderer) {
    const maps={},cache=new Map(),failed=[],anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
    const noise=(x,y)=>{const a=Math.floor(x),b=Math.floor(y);let u=x-a,v=y-b;u=u*u*(3-2*u);v=v*v*(3-2*v);return T.MathUtils.lerp(T.MathUtils.lerp(hash(a,b),hash(a+1,b),u),T.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),u),v);};
    const tex=(data,size,color=false)=>{const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=anisotropy;if(color)t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;return t;};
    // 一份高度场派生颜色、法线与粗糙度，不随发行包携带扫描图片。
    function generate(kind,size=512){const c=new Uint8Array(size*size*4),r=new Uint8Array(c.length),n=new Uint8Array(c.length),height=new Float32Array(size*size);
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,k=i*4,u=x/size,v=y/size,fine=hash(x,y),broad=noise(u*8,v*8),grain=noise(u*58,v*58);let col,rough,h;
        if(kind==='asphalt'){const stone=Math.max(0,grain-.57),crack=Math.pow(Math.max(0,1-Math.abs(noise(u*15+3,v*15)-.5)*38),5);const g=70+broad*25+fine*22+stone*46-crack*29;col=[g*.94,g,g*1.02];rough=175+grain*45;h=grain*.46+fine*.16-crack*.3;}
        else if(kind==='paint'){const flake=noise(u*45,v*22)*.65+noise(u*130,v*80)*.35,rust=T.MathUtils.smoothstep(flake,.66,.83),streak=noise(u*78,v*3)*noise(u*17,v*8);const g=185+broad*24+fine*9-streak*35;col=[g*(1-rust)+132*rust,g*(1-rust)+88*rust,g*(1-rust)+60*rust];rough=145+rust*94+grain*25;h=grain*.12-rust*.14;}
        else{const brushed=noise(u*300,v*7),g=158+brushed*32+fine*17;col=[g,g*1.01,g*1.025];rough=125+brushed*80;h=brushed*.12+fine*.025;}
        c[k]=col[0];c[k+1]=col[1];c[k+2]=col[2];c[k+3]=255;r[k]=r[k+1]=r[k+2]=rough;r[k+3]=255;height[i]=h;
      }
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){const k=(y*size+x)*4,dx=(height[y*size+(x+1)%size]-height[y*size+(x+size-1)%size])*2,dy=(height[((y+1)%size)*size+x]-height[((y+size-1)%size)*size+x])*2,l=Math.hypot(dx,dy,1);n[k]=(-dx/l*.5+.5)*255;n[k+1]=(-dy/l*.5+.5)*255;n[k+2]=(1/l*.5+.5)*255;n[k+3]=255;}
      return{color:tex(c,size,true),normal:tex(n,size),roughness:tex(r,size)};
    }
    const road=generate('asphalt'),paint=generate('paint'),metal=generate('metal',256);
    for(const [prefix,set]of[['asphalt_02',road],['rusty_painted_metal',paint],['metal_plate',metal]])for(const k of ['color','normal','roughness'])maps[prefix+'_'+k]=set[k];
    const envScene=new T.Scene(),sky=H.createSky();sky.material.uniforms.environment.value=1;envScene.add(sky);const generator=new T.PMREMGenerator(renderer),env=generator.fromScene(envScene,0,.1,500);generator.dispose();sky.geometry.dispose();sky.material.dispose();
    return{ready:true,failed,maps,environment:env.texture,procedural:true,texture(name,x=1,y=x){const key=name+':'+x+':'+y;if(!cache.has(key)){const t=maps[name].clone();t.repeat.set(x,y);t.needsUpdate=true;cache.set(key,t);}return cache.get(key);},stats:()=>({proceduralSets:3,textures:Object.keys(maps).length,cachedVariants:cache.size})};
  };
  // 材质共享世界空间湿度，朝上面、水痕与脚部溅湿具有不同强度。
  H.weather={wet:{value:1},time:{value:0}};
  H.weatherMaterial=function(material,kind='metal'){
    const previous=material.onBeforeCompile,key=material.customProgramCacheKey?.call(material)||'';
    material.onBeforeCompile=shader=>{previous?.(shader);Object.assign(shader.uniforms,{hWet:H.weather.wet,hTime:H.weather.time});
      shader.vertexShader='varying vec3 vHWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vec4 hPos=vec4(transformed,1.);\n#ifdef USE_INSTANCING\n hPos=instanceMatrix*hPos;\n#endif\n vHWorld=(modelMatrix*hPos).xyz;');
      shader.fragmentShader='varying vec3 vHWorld;uniform float hWet,hTime;\n'+H.glslNoise+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        vec3 hWN=inverseTransformDirection(normalize(vNormal),viewMatrix);float hUp=smoothstep(-.2,.8,hWN.y);float hStreak=hNoise(vec2(vHWorld.x+vHWorld.z,vHWorld.y*.06)*18.);
        float hMoist=hWet*mix(.14+hStreak*.25,.85,hUp);float hMacro=hFbm(vHWorld.xz*.7);roughnessFactor=clamp(roughnessFactor+(hMacro-.5)*.14,.13,1.);roughnessFactor=mix(roughnessFactor,max(.09,roughnessFactor*.38),hMoist);
        diffuseColor.rgb*=1.-hMoist*.12;`);
    };material.customProgramCacheKey=()=>key+'|harbor-weather-v3-'+kind;return material;
  };
  H.installSoftShadows=function(){const original=T.ShaderChunk.shadowmap_pars_fragment,start=original.indexOf('float getShadow('),end=original.indexOf('vec2 cubeToUV');if(start<0||end<start)return false;
    const replacement=`float hShadowRand(vec2 p){return fract(52.9829*fract(dot(p,vec2(.06711,.00584))));}
      vec2 hDisk(int i,float count,float angle){float a=float(i)*2.399963+angle;return vec2(cos(a),sin(a))*sqrt((float(i)+.5)/count);}
      float getShadow(sampler2D shadowMap,vec2 shadowMapSize,float shadowBias,float shadowRadius,vec4 shadowCoord){
      vec3 sc=shadowCoord.xyz/shadowCoord.w;if(sc.x<0.||sc.x>1.||sc.y<0.||sc.y>1.||sc.z>1.)return 1.;
      vec3 dx=dFdx(sc),dy=dFdy(sc);float det=dx.x*dy.y-dx.y*dy.x;vec2 slope=abs(det)>.00000001?vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/det:vec2(0.);slope=clamp(slope,vec2(-.4),vec2(.4));
      float z=sc.z+shadowBias-.0001,angle=hShadowRand(gl_FragCoord.xy)*6.28318,blocker=0.,count=0.;vec2 texel=1./shadowMapSize;
      for(int i=0;i<6;i++){vec2 o=hDisk(i,6.,angle)*.003;float d=unpackRGBAToDepth(texture2D(shadowMap,sc.xy+o));if(d<z+dot(o,slope)){blocker+=d;count+=1.;}}
      if(count<.5)return 1.;float pen=clamp((z-blocker/count)*.17,.00045,.004);vec2 radius=max(vec2(pen),texel*1.2);float lit=0.;
      for(int i=0;i<12;i++){vec2 o=hDisk(i,12.,angle+1.3)*radius;lit+=step(z+dot(o,slope),unpackRGBAToDepth(texture2D(shadowMap,sc.xy+o)));}
      vec2 edge=min(sc.xy,1.-sc.xy);return mix(1.,lit/12.,smoothstep(0.,.015,min(edge.x,edge.y)));}
    `;T.ShaderChunk.shadowmap_pars_fragment=original.slice(0,start)+replacement+original.slice(end);return true;
  };
  H.captureEnvironment=function(renderer,scene,position){
    const target=new T.WebGLCubeRenderTarget(64,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType}),camera=new T.CubeCamera(.1,220,target),previous=renderer.getRenderTarget(),tone=renderer.toneMapping;
    camera.position.copy(position);const generator=new T.PMREMGenerator(renderer);let result;
    try{renderer.toneMapping=T.NoToneMapping;camera.update(renderer,scene);result=generator.fromCubemap(target.texture).texture;}
    finally{renderer.toneMapping=tone;renderer.setRenderTarget(previous);target.dispose();generator.dispose();}return result;
  };
  H.createPost=function(renderer,camera){
    const hdr=renderer.capabilities.isWebGL2&&renderer.extensions.has('EXT_color_buffer_float'),type=hdr?T.HalfFloatType:T.UnsignedByteType;
    const target=new T.WebGLRenderTarget(1,1,{type,depthBuffer:true,minFilter:T.LinearFilter,magFilter:T.LinearFilter});target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
    const make=()=>new T.WebGLRenderTarget(1,1,{type,depthBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter});const ldr=make(),half=make(),blur=make(),bloom=[make(),make(),make(),make()],adapt=[make(),make()];adapt.forEach(t=>t.setSize(1,1));
    const quadScene=new T.Scene(),quad=new T.Mesh(new T.PlaneGeometry(2,2)),quadCam=new T.Camera();quadScene.add(quad);quad.frustumCulled=false;
    const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
    const material=(code,uniforms)=>new T.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms,vertexShader,fragmentShader:'varying vec2 vUv;'+code});
    const common={depth:{value:target.depthTexture},color:{value:target.texture},inverseProjection:{value:camera.projectionMatrixInverse},inverseView:{value:camera.matrixWorld},sunMatrix:{value:new T.Matrix4()},shadowMap:{value:null},sunDir:{value:H.sunDirection},resolution:{value:new T.Vector2(1,1)},time:{value:0},strength:{value:1},aoOn:{value:1},volOn:{value:1},shadowOn:{value:0}};
    const atmosphere=material(`uniform sampler2D depth,color,shadowMap;uniform mat4 inverseProjection,inverseView,sunMatrix;uniform vec3 sunDir;uniform vec2 resolution;uniform float time,aoOn,volOn,shadowOn;${H.glslNoise}
      vec3 viewPos(vec2 uv,float d){vec4 p=inverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
      float visibility(vec3 p){if(shadowOn<.5)return 1.;vec4 s=sunMatrix*vec4(p,1.);s.xyz/=s.w;if(s.x<0.||s.x>1.||s.y<0.||s.y>1.||s.z>1.)return 1.;vec4 d=texture2D(shadowMap,s.xy);float z=dot(d,vec4(.99609375,.0038909912,.0000151992,.0000000596));return step(s.z-.0008,z);}
      void main(){float d=texture2D(depth,vUv).r;vec3 p=viewPos(vUv,d),n=normalize(cross(dFdx(p),dFdy(p)));if(dot(n,-p)<0.)n=-n;float ao=0.;
        if(d<.9999&&aoOn>.5){float radius=clamp(1.1/max(1.,-p.z),.002,.09);for(int i=0;i<10;i++){float a=float(i)*2.39996+hHash(gl_FragCoord.xy)*6.28;vec2 uv=vUv+vec2(cos(a)/ (resolution.x/resolution.y),sin(a))*radius*(.25+float(i)*.075);vec3 delta=viewPos(uv,texture2D(depth,uv).r)-p;float len=length(delta);ao+=max(0.,dot(n,delta/max(.001,len))-.08)*smoothstep(1.8,.05,len);}}
        vec3 wp=(inverseView*vec4(p,1.)).xyz,eye=inverseView[3].xyz,dir=normalize(wp-eye);float distance=min(length(wp-eye),100.),scatter=0.;
        if(volOn>.5){float jitter=hHash(gl_FragCoord.xy);for(int i=0;i<12;i++){float t=(float(i)+jitter)/12.;vec3 sampleP=eye+dir*distance*t*t;scatter+=visibility(sampleP)*exp(-max(sampleP.y,0.)*.11)*t;}}
        float phase=.2+pow(max(0.,dot(dir,sunDir)),8.)*1.4;vec3 fog=vec3(1.0,.61,.30)*scatter/12.*(1.-exp(-distance*.014))*phase*.42;
        gl_FragColor=vec4(fog,clamp(1.-ao*.18, .38,1.));}`,common);
    const bilateral=material(`uniform sampler2D inputMap,depth;uniform vec2 direction;void main(){float z=texture2D(depth,vUv).r;vec4 c=texture2D(inputMap,vUv)*.4;float sum=.4;for(int i=1;i<=3;i++){for(int j=0;j<2;j++){vec2 uv=vUv+direction*float(i)*(j==0?1.:-1.);float w=exp(-float(i*i)*.2)*exp(-abs(texture2D(depth,uv).r-z)*2200.);c+=texture2D(inputMap,uv)*w;sum+=w;}}gl_FragColor=c/sum;}`,{inputMap:{value:half.texture},depth:common.depth,direction:{value:new T.Vector2()}});
    const down=material(`uniform sampler2D inputMap;uniform vec2 texel;uniform float first;void main(){vec3 c=texture2D(inputMap,vUv).rgb*.25;for(int i=0;i<4;i++){vec2 p=vec2(i==0||i==3?-1.:1.,i<2?-1.:1.);c+=texture2D(inputMap,vUv+p*texel).rgb*.1875;}if(first>.5)c=max(c-vec3(.9),vec3(0.));gl_FragColor=vec4(c,1.);}`,{inputMap:{value:null},texel:{value:new T.Vector2()},first:{value:1}});
    const meter=material(`uniform sampler2D inputMap,previous;uniform float rate,first;void main(){float lum=0.,weights=0.;for(int x=0;x<5;x++)for(int y=0;y<5;y++){vec2 uv=(vec2(float(x),float(y))+.5)/5.;vec3 c=texture2D(inputMap,uv).rgb;float w=1.-length(uv-.5);lum+=log(max(.025,dot(c,vec3(.2126,.7152,.0722))))*w;weights+=w;}float value=exp(lum/weights);float old=texture2D(previous,vec2(.5)).r;gl_FragColor=vec4(mix(old,value,first>.5?1.:rate),0.,0.,1.);}`,{inputMap:{value:target.texture},previous:{value:null},rate:{value:.02},first:{value:1}});
    const grade=material(`uniform sampler2D color,atmosphere,bloom0,bloom1,bloom2,bloom3,exposureMap;uniform vec2 resolution;uniform float aoOn,damage,lowHealth,ads,time,exposureOn;${H.glslNoise}
      vec3 film(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
      void main(){vec2 uv=vUv;vec3 c=texture2D(color,uv).rgb;vec4 fog=texture2D(atmosphere,uv);float l=dot(c,vec3(.2126,.7152,.0722));c*=mix(1.,fog.a,aoOn*(1.-smoothstep(.5,3.,l))*.8);c+=fog.rgb;
        vec3 glow=texture2D(bloom0,uv).rgb*.35+texture2D(bloom1,uv).rgb*.3+texture2D(bloom2,uv).rgb*.2+texture2D(bloom3,uv).rgb*.15;c+=glow*.13;
        float luminance=texture2D(exposureMap,vec2(.5)).r;float exposure=clamp(pow(.25/max(.025,luminance),.45),.67,1.45);c=film(c*mix(1.,exposure,exposureOn)*1.05);
        float level=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(level),c,1.08);c+=vec3(-.012,.008,.015)*(1.-level)+vec3(.015,.004,-.01)*level;
        float edge=smoothstep(.2,.75,length((uv-.5)*vec2(1.,.85)));c*=1.-edge*(.14+lowHealth*.3+ads*.08);c=mix(c,c*vec3(1.,.35,.24),damage*edge*.45);
        gl_FragColor=vec4(max(c,vec3(0)),1.);
        #include <colorspace_fragment>
        gl_FragColor.rgb+=(hHash(gl_FragCoord.xy+fract(time)*213.)-.5)*.004;
      }`,{color:common.color,atmosphere:{value:half.texture},bloom0:{value:bloom[0].texture},bloom1:{value:bloom[1].texture},bloom2:{value:bloom[2].texture},bloom3:{value:bloom[3].texture},exposureMap:{value:adapt[0].texture},resolution:common.resolution,aoOn:common.aoOn,damage:{value:0},lowHealth:{value:0},ads:{value:0},time:common.time,exposureOn:{value:hdr?1:0}});
    const final=material(`uniform sampler2D inputMap;uniform vec2 texel;uniform float time;${H.glslNoise}
      float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}void main(){vec3 nw=texture2D(inputMap,vUv+vec2(-1,-1)*texel).rgb,ne=texture2D(inputMap,vUv+vec2(1,-1)*texel).rgb,sw=texture2D(inputMap,vUv+vec2(-1,1)*texel).rgb,se=texture2D(inputMap,vUv+vec2(1,1)*texel).rgb,c=texture2D(inputMap,vUv).rgb;
        float a=lum(nw),b=lum(ne),d=lum(sw),e=lum(se),m=lum(c);vec2 dir=vec2(-((a+b)-(d+e)),(a+d)-(b+e));float reduce=max((a+b+d+e)*.03125,.0078125);dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+reduce),vec2(-6),vec2(6))*texel;
        vec3 aa=(texture2D(inputMap,vUv-dir/6.).rgb+texture2D(inputMap,vUv+dir/6.).rgb)*.5;vec3 bb=aa*.5+(texture2D(inputMap,vUv-dir*.5).rgb+texture2D(inputMap,vUv+dir*.5).rgb)*.25;float l=lum(bb);float lo=min(m,min(min(a,b),min(d,e))),hi=max(m,max(max(a,b),max(d,e)));vec3 result=l<lo||l>hi?aa:bb;gl_FragColor=vec4(mix(c,result,smoothstep(.025,.12,hi-lo)),1.);
        #include <colorspace_fragment>
        gl_FragColor.rgb+=(hHash(gl_FragCoord.xy+fract(time)*213.)-.5)*.003;
      }`,{inputMap:{value:ldr.texture},texel:{value:new T.Vector2()},time:common.time});
    let quality='medium',scale=1,samples=0,total=0,wait=3,adaptIndex=0,first=true,advanced=true,shadow=null,frameNo=0;
    const gl=renderer.getContext(),timerExt=renderer.capabilities.isWebGL2&&renderer.extensions.has('EXT_disjoint_timer_query_webgl2')?renderer.extensions.get('EXT_disjoint_timer_query_webgl2'):null,queries=[];let activeQuery=null,automatic=true;
    const diagnostics={gpuMs:null,cpuMs:0,frameMs:0,budgetSource:timerExt?'GPU 计时':'CPU 计时',mode:'HDR',scale:1,autoDrops:0,passes:0,quality:'medium',fallbackReason:null};
    function pass(m,to){quad.material=m;renderer.setRenderTarget(to);renderer.clear();renderer.render(quadScene,quadCam);diagnostics.passes++;}
    function resize(){const cap={low:850000,medium:1400000,high:2300000}[quality],ratio=Math.min(devicePixelRatio,quality==='high'?1.65:1.25),ratioCap=Math.sqrt(cap/(innerWidth*innerHeight));renderer.setPixelRatio(Math.min(ratio,ratioCap)*scale);renderer.setSize(innerWidth,innerHeight);const size=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(size.x,size.y);ldr.setSize(size.x,size.y);final.uniforms.texel.value.set(1/size.x,1/size.y);half.setSize(Math.ceil(size.x/2),Math.ceil(size.y/2));blur.setSize(half.width,half.height);common.resolution.value.copy(size);bloom.forEach((t,i)=>t.setSize(Math.max(2,Math.ceil(size.x/Math.pow(2,i+1))),Math.max(2,Math.ceil(size.y/Math.pow(2,i+1)))));diagnostics.resolution=[size.x,size.y];diagnostics.scale=scale;}
    const api={target,diagnostics,setAutomatic(value){automatic=!!value;},setSun(sun){shadow=sun;},resize,setQuality(q){quality=q;diagnostics.quality=q;common.aoOn.value=q==='low'?0:1;common.volOn.value=q==='low'?0:1;scale=1;wait=2;resize();},get quality(){return quality;},updateBudget(dt,active){if(!active||dt>.25||!automatic)return;diagnostics.frameMs=+(dt*1000).toFixed(2);wait-=dt;if(wait>0)return;total+=(diagnostics.gpuMs??diagnostics.cpuMs)/1000;samples++;if(samples<40)return;const ms=total/samples*1000;total=samples=0;let next=scale;if(ms>23)next=Math.max(.6,scale-.1);else if(ms<16.8)next=Math.min(1,scale+.05);if(next!==scale){scale=next;resize();wait=ms>23?1.5:5;}if(scale<=.6&&ms>31&&quality!=='low'){quality=quality==='high'?'medium':'low';diagnostics.autoDrops++;api.setQuality(quality);api.onAutoQuality?.(quality);}},
      render(scene,time,view,state={}){const cpuStart=performance.now();diagnostics.passes=0;frameNo++;if(timerExt){while(queries.length&&gl.getQueryParameter(queries[0],gl.QUERY_RESULT_AVAILABLE)){const q=queries.shift();if(!gl.getParameter(timerExt.GPU_DISJOINT_EXT)){const ms=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;diagnostics.gpuMs=+(diagnostics.gpuMs==null?ms:diagnostics.gpuMs*.9+ms*.1).toFixed(2);}gl.deleteQuery(q);}if(queries.length<4){activeQuery=gl.createQuery();gl.beginQuery(timerExt.TIME_ELAPSED_EXT,activeQuery);}}const savedTone=renderer.toneMapping;renderer.toneMapping=T.NoToneMapping;
        try{renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);
          if(view){renderer.clearDepth();renderer.render(view.scene,view.camera);}if(!advanced)throw Error('基础渲染模式');
          common.time.value=time;common.inverseProjection.value=camera.projectionMatrixInverse;common.inverseView.value=camera.matrixWorld;
          common.shadowOn.value=shadow?.shadow.map&&shadow.castShadow?1:0;if(common.shadowOn.value){common.shadowMap.value=shadow.shadow.map.texture;common.sunMatrix.value.copy(shadow.shadow.matrix);}
          pass(atmosphere,half);bilateral.uniforms.inputMap.value=half.texture;bilateral.uniforms.direction.value.set(1/half.width,0);pass(bilateral,blur);bilateral.uniforms.inputMap.value=blur.texture;bilateral.uniforms.direction.value.set(0,1/half.height);pass(bilateral,half);
          bloom.forEach((t,i)=>{down.uniforms.inputMap.value=i?bloom[i-1].texture:target.texture;down.uniforms.texel.value.set(1/(i?bloom[i-1].width:target.width),1/(i?bloom[i-1].height:target.height));down.uniforms.first.value=i?0:1;pass(down,t);});
          meter.uniforms.previous.value=adapt[adaptIndex].texture;meter.uniforms.first.value=first?1:0;meter.uniforms.rate.value=.03;adaptIndex=1-adaptIndex;pass(meter,adapt[adaptIndex]);first=false;grade.uniforms.exposureMap.value=adapt[adaptIndex].texture;
          grade.uniforms.damage.value=state.damage||0;grade.uniforms.lowHealth.value=state.lowHealth||0;grade.uniforms.ads.value=state.ads||0;pass(grade,ldr);pass(final,null);diagnostics.mode=hdr?'HDR / 自适应曝光':'LDR / 兼容模式';
        }catch(error){if(advanced){diagnostics.fallbackReason=String(error);console.error('后处理降级：',error);advanced=false;}renderer.setRenderTarget(null);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.clear();renderer.render(scene,camera);if(view){renderer.clearDepth();renderer.render(view.scene,view.camera);}diagnostics.mode='基础渲染';}
        finally{if(activeQuery){gl.endQuery(timerExt.TIME_ELAPSED_EXT);queries.push(activeQuery);activeQuery=null;}const cost=performance.now()-cpuStart;diagnostics.cpuMs=+(diagnostics.cpuMs?diagnostics.cpuMs*.9+cost*.1:cost).toFixed(2);renderer.setRenderTarget(null);renderer.toneMapping=savedTone;}
      }};resize();return api;
  };
})(window.Harbor);
