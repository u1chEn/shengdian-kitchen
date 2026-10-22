// AI-created cut-paper artwork, rendered from a 4 × 4 transparent asset atlas.
// No remote image requests. Text and all interactions remain native HTML.
const atlas=new Image();atlas.src=new URL('./assets/collage-atlas.png',import.meta.url).href;
const pending=new Map();
const cells={egg:0,tomato:1,noodles:2,potato:3,carrot:4,onion:5,rice:6,mushroom:7,greens:8,pot:9,generic:14};
function bowlCell(art){if(art.includes('tomato')&&art.includes('soup'))return 12;if(art.includes('tomato'))return 10;if(art.includes('rice'))return 13;if(art==='')return 14;return 11}
function paint(canvas,type,variant){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);const i=type==='bowl'?bowlCell(variant):cells[type]??14;const cw=atlas.naturalWidth/4,ch=atlas.naturalHeight/4;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';const sw=cw,sh=ch;const size=Math.min(canvas.width,canvas.height);ctx.drawImage(atlas,(i%4)*cw,Math.floor(i/4)*ch,sw,sh,(canvas.width-size)/2,(canvas.height-size)/2,size,size)}
export function drawSprite(canvas,type='generic',variant=''){const width=type==='pot'?384:256,height=type==='pot'?336:256;if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}if(atlas.complete&&atlas.naturalWidth){paint(canvas,type,variant);return}pending.set(canvas,[type,variant]);}
atlas.onload=()=>{for(const [c,args]of pending){if(c.isConnected)paint(c,...args)}pending.clear()};
export function sprite(type,size=32,variant=''){const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');drawSprite(canvas,type,variant);return canvas}
