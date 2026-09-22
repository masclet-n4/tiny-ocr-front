import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from './app'

describe('Bun server', () => {
  let staticRoot: string

  beforeEach(async () => {
    staticRoot = await mkdtemp(join(tmpdir(), 'tiny-ocr-front-'))
    await Bun.write(join(staticRoot, 'index.html'), '<main>OCR app</main>')
    await Bun.write(join(staticRoot, 'app.js'), 'console.log("app")')
  })

  afterEach(async () => {
    await rm(staticRoot, { recursive: true, force: true })
  })

  test('serves assets and uses index.html as SPA fallback', async () => {
    const app = createApp({ staticRoot })

    const root = await app(new Request('http://localhost/'))
    const asset = await app(new Request('http://localhost/app.js'))
    const fallback = await app(new Request('http://localhost/history/job-1'))

    expect(await root.text()).toBe('<main>OCR app</main>')
    expect(asset.status).toBe(200)
    expect(await asset.text()).toBe('console.log("app")')
    expect(fallback.headers.get('content-type')).toContain('text/html')
    expect(await fallback.text()).toBe('<main>OCR app</main>')
  })

  test('forwards an OCR multipart upload without changing its contents', async () => {
    const fetchImpl = mock(async (request: Request) => {
      expect(request.url).toBe('http://python:3000/ocr/async?language=es')
      expect(request.method).toBe('POST')
      const formData = await request.formData()
      const file = formData.get('file')
      expect(file).toBeInstanceOf(File)
      expect(await (file as File).text()).toBe('%PDF-test')
      return Response.json({ job_id: 'job-1' }, { status: 202 })
    })
    const app = createApp({ staticRoot, ocrServiceUrl: 'http://python:3000/', fetchImpl })
    const formData = new FormData()
    formData.set('file', new File(['%PDF-test'], 'document.pdf', { type: 'application/pdf' }))

    const response = await app(new Request('http://localhost/ocr/async?language=es', {
      method: 'POST',
      body: formData,
    }))

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ job_id: 'job-1' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  test('forwards job responses and query strings unchanged', async () => {
    const fetchImpl = mock(async (request: Request) => {
      expect(request.url).toBe('http://python:3000/jobs/job%20one?details=true')
      return Response.json({ status: 'processing' }, { status: 206 })
    })
    const app = createApp({ staticRoot, ocrServiceUrl: 'http://python:3000', fetchImpl })

    const response = await app(new Request('http://localhost/jobs/job%20one?details=true'))

    expect(response.status).toBe(206)
    expect(await response.json()).toEqual({ status: 'processing' })
  })

  test('returns 502 when the Python service is unavailable', async () => {
    const app = createApp({
      staticRoot,
      fetchImpl: async () => { throw new Error('connection refused') },
    })

    const response = await app(new Request('http://localhost/jobs/job-1'))

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'El servicio OCR no está disponible' })
  })

  test('rejects unsupported API methods and routes', async () => {
    const app = createApp({ staticRoot })

    expect((await app(new Request('http://localhost/ocr/async'))).status).toBe(405)
    expect((await app(new Request('http://localhost/jobs/job-1', { method: 'DELETE' }))).status).toBe(405)
    expect((await app(new Request('http://localhost/results/job-1.txt'))).status).toBe(200)
  })
})
