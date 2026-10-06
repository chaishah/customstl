import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { bands, type Relief, type Settings } from './relief';

export default function Preview({ relief, settings, top, back=false, reset }: { relief: Relief; settings: Settings; top: boolean; back?: boolean; reset: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { setError(true); return; }
    setError(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D relief preview');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 3000);
    camera.up.set(0, top||back?1:0, top||back?0:1);
    const size = Math.max(relief.width, relief.height);
    camera.position.set(top||back ? 0 : size * .75, top||back ? .001 : -size * 1.05, size * 1.9*(back?-1:1));
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.minDistance = size * .4; controls.maxDistance = size * 5;
    controls.maxPolarAngle = Math.PI;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(relief.positions, 3)); geometry.computeVertexNormals();
    const palette = [...settings.colors]; while (palette.length < 4) palette.push(palette[palette.length - 1]);
    const starts = bands(settings).map(b => (b.start - 1) * settings.layerHeight + .00001);
    while (starts.length < 4) starts.push(1e5);
    const material = new THREE.ShaderMaterial({
      uniforms: { palette: { value: palette.map(c => new THREE.Color(c)) }, starts: { value: starts }, rear: {value:back?1:0} },
      vertexShader: 'varying float h; varying vec3 n; void main(){h=position.z; n=normal; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 palette[4]; uniform float starts[4]; varying float h; varying vec3 n; void main(){ vec3 c=palette[0]; if(h>starts[1]) c=palette[1]; if(h>starts[2]) c=palette[2]; if(h>starts[3]) c=palette[3]; float light=.78+.22*max(dot(normalize(n),normalize(vec3(-.3,-.5,1.))),0.); gl_FragColor=vec4(c*light,1.); #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }'
    });
    // Shader include directives must begin on their own line.
    material.fragmentShader = material.fragmentShader.replace('; #include', ';\n #include');
    material.fragmentShader = 'uniform float rear;\n'+material.fragmentShader.replace('vec3(-.3,-.5,1.)','vec3(-.3,-.5,1.-2.*rear)').replace('vec4(c*light,1.)','vec4(c*light*(1.-rear*min(h*.16,.45)),1.)');
    const mesh = new THREE.Mesh(geometry, material); scene.add(mesh);
    const grid = new THREE.GridHelper(size * 2, 20, '#c1c9c1', '#dce1d8'); grid.rotation.x = Math.PI / 2; grid.position.z = -.05; if(!back)scene.add(grid);
    const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w/h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    let frame = 0;
    const draw = () => { frame = requestAnimationFrame(draw); controls.update(); renderer.render(scene, camera); }; draw();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); geometry.dispose(); material.dispose(); grid.geometry.dispose(); (grid.material as THREE.Material).dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, [relief, settings, top, back, reset]);
  return <div className="scene" ref={host}>{error && <div className="webgl-error">3D preview requires WebGL. Try enabling hardware acceleration or another browser. STL export is still available.</div>}</div>;
}
