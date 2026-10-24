// Neon Object Storage: S3-compatible bucket that branches with the database.
// The AWS_* env vars Neon injects configure the client automatically; only
// `forcePathStyle` is required beyond them.

import { S3Client } from "@aws-sdk/client-s3"
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export const AVATAR_BUCKET = process.env.NEON_STORAGE_BUCKET || "uploads"

export function neonStorageEnabled(): boolean {
  return Boolean(
    process.env.AWS_ENDPOINT_URL_S3 &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  )
}

let client: S3Client | null = null

export function getS3Client(): S3Client | null {
  if (!neonStorageEnabled()) return null
  if (!client) {
    client = new S3Client({ forcePathStyle: true })
  }
  return client
}

export async function uploadAvatar(
  userId: number,
  body: Uint8Array,
  contentType: string,
): Promise<{ key: string } | null> {
  const s3 = getS3Client()
  if (!s3) return null
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : contentType === "image/gif" ? "gif" : "jpg"
  const key = `avatars/${userId}/${crypto.randomUUID()}.${ext}`
  await s3.send(new PutObjectCommand({
    Bucket: AVATAR_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }))
  return { key }
}

/** Presigned GET so a private bucket object can be read with an HTTP redirect. */
export async function getAvatarSignedUrl(key: string, expiresIn = 600): Promise<string | null> {
  const s3 = getS3Client()
  if (!s3) return null
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: AVATAR_BUCKET, Key: key }), { expiresIn })
}

export async function deleteObject(key: string): Promise<boolean> {
  const s3 = getS3Client()
  if (!s3) return false
  await s3.send(new DeleteObjectCommand({ Bucket: AVATAR_BUCKET, Key: key }))
  return true
}

/** App-relative URL that serves a bucket object through a presigned redirect. */
export function avatarServeUrl(key: string): string {
  return `/api/storage/${key}`
}

/** True when users.avatar points into the bucket rather than legacy /uploads. */
export function isBucketAvatarUrl(avatar: string | null | undefined): avatar is string {
  return Boolean(avatar && avatar.startsWith("/api/storage/"))
}

/** Bucket key for an avatar URL stored as /api/storage/<key>. */
export function bucketKeyFromAvatarUrl(avatar: string): string {
  return avatar.replace(/^\/api\/storage\//, "")
}
