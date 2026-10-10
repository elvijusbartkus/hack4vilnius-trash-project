import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Shared with the resident app: the public Supabase keys come from the
  // repo root's .env.local (NEXT_PUBLIC_*, browser-safe values only), and
  // lib/config.ts is imported from the root for the demo date and constants.
  envDir: '..',
  envPrefix: ['VITE_', 'NEXT_PUBLIC_SUPABASE_'],
  server: { fs: { allow: ['..'] } },
})
