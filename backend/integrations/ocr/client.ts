type Fetch = (request: Request) => Promise<Response>

export function isProxyRoute(pathname: string, method: string) {
  return (pathname === '/ocr/async' && method === 'POST')
    || (/^\/jobs\/[^/]+$/.test(pathname) && method === 'GET')
}

export function isApiPath(pathname: string) {
  return pathname === '/ocr/async' || pathname.startsWith('/jobs/')
}

export async function proxyRequest(
  request: Request,
  ocrServiceUrl: string,
  fetchImpl: Fetch = fetch,
) {
  const url = new URL(request.url)

  try {
    const upstreamUrl = `${ocrServiceUrl.replace(/\/$/, '')}${url.pathname}${url.search}`
    return await fetchImpl(new Request(upstreamUrl, request))
  } catch {
    return Response.json(
      { error: 'El servicio OCR no está disponible' },
      { status: 502 },
    )
  }
}
