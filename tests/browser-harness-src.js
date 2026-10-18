import {unzipSync} from 'fflate';
const results=[];let id=0,worker;const pending=new Map();
function rpc(action,payload){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});worker.postMessage({id:n,action,payload})})}
function check(name,value,detail=''){results.push({name,passed:!!value,detail});document.getElementById('report').textContent=JSON.stringify(results,null,2);if(!value)throw new Error(name+': '+detail)}
async function load(name){const response=await fetch('./fixtures/'+name);const blob=await response.blob();return new File([blob],name,{type:blob.type})}
async function pixels(buffer,mime){const image=await createImageBitmap(new Blob([buffer],{type:mime}));const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,c.width,c.height);image.close();return data}
async function waitUntil(fn,timeout=20000){const start=performance.now();while(!fn()){if(performance.now()-start>timeout)throw new Error('UI wait timed out');await new Promise(r=>setTimeout(r,30))}}
document.getElementById('run').onclick=async()=>{const button=document.getElementById('run');button.disabled=true;results.length=0;document.getElementById('state').textContent='검증 중';
 worker=new Worker('../dist/assets/worker.js',{type:'module'});worker.onmessage=({data})=>{const job=pending.get(data.id);if(!job)return;pending.delete(data.id);data.ok?job.resolve(data.result):job.reject(new Error(data.error))};worker.onerror=e=>{for(const j of pending.values())j.reject(new Error(e.message));pending.clear()};
 try{
 const files=await Promise.all(['transparent.png','photo.jpg','animated.gif','transparent.webp'].map(load));const infos=[];for(const file of files)infos.push(await rpc('inspect',{file}));const zipFiles=[];
 for(let i=0;i<files.length;i++)for(const target of ['jpg','png','webp','gif']){
  const result=await rpc('convert',{file:files[i],info:infos[i],target,quality:85,background:'#ffffff'});const expected={jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'}[target];const image=await pixels(result.buffer,result.mime);check(`${infos[i].format} → ${target}`,result.mime===expected&&image.width===infos[i].width&&image.height===infos[i].height,`${result.mime}, ${image.width}x${image.height}, ${result.buffer.byteLength}bytes`);
  if(i===0){const a=image.data[3];check('PNG 투명 영역 → '+target,target==='jpg'?a===255&&image.data[0]>245&&image.data[1]>245&&image.data[2]>245:a===0,'alpha='+a);zipFiles.push({name:'transparent-converted.'+target,blob:new Blob([result.buffer],{type:result.mime})})}
  if(i===2&&target!=='gif'){const cx=(Math.floor(image.height/2)*image.width+Math.floor(image.width/2))*4;check('GIF 첫 프레임 → '+target,image.data[cx]>200&&image.data[cx+1]<80,Array.from(image.data.slice(cx,cx+4)).join(','))}
  if(i===2&&target==='gif'){const original=new Uint8Array(await files[i].arrayBuffer());const out=new Uint8Array(result.buffer);check('같은 GIF 원본 바이트·애니메이션 유지',out.length===original.length&&out.every((n,j)=>n===original[j]))}
 }
 const fallback=await rpc('convert',{file:files[0],info:infos[0],target:'webp',quality:82,background:'#fff',forceWasm:true});const fallbackImage=await pixels(fallback.buffer,fallback.mime);check('WEBP WASM 보조 인코더',fallback.mime==='image/webp'&&fallbackImage.width===120&&fallbackImage.data[3]===0);
 const black=await rpc('convert',{file:files[0],info:infos[0],target:'jpg',quality:90,background:'#000000'});const blackPixels=await pixels(black.buffer,black.mime);check('JPG 사용자 배경색 적용',blackPixels.data[0]<10&&blackPixels.data[1]<10&&blackPixels.data[2]<10&&blackPixels.data[3]===255);
 const header=new Uint8Array(24);header.set([137,80,78,71,13,10,26,10]);const headerView=new DataView(header.buffer);headerView.setUint32(16,30000);headerView.setUint32(20,30000);let tooLarge=false;try{await rpc('inspect',{file:new File([header],'huge.png',{type:'image/png'})})}catch(e){tooLarge=e.message.includes('2,500만')}check('거대 이미지 헤더 디코딩 전 차단',tooLarge);
 const rotated=await load('rotated.jpg');const orientation=await rpc('inspect',{file:rotated});check('JPEG EXIF 방향 자동 적용',orientation.width===20&&orientation.height===40,JSON.stringify({width:orientation.width,height:orientation.height}));
 const zip=await rpc('zip',{files:zipFiles});const entries=unzipSync(new Uint8Array(zip.buffer));check('ZIP 4개 파일 저장·무결성',Object.keys(entries).length===4&&entries['transparent-converted.gif'].length>0);
 const webp=await load('animated.webp'),webpInfo=await rpc('inspect',{file:webp});check('움직이는 WEBP 감지',webpInfo.animated===true);const staticPng=await rpc('convert',{file:webp,info:webpInfo,target:'png',quality:82,background:'#ffffff'});const first=await pixels(staticPng.buffer,staticPng.mime);check('움직이는 WEBP 첫 프레임',first.data[0]>200&&first.data[1]<80);
 let corrupt=false;try{await rpc('inspect',{file:await load('broken.png')})}catch{corrupt=true}check('손상 이미지 오류 처리',corrupt);
 const iframe=document.getElementById('app');await waitUntil(()=>iframe.contentDocument?.getElementById('pick-files'));const doc=iframe.contentDocument;
 async function feed(count){const dt=new DataTransfer();for(let i=0;i<count;i++)dt.items.add(new File([files[0]],`batch-${i}.png`,{type:'image/png'}));const input=doc.getElementById('file-input');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(r=>setTimeout(r,40))}
 await feed(11);check('실제 UI에서 11개 일괄 추가 차단',doc.querySelectorAll('.file-row').length===0&&doc.getElementById('notice').textContent.includes('최대 10개'));
 await feed(10);await waitUntil(()=>!doc.querySelector('.file-row[data-state="loading"]'));check('실제 UI에서 10개 허용',doc.querySelectorAll('.file-row').length===10&&doc.getElementById('count').textContent==='10 / 10');
 await feed(1);check('10개 이후 추가 차단',doc.querySelectorAll('.file-row').length===10);
 doc.querySelector('.remove-file').click();check('개별 제거 후 9개',doc.querySelectorAll('.file-row').length===9);await feed(1);await waitUntil(()=>!doc.querySelector('.file-row[data-state="loading"]'));check('제거한 자리로 다시 추가',doc.querySelectorAll('.file-row').length===10);
 doc.getElementById('convert').click();await waitUntil(()=>doc.querySelectorAll('.file-row[data-state="done"]').length===10);check('실제 UI 10개 일괄 변환',doc.querySelectorAll('a.download-one').length===10);
 doc.querySelector('input[value="png"]').click();check('설정 변경 시 이전 다운로드 무효화',doc.querySelectorAll('a.download-one').length===0&&doc.getElementById('zip-download').disabled);
 doc.getElementById('clear-all').click();check('전체 지우기',doc.querySelectorAll('.file-row').length===0&&doc.getElementById('convert').disabled);
 document.getElementById('state').textContent=`PASS · ${results.length}개 검증 완료`;document.getElementById('state').className='ok';
 }catch(e){document.getElementById('state').textContent='FAIL · '+e.message;document.getElementById('state').className='bad';console.error(e)}finally{worker.terminate();button.disabled=false}
};
