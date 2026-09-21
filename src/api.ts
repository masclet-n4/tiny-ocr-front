export type JobStatus = 'starting' | 'processing' | 'done' | 'error'

export type Job = {
  status: JobStatus
  filename?: string
  size?: number
  pages_processed?: number
  total_pages?: number
  pages_text_layer?: number
  avg_score?: number
  text?: string
  result_path?: string
  error?: string
}

export async function submitFile(file: File): Promise<{ job_id: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/ocr/async', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`No se pudo subir el archivo: HTTP ${response.status}`)
  }

  return response.json()
}

export async function getJob(jobId: string): Promise<Job> {
  const response = await fetch(`/jobs/${encodeURIComponent(jobId)}`)

  if (!response.ok) {
    throw new Error(`No se pudo consultar el job: HTTP ${response.status}`)
  }

  return response.json()
}

export function getResultUrl(jobId: string): string {
  return `/results/${encodeURIComponent(jobId)}.txt`
}
