import { test, expect, type Page } from '@playwright/test'

// A valid, generated two-page PDF, usable by both PDF.js and the real OCR service.
function pdfFixture() {
  const stream = 'BT /F1 18 Tf 50 100 Td (Playwright OCR smoke test) Tj ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return { name: 'sample.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) }
}

async function selectPdf(page: Page) {
  await page.locator('input[type=file]').setInputFiles(pdfFixture())
}

async function mockJob(page: Page, initial: Record<string, unknown>) {
  let state = initial
  let polls = 0
  await page.route('**/ocr/async', async route => {
    expect(route.request().headers()['content-type']).toContain('multipart/form-data')
    expect(route.request().postDataBuffer()?.toString()).toContain('sample.pdf')
    await route.fulfill({ json: { job_id: 'test-job' } })
  })
  await page.route('**/jobs/test-job', async route => {
    polls++
    await route.fulfill({ json: state })
  })
  return { set: (next: Record<string, unknown>) => { state = next }, polls: () => polls }
}

test('initial load from Bun has no runtime errors', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const started = Date.now()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'JK tiny OCR' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Procesar archivo' })).toBeDisabled()
  expect(errors).toEqual([])
  await testInfo.attach('load-timing', { body: `${Date.now() - started} ms to visible UI`, contentType: 'text/plain' })
})

test('select, remove and select the same file again', async ({ page }) => {
  await page.goto('/')
  await selectPdf(page)
  await expect(page.getByRole('cell', { name: 'sample.pdf' })).toBeVisible()
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByRole('button', { name: 'Procesar archivo' })).toBeDisabled()
  await selectPdf(page)
  await expect(page.getByRole('cell', { name: 'sample.pdf' })).toBeVisible()
})

test('rejects invalid types and files larger than 10 MB', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('not a PDF') })
  await expect(page.getByRole('alert')).toContainText('bad.txt')
  await page.locator('input[type=file]').setInputFiles({ name: 'large.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) })
  await expect(page.getByRole('alert')).toContainText('large.pdf')
  await expect(page.getByRole('button', { name: 'Procesar archivo' })).toBeDisabled()
})

test('PDF preview renders and paginates', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await selectPdf(page)
  await page.getByRole('cell', { name: 'sample.pdf' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
  await expect.poll(() => page.locator('canvas').evaluate(canvas => canvas.width)).toBe(210)
  // Wait until rendering has completed, not just canvas creation.
  await expect.poll(() => page.locator('canvas').evaluate(canvas => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data).some((value, i) => i % 4 === 3 && value > 0))).toBe(true)
  await page.getByRole('button', { name: 'Página siguiente' }).click()
  await expect(page.getByRole('button', { name: 'Página siguiente' })).toBeDisabled()
  await page.getByRole('button', { name: 'Página anterior' }).click()
  await expect(page.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
  await page.getByRole('button', { name: 'Cerrar modal' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('progress follows actual page counts visually and polling stops on done', async ({ page }) => {
  const job = await mockJob(page, { status: 'processing', pages_processed: 1, total_pages: 4 })
  await page.goto('/')
  await selectPdf(page)
  await page.getByRole('button', { name: 'Procesar archivo' }).click()
  await expect(page.getByText('25%', { exact: true })).toBeVisible()
  const fill = page.locator('div[style*="width:"]')
  await expect.poll(() => fill.evaluate(el => el.getBoundingClientRect().width / el.parentElement!.getBoundingClientRect().width)).toBeCloseTo(0.25, 1)
  job.set({ status: 'processing', pages_processed: 2, total_pages: 4 })
  await expect(page.getByText('50%', { exact: true })).toBeVisible()
  await expect.poll(() => fill.evaluate(el => el.getBoundingClientRect().width / el.parentElement!.getBoundingClientRect().width)).toBeCloseTo(0.5, 1)
  job.set({ status: 'done', pages_processed: 4, total_pages: 4, text: 'OCR result' })
  await expect(page.getByRole('button', { name: 'Descargar' })).toBeVisible()
  const count = job.polls()
  await page.waitForTimeout(1200)
  expect(job.polls()).toBe(count)
  await expect(page.getByText('100%', { exact: true })).toBeVisible()
})

test('unknown page total shows preparation instead of a misleading percentage', async ({ page }) => {
  const job = await mockJob(page, { status: 'starting' })
  await page.goto('/')
  await selectPdf(page)
  await page.getByRole('button', { name: 'Procesar archivo' }).click()
  await expect(page.getByText('Preparando documento...', { exact: true })).toBeVisible()
  await expect(page.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  job.set({ status: 'processing', total_pages: 0, pages_processed: 0 })
  await expect.poll(job.polls).toBeGreaterThan(1)
  await expect(page.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
  job.set({ status: 'processing', total_pages: 4, pages_processed: -1 })
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  job.set({ status: 'processing', total_pages: 4, pages_processed: 9 })
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
})

test('displays the backend job error', async ({ page }) => {
  await mockJob(page, { status: 'error', errors: { message: 'PDF dañado' } })
  await page.goto('/')
  await selectPdf(page)
  await page.getByRole('button', { name: 'Procesar archivo' }).click()
  await expect(page.getByRole('alert')).toContainText('PDF dañado')
  await expect(page.getByRole('button', { name: 'Procesar archivo' })).toBeEnabled()
})

test('reports upload and polling HTTP errors', async ({ page }) => {
  await page.route('**/ocr/async', route => route.fulfill({ status: 413 }))
  await page.goto('/')
  await selectPdf(page)
  await page.getByRole('button', { name: 'Procesar archivo' }).click()
  await expect(page.getByRole('alert')).toContainText('HTTP 413')
  await page.unroute('**/ocr/async')
  await page.route('**/ocr/async', route => route.fulfill({ json: { job_id: 'broken' } }))
  await page.route('**/jobs/broken', route => route.fulfill({ status: 503 }))
  await page.getByRole('button', { name: 'Procesar archivo' }).click()
  await expect(page.getByRole('alert')).toContainText('HTTP 503')
})

test('downloads inline OCR text', async ({ page }) => {
  await mockJob(page, { status: 'done', text: 'Texto OCR con acentos: áéíóú' })
  await page.goto('/')
  await selectPdf(page)
  await page.getByRole('button', { name: 'Procesar archivo' }).click()
  const download = page.waitForEvent('download', { timeout: 5000 })
  await page.getByRole('button', { name: 'Descargar' }).click()
  const result = await download
  expect(result.suggestedFilename()).toBe('sample.txt')
  const stream = await result.createReadStream()
  const chunks = []
  for await (const chunk of stream!) chunks.push(chunk)
  expect(Buffer.concat(chunks).toString()).toBe('Texto OCR con acentos: áéíóú')
})

test('stored result downloads through the known endpoint and reports missing files', async ({ page }) => {
  await mockJob(page, { status: 'done', result_path: '/internal/path/test-job.txt' })
  await page.route('**/results/test-job.txt', route => route.fulfill({ status: 404 }))
  await page.goto('/')
  await selectPdf(page)
  await page.getByRole('button', { name: 'Procesar archivo' }).click()
  await page.getByRole('button', { name: 'Descargar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('HTTP 404')
  await page.unroute('**/results/test-job.txt')
  await page.route('**/results/test-job.txt', route => route.fulfill({ contentType: 'text/html', body: '<html>SPA fallback</html>' }))
  await page.getByRole('button', { name: 'Descargar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('no ha devuelto un archivo de texto')
  await page.unroute('**/results/test-job.txt')
  await page.route('**/results/test-job.txt', route => route.fulfill({ contentType: 'text/plain', body: 'Stored OCR result' }))
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar', exact: true }).click()
  const result = await download
  expect(result.suggestedFilename()).toBe('sample.txt')
  const stream = await result.createReadStream()
  const chunks = []
  for await (const chunk of stream!) chunks.push(chunk)
  expect(Buffer.concat(chunks).toString()).toBe('Stored OCR result')
})

test('RustFS-only result enables the backend download', async ({ page }) => {
  await mockJob(page, { status: 'done', result_key: 'test-job.txt' })
  await page.route('**/results/test-job.txt', route => route.fulfill({
    contentType: 'text/plain',
    body: 'Stored OCR result',
  }))
  await page.goto('/')
  await selectPdf(page)
  await page.getByRole('button', { name: 'Procesar archivo' }).click()
  await expect(page.getByText('100%', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Descargar' })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar' }).click()
  const result = await download
  expect(result.suggestedFilename()).toBe('sample.txt')
})

test('drag and drop selects a file', async ({ page }) => {
  await page.goto('/')
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer()
    data.items.add(new File(['%PDF-1.4'], 'dropped.pdf', { type: 'application/pdf' }))
    return data
  })
  await page.locator('label').dispatchEvent('drop', { dataTransfer: transfer })
  await expect(page.getByRole('cell', { name: 'dropped.pdf' })).toBeVisible()
  await transfer.dispose()
})

test('image preview loads and closes', async ({ page }) => {
  await page.goto('/')
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    canvas.getContext('2d')!.fillRect(0, 0, 1, 1)
    return canvas.toDataURL('image/png').split(',')[1]!
  })
  await page.locator('input[type=file]').setInputFiles({
    name: 'pixel.png', mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  })
  await page.getByRole('cell', { name: 'pixel.png' }).click()
  const image = page.getByRole('img', { name: 'pixel.png' })
  await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1)
  await page.getByRole('button', { name: 'Cerrar modal' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('mobile page has no horizontal overflow and supports upload', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await selectPdf(page)
  await expect(page.getByRole('button', { name: 'Procesar archivo' })).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('real backend processes a generated PDF', async ({ page }, testInfo) => {
  test.skip(process.env.OCR_LIVE !== '1', 'Opt-in: creates one job in the running OCR service per browser')
  test.setTimeout(60_000)
  const responses: Record<string, unknown>[] = []
  await page.route('**/jobs/*', async route => {
    const response = await route.fetch()
    responses.push(await response.json())
    await route.fulfill({ response })
  })
  await page.goto('/')
  await selectPdf(page)
  await page.getByRole('button', { name: 'Procesar archivo' }).click()
  await expect(page.getByText('Procesamiento completado', { exact: true })).toBeVisible({ timeout: 45_000 })
  expect(responses.at(-1)?.status).toBe('done')
  const result = responses.at(-1)!
  expect(result.pages_processed).toBe(2)
  expect(result.total_pages).toBe(2)
  expect(typeof result.text === 'string' || typeof result.result_path === 'string' || typeof result.result_key === 'string').toBe(true)
  if (typeof result.result_key === 'string' && typeof result.text !== 'string' && !result.result_path) {
    await expect(page.getByText(/Resultado guardado en RustFS/)).toBeVisible()
  } else {
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Descargar' }).click()
    const stream = await (await download).createReadStream()
    const chunks = []
    for await (const chunk of stream!) chunks.push(chunk)
    expect(Buffer.concat(chunks).toString()).toContain('Playwright OCR smoke test')
  }
  await testInfo.attach('live-job', { body: JSON.stringify(result, null, 2), contentType: 'application/json' })
})
