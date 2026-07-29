import { execFileSync } from 'node:child_process';
const lum=(r,g,b)=>{const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
const ratio=(a,b)=>{const L1=lum(...a),L2=lum(...b);return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)};
// 站上的文字色（已把 alpha 疊在 ink 上算好）
const 文字 = { '巨型名字 paper':[233,228,216], '簡介 paper-64':[155,152,144], '分類 paper-38':[101,99,94] };
function 取樣(x,y,w,h){
  const out = execFileSync('ffmpeg',['-v','error','-i','check/bg1.png','-vf',`crop=${w}:${h}:${x}:${y},scale=1:1`,'-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:1e7});
  return [out[0],out[1],out[2]];
}
const 點 = [
  ['巨型名字後面',        130,410,320,90, '巨型名字 paper'],
  ['右欄簡介後面',       1050,380,330,120,'簡介 paper-64'],
  ['底部分類後面',       1060,720,300,160,'分類 paper-38'],
  ['左上角導覽後面',       60, 20,300, 60,'簡介 paper-64'],
];
console.log('位置'.padEnd(16)+'背景色'.padEnd(22)+'文字色'.padEnd(18)+'對比');
for (const [名,x,y,w,h,k] of 點){
  const bg=取樣(x,y,w,h), fg=文字[k];
  const r=ratio(fg,bg);
  console.log(名.padEnd(16)+`rgb(${bg.join(',')})`.padEnd(22)+k.padEnd(18)+r.toFixed(2)+':1  '+(r>=4.5?'✅':r>=3?'⚠️ 只夠圖形':'❌'));
}
