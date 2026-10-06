import { useEffect, useMemo, useRef, useState } from 'react';
import { colorIndex, type Settings } from './relief';
type Pixels={data:Uint8ClampedArray;width:number;height:number};
function Thumbnail({pixels,settings}:{pixels:Pixels;settings:Settings}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current!,ctx=canvas.getContext('2d')!;
    canvas.width=pixels.width;canvas.height=pixels.height;
    const image=ctx.createImageData(pixels.width,pixels.height);
    for(let i=0;i<pixels.data.length;i+=4){
      const a=pixels.data[i+3]/255;
      let lum=(.2126*pixels.data[i]+.7152*pixels.data[i+1]+.0722*pixels.data[i+2])/255*a+1-a;
      lum=Math.max(0,Math.min(1,(lum-.5)*settings.contrast+.5));if(settings.invert)lum=1-lum;
      const layer=settings.baseLayers+Math.round(lum*(settings.layers-settings.baseLayers));
      const color=settings.colors[colorIndex(layer,settings)];
      for(let j=0;j<3;j++)image.data[i+j]=parseInt(color.slice(1+j*2,3+j*2),16);
      image.data[i+3]=255;
    }
    ctx.putImageData(image,0,0);
  },[pixels,settings]);
  return <canvas ref={ref} aria-label="Variant colour study"/>;
}
export default function Variants({pixels,settings,onApply}:{pixels:Pixels;settings:Settings;onApply:(s:Settings)=>void}){
  const [saved,setSaved]=useState<Settings>();
  const variants=useMemo(()=>[
    {name:'Earth & ember',description:'Warm tones · a lighter print',settings:{...settings,layers:16,contrast:1.2,colors:['#253d38','#bd7352','#dfb977','#f3e7cd']}},
    {name:'Coastal blue',description:'Cool tones · balanced detail',settings:{...settings,layers:32,contrast:1.1,colors:['#183744','#397c8d','#9bc9c0','#f2efda']}},
    {name:'Graphite',description:'Monochrome · more height steps',settings:{...settings,layers:48,contrast:1.4,colors:['#202326','#63696d','#b8bcba','#f2f1e9']}},
    ...(saved?[{name:'My comparison',description:'Your saved settings · this image',settings:saved}]:[])
  ],[settings,saved]);
  return <section className="variants"><div className="variants-heading"><div><div className="eyebrow">EXPLORE A DIFFERENT FEEL</div><h2>One image. More possibilities.</h2></div><button className="secondary" onClick={()=>setSaved({...settings,colors:[...settings.colors]})}>{saved?'Replace saved comparison':'Save current comparison'}</button></div><p className="section-copy">Compare colour studies and relief layer counts. Apply a design to inspect its frame and mounting in 3D.</p><div className="variant-grid">{variants.map(v=>{
    const selected=JSON.stringify(settings)===JSON.stringify(v.settings);
    return <article className={`variant ${selected?'selected':''}`} key={v.name}><div className="variant-image"><Thumbnail pixels={pixels} settings={v.settings}/></div><div className="variant-body"><h3>{v.name}</h3><p>{v.description}</p><div className="variant-meta"><span>{v.settings.layers} relief layers</span><span>{(v.settings.layers*v.settings.layerHeight).toFixed(2)} mm relief</span></div><div className="variant-colors">{v.settings.colors.map((c,i)=><i key={i} style={{background:c}}/>)}</div><button className="secondary" aria-pressed={selected} onClick={()=>onApply({...v.settings,colors:[...v.settings.colors]})}>{selected?'Applied':`Apply ${v.name}`}</button></div></article>;
  })}</div><p className="stl-note">Colour studies show opaque top colours. Geometry depends on layer settings; palette-only changes do not change the STL.</p></section>;
}
