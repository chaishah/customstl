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

This creates a **luminance height relief**, not an AI reconstruction or full-colour replica. Dark pixels become lower and light pixels higher; invert reverses that. Transparent pixels composite over white. A four-layer solid base keeps all detail connected. The image is sampled on a grid, with heights rounded to print layers and triangles connecting samples. Height bands use the selected colours in order; the preview shades the same mesh exported to STL.

STL stores geometry only. Download the print guide, import the STL in millimetres, keep the flat base down, set **both first and subsequent layer heights** to the specified value and disable adaptive layers. Use solid infill for this thin relief. After slicing, insert filament changes at the guide's layer numbers and map to actual AMS slots. If the image does not reach maximum brightness, some upper colour bands may not be used. Check the sliced preview before printing.

The preview assumes opaque colours. It does not simulate filament transmission, colour blending, extrusion width or calibrated HueForge behaviour. Narrow features depend on nozzle size and slicer settings. A higher sample resolution gives finer geometry and larger downloads. The model preserves approximate image aspect ratio; verify both width and height fit your print bed, especially for portrait images. No physical print or native Bambu Studio slice validation is claimed.

## Privacy and limits

Images are decoded and processed locally; nothing uploads to a server. PNG, JPEG and WebP files are limited to 20 MB, resized to a maximum 1600-pixel source preview and sampled at 80, 160 or 256 intervals on the longest side. WebGL is required for the interactive preview, but geometry export is independent of WebGL. Google Fonts supplies the optional interface fonts; system fonts are the fallback.

## Verification

Automated tests check manifold edge pairing, consistent triangle winding, positive volume, flat bed placement, STL byte structure, all supported layer/palette band combinations, upload validation, UI controls, both downloads and mobile overflow. `npm run build` also performs strict TypeScript checks. Browser tests use Chromium.
