import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// 網頁版 (GitHub Pages) 使用 /GCREC/；桌面版 (vite build --mode desktop) 以 file:// 載入，需使用相對路徑
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'desktop' ? './' : '/GCREC/',
  build: mode === 'desktop' ? { outDir: 'dist-desktop' } : undefined,
}))
