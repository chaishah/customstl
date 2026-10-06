export type Settings = { width: number; layers: number; layerHeight: number; baseLayers: number; resolution: number; contrast: number; invert: boolean; colors: string[] };
export type Relief = { positions: Float32Array; width: number; height: number; maxZ: number; sampleWidth: number; sampleHeight: number };
export const defaults: Settings = { width: 150, layers: 24, layerHeight: 0.12, baseLayers: 4, resolution: 160, contrast: 1.1, invert: false, colors: ['#253d38', '#bd7352', '#dfb977', '#f3e7cd'] };
export function colorIndex(layer: number, s: Settings) {
  return Math.min(s.colors.length - 1, Math.max(0, Math.floor((layer - s.baseLayers) / (s.layers - s.baseLayers + 1) * s.colors.length)));
}
export function bands(s: Settings) {
  return s.colors.map((color, index) => {
    const layers = Array.from({ length: s.layers }, (_, i) => i + 1).filter(l => colorIndex(l, s) === index);
    return { color, start: layers[0], end: layers[layers.length - 1] };
  });
}
// Shared rectangular grid: every edge belongs to exactly two triangles.
// Image rows run top-to-bottom; print coordinates run bottom-to-top.
export function buildRelief(rgba: Uint8ClampedArray, nx: number, ny: number, s: Settings): Relief {
  if (nx < 2 || ny < 2 || rgba.length !== nx * ny * 4) throw new Error('Invalid image grid');
  if (s.layers <= s.baseLayers || s.baseLayers < 1 || s.width <= 0 || s.layerHeight <= 0) throw new Error('Invalid print dimensions');
  const width = s.width, height = width * (ny - 1) / (nx - 1);
  const out: number[] = [], points: number[][] = [];
  let maxZ = 0;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const i = (y * nx + x) * 4, a = rgba[i + 3] / 255;
    let lum = (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255;
    lum = lum * a + 1 - a;
    lum = Math.min(1, Math.max(0, (lum - 0.5) * s.contrast + 0.5));
    if (s.invert) lum = 1 - lum;
    const z = (s.baseLayers + Math.round(lum * (s.layers - s.baseLayers))) * s.layerHeight;
    maxZ = Math.max(maxZ, z);
    points.push([x / (nx - 1) * width - width / 2, height / 2 - y / (ny - 1) * height, z]);
  }
  const tri = (a: number[], b: number[], c: number[]) => out.push(...a, ...b, ...c);
  const bottom = (p: number[]) => [p[0], p[1], 0];
  for (let y = 0; y < ny - 1; y++) for (let x = 0; x < nx - 1; x++) {
    const a = points[y * nx + x], b = points[y * nx + x + 1], c = points[(y + 1) * nx + x], d = points[(y + 1) * nx + x + 1];
    tri(a, c, b); tri(b, c, d);
    tri(bottom(a), bottom(b), bottom(c)); tri(bottom(b), bottom(d), bottom(c));
  }
  const wall = (a: number[], b: number[]) => { tri(a, b, bottom(a)); tri(b, bottom(b), bottom(a)); };
  for (let x = 0; x < nx - 1; x++) { wall(points[x], points[x + 1]); wall(points[(ny - 1) * nx + x + 1], points[(ny - 1) * nx + x]); }
  for (let y = 0; y < ny - 1; y++) { wall(points[(y + 1) * nx], points[y * nx]); wall(points[y * nx + nx - 1], points[(y + 1) * nx + nx - 1]); }
  return { positions: new Float32Array(out), width, height, maxZ, sampleWidth: nx, sampleHeight: ny };
}
export function binarySTL(r: Relief): ArrayBuffer {
  const n = r.positions.length / 9, buffer = new ArrayBuffer(84 + n * 50), view = new DataView(buffer);
  new Uint8Array(buffer, 0, 80).set(new TextEncoder().encode('Layerform | millimetres | flat base at Z=0'));
  view.setUint32(80, n, true);
  for (let i = 0; i < n; i++) {
    const p = r.positions.subarray(i * 9, i * 9 + 9), offset = 84 + i * 50;
    const u = [p[3]-p[0], p[4]-p[1], p[5]-p[2]], v = [p[6]-p[0], p[7]-p[1], p[8]-p[2]];
    const normal = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]], length = Math.hypot(...normal) || 1;
    normal.forEach((value, j) => view.setFloat32(offset + j * 4, value / length, true));
    p.forEach((value, j) => view.setFloat32(offset + 12 + j * 4, value, true));
  }
  return buffer;
}
