import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Box, Check, ChevronRight, ImagePlus, Layers3, RotateCcw, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import Preview from './Preview';
import { bands, binarySTL, buildRelief, defaults, type Settings } from './relief';

function sampleImage() {
  const c = document.createElement('canvas'); c.width = 900; c.height = 600;
  const g = c.getContext('2d')!;
  g.fillStyle = '#eee'; g.fillRect(0, 0, 900, 600);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(625, 175, 88, 0, Math.PI * 2); g.fill();
  const mountain = (color: string, points: number[][]) => { g.fillStyle=color; g.beginPath(); points.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y)); g.lineTo(900,600); g.lineTo(0,600); g.closePath(); g.fill(); };
  mountain('#a0a0a0', [[0,360],[110,240],[205,305],[365,95],[570,370],[740,230],[900,360]]);
  mountain('#646464', [[0,400],[175,320],[280,390],[470,235],[665,395],[800,300],[900,380]]);
  mountain('#171717', [[0,470],[155,405],[365,490],[590,415],[750,475],[900,425]]);
  return c.toDataURL('image/png');
}
function download(data: BlobPart, filename: string, type: string) {
  const url=URL.createObjectURL(new Blob([data],{type})); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export default function App() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [source, setSource] = useState(sampleImage);
  const [name, setName] = useState('Alpine afternoon');
  const [pixels, setPixels] = useState<{ data: Uint8ClampedArray; width: number; height: number }>();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [dragging, setDragging] = useState(false);
  const [top, setTop] = useState(false), [reset, setReset] = useState(0), [exported, setExported] = useState(false);
  const input = useRef<HTMLInputElement>(null), uploadId=useRef(0);
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => { setSettings(s => ({...s,[key]:value})); setExported(false); };
  useEffect(() => {
    let cancelled=false; setBusy(true);
    const image=new Image();
    image.onload=()=>{
      if(cancelled)return;
      const ratio=image.width/image.height;
      const width=Math.max(2,Math.round(settings.resolution*Math.min(1,ratio)))+1;
      const height=Math.max(2,Math.round(settings.resolution*Math.min(1,1/ratio)))+1;
      const c=document.createElement('canvas'); c.width=width;c.height=height;
      const g=c.getContext('2d',{willReadFrequently:true})!; g.drawImage(image,0,0,width,height);
      setPixels({data:g.getImageData(0,0,width,height).data,width,height});setBusy(false);
    };
    image.onerror=()=>{if(!cancelled){setError('Could not decode this image. Please use PNG, JPG or WebP.');setBusy(false);}};
    image.src=source;
    return ()=>{cancelled=true;};
  },[source,settings.resolution]);
  const relief=useMemo(()=>pixels?buildRelief(pixels.data,pixels.width,pixels.height,settings):undefined,[pixels,settings]);
  async function upload(file?: File) {
    if(!file)return;
    const id=++uploadId.current; setError('');
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setError('Choose a PNG, JPG or WebP image.');return;}
    if(file.size>20*1024*1024){setError('This image is too large. Please choose a file under 20 MB.');return;}
    setBusy(true);
    try {
      const bitmap=await createImageBitmap(file);
      if(id!==uploadId.current){bitmap.close();return;}
      const ratio=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
      const c=document.createElement('canvas'); c.width=Math.max(2,Math.round(bitmap.width*ratio)); c.height=Math.max(2,Math.round(bitmap.height*ratio));
      c.getContext('2d')!.drawImage(bitmap,0,0,c.width,c.height);bitmap.close();
      setSource(c.toDataURL('image/png'));setName(file.name.replace(/\.[^.]+$/,''));setExported(false);
    }catch{if(id===uploadId.current)setError('This image could not be opened. Try another PNG, JPG or WebP.');}finally{if(id===uploadId.current)setBusy(false);}
  }
  const schedule=bands(settings);
  const slug=name.replace(/[^a-z0-9_-]/gi,'-').slice(0,60)||'relief';
  function exportGuide(){
    if(!relief)return;
    download(`LAYERFORM — ${name}\n\nSize: ${relief.width.toFixed(1)} × ${relief.height.toFixed(1)} mm\nMaximum design height: ${(settings.layers*settings.layerHeight).toFixed(2)} mm\nActual model height: ${relief.maxZ.toFixed(2)} mm\nUniform layer height (including FIRST layer): ${settings.layerHeight} mm\nBase: ${settings.baseLayers} layers\n\nAMS / FILAMENT SCHEDULE\n${schedule.map((b,i)=>`Slot ${i+1}: ${b.color} | layers ${b.start}–${b.end} | switch before layer ${b.start} (bottom Z=${((b.start-1)*settings.layerHeight).toFixed(2)} mm)`).join('\n')}\n\nImport STL into Bambu Studio in millimetres, flat base down. Set the first and other layer heights to the value above, disable adaptive layers, and use solid infill for this thin relief. Slice and add filament changes at the specified layers in Preview; map the colours to your actual AMS slots. Bands above the actual model height are unused. Verify the sliced preview before printing.\n\nSTL contains geometry only, not colours or AMS commands. Preview uses opaque colours by height, not measured filament transmission. This is a luminance relief, not full-colour reproduction. Thin details depend on your nozzle and slicer.\n` ,`${slug}-print-guide.txt`,'text/plain');
  }
  return <>
    <header><a className="brand" href="/" aria-label="Layerform home"><span className="brand-icon"><Layers3 size={23}/></span>layerform<span className="beta">STUDIO</span></a><span className="header-note">A little image. A new dimension.</span><a className="github" href="https://github.com/chaishah/customstl" target="_blank" rel="noreferrer">View project <ArrowUpRight size={15}/></a></header>
    <main><div className="intro"><div><div className="eyebrow">IMAGE → LAYERS → SOMETHING REAL</div><h1>Make your images <em>tangible.</em></h1><p>Turn a favourite image into a layered, colour-filled 3D print.</p></div><div className="privacy"><ShieldCheck size={18}/><span>Made on your device.<br/><strong>Your images stay yours.</strong></span></div></div>
    <div className="workspace"><aside>
      <section><div className="section-title"><span className="step">01</span><h2>Your canvas</h2><span className="tiny-tag">START HERE</span></div>
        <button className={`upload ${dragging?'dragging':''}`} onClick={()=>input.current?.click()} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);void upload(e.dataTransfer.files[0]);}}><ImagePlus size={25}/><strong>Drop an image, or browse</strong><span>PNG, JPG or WebP · up to 20 MB</span></button>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload image" hidden onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/>
        <div className="source"><img src={source} alt="Source image"/><div><strong>{name}</strong><span>{name==='Alpine afternoon'?'Sample artwork · try your own':'Ready to turn into a relief'}</span></div><Check size={16}/></div>
        {error&&<p role="alert" className="error">{error}</p>}
      </section>
      <section><div className="section-title"><span className="step">02</span><h2>Shape your print</h2><SlidersHorizontal size={16}/></div>
        <label className="range-label" htmlFor="layers">Total print layers <output>{settings.layers}<small> layers</small></output></label><input id="layers" type="range" min="8" max="80" value={settings.layers} onChange={e=>update('layers',+e.target.value)}/><div className="range-ends"><span>8 layers</span><span>80 layers</span></div>
        <div className="field-grid"><label>Width (mm)<input type="number" min="30" max="250" value={settings.width} onChange={e=>update('width',Math.max(30,Math.min(250,+e.target.value)))}/></label><label>Layer height<select value={settings.layerHeight} onChange={e=>update('layerHeight',+e.target.value)}><option value="0.08">0.08 mm · fine</option><option value="0.12">0.12 mm · balanced</option><option value="0.16">0.16 mm · standard</option><option value="0.2">0.20 mm · quick</option></select></label></div>
        <div className="height-note"><Layers3 size={14}/> {(settings.layers*settings.layerHeight).toFixed(2)} mm maximum height · solid {settings.baseLayers}-layer base</div>
        <details><summary>Image & detail settings <ChevronRight size={14}/></summary><label>Detail resolution<select value={settings.resolution} onChange={e=>update('resolution',+e.target.value)}><option value="80">Draft · 80 samples</option><option value="160">Balanced · 160 samples</option><option value="256">Fine · 256 samples</option></select></label><label className="range-label" htmlFor="contrast">Contrast <output>{settings.contrast.toFixed(1)}</output></label><input id="contrast" type="range" min="0.5" max="2" step="0.1" value={settings.contrast} onChange={e=>update('contrast',+e.target.value)}/><label className="checkbox"><input type="checkbox" checked={settings.invert} onChange={e=>update('invert',e.target.checked)}/>Invert height · dark areas become raised</label></details>
      </section>
      <section><div className="section-title"><span className="step">03</span><h2>Your AMS palette</h2><span className="tiny-tag">UP TO 4</span></div><p className="section-copy">Colours go from the base to the highest detail.</p><div className="palette">{settings.colors.map((c,i)=><label key={i} className="swatch"><input aria-label={`AMS colour ${i+1}`} type="color" value={c} onChange={e=>update('colors',settings.colors.map((v,j)=>j===i?e.target.value:v))}/><span>{i+1}</span></label>)}{settings.colors.length<4&&<button className="add-color" aria-label="Add AMS colour" onClick={()=>update('colors',[...settings.colors,'#f3e7cd'])}>+</button>}</div><div className="palette-bottom"><span>{settings.colors.length} / 4 AMS slots</span><button disabled={settings.colors.length===1} onClick={()=>update('colors',settings.colors.slice(0,-1))}>Remove last colour</button></div></section>
    </aside>
    <div className="right"><section className="preview-card"><div className="preview-header"><div><span className="live-dot"/> Live preview <span className="preview-sub">/ {top?'Top view':'3D relief'}</span></div><div className="view-controls"><button className={!top?'active':''} onClick={()=>setTop(false)}>3D</button><button className={top?'active':''} onClick={()=>setTop(true)}>Top</button><button aria-label="Reset view" onClick={()=>setReset(r=>r+1)}><RotateCcw size={15}/></button></div></div>
      {relief&&<Preview relief={relief} settings={settings} top={top} reset={reset}/>}{busy&&<div className="processing" role="status">Preparing your relief…</div>}
      <div className="preview-footer"><span><Box size={14}/> {relief?`${relief.width.toFixed(0)} × ${relief.height.toFixed(0)} × ${relief.maxZ.toFixed(2)} mm`:'Preparing…'}</span><span>Drag to orbit · scroll to zoom</span></div></section>
      <div className="preview-disclaimer">An opaque-colour approximation. Filament translucency and small print details will vary.</div>
      <section className="print-strip"><div className="strip-heading"><h2>A colour story, layer by layer.</h2><span>{settings.layers} layers · {settings.colors.length} colours</span></div><div className="band-bar">{schedule.map((b,i)=><div key={i} style={{background:b.color,flex:b.end-b.start+1}} title={`Slot ${i+1}: layers ${b.start}–${b.end}`}/>)}</div><div className="band-labels">{schedule.map((b,i)=><div key={i}><i style={{background:b.color}}/><span>Slot {i+1}<small>Layers {b.start}–{b.end}</small></span></div>)}</div></section>
      <section className="export-card"><div><div className="export-eyebrow">FROM SCREEN TO PRINT BED</div><h2>Your next print starts here.</h2><p>Export your relief and its filament-change guide.</p></div><div className="export-actions"><button className="primary" disabled={!relief||busy} onClick={()=>{if(relief){download(binarySTL(relief),`${slug}.stl`,'model/stl');setExported(true);}}}>{exported?<Check size={17}/>:<ArrowDownToLine size={17}/>} {exported?'STL exported':'Export STL'} <span>↓</span></button><button className="guide" disabled={!relief||busy} onClick={exportGuide}>Download print guide <ArrowDownToLine size={14}/></button></div></section>
      <p className="stl-note">STL contains geometry only. Use the print guide to set filament changes in your slicer. Lighter image areas become higher; colours follow height, not the original image hues.</p>
    </div></div><footer><span className="footer-brand">layerform</span><span>Pixels to possibilities.</span><span>Built for curious makers.</span></footer></main>
  </>;
}
