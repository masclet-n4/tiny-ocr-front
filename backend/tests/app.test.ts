import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../http/app'
import { validateJobId, validateResultKey } from '../features/results/validation'

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
    expect((await app(new Request('http://localhost/results/job-1.txt'))).status).toBe(503)
  })

  test('streams a completed result through Bun', async () => {
    const app = createApp({
      staticRoot,
      ocrServiceUrl: 'http://python:3000',
      jobFetchImpl: async () => Response.json({
        status: 'done',
        result_key: 'job-123.txt',
      }),
      createDownloadUrl: async (key, filename) => {
        expect(key).toBe('job-123.txt')
        expect(filename).toBe('job-123.txt')
        return 'http://rustfs.test/signed'
      },
      resultFetchImpl: async (url) => {
        expect(url).toBe('http://rustfs.test/signed')
        return new Response('OCR result')
      },
    })

    const response = await app(new Request('http://localhost/results/job-123.txt'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="job-123.txt"')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toBe('OCR result')
  })

  test('returns 502 when RustFS cannot serve the signed result', async () => {
    const app = createApp({
      staticRoot,
      jobFetchImpl: async () => Response.json({
        status: 'done',
        result_key: 'job-123.txt',
      }),
      createDownloadUrl: async () => 'http://rustfs.test/signed',
      resultFetchImpl: async () => new Response('not found', { status: 404 }),
    })

    const response = await app(new Request('http://localhost/results/job-123.txt'))

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({
      error: 'No se pudo descargar el resultado desde RustFS',
    })
  })

  test('accepts only safe job ids', () => {
    expect(validateJobId('abc123')).toBe(true)
    expect(validateJobId('job_123-456')).toBe(true)
    expect(validateJobId('../secret')).toBe(false)
    expect(validateJobId('job/123')).toBe(false)
    expect(validateJobId('')).toBe(false)
  })

  test('accepts only the result belonging to the requested job', () => {
    expect(validateResultKey('abc123', 'abc123.txt')).toBe(true)
    expect(validateResultKey('abc123', 'other-job.txt')).toBe(false)
    expect(validateResultKey('abc123', '../secret.txt')).toBe(false)
    expect(validateResultKey('abc123', '/abc123.txt')).toBe(false)
    expect(validateResultKey('abc123', 'abc123.pdf')).toBe(false)
    expect(validateResultKey('abc123', null)).toBe(false)
  })

})
