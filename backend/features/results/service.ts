import { validateJobId, validateResultKey } from './validation'

type JobResponse = {
  status?: string
  result_key?: unknown
}

type ResultsDependencies = {
  ocrServiceUrl: string
  createDownloadUrl: (key: string, filename: string) => Promise<string>
  fetchImpl?: (url: string) => Promise<Response>
}

type ResultResponseDependencies = ResultsDependencies & {
  resultFetchImpl?: (url: string) => Promise<Response>
}

export class ResultDownloadError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function createResultDownloadUrl(
  jobId: string,
  dependencies: ResultsDependencies,
): Promise<string> {
  if (!validateJobId(jobId)) {
    throw new ResultDownloadError('Identificador de job no válido', 400)
  }

  const fetchImpl = dependencies.fetchImpl ?? ((url: string) => fetch(url))
  const serviceUrl = dependencies.ocrServiceUrl.replace(/\/$/, '')
  const jobUrl = `${serviceUrl}/jobs/${encodeURIComponent(jobId)}`

  let response: Response

  try {
    response = await fetchImpl(jobUrl)
  } catch {
    throw new ResultDownloadError(
      'El servicio OCR no está disponible',
      502,
    )
  }

  if (response.status === 404) {
    throw new ResultDownloadError('Job no encontrado', 404)
  }

  if (!response.ok) {
    throw new ResultDownloadError(
      'No se pudo consultar el job',
      502,
    )
  }

  let job: JobResponse

  try {
    job = await response.json() as JobResponse
  } catch {
    throw new ResultDownloadError(
      'El servicio OCR devolvió una respuesta inválida',
      502,
    )
  }

  if (job.status !== 'done') {
    throw new ResultDownloadError(
      'El resultado todavía no está disponible',
      409,
    )
  }

  if (!validateResultKey(jobId, job.result_key)) {
    throw new ResultDownloadError(
      'El job no tiene un resultado válido',
      502,
    )
  }

  try {
    return await dependencies.createDownloadUrl(
      job.result_key,
      `${jobId}.txt`,
    )
  } catch {
    throw new ResultDownloadError(
      'No se pudo preparar la descarga',
      502,
    )
  }
}

export async function downloadResult(
  jobId: string,
  dependencies: ResultResponseDependencies,
): Promise<Response> {
  const signedUrl = await createResultDownloadUrl(jobId, dependencies)
  const fetchImpl = dependencies.resultFetchImpl ?? ((url: string) => fetch(url))

  let resultResponse: Response
  try {
    resultResponse = await fetchImpl(signedUrl)
  } catch {
    throw new ResultDownloadError(
      'No se pudo descargar el resultado desde RustFS',
      502,
    )
  }

  if (!resultResponse.ok || !resultResponse.body) {
    throw new ResultDownloadError(
      'No se pudo descargar el resultado desde RustFS',
      502,
    )
  }

  const headers = new Headers({
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Disposition': `attachment; filename="${jobId}.txt"`,
    'Cache-Control': 'no-store',
  })

  return new Response(resultResponse.body, { headers })
}
