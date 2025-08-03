// Global type definitions for the preload `window.api` bridge.
// Placed in renderer `src/types` so it is included by the tsconfig `@/*` path mapping.
// This removes TS errors like "Property 'api' does not exist on type 'Window'".

import type { ElectronAPI } from '../../../preload/index'

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}
