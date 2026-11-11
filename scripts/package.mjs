// 将程序化资源和脚本合成为无需联网的单文件试玩版。
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist');
let html=await readFile(path.join(dist,'index.html'),'utf8');
html=html.replace(/<link rel="stylesheet" href="style\.css(?:\?[^\"]*)?">/,`<style>${await readFile(path.join(dist,'style.css'),'utf8')}</style>`);
for(const file of ['vendor/three.min.js','art.js','terrain.js','world.js','geometry.js','weapon.js','rifle.js','effects.js','game.js']){
  const code=(await readFile(path.join(dist,file),'utf8')).replace(/<\/script/gi,'<\\/script');
  const escaped=file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  html=html.replace(new RegExp(`<script src="${escaped}(?:\\?[^\"]*)?"><\\/script>`),()=>`<script>${code}</script>`);
}
const license=await readFile(path.join(dist,'vendor/THREE-LICENSE.txt'),'utf8');
html=html.replace('<html lang="zh-CN">',`<html lang="zh-CN">\n<!-- 第三方 Three.js，MIT 许可证：\n${license}\n-->`);
if(/<(?:script|link)[^>]+(?:src|href)="[^\"]+\.(?:js|css)/.test(html))throw Error('离线文件仍包含外置脚本或样式');
const output=path.join(root,'雾港-直接打开.html');await writeFile(output,html);console.log(`已生成离线试玩：${output}（${Buffer.byteLength(html)} 字节）`);
