/**
 * Helper functions to validate and verify images
 */

/**
 * Validates if a URL points to a valid image
 */
export async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    const contentType = response.headers.get('content-type')
    return contentType?.startsWith('image/') ?? false
  } catch (error) {
    console.error('Error validating image URL:', error)
    return false
  }
}

/**
 * Gets filename from URL
 */
export function getFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    return pathname.split('/').pop() || ''
  } catch {
    return url.split('/').pop() || ''
  }
}

/**
 * Gets file extension from URL
 */
export function getExtensionFromUrl(url: string): string {
  const filename = getFilenameFromUrl(url)
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Checks if URL has an image extension
 */
export function hasImageExtension(url: string): boolean {
  const extension = getExtensionFromUrl(url)
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico']
  return validExtensions.includes(extension)
}

/**
 * Adds cache busting to URL
 */
export function getCacheBustingUrl(url: string): string {
  const timestamp = new Date().getTime()
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}t=${timestamp}`
}

/**
 * Validates image dimensions
 */
export async function validateImageDimensions(url: string, maxWidth: number, maxHeight: number): Promise<boolean> {
  try {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
    return img.width <= maxWidth && img.height <= maxHeight
  } catch (error) {
    console.error('Error validating image dimensions:', error)
    return false
  }
}

/**
 * Validates image file size
 */
export async function validateImageSize(url: string, maxSizeInBytes: number): Promise<boolean> {
  try {
    const response = await fetch(url)
    const contentLength = response.headers.get('content-length')
    if (!contentLength) return false
    return parseInt(contentLength) <= maxSizeInBytes
  } catch (error) {
    console.error('Error validating image size:', error)
    return false
  }
}

/**
 * Validates image format
 */
export async function validateImageFormat(url: string, allowedFormats: string[]): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    const contentType = response.headers.get('content-type')
    if (!contentType) return false
    const format = contentType.split('/')[1]
    return allowedFormats.includes(format)
  } catch (error) {
    console.error('Error validating image format:', error)
    return false
  }
}
