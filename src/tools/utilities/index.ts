// Utility functions for image processing

/**
 * Convert base64 string to Buffer
 * @param base64 - Base64 encoded image string (with or without data URI prefix)
 * @returns Buffer containing image data
 */
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
}

/**
 * Convert Buffer to base64 string with data URI
 * @param buffer - Buffer containing image data
 * @param mimeType - MIME type of the image (default: 'image/png')
 * @returns Base64 encoded string with data URI prefix
 */
export function bufferToBase64(buffer: Buffer, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}