import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    alias: {
      '@stellar-mesh/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@stellar-mesh/voucher-protocol': path.resolve(__dirname, '../../packages/voucher-protocol/src/index.ts'),
      '@stellar-mesh/stellar-client': path.resolve(__dirname, '../../packages/stellar-client/src/index.ts'),
    },
  },
  resolve: {
    alias: {
      '@stellar-mesh/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@stellar-mesh/voucher-protocol': path.resolve(__dirname, '../../packages/voucher-protocol/src/index.ts'),
      '@stellar-mesh/stellar-client': path.resolve(__dirname, '../../packages/stellar-client/src/index.ts'),
      '@': path.resolve(__dirname, './src'),
    },
  },
})
