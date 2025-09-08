import { defineConfig, devices } from '@playwright/test';

// Local config to avoid Nx in constrained environments
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';
// Ensure specs using process.env.BASE_URL pick up :4200 in local runs
process.env.BASE_URL = baseURL;

export default defineConfig({
  testDir: './src',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  reporter: [
    ['line'],
  ],
  webServer: {
    // Reuse existing Next server on :4200 (scripts/dev-all-local.sh)
    command: 'npx next dev -p 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    cwd: '../frontend',
    timeout: 120 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
