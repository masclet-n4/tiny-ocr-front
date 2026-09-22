import type { AppConfig } from '../config/env'
import { proxyRequest, isApiPath, isProxyRoute } from '../integrations/ocr/client'
import { downloadResult, ResultDownloadError } from '../features/results/service'
import { serveFrontend } from './static'

type AppOptions = Partial<AppConfig> & {
  fetchImpl?: (request: Request) => Promise<Response>
  jobFetchImpl?: (url: string) => Promise<Response>
  resultFetchImpl?: (url: string) => Promise<Response>
  createDownloadUrl?: (key: string, filename: string) => Promise<string>
}

export function createApp(options: AppOptions = {}) {
  const ocrServiceUrl = options.ocrServiceUrl ?? 'http://localhost:3000'
  const staticRoot = options.staticRoot ?? './frontend/dist'

  return async function handleRequest(request: Request): Promise<Response> {
    const pathname = new URL(request.url).pathname

    const resultMatch = pathname.match(/^\/results\/([A-Za-z0-9_-]+)\.txt$/)

    if (request.method === 'GET' && resultMatch) {
      if (!options.createDownloadUrl) {
        return Response.json(
          { error: 'La descarga de resultados no está configurada' },
          { status: 503 },
        )
      }

      try {
        return await downloadResult(
          resultMatch[1],
          {
            ocrServiceUrl,
            createDownloadUrl: options.createDownloadUrl,
            fetchImpl: options.jobFetchImpl,
            resultFetchImpl: options.resultFetchImpl,
          },
        )
      } catch (error) {
        if (error instanceof ResultDownloadError) {
          return Response.json(
            { error: error.message },
            { status: error.status },
          )
        }

        return Response.json(
          { error: 'No se pudo preparar la descarga' },
          { status: 502 },
        )
      }
    }

    if (isProxyRoute(pathname, request.method)) {
      return proxyRequest(request, ocrServiceUrl, options.fetchImpl)
    }

    if (isApiPath(pathname) || pathname.startsWith('/results/')) {
      return Response.json({ error: 'Ruta o método no soportado' }, { status: 405 })
    }

    return serveFrontend(request, staticRoot)
  }
}
