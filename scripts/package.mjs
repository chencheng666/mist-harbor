// 合成无需网络和本地服务器的单文件试玩版本。
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
let html = await readFile(path.join(dist, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="style.css">', `<style>${await readFile(path.join(dist, 'style.css'), 'utf8')}</style>`);
const embedded = {};
const manifest = JSON.parse(await readFile(path.join(dist,'assets/materials/sources.json'),'utf8'));
for (const item of manifest) embedded[item.file.replace(/\.jpg$/, '')] = 'data:image/jpeg;base64,' + (await readFile(path.join(dist,'assets/materials',item.file))).toString('base64');
html = html.replace('<script src="art.js"></script>', () => `<script>window.HARBOR_EMBEDDED_ASSETS=${JSON.stringify(embedded)};</script><script src="art.js"></script>`);
for (const file of ['vendor/three.min.js', 'art.js', 'world.js', 'weapon.js', 'rifle.js', 'game.js']) {
  const code = (await readFile(path.join(dist, file), 'utf8')).replace(/<\/script/gi, '<\\/script');
  html = html.replace(`<script src="${file}"></script>`, () => `<script>${code}</script>`);
}
const license = await readFile(path.join(dist, 'vendor/THREE-LICENSE.txt'), 'utf8');
html = html.replace('<html lang="zh-CN">', `<html lang="zh-CN">\n<!-- 第三方 Three.js，MIT 许可证：\n${license}\n-->`);
const output = path.join(root, '雾港-直接打开.html');
await writeFile(output, html);
console.log(`已生成离线试玩文件：${output}`);
