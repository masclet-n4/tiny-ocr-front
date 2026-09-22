import { describe, expect, mock, test } from 'bun:test'
import {
  createResultDownloadUrl,
  downloadResult,
  ResultDownloadError,
} from '../features/results/service'

function dependencies(
  response: Response,
  createDownloadUrl: (key: string, filename: string) => Promise<string> = async () => 'https://rustfs.test/signed-url',
) {
  return {
    ocrServiceUrl: 'http://python:3000',
    fetchImpl: mock(async (url: string) => {
      expect(url).toBe('http://python:3000/jobs/job-123')
      return response
    }),
    createDownloadUrl,
  }
}

describe('createResultDownloadUrl', () => {
  test('creates a signed URL using the result key returned by Python', async () => {
    const createDownloadUrl = mock(async (key: string, filename: string) => {
      expect(key).toBe('job-123.txt')
      expect(filename).toBe('job-123.txt')
      return 'https://rustfs.test/signed-url'
    })

    const result = await createResultDownloadUrl(
      'job-123',
      dependencies(
        Response.json({
          status: 'done',
          result_key: 'job-123.txt',
        }),
        createDownloadUrl,
      ),
    )

    expect(result).toBe('https://rustfs.test/signed-url')
    expect(createDownloadUrl).toHaveBeenCalledTimes(1)
  })

  test('rejects a job that is still processing', async () => {
    await expect(
      createResultDownloadUrl(
        'job-123',
        dependencies(Response.json({ status: 'processing' })),
      ),
    ).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<ResultDownloadError>)
  })

  test('returns 404 when the job does not exist', async () => {
    await expect(
      createResultDownloadUrl(
        'job-123',
        dependencies(new Response(null, { status: 404 })),
      ),
    ).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<ResultDownloadError>)
  })

  test('rejects a result key belonging to another job', async () => {
    await expect(
      createResultDownloadUrl(
        'job-123',
        dependencies(
          Response.json({
            status: 'done',
            result_key: 'other-job.txt',
          }),
        ),
      ),
    ).rejects.toMatchObject({
      status: 502,
    } satisfies Partial<ResultDownloadError>)
  })

  test('returns 502 when Python is unavailable', async () => {
    const dependenciesWithFailure = {
      ocrServiceUrl: 'http://python:3000',
      fetchImpl: mock(async () => {
        throw new Error('connection refused')
      }),
      createDownloadUrl: mock(async () => 'unused'),
    }

    await expect(
      createResultDownloadUrl('job-123', dependenciesWithFailure),
    ).rejects.toMatchObject({
      status: 502,
    } satisfies Partial<ResultDownloadError>)
  })
  test('rejects an invalid job id before contacting Python', async () => {
    const fetchImpl = mock(async () => Response.json({ status: 'done' }))

    await expect(
      createResultDownloadUrl('../secret', {
        ocrServiceUrl: 'http://python:3000',
        fetchImpl,
        createDownloadUrl: async () => 'unused',
      }),
    ).rejects.toMatchObject({ status: 400 } satisfies Partial<ResultDownloadError>)

    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('rejects an invalid Python response', async () => {
    await expect(
      createResultDownloadUrl(
        'job-123',
        dependencies(new Response('not-json', { status: 200 })),
      ),
    ).rejects.toMatchObject({ status: 502 } satisfies Partial<ResultDownloadError>)
  })

  test('returns 502 when signing the result fails', async () => {
    await expect(
      createResultDownloadUrl(
        'job-123',
        dependencies(
          Response.json({ status: 'done', result_key: 'job-123.txt' }),
          async () => { throw new Error('RustFS credentials rejected') },
        ),
      ),
    ).rejects.toMatchObject({ status: 502 } satisfies Partial<ResultDownloadError>)
  })

  test('returns 502 when RustFS cannot be reached', async () => {
    await expect(
      downloadResult('job-123', {
        ...dependencies(Response.json({
          status: 'done',
          result_key: 'job-123.txt',
        })),
        resultFetchImpl: async () => { throw new Error('connection refused') },
      }),
    ).rejects.toMatchObject({ status: 502 } satisfies Partial<ResultDownloadError>)
  })
})
