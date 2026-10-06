# Layerform

A browser-only image-to-STL studio built with React, TypeScript, Vite and Three.js. Upload PNG, JPG or WebP; select 8–80 print layers, physical width, layer height and up to four AMS colours; orbit the 3D relief and export a binary STL plus a filament-change guide.

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import `chaishah/customstl` from GitHub.
2. Keep the repository root as the root directory. Select the **Vite** preset. Build command: `npm run build`. Output directory: `dist`.
3. Click **Deploy**. No environment variables, database or backend are required.

The included `vercel.json` provides the build configuration. Use Node 22.12+ (or Node 24). See [Vercel's Vite documentation](https://vercel.com/docs/frameworks/frontend/vite).

## Local development

```sh
npm ci
npm run dev
```

```sh
npm run build
npx playwright install chromium
npm test
```

## Printing and colour

### Frames, mounting and comparisons

- **Frames:** flat border at base height or raised border at full relief height, 2–15 mm wide. Borders extend beyond the artwork; the exported dimensions include them. Frame colours follow the same height-based filament schedule as the relief.
- **Hanging:** a fused top tab with a 3–6 mm through-hole. Included in the main STL.
- **Magnets:** two rear pockets for 6, 8 or 10 mm round magnets, 1–3 mm thick. Pockets add 0.3 mm diameter clearance for glue and a backing rounded up to whole layers, keeping at least 0.8 mm above the recess. The preview and print guide automatically shift colour changes by the backing layer count. The pockets open towards the print bed and require short bridges; inspect these in the slicer. Magnet strength and physical retention are not validated.
- **Stand:** a separate STL containing two slotted feet, arranged flat on the bed. Preview or download with the buttons below the main preview. Slots allow 0.4 mm beyond the maximum design thickness. Print separately in one colour; fit and stability depend on the artwork and your printer. Use a raised border for a consistent lower edge.
- **Variants:** compare three palette/layer presets and save one custom comparison for the current session. Thumbnails are top-colour studies of the current image; apply one to inspect the complete geometry and export it. Presets retain current frame and mount selections. A saved comparison restores its captured settings and uses the current image; it does not persist after reloading.

Accessory boolean operations run locally in a Web Worker using [Manifold](https://manifoldcad.org/docs/jsapi/documents/Using_Manifold.html); WASM is bundled with the Vercel build. Exports are disabled while geometry is rebuilding or if a model cannot be created.

This creates a **luminance height relief**, not an AI reconstruction or full-colour replica. Dark pixels become lower and light pixels higher; invert reverses that. Transparent pixels composite over white. A four-layer solid base keeps all detail connected. The image is sampled on a grid, with heights rounded to print layers and triangles connecting samples. Height bands use the selected colours in order; the preview shades the same mesh exported to STL.

STL stores geometry only. Download the print guide, import the STL in millimetres, keep the flat base down, set **both first and subsequent layer heights** to the specified value and disable adaptive layers. Use solid infill for this thin relief. After slicing, insert filament changes at the guide's layer numbers and map to actual AMS slots. If the image does not reach maximum brightness, some upper colour bands may not be used. Check the sliced preview before printing.

The preview assumes opaque colours. It does not simulate filament transmission, colour blending, extrusion width or calibrated HueForge behaviour. Narrow features depend on nozzle size and slicer settings. A higher sample resolution gives finer geometry and larger downloads. The model preserves approximate image aspect ratio; verify both width and height fit your print bed, especially for portrait images. No physical print or native Bambu Studio slice validation is claimed.

## Privacy and limits

Images are decoded and processed locally; nothing uploads to a server. PNG, JPEG and WebP files are limited to 20 MB, resized to a maximum 1600-pixel source preview and sampled at 80, 160 or 256 intervals on the longest side. WebGL is required for the interactive preview, but geometry export is independent of WebGL. Google Fonts supplies the optional interface fonts; system fonts are the fallback.

## Verification

Automated tests check manifold edge pairing, consistent triangle winding, positive volume, flat bed placement, STL byte structure, all supported layer/palette band combinations, upload validation, UI controls, downloads and mobile overflow. Accessory checks cover all 12 frame/mount combinations, connected solids, actual through-holes, pocket depth and roofs, and the two separate stand feet. Browser tests exercise applying/saving comparisons and magnet backing offsets in the downloaded guide. `npm run build` also performs strict TypeScript checks. Browser tests use Chromium; mounting fit and physical printing remain untested.
