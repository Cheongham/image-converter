export const MAX_FILES=10;
export const MAX_BYTES=30*1024*1024;
export const MAX_PIXELS=25_000_000;
export const MAX_GIF_PIXELS=8_000_000;
export const FORMATS={jpg:{label:'JPG',mime:'image/jpeg'},png:{label:'PNG',mime:'image/png'},webp:{label:'WEBP',mime:'image/webp'},gif:{label:'GIF',mime:'image/gif'}};
export function sniffImage(b){
 const ascii=(a,n)=>String.fromCharCode(...b.subarray(a,a+n));
 if(b.length>=8&&b[0]===137&&ascii(1,3)==='PNG'&&b[4]===13&&b[5]===10&&b[6]===26&&b[7]===10)return 'png';
 if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return 'jpg';
 if(b.length>=6&&['GIF87a','GIF89a'].includes(ascii(0,6)))return 'gif';
 if(b.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP')return 'webp';
 throw new Error('GIF, JPG, PNG, WEBP 이미지 파일만 추가할 수 있어요.');
}
export function isAnimated(bytes,format){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const text=(p,n)=>String.fromCharCode(...bytes.subarray(p,p+n));
 if(format==='webp'){
  for(let p=12;p+8<=bytes.length;){const kind=text(p,4),size=view.getUint32(p+4,true);if(kind==='ANIM'||kind==='ANMF')return true;if(size>bytes.length-p-8)break;p+=8+size+(size%2)}return false;
 }
 if(format==='png'){
  for(let p=8;p+12<=bytes.length;){const size=view.getUint32(p),kind=text(p+4,4);if(kind==='acTL')return true;if(size>bytes.length-p-12)break;p+=12+size}return false;
 }
 if(format!=='gif'||bytes.length<13)return false;
 let p=13+(bytes[10]&128?3*(2**((bytes[10]&7)+1)):0),frames=0;
 const skip=()=>{while(p<bytes.length){const n=bytes[p++];if(n===0)return;p+=n}};
 while(p<bytes.length){const kind=bytes[p++];if(kind===59)break;if(kind===33){p++;skip()}else if(kind===44){if(p+9>bytes.length)break;const packed=bytes[p+8];p+=9;if(packed&128)p+=3*(2**((packed&7)+1));p++;skip();if(++frames>1)return true}else break}
 return false;
}
export function assertBatchCapacity(current,added){
 if(current+added>MAX_FILES)throw new Error(`최대 ${MAX_FILES}개까지 추가할 수 있어요. 현재 ${current}개가 있어 ${MAX_FILES-current}개까지 더 추가할 수 있습니다. 선택한 파일은 추가되지 않았어요.`);
}
export function outputFilename(name,format,used=new Set()){
 let stem=name.replace(/\.[^.]*$/,'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/^[. ]+|[. ]+$/g,'').slice(0,110)||'image';
 // Avoid reserved Windows device filenames, including when followed by another dot.
 if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem))stem='image_'+stem;
 let candidate=`${stem}-converted.${format}`,n=2;
 while(used.has(candidate.toLocaleLowerCase()))candidate=`${stem}-converted-${n++}.${format}`;
 used.add(candidate.toLocaleLowerCase());return candidate;
}
export function humanBytes(n){if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;return `${(n/1024/1024).toFixed(2)} MB`}

export function encodedDimensions(b,format){
 const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 if(format==='png'&&b.length>=24)return {width:v.getUint32(16),height:v.getUint32(20)};
 if(format==='gif'&&b.length>=10)return {width:v.getUint16(6,true),height:v.getUint16(8,true)};
 if(format==='jpg'){
  let p=2;
  while(p+4<=b.length){if(b[p++]!==255)break;while(p<b.length&&b[p]===255)p++;const m=b[p++];if(m===0xDA||m===0xD9)break;if(m===0x01||(m>=0xD0&&m<=0xD8))continue;if(p+2>b.length)break;const len=v.getUint16(p);if(len<2||p+len>b.length)break;if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(m)&&len>=7)return {width:v.getUint16(p+5),height:v.getUint16(p+3)};p+=len}
 }
 if(format==='webp'){
  for(let p=12;p+8<=b.length;){const kind=String.fromCharCode(...b.subarray(p,p+4)),len=v.getUint32(p+4,true),d=p+8;if(len>b.length-d)break;
   if(kind==='VP8X'&&len>=10)return {width:1+b[d+4]+256*b[d+5]+65536*b[d+6],height:1+b[d+7]+256*b[d+8]+65536*b[d+9]};
   if(kind==='VP8L'&&len>=5&&b[d]===0x2F){const n=v.getUint32(d+1,true);return {width:(n&0x3FFF)+1,height:((n>>>14)&0x3FFF)+1}}
   if(kind==='VP8 '&&len>=10&&b[d+3]===0x9D&&b[d+4]===0x01&&b[d+5]===0x2A)return {width:v.getUint16(d+6,true)&0x3FFF,height:v.getUint16(d+8,true)&0x3FFF};p+=8+len+(len%2)
  }
 }
 return null;
}
