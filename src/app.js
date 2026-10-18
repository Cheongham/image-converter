import {MAX_FILES,MAX_BYTES,FORMATS,assertBatchCapacity,outputFilename,humanBytes} from './core.js';
const $=id=>document.getElementById(id),rows=[];let worker=null,rpcId=0,rowId=0,busy=false,cancelled=false,zipUrl=null,lastFocus=null;const pending=new Map();
function resetWorker(reason='작업이 취소됐어요.'){
 if(worker)worker.terminate();worker=null;for(const request of pending.values()){clearTimeout(request.timer);request.reject(new Error(reason))}pending.clear();
}
function ensureWorker(){
 if(worker)return worker;
 worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
 worker.onmessage=({data})=>{const request=pending.get(data.id);if(!request)return;clearTimeout(request.timer);pending.delete(data.id);data.ok?request.resolve(data.result):request.reject(new Error(data.error))};
 worker.onerror=e=>{e.preventDefault();resetWorker('변환 기능을 실행하지 못했어요. 페이지를 새로고침하거나 최신 브라우저에서 다시 시도해주세요.')};return worker;
}
function rpc(action,payload){return new Promise((resolve,reject)=>{try{const id=++rpcId;const timer=setTimeout(()=>resetWorker('처리 시간이 너무 길어 중단했어요. 더 작은 이미지로 다시 시도해주세요.'),120000);pending.set(id,{resolve,reject,timer});ensureWorker().postMessage({id,action,payload})}catch(e){resetWorker();reject(e)}})}
function notice(message,kind='info'){$('notice').textContent=message;$('notice').dataset.kind=kind;$('notice').hidden=!message}
function revokeResults(){if(zipUrl){URL.revokeObjectURL(zipUrl);zipUrl=null}for(const row of rows){if(row.url)URL.revokeObjectURL(row.url);row.url=null;row.blob=null;row.outputName=null;row.note=null;if(row.info)row.status='ready'}$('summary').hidden=true;update()}
function settings(){return {target:document.querySelector('input[name="format"]:checked').value,quality:Number($('quality').value),background:$('background').value}}
function syncSettings(){const {target}=settings();$('quality-setting').hidden=!['jpg','webp'].includes(target);$('background-setting').hidden=target!=='jpg';const messages={jpg:'투명한 부분은 선택한 배경색으로 채웁니다. 사진에 적합해요.',png:'투명도를 유지하는 무손실 형식입니다. 로고와 스크린샷에 적합해요.',webp:'투명도를 지원하는 웹용 이미지입니다. 품질에 따라 용량이 달라져요.',gif:'최대 256색과 단색 투명도를 지원합니다. 사진의 색상이나 부드러운 경계가 달라질 수 있어요.'};$('format-help').textContent=messages[target];$('target-label').textContent=FORMATS[target].label;$('quality-value').textContent=$('quality').value+'%';$('background-value').textContent=$('background').value.toUpperCase();update()}
function update(){
 const ready=rows.filter(r=>r.info),done=rows.filter(r=>r.status==='done');$('count').textContent=`${rows.length} / ${MAX_FILES}`;$('empty-state').hidden=rows.length>0;$('file-list').hidden=!rows.length;$('queue-head').hidden=!rows.length;
 $('add-files').disabled=busy||rows.length>=MAX_FILES;$('pick-files').disabled=busy||rows.length>=MAX_FILES||location.protocol==='file:';$('file-input').disabled=busy||location.protocol==='file:';$('clear-all').disabled=busy||!rows.length;$('convert').disabled=busy||!ready.length;$('zip-download').disabled=busy||!done.length;$('cancel').hidden=!busy;
 $('settings-fields').disabled=busy;$('dropzone').classList.toggle('locked',busy);$('dropzone').setAttribute('aria-disabled',String(busy));$('convert-label').textContent=done.length===rows.length&&rows.length?'다시 변환하기':'이미지 변환하기';$('zip-label').textContent=done.length?`전체 다운로드 (${done.length}개 · ZIP)`:'전체 다운로드 (ZIP)';
 if(!busy)$('progress-wrap').hidden=true;
 renderRows();
}
function renderRows(){
 const target=settings().target;$('file-list').replaceChildren();
 for(const row of rows){const li=document.createElement('li');li.className='file-row';li.dataset.id=row.id;li.dataset.state=row.status;
 const thumb=document.createElement('div');thumb.className='thumbnail';if(row.thumb){const img=document.createElement('img');img.src=row.thumb;img.alt='';thumb.append(img)}else{thumb.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="m3 17 6-6 4 4 3-3 5 5"/><circle cx="16" cy="8" r="1.5"/></svg>'}li.append(thumb);
 const details=document.createElement('div');details.className='file-details';const name=document.createElement('strong');name.className='file-name';name.textContent=row.file.name;name.title=row.file.name;details.append(name);
 const meta=document.createElement('div');meta.className='file-meta';meta.textContent=row.info?`${FORMATS[row.info.format].label} · ${row.info.width.toLocaleString()} × ${row.info.height.toLocaleString()} · ${humanBytes(row.file.size)}`:humanBytes(row.file.size);details.append(meta);
 const status=document.createElement('div');status.className='file-status';if(row.status==='loading')status.textContent='이미지 확인 중…';else if(row.status==='converting')status.textContent='변환 중…';else if(row.status==='error'){status.textContent=row.error;status.classList.add('error-text')}else if(row.status==='done'){status.textContent=`${FORMATS[target].label} · ${humanBytes(row.blob.size)} · ${row.note}`;status.classList.add('success-text')}else if(row.info?.animated){status.textContent=row.info.format===target?'움직이는 이미지 · 같은 형식은 애니메이션을 유지합니다':'움직이는 이미지 · 다른 형식으로 변환하면 첫 프레임만 저장합니다';status.classList.add('animation-note')}else status.textContent='변환 준비 완료';details.append(status);li.append(details);
 const actions=document.createElement('div');actions.className='file-actions';if(row.status==='done'){const a=document.createElement('a');a.href=row.url;a.download=row.outputName;a.className='download-one';a.textContent='다운로드';a.setAttribute('aria-label',row.outputName+' 다운로드');actions.append(a)}
 const remove=document.createElement('button');remove.type='button';remove.className='remove-file';remove.textContent='×';remove.title='목록에서 제거';remove.setAttribute('aria-label',row.file.name+' 제거');remove.disabled=busy;remove.onclick=()=>{if(row.url)URL.revokeObjectURL(row.url);if(row.thumb)URL.revokeObjectURL(row.thumb);rows.splice(rows.indexOf(row),1);if(zipUrl){URL.revokeObjectURL(zipUrl);zipUrl=null}$('summary').hidden=true;update()};actions.append(remove);li.append(actions);$('file-list').append(li)
 }
}
async function addFiles(input){
 if(busy){notice('현재 작업이 끝난 후 이미지를 추가해주세요.');return}
 const files=Array.from(input);if(!files.length)return;
 try{assertBatchCapacity(rows.length,files.length)}catch(e){notice(e.message,'error');return}
 notice('');busy=true;cancelled=false;lastFocus=document.activeElement;update();let accepted=0,rejected=0;const errors=[];
 try{for(const file of files){if(cancelled)break;if(file.size>MAX_BYTES){rejected++;errors.push(`${file.name}: 파일당 최대 30MB까지 지원해요.`);continue}
  const row={id:++rowId,file,status:'loading'};rows.push(row);update();try{row.info=await rpc('inspect',{file});row.thumb=URL.createObjectURL(row.info.thumbnail);delete row.info.thumbnail;row.status='ready';accepted++}catch(e){if(cancelled){rows.splice(rows.indexOf(row),1);break}rejected++;rows.splice(rows.indexOf(row),1);errors.push(`${file.name}: ${e.message}`)}update()
 }}finally{busy=false;update();if(cancelled)notice('파일 추가를 중단했어요. 확인이 끝난 파일은 목록에 남아 있습니다.');else if(rejected)notice(`${accepted}개 추가, ${rejected}개 제외했어요.\n${errors.slice(0,3).join('\n')}${errors.length>3?'\n나머지 파일도 형식과 크기를 확인해주세요.':''}`,'error');else if(accepted)notice(`${accepted}개 이미지를 추가했어요. 원하는 형식을 선택하고 변환해주세요.`);if(lastFocus?.isConnected&&!lastFocus.disabled)lastFocus.focus({preventScroll:true})}
}
async function convertAll(){
 if(busy||!rows.length)return;notice('');const config=settings();revokeResults();busy=true;cancelled=false;lastFocus=document.activeElement;update();$('progress-wrap').hidden=false;$('summary').hidden=true;const usedNames=new Set();let completed=0,failed=0;
 try{for(let index=0;index<rows.length;index++){if(cancelled)break;const row=rows[index];row.status='converting';update();$('progress-wrap').hidden=false;$('progress').value=index/rows.length*100;$('progress-label').textContent=`${index+1} / ${rows.length} · ${row.file.name} 변환 중`;
  try{const result=await rpc('convert',{file:row.file,info:row.info,...config});row.blob=new Blob([result.buffer],{type:result.mime});row.outputName=outputFilename(row.file.name,config.target,usedNames);row.url=URL.createObjectURL(row.blob);row.status='done';row.note=result.passthrough?'동일 형식 · 원본 유지':row.info.animated?'첫 프레임 저장':'변환 완료';completed++}catch(e){if(cancelled){row.status='ready';break}row.status='error';row.error=e.message;failed++}
  update();$('progress-wrap').hidden=false;$('progress').value=(index+1)/rows.length*100;
 }}finally{busy=false;for(const row of rows)if(row.status==='converting')row.status='ready';update();const done=rows.filter(r=>r.status==='done');if(done.length){const before=done.reduce((n,r)=>n+r.file.size,0),after=done.reduce((n,r)=>n+r.blob.size,0),change=((after-before)/before*100);$('summary').hidden=false;$('summary-title').textContent=`${done.length}개 이미지가 준비됐어요`;$('summary-text').textContent=`${humanBytes(before)} → ${humanBytes(after)}${Math.abs(change)<.05?' · 원본과 같은 용량':` · ${Math.abs(change).toFixed(1)}% ${change<0?'감소':'증가'}`}. 파일별로 저장하거나 ZIP으로 한 번에 내려받으세요.`}notice(cancelled?`변환을 중단했어요. 완료된 ${completed}개 파일은 다운로드할 수 있습니다.`:failed?`${completed}개 완료, ${failed}개 실패했어요. 파일별 오류를 확인하고 다시 시도해주세요.`:`${completed}개 이미지 변환이 끝났어요.`,failed?'error':'success');if(lastFocus?.isConnected&&!lastFocus.disabled)lastFocus.focus({preventScroll:true})}
}
function download(url,name){const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove()}
async function downloadZip(){if(busy)return;const done=rows.filter(r=>r.status==='done');if(!done.length)return;if(zipUrl){download(zipUrl,'vasnuri-images.zip');return}busy=true;cancelled=false;update();$('zip-label').textContent='ZIP 파일 준비 중…';try{const result=await rpc('zip',{files:done.map(r=>({name:r.outputName,blob:r.blob}))});zipUrl=URL.createObjectURL(new Blob([result.buffer],{type:'application/zip'}));download(zipUrl,'vasnuri-images.zip');notice('ZIP 파일을 준비했어요. 다운로드가 시작되지 않았다면 전체 다운로드를 다시 눌러주세요.','success')}catch(e){notice(cancelled?'ZIP 생성을 중단했어요.':e.message,'error')}finally{busy=false;update()}}
$('file-input').onchange=e=>{const files=Array.from(e.target.files);e.target.value='';addFiles(files)};
$('add-files').onclick=()=>$('file-input').click();$('pick-files').onclick=()=>$('file-input').click();
let dragDepth=0;document.addEventListener('dragover',e=>e.preventDefault());document.addEventListener('drop',e=>e.preventDefault());
$('dropzone').ondragenter=e=>{e.preventDefault();dragDepth++;if(!busy)$('dropzone').classList.add('dragover')};$('dropzone').ondragleave=e=>{e.preventDefault();if(--dragDepth<=0){dragDepth=0;$('dropzone').classList.remove('dragover')}};$('dropzone').ondrop=e=>{e.preventDefault();dragDepth=0;$('dropzone').classList.remove('dragover');addFiles(e.dataTransfer.files)};
$('clear-all').onclick=()=>{for(const row of rows){if(row.url)URL.revokeObjectURL(row.url);if(row.thumb)URL.revokeObjectURL(row.thumb)}rows.length=0;if(zipUrl)URL.revokeObjectURL(zipUrl);zipUrl=null;$('summary').hidden=true;notice('');update()};
$('convert').onclick=convertAll;$('zip-download').onclick=downloadZip;$('cancel').onclick=()=>{cancelled=true;resetWorker()};
for(const radio of document.querySelectorAll('input[name="format"]'))radio.onchange=()=>{revokeResults();syncSettings();notice('출력 형식이 바뀌었어요. 다시 변환하면 새 형식으로 저장됩니다.')};
$('quality').oninput=()=>{revokeResults();syncSettings()};$('background').oninput=()=>{revokeResults();syncSettings()};
window.addEventListener('pagehide',event=>{if(event.persisted)return;resetWorker();for(const row of rows){if(row.url)URL.revokeObjectURL(row.url);if(row.thumb)URL.revokeObjectURL(row.thumb)}if(zipUrl)URL.revokeObjectURL(zipUrl)});
if(location.protocol==='file:'){notice('이 도구는 웹 주소에서 실행해주세요. 케미클라우드에 업로드하거나 로컬 서버로 열면 이미지 변환이 동작합니다.','error');$('pick-files').disabled=true;$('file-input').disabled=true}
syncSettings();update();
