import fs from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function parseRggenVersions(): Record<string, string> {
  const lock = fs.readFileSync('./rggen-wasm/Gemfile.lock', 'utf-8')
  const versions: Record<string, string> = {}
  for (const line of lock.split('\n')) {
    const m = line.match(/^ {4}(rggen-[\w-]+) \((\d[^)]+)\)$/)
    if (m) versions[m[1]] = m[2]
  }
  return versions
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  define: {
    __RGGEN_VERSIONS__: JSON.stringify(parseRggenVersions()),
  },
  plugins: [react(), tailwindcss()],
})
