import { test, expect } from '@playwright/test';
test('all accessory meshes are closed, connected and have real holes and recesses',async({page})=>{
  await page.goto('/');
  const errors=await page.evaluate(async()=>{
    const enginePath='/node_modules/manifold-3d/manifold.js', geometryPath='/src/accessories.ts', reliefPath='/src/relief.ts';
    const {default:Module}=await import(/* @vite-ignore */ enginePath);
    const api=await Module({locateFile:()=>'/node_modules/manifold-3d/manifold.wasm'});api.setup();
    const {decorateRelief}=await import(/* @vite-ignore */ geometryPath);
    const {buildRelief,defaults,printSettings}=await import(/* @vite-ignore */ reliefPath);
    const errors:string[]=[];
    const check=(condition:boolean,message:string)=>{if(!condition)errors.push(message);};
    const solid=(r:{positions:Float32Array})=>{const mesh=new api.Mesh({numProp:3,vertProperties:r.positions,triVerts:Uint32Array.from({length:r.positions.length/3},(_,i)=>i)});mesh.merge();return new api.Manifold(mesh);};
    const pixels=new Uint8ClampedArray([0,0,0,255,255,255,255,255,125,125,125,255,200,200,200,255]);
    for(const frame of ['none','flat','raised'])for(const mount of ['none','hanging','magnets','stand']){
      const s={...defaults,frame,mount},raw=buildRelief(pixels,2,2,s),result=decorateRelief(api,raw,s),m=solid(result.relief),label=frame+' '+mount;
      check(m.status()==='NoError',label+' manifold');check(m.volume()>0,label+' volume');check(m.boundingBox().min[2]===0,label+' bed');
      const parts=m.decompose();check(parts.length===1,label+' connected');parts.forEach((p:{delete:()=>void})=>p.delete());
      check(Math.abs(result.relief.width-s.width-(frame==='none'?0:2*s.frameWidth))<.01,label+' width');
      if(mount==='hanging'){const outer=raw.height+(frame==='none'?0:2*s.frameWidth),y=outer/2+s.holeDiameter/2+3-1.5;check(m.rayCast([0,y,-1],[0,y,20]).length===0,label+' through-hole');}
      if(mount==='magnets'){const x=raw.width/4;check(m.rayCast([x,0,-1],[x,0,s.magnetDepth-.05]).length===0,label+' pocket air');check(m.rayCast([x,0,-1],[x,0,s.magnetDepth+.05]).length>0,label+' pocket roof');check(Math.abs(result.relief.maxZ-printSettings(s).layers*s.layerHeight)<.01,label+' height');}
      if(result.stand){const feet=solid(result.stand);check(feet.status()==='NoError',label+' feet mesh');const parts=feet.decompose();check(parts.length===2,label+' two feet');parts.forEach((p:{delete:()=>void})=>p.delete());check(feet.rayCast([-16,0,6],[-16,0,15]).length===0,label+' slot');feet.delete();}
      m.delete();
    }
    const s={...defaults,width:30,mount:'magnets'},r=buildRelief(new Uint8ClampedArray(20*2*4).fill(255),20,2,s);
    let rejected=false;try{decorateRelief(api,r,s);}catch{rejected=true;}check(rejected,'reject short magnet artwork');
    return errors;
  });
  expect(errors).toEqual([]);
});
