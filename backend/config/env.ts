import { resolve } from 'node:path'

export type AppConfig = {
  ocrServiceUrl: string
  staticRoot: string
  rustfs: {
    endpoint: string
    bucket: string
    accessKey: string
    secretKey: string
    region: string
    expiresIn: number
  }
}


export function loadConfig(): AppConfig {
  return {
    ocrServiceUrl: (Bun.env.OCR_SERVICE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
    staticRoot: resolve(Bun.env.STATIC_ROOT ?? './frontend/dist'),
    rustfs: {
      endpoint: Bun.env.RUSTFS_ENDPOINT ?? 'http://localhost:9000',
      bucket: Bun.env.RUSTFS_BUCKET ?? 'ocr-results',
      accessKey: Bun.env.RUSTFS_ACCESS_KEY ?? '',
      secretKey: Bun.env.RUSTFS_SECRET_KEY ?? '',
      region: Bun.env.RUSTFS_REGION ?? 'us-east-1',
      expiresIn: Number(Bun.env.RESULT_URL_EXPIRES_SECONDS ?? 60),
    },

  }
}

export function loadPort() {
  return Number(Bun.env.PORT ?? 3001)
}
