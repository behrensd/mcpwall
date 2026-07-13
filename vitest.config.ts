import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Integration tests spawn a `node dist/index.js` subprocess per case and
    // collect responses over stdio. The default 5s timeout is too tight when
    // the machine is under load, causing spurious failures. Give them headroom.
    testTimeout: 20000,
  },
});
