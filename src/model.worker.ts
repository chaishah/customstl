import Module from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { buildRelief, type Settings } from './relief';
import { decorateRelief } from './accessories';
const api = Module({locateFile:()=>wasmUrl}).then(m=>{m.setup();return m;});
self.onmessage=async(event: MessageEvent<{id:number;data:Uint8ClampedArray;width:number;height:number;settings:Settings}>)=>{
  const {id,data,width,height,settings}=event.data;
  try{
    const raw=buildRelief(data,width,height,settings);
    const result=settings.frame==='none'&&settings.mount==='none'?{relief:raw}:decorateRelief(await api,raw,settings);
    self.postMessage({id,...result});
  }catch(error){self.postMessage({id,error:error instanceof Error?error.message:'Unable to build this model.'});}
};
