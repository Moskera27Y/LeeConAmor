import { defineConfig } from '@playwright/test';

// E2E de LeeConAmor: arranca el servidor de Vite solo y corre los flujos
// críticos (crear peque, juegos, zona de padres).
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    locale: 'es-ES',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
