import { resolve, sep } from 'node:path'

export async function serveFrontend(request: Request, staticRoot: string) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let pathname: string
  try {
    pathname = decodeURIComponent(new URL(request.url).pathname)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const requestedPath = resolve(staticRoot, `.${pathname}`)
  const isInsideStaticRoot = requestedPath === staticRoot
    || requestedPath.startsWith(`${staticRoot}${sep}`)
  const file = isInsideStaticRoot ? Bun.file(requestedPath) : null
  const responseFile = file && await file.exists()
    ? file
    : Bun.file(resolve(staticRoot, 'index.html'))

  if (!await responseFile.exists()) {
    return new Response('Frontend no compilado', { status: 503 })
  }

  const headers = { 'Content-Type': responseFile.type }
  return request.method === 'HEAD'
    ? new Response(null, { headers })
    : new Response(responseFile, { headers })
}
