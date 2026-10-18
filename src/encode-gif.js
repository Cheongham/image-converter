import * as gifenc from 'gifenc';
const {GIFEncoder,quantize,applyPalette}=gifenc.default?.GIFEncoder?gifenc.default:gifenc;
export function encodeGif(image){
 const {data,width,height}=image;let transparent=false;
 for(let i=3;i<data.length;i+=4)if(data[i]<128){transparent=true;break}
 const palette=quantize(data,transparent?255:256,{format:'rgb565'});
 const indices=applyPalette(data,palette,'rgb565');
 let transparentIndex=0;
 if(transparent){transparentIndex=palette.length;palette.push([0,0,0]);for(let i=0;i<indices.length;i++)if(data[i*4+3]<128)indices[i]=transparentIndex}
 const gif=GIFEncoder();gif.writeFrame(indices,width,height,{palette,transparent,transparentIndex,repeat:-1});gif.finish();return gif.bytes();
}
