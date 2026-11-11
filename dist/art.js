/* 画质资源：本地 PBR 材质、环境反射与统一后处理。 */
window.Harbor = window.Harbor || {};
(function (H) {
  'use strict';
  const T = THREE;
  H.createArt = function (renderer) {
    const manager = new T.LoadingManager(), loader = new T.TextureLoader(manager), maps = {}, failed = [];
    const art = { ready: false, maps, failed };
    manager.onLoad = () => art.ready = true;
    manager.onError = url => failed.push(url.split('/').pop());
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    for (const name of ['asphalt_02_color', 'asphalt_02_normal', 'asphalt_02_roughness', 'rusty_painted_metal_color', 'rusty_painted_metal_normal', 'rusty_painted_metal_roughness', 'metal_plate_normal', 'metal_plate_roughness']) {
      const url = window.HARBOR_EMBEDDED_ASSETS?.[name] || `assets/materials/${name}.jpg`;
      const tex = loader.load(url); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.anisotropy = anisotropy;
      if (name.endsWith('_color')) tex.colorSpace = T.SRGBColorSpace;
      maps[name] = tex;
    }
    art.texture = (name, x = 1, y = x) => { const tex = maps[name].clone(); tex.repeat.set(x, y); return tex; };
    // 环境亮度参与真实金属的高光与粗糙反射，避免黑色机匣成为一片死黑。
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const ctx = c.getContext('2d');
    const sky = ctx.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, '#527389'); sky.addColorStop(.4, '#93a8af'); sky.addColorStop(.49, '#dbbe92'); sky.addColorStop(.54, '#39464a'); sky.addColorStop(1, '#131b20'); ctx.fillStyle = sky; ctx.fillRect(0, 0, 1024, 512);
    const glow = ctx.createRadialGradient(700, 218, 1, 700, 218, 105); glow.addColorStop(0, '#fff4d4'); glow.addColorStop(.06, '#ffe4b5'); glow.addColorStop(.35, '#ddbd8499'); glow.addColorStop(1, '#cead6900'); ctx.fillStyle = glow; ctx.fillRect(0, 0, 1024, 512);
    const env = new T.CanvasTexture(c); env.colorSpace = T.SRGBColorSpace; env.mapping = T.EquirectangularReflectionMapping;
    const pmrem = new T.PMREMGenerator(renderer); art.environment = pmrem.fromEquirectangular(env).texture; env.dispose(); pmrem.dispose();
    return art;
  };
  H.createPost = function (renderer, camera) {
    const target = new T.WebGLRenderTarget(1, 1, { type: renderer.extensions.has('EXT_color_buffer_float') ? T.HalfFloatType : T.UnsignedByteType, minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: true });
    target.depthTexture = new T.DepthTexture(1, 1, T.UnsignedIntType);
    const uniforms = { tColor: { value: target.texture }, tDepth: { value: target.depthTexture }, resolution: { value: new T.Vector2() }, inverseProjection: { value: camera.projectionMatrixInverse }, time: { value: 0 }, aoStrength: { value: .55 }, bloomStrength: { value: .12 } };
    const material = new T.ShaderMaterial({ uniforms, depthTest: false, depthWrite: false, extensions: {derivatives:true},
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: `varying vec2 vUv;uniform sampler2D tColor,tDepth;uniform vec2 resolution;uniform mat4 inverseProjection;uniform float time,aoStrength,bloomStrength;
      vec3 positionAt(vec2 uv){float d=texture2D(tDepth,uv).x;vec4 p=inverseProjection*vec4(uv*2.-1.,d*2.-1.,1.);return p.xyz/p.w;}
      float random(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){vec3 c=texture2D(tColor,vUv).rgb;float depth=texture2D(tDepth,vUv).x;
      if(depth<.99995&&aoStrength>0.){vec3 p=positionAt(vUv);vec3 dx=dFdx(p),dy=dFdy(p);vec3 n=normalize(cross(dx,dy));if(dot(n,-p)<0.)n=-n;float ao=0.;float radius=clamp(210./max(1.,-p.z),2.,26.);for(int i=0;i<8;i++){float a=float(i)*2.39996;vec2 uv=vUv+vec2(cos(a),sin(a))*radius*(.45+float(i)*.07)/resolution;vec3 delta=positionAt(uv)-p;float distance=length(delta);ao+=max(0.,dot(n,delta/max(.001,distance))-.1)*smoothstep(1.4,.06,distance);}c*=1.-clamp(ao*.24*aoStrength,0.,.38);}
      vec3 bloom=vec3(0.);for(int i=0;i<8;i++){float a=float(i)*.785398;vec3 sampleColor=texture2D(tColor,vUv+vec2(cos(a),sin(a))*3.5/resolution).rgb;bloom+=max(sampleColor-vec3(1.1),0.);}c+=bloom*bloomStrength*.125;
      float vignette=1.-smoothstep(.32,.82,length((vUv-.5)*vec2(1.,.85)));c*=mix(.82,1.,vignette);c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,.91);c+=vec3(.004,.008,.012)*(1.-clamp(c.r,0.,1.));
      gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor.rgb+=(random(gl_FragCoord.xy+fract(time)*97.)-.5)*.009;}` });
    const postScene = new T.Scene(), postCamera = new T.Camera(); postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), material));
    let quality = 'medium';
    return { target,
      resize() { const size = renderer.getDrawingBufferSize(new T.Vector2()); target.setSize(size.x, size.y); uniforms.resolution.value.copy(size); },
      setQuality(value) { quality = value; uniforms.aoStrength.value = value === 'high' ? .8 : value === 'medium' ? .5 : 0; uniforms.bloomStrength.value = value === 'low' ? .06 : .14; },
      render(scene, time) { uniforms.time.value = time; uniforms.inverseProjection.value = camera.projectionMatrixInverse; renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.clear(); renderer.render(postScene, postCamera); },
      get quality() { return quality; }
    };
  };
})(window.Harbor);
