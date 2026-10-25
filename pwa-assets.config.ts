import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'
import { APP_HINTERGRUND } from './src/config.ts'

// Erzeugt aus public/icon.svg die App-Icons für iPhone und Android.
// Achtung: Das Tab-Bild public/favicon.ico kommt aus public/favicon.svg (Löwe ohne Hintergrund) und wird hier
// mit überschrieben. Nach „npm run icons“ deshalb favicon.ico neu aus favicon.svg erzeugen.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: APP_HINTERGRUND } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: APP_HINTERGRUND } },
  },
  images: ['public/icon.svg'],
})
