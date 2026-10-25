import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Erzeugt aus public/icon.svg alle Icon-Größen für iPhone, Android und Browser-Tab.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#1f1e1d' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#1f1e1d' } },
  },
  images: ['public/icon.svg'],
})
