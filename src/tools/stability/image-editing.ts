import axios from 'axios';
import FormData from 'form-data';
import { executeWithApiFallback } from '../utilities/index.js';

// Utility function to convert base64 to buffer
function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
}

// Utility function to convert buffer to base64
function bufferToBase64(buffer: Buffer, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Remove background from image
export async function removeBackground(params: {
  image: string; // base64 encoded image
}): Promise<{
  image: string; // base64 encoded image with background removed
}> {
  try {
    const formData = new FormData();
    const imageBuffer = base64ToBuffer(params.image);
    
    formData.append('image', imageBuffer, {
      filename: 'image.png',
      contentType: 'image/png'
    });

    const response = await executeWithApiFallback(async (apiKey) => {
      return await axios.post(
        'https://api.stability.ai/v2beta/stable-image/edit/remove-background',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            ...formData.getHeaders()
          },
          responseType: 'arraybuffer'
        }
      );
    });

    return {
      image: bufferToBase64(Buffer.from(response.data))
    };
  } catch (error: any) {
    throw new Error(`Failed to remove background: ${error.message}`);
  }
}

// Outpaint - extend image in any direction
export async function outpaint(params: {
  image: string; // base64 encoded image
  prompt: string;
  direction: 'left' | 'right' | 'top' | 'bottom' | 'all';
  width?: number;
  height?: number;
}): Promise<{
  image: string; // base64 encoded outpainted image
}> {
  try {
    const formData = new FormData();
    const imageBuffer = base64ToBuffer(params.image);
    
    formData.append('image', imageBuffer, {
      filename: 'image.png',
      contentType: 'image/png'
    });
    formData.append('prompt', params.prompt);
    formData.append('direction', params.direction);
    
    if (params.width) formData.append('width', params.width.toString());
    if (params.height) formData.append('height', params.height.toString());

    const response = await executeWithApiFallback(async (apiKey) => {
      return await axios.post(
        'https://api.stability.ai/v2beta/stable-image/edit/outpaint',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            ...formData.getHeaders()
          },
          responseType: 'arraybuffer'
        }
      );
    });

    return {
      image: bufferToBase64(Buffer.from(response.data))
    };
  } catch (error: any) {
    throw new Error(`Failed to outpaint image: ${error.message}`);
  }
}

// Search and replace objects in image
export async function searchAndReplace(params: {
  image: string; // base64 encoded image
  search_prompt: string; // what to search for
  replace_prompt: string; // what to replace it with
}): Promise<{
  image: string; // base64 encoded modified image
}> {
  try {
    const formData = new FormData();
    const imageBuffer = base64ToBuffer(params.image);
    
    formData.append('image', imageBuffer, {
      filename: 'image.png',
      contentType: 'image/png'
    });
    formData.append('search_prompt', params.search_prompt);
    formData.append('replace_prompt', params.replace_prompt);

    const response = await executeWithApiFallback(async (apiKey) => {
      return await axios.post(
        'https://api.stability.ai/v2beta/stable-image/edit/search-replace',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            ...formData.getHeaders()
          },
          responseType: 'arraybuffer'
        }
      );
    });

    return {
      image: bufferToBase64(Buffer.from(response.data))
    };
  } catch (error: any) {
    throw new Error(`Failed to search and replace: ${error.message}`);
  }
}