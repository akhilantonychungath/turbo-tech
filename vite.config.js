import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@reduxjs/toolkit/query/react': path.resolve(__dirname, './node_modules/@reduxjs/toolkit/dist/query/react/rtk-query-react.legacy-esm.js'),
      '@reduxjs/toolkit/query': path.resolve(__dirname, './node_modules/@reduxjs/toolkit/dist/query/rtk-query.legacy-esm.js'),
      '@reduxjs/toolkit/react': path.resolve(__dirname, './node_modules/@reduxjs/toolkit/dist/react/redux-toolkit-react.legacy-esm.js'),
      '@reduxjs/toolkit': path.resolve(__dirname, './node_modules/@reduxjs/toolkit/dist/redux-toolkit.legacy-esm.js'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
  publicDir: 'public',
})

