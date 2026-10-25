import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'
import { APP_HINTERGRUND } from './src/config.ts'

// Erzeugt aus public/icon.svg alle Icon-Größen für iPhone, Android und Browser-Tab.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: APP_HINTERGRUND } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: APP_HINTERGRUND } },
  },
  images: ['public/icon.svg'],
})
