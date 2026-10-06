import type { ManifoldToplevel, Manifold } from 'manifold-3d';
import { backingLayers, type Relief, type Settings } from './relief';

// Boolean operations fuse accessories into one closed solid, including real recesses.
// Track every WASM object because Manifold allocations need explicit disposal.
export function decorateRelief(api: ManifoldToplevel, relief: Relief, s: Settings): { relief: Relief; stand?: Relief } {
  const owned: Manifold[] = [];
  const keep = (solid: Manifold) => { owned.push(solid); return solid; };
  const { Manifold: M, Mesh } = api;
  const box = (w: number, h: number, z: number, x=0, y=0, bottom=0) => keep(keep(M.cube([w,h,z])).translate([x-w/2,y-h/2,bottom]));
  const cylinder = (radius: number, depth: number, x: number, y: number, z=0) => keep(keep(M.cylinder(depth,radius,radius,64)).translate([x,y,z]));
  const union = (a: Manifold,b: Manifold) => keep(a.add(b));
  const subtract = (a: Manifold,b: Manifold) => keep(a.subtract(b));
  const convert = (solid: Manifold): Relief => {
    if (solid.status() !== 'NoError' || solid.isEmpty()) throw new Error('Could not build a closed accessory mesh. Try different dimensions.');
    const mesh = solid.getMesh(), positions = new Float32Array(mesh.triVerts.length*3), bounds=solid.boundingBox();
    mesh.triVerts.forEach((v,i)=>{for(let j=0;j<3;j++)positions[i*3+j]=mesh.vertProperties[v*mesh.numProp+j];});
    return {...relief,positions,width:bounds.max[0]-bounds.min[0],height:bounds.max[1]-bounds.min[1],maxZ:bounds.max[2]};
  };
  try {
    const mesh = new Mesh({numProp:3, vertProperties:relief.positions,triVerts:Uint32Array.from({length:relief.positions.length/3},(_,i)=>i)});
    mesh.merge();
    let model=keep(new M(mesh));
    const backing=backingLayers(s)*s.layerHeight;
    const frame=s.frame==='none'?0:s.frameWidth;
    const w=relief.width+2*frame,h=relief.height+2*frame;
    const top=s.layers*s.layerHeight+backing;
    if(backing){
      if(relief.height<s.magnetDiameter+4)throw new Error('The artwork is too short for these magnets. Increase its width or use smaller magnets.');
      model=union(keep(model.translate([0,0,backing])),box(relief.width,relief.height,backing+.001));
    }
    if(frame){
      const z=s.frame==='raised'?top:s.baseLayers*s.layerHeight+backing;
      const ring=subtract(box(w,h,z),box(relief.width-.2,relief.height-.2,z+2,0,0,-1));
      model=union(model,ring);
    }
    if(s.mount==='hanging'){
      const radius=s.holeDiameter/2+3,y=h/2+radius-1.5;
      model=union(model,cylinder(radius,top,0,y));
      model=subtract(model,cylinder(s.holeDiameter/2,top+2,0,y,-1));
    }
    if(s.mount==='magnets'){
      for(const x of [-relief.width/4,relief.width/4])model=subtract(model,cylinder((s.magnetDiameter+.3)/2,s.magnetDepth+1,x,0,-1));
    }
    let stand: Relief|undefined;
    if(s.mount==='stand'){
      // Two independent feet, already arranged flat for a separate print.
      const slot=top+.4;
      const foot=(x:number)=>subtract(box(24,Math.max(35,slot+20),12,x),box(26,slot,9,x,0,5));
      stand=convert(union(foot(-16),foot(16)));
    }
    return {relief:convert(model),stand};
  } finally { for(const solid of owned.reverse())solid.delete(); }
}
