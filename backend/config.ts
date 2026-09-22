import { resolve } from 'node:path'

export type AppConfig = {
  ocrServiceUrl: string
  staticRoot: string
}

export function loadConfig(): AppConfig {
  return {
    ocrServiceUrl: (Bun.env.OCR_SERVICE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
    staticRoot: resolve(Bun.env.STATIC_ROOT ?? './frontend/dist'),
  }
}

export function loadPort() {
  return Number(Bun.env.PORT ?? 3001)
}
