import type { AppConfig } from './config'
import { isApiPath, isProxyRoute, proxyRequest } from './proxy'
import { serveFrontend } from './static'

type AppOptions = Partial<AppConfig> & {
  fetchImpl?: (request: Request) => Promise<Response>
}

export function createApp(options: AppOptions = {}) {
  const ocrServiceUrl = options.ocrServiceUrl ?? 'http://localhost:3000'
  const staticRoot = options.staticRoot ?? './frontend/dist'

  return async function handleRequest(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname

    if (isProxyRoute(pathname, request.method)) {
      return proxyRequest(request, ocrServiceUrl, options.fetchImpl)
    }

    if (isApiPath(pathname)) {
      return Response.json({ error: 'Ruta o método no soportado' }, { status: 405 })
    }

    return serveFrontend(request, staticRoot)
  }
}
