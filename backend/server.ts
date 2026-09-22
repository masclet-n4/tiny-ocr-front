import Bun from 'bun'
import { createApp } from './http/app'
import { loadConfig, loadPort } from './config/env'
import { createRustfsClient } from './integrations/rustfs/client'

const config = loadConfig()
const rustfs = createRustfsClient(config.rustfs)

const server = Bun.serve({
  port: loadPort(),
  fetch: createApp({
    ...config,
    createDownloadUrl: rustfs.createDownloadUrl,
  }),
})

console.log(`tiny-ocr disponible en ${server.url}`)
