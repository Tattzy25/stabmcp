// Utility functions for image processing and API management

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

// API Key management with fallback support
export let currentApiKeyIndex = 0;
export const API_KEYS = [
  process.env.STABILITY_API_KEY,
  process.env.STABILITY_API_KEY_ALT
].filter(Boolean);

/**
 * Get the current API key with automatic fallback
 * @returns Current API key string
 */
export function getCurrentApiKey(): string {
  if (API_KEYS.length === 0) {
    throw new Error('No Stability AI API keys configured');
  }
  return API_KEYS[currentApiKeyIndex];
}

/**
 * Rotate to the next API key (for fallback purposes)
 * @returns The new current API key
 */
export function rotateApiKey(): string {
  if (API_KEYS.length <= 1) {
    return getCurrentApiKey();
  }
  
  currentApiKeyIndex = (currentApiKeyIndex + 1) % API_KEYS.length;
  return API_KEYS[currentApiKeyIndex];
}

/**
 * Execute an API call with automatic retry and fallback
 * @param apiCall - Function that makes the API call
 * @param maxRetries - Maximum number of retries (default: API_KEYS.length)
 * @returns The API response
 */
export async function executeWithApiFallback<T>(
  apiCall: (apiKey: string) => Promise<T>,
  maxRetries: number = API_KEYS.length
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const apiKey = getCurrentApiKey();
      return await apiCall(apiKey);
    } catch (error: any) {
      lastError = error;
      
      // Check if this is an authentication error that warrants key rotation
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn(`API key failed with auth error, rotating to next key (attempt ${attempt + 1}/${maxRetries})`);
        rotateApiKey();
      } else {
        // For non-auth errors, we don't rotate keys
        console.warn(`API call failed with non-auth error (attempt ${attempt + 1}/${maxRetries}):`, error.message);
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError || new Error('All API key attempts failed');
}
