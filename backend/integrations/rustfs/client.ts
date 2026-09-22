import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

type RustfsConfig = {
  endpoint: string
  bucket: string
  accessKey: string
  secretKey: string
  region: string
  expiresIn: number
}

export function createRustfsClient(config: RustfsConfig) {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  })

  return {
    async createDownloadUrl(key: string, filename: string) {
      const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ResponseContentType: 'text/plain; charset=utf-8',
        ResponseContentDisposition: `attachment; filename="${filename}"`,
      })

      return getSignedUrl(client, command, {
        expiresIn: config.expiresIn,
      })
    },
  }
}
