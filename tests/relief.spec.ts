import { test, expect } from '@playwright/test';
import { buildRelief, defaults, binarySTL, bands } from '../src/relief';
test('relief is closed, consistently wound, positive volume and on the bed', () => {
  const pixels=new Uint8ClampedArray([0,0,0,255,255,255,255,255,125,125,125,255,255,0,0,255,0,0,0,0,20,20,20,255]);
  const r=buildRelief(pixels,3,2,defaults), edges=new Map<string,number[]>(); let volume=0;
  for(let i=0;i<r.positions.length;i+=9){
    const v=[Array.from(r.positions.slice(i,i+3)),Array.from(r.positions.slice(i+3,i+6)),Array.from(r.positions.slice(i+6,i+9))];
    const [a,b,c]=v;volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    for(let j=0;j<3;j++){const a=v[j].join(','),b=v[(j+1)%3].join(','),k=[a,b].sort().join('|');edges.set(k,[...(edges.get(k)||[]),a<b?1:-1]);}
  }
  for(const e of edges.values()){expect(e).toHaveLength(2);expect(e[0]+e[1]).toBe(0);}
  expect(volume).toBeGreaterThan(0);expect(r.maxZ).toBeCloseTo(defaults.layers*defaults.layerHeight);
  expect(Math.min(...Array.from(r.positions).filter((_,i)=>i%3===2))).toBe(0);
  const stl=binarySTL(r);expect(stl.byteLength).toBe(84+r.positions.length/9*50);expect(new DataView(stl).getUint32(80,true)).toBe(r.positions.length/9);
});
test('all layer counts and palettes produce contiguous nonempty colour bands',()=>{
  for(let layers=8;layers<=80;layers++)for(let count=1;count<=4;count++){
    const b=bands({...defaults,layers,colors:defaults.colors.slice(0,count)});
    expect(b[0].start).toBe(1);expect(b.at(-1)!.end).toBe(layers);
    b.forEach((v,i)=>{expect(v.end).toBeGreaterThanOrEqual(v.start);if(i)expect(v.start).toBe(b[i-1].end+1);});
  }
});
