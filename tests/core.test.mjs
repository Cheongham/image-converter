import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sniffImage,isAnimated,encodedDimensions,assertBatchCapacity,outputFilename} from '../src/core.js';
import {encodeGif} from '../src/encode-gif.js';
const file=name=>new Uint8Array(readFileSync(new URL('./fixtures/'+name,import.meta.url)));
for(const [name,format,width,height] of [['transparent.png','png',120,80],['photo.jpg','jpg',120,80],['animated.gif','gif',80,60],['transparent.webp','webp',120,80]]){
 test('실제 파일 시그니처와 크기: '+name,()=>{const b=file(name);assert.equal(sniffImage(b),format);assert.deepEqual(encodedDimensions(b,format),{width,height})});
}
test('파일명 확장자를 믿지 않고 실제 바이트를 판정한다',()=>{assert.equal(sniffImage(file('photo.jpg')),'jpg');assert.throws(()=>sniffImage(new TextEncoder().encode('<svg>fake.png</svg>')))});
test('GIF와 WEBP 애니메이션 감지',()=>{assert.equal(isAnimated(file('animated.gif'),'gif'),true);assert.equal(isAnimated(file('animated.webp'),'webp'),true);assert.equal(isAnimated(file('transparent.webp'),'webp'),false);assert.equal(isAnimated(file('transparent.png'),'png'),false)});
test('손상되거나 잘린 데이터도 감지기에서 범위 밖을 읽지 않는다',()=>{for(const format of ['gif','webp','png','jpg'])for(let i=0;i<24;i++)assert.doesNotThrow(()=>{isAnimated(new Uint8Array(i),format);encodedDimensions(new Uint8Array(i),format)})});
test('최대 10개, 추가 시 남은 자리도 검사한다',()=>{assert.doesNotThrow(()=>assertBatchCapacity(0,10));assert.doesNotThrow(()=>assertBatchCapacity(9,1));assert.throws(()=>assertBatchCapacity(0,11),/최대 10개/);assert.throws(()=>assertBatchCapacity(9,2));assert.throws(()=>assertBatchCapacity(10,1))});
test('한글 파일명, 중복 이름, 대소문자 충돌을 안전하게 처리한다',()=>{const used=new Set();assert.equal(outputFilename('사진.png','jpg',used),'사진-converted.jpg');assert.equal(outputFilename('사진.webp','jpg',used),'사진-converted-2.jpg');assert.equal(outputFilename('PHOTO.png','webp',used),'PHOTO-converted.webp');assert.equal(outputFilename('photo.jpg','webp',used),'photo-converted-2.webp')});
test('ZIP 경로 탈출과 Windows 예약 이름을 피한다',()=>{const name=outputFilename('../../CON.png','png');assert(!name.includes('/'));assert(!name.includes('\\'));assert(!name.startsWith('.'));assert(outputFilename('NUL.png','jpg').startsWith('image_'));assert(outputFilename('...','png').startsWith('image-'))});
test('투명 이미지에서 실제 GIF89a 데이터를 생성한다',()=>{const bytes=encodeGif({data:new Uint8ClampedArray([255,0,0,255,0,0,0,0]),width:2,height:1});assert.equal(new TextDecoder().decode(bytes.subarray(0,6)),'GIF89a');assert.equal(bytes[bytes.length-1],0x3B);assert.deepEqual(encodedDimensions(bytes,'gif'),{width:2,height:1});assert.equal(isAnimated(bytes,'gif'),false)});
