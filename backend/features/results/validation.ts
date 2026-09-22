export function validateJobId(jobId: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(jobId)
}

export function validateResultKey(
  jobId: string,
  resultKey: unknown,
): resultKey is string {
  if (typeof resultKey !== 'string') {
    return false
  }

  if (resultKey !== `${jobId}.txt`) {
    return false
  }

  if (
    resultKey.startsWith('/')
    || resultKey.includes('\\')
    || resultKey.includes('..')
    || /[\u0000-\u001f\u007f]/.test(resultKey)
  ) {
    return false
  }

  return true
}
