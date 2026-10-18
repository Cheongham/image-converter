import {sniffImage,isAnimated,encodedDimensions,MAX_BYTES,MAX_PIXELS,MAX_GIF_PIXELS,FORMATS} from './core.js';
import {encodeGif} from './encode-gif.js';
import encodeWebp,{init as initWebp} from '@jsquash/webp/encode.js';
import {zipSync} from 'fflate';
let wasmReady;
function supported(){if(typeof OffscreenCanvas==='undefined'||typeof createImageBitmap==='undefined')throw new Error('이 브라우저는 이미지 변환 기능을 지원하지 않아요. 최신 Chrome, Edge, Firefox 또는 Safari로 열어주세요.')}
async function bitmap(file){try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch{throw new Error('이미지를 읽지 못했어요. 파일이 손상됐거나 이 브라우저에서 지원하지 않는 이미지일 수 있어요.')}}
function checkSize(w,h){if(!w||!h||w*h>MAX_PIXELS||w>16384||h>16384)throw new Error('이미지는 최대 2,500만 화소, 한 변 16,384px까지 지원해요.')}
async function inspect(file){
 supported();if(file.size>MAX_BYTES)throw new Error('파일당 최대 30MB까지 지원해요.');if(!file.size)throw new Error('비어 있는 파일이에요. 다른 이미지를 선택해주세요.');
 const bytes=new Uint8Array(await file.arrayBuffer()),format=sniffImage(bytes),animated=isAnimated(bytes,format);const dimensions=encodedDimensions(bytes,format);if(dimensions)checkSize(dimensions.width,dimensions.height);const image=await bitmap(file);
 try{checkSize(image.width,image.height);const scale=Math.min(1,96/image.width,96/image.height),canvas=new OffscreenCanvas(Math.max(1,Math.round(image.width*scale)),Math.max(1,Math.round(image.height*scale)));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return {format,animated,width:image.width,height:image.height,thumbnail:await canvas.convertToBlob({type:'image/png'})}}
 finally{image.close()}
}
async function convert({file,info,target,quality,background,forceWasm=false}){
 supported();if(!FORMATS[target])throw new Error('지원하지 않는 출력 형식이에요.');
 if(info.format===target)return {buffer:await file.arrayBuffer(),mime:FORMATS[target].mime,passthrough:true,animated:info.animated};
 const image=await bitmap(file);
 try{
  checkSize(image.width,image.height);
  if(target==='gif'&&image.width*image.height>MAX_GIF_PIXELS)throw new Error('GIF 변환은 최대 800만 화소까지 지원해요. 작은 이미지 또는 다른 형식을 선택해주세요.');
  const canvas=new OffscreenCanvas(image.width,image.height),ctx=canvas.getContext('2d',{willReadFrequently:target==='gif'||target==='webp'});
  if(target==='jpg'){ctx.fillStyle=/^#[0-9a-f]{6}$/i.test(background)?background:'#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height)}
  ctx.drawImage(image,0,0);
  if(target==='gif'){const bytes=encodeGif(ctx.getImageData(0,0,canvas.width,canvas.height));return {buffer:bytes.buffer,mime:'image/gif',passthrough:false,animated:false}}
  const mime=FORMATS[target].mime;
  if(!forceWasm){let blob;try{blob=await canvas.convertToBlob({type:mime,quality:Math.min(1,Math.max(.1,quality/100))})}catch(e){if(target!=='webp')throw e}if(blob?.type===mime)return {buffer:await blob.arrayBuffer(),mime,passthrough:false,animated:false}}
  if(target==='webp'){
   wasmReady??=initWebp({locateFile:path=>new URL('./'+path,import.meta.url).href});await wasmReady;
   const buffer=await encodeWebp(ctx.getImageData(0,0,canvas.width,canvas.height),{quality,method:4});
   return {buffer,mime:'image/webp',passthrough:false,animated:false};
  }
  throw new Error(`${FORMATS[target].label} 저장을 지원하지 않는 브라우저예요. 다른 형식이나 최신 브라우저를 사용해주세요.`);
 }finally{image.close()}
}
async function archive(files){const entries={};for(const {name,blob} of files)entries[name]=new Uint8Array(await blob.arrayBuffer());const bytes=zipSync(entries,{level:0});return {buffer:bytes.buffer,mime:'application/zip'}}
self.onmessage=async({data})=>{const {id,action,payload}=data;try{const result=action==='inspect'?await inspect(payload.file):action==='convert'?await convert(payload):action==='zip'?await archive(payload.files):null;if(!result)throw new Error('알 수 없는 요청이에요.');self.postMessage({id,ok:true,result},result.buffer?[result.buffer]:[])}catch(e){self.postMessage({id,ok:false,error:e?.message||'처리 중 문제가 발생했어요. 다시 시도해주세요.'})}};
