import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 👇 Change this to match your GitHub repo name.
  //    If your repo is "username.github.io", use base: '/'
  //    If your repo is "my-repo-name",      use base: '/my-repo-name/'
  base: '/PIPlanner/'
})
