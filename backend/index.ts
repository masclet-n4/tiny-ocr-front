import Bun from 'bun'
import { createApp } from './app'
import { loadConfig, loadPort } from './config'

const server = Bun.serve({
  port: loadPort(),
  fetch: createApp(loadConfig()),
})

console.log(`tiny-ocr disponible en ${server.url}`)
