import {dishIllustrations} from './dish-illustrations.js';

// Explicit cooked-dish assets: never assemble the raw pantry icons into a meal.
export function dishArt(recipe){
  const art=dishIllustrations[recipe.illustrationId||recipe.id];
  if(!art&&recipe.source==='ai'){
    const box=document.createElement('span');box.className='finished-dish text-recipe-art';box.setAttribute('aria-label','AI文字食谱，暂无对应插图');box.setAttribute('role','img');
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 100 70');icon.setAttribute('aria-hidden','true');
    icon.innerHTML='<path d="M50 16c-13-8-26-9-39-5v47c13-4 26-3 39 5 13-8 26-9 39-5V11c-13-4-26-3-39 5Z" fill="#ead9b8" stroke="#aa8262" stroke-width="2"/><path d="M50 16v47M23 24l15 3M23 34l15 3M62 27l15-3M62 37l15-3" stroke="#aa8262" stroke-width="2" fill="none"/>';
    const label=document.createElement('span');label.textContent='AI 文字食谱';box.append(icon,label);return box;
  }
  if(!art)throw new Error(`Missing finished illustration: ${recipe.id}`);
  const frame=document.createElement('span');
  frame.className='finished-dish';
  frame.setAttribute('role','img');
  frame.setAttribute('aria-label',`${recipe.name}成品插画`);
  const image=document.createElement('span');
  image.className='finished-dish-image';
  const [x,y,w,h]=art.box;
  image.style.backgroundImage=`url('${art.src}')`;
  image.style.backgroundSize=`${art.width/w*100}% ${art.height/h*100}%`;
  image.style.backgroundPosition=`${x/(art.width-w)*100}% ${y/(art.height-h)*100}%`;
  image.style.aspectRatio=`${w} / ${h}`;
  image.style.width=`${Math.min(100,100*w/h)}%`;
  frame.append(image);
  return frame;
}
