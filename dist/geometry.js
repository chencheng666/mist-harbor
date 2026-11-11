/* 静态子部件按材质合并；运动部件和独立碰撞面保留各自的变换。 */
(function(H){
  'use strict';const T=THREE;
  H.mergeParts=function(parent){const groups=new Map(),removed=[];for(const mesh of [...parent.children]){if(!mesh.isMesh||mesh.userData.noMerge||Array.isArray(mesh.material)||mesh.material.transparent)continue;const key=mesh.material.uuid+'|'+!!mesh.userData.weak;if(!groups.has(key))groups.set(key,{material:mesh.material,weak:!!mesh.userData.weak,geos:[]});mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrix);groups.get(key).geos.push(g);removed.push(mesh);}
    for(const group of groups.values()){const attributes=['position','normal','uv'],g=new T.BufferGeometry();for(const name of attributes){const size=name==='uv'?2:3,length=group.geos.reduce((n,x)=>n+x.attributes.position.count*size,0),array=new Float32Array(length);let offset=0;for(const source of group.geos){const attr=source.attributes[name],count=source.attributes.position.count;if(attr)array.set(attr.array,offset);offset+=count*size;}g.setAttribute(name,new T.BufferAttribute(array,size));}const mesh=new T.Mesh(g,group.material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.weak=group.weak;parent.add(mesh);group.geos.forEach(g=>g.dispose());}
    removed.forEach(o=>{parent.remove(o);o.geometry.dispose();});
  };
})(window.Harbor);
