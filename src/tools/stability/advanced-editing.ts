import axios from 'axios';
import FormData from 'form-data';

// Utility function to convert base64 to buffer
function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
}

// Utility function to convert buffer to base64
function bufferToBase64(buffer: Buffer, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Replace background and relight
export async function replaceBackgroundAndRelight(params: {
  image: string; // base64 encoded image
  background_prompt: string;
}): Promise<{
  image: string; // base64 encoded image with new background
}> {
  try {
    const formData = new FormData();
    const imageBuffer = base64ToBuffer(params.image);
    
    formData.append('image', imageBuffer, {
      filename: 'image.png',
      contentType: 'image/png'
    });
    formData.append('background_prompt', params.background_prompt);

    const response = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/edit/replace-background-relight',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      image: bufferToBase64(Buffer.from(response.data))
    };
  } catch (error: any) {
    throw new Error(`Failed to replace background and relight: ${error.message}`);
  }
}

// Search and recolor objects
export async function searchAndRecolor(
  image: string,
  prompt: string,
  search_prompt: string,
  color: string,
  output_format?: string,
  seed?: number
): Promise<string> {
  const formData = new FormData();
  formData.append('image', Buffer.from(image, 'base64'));
  formData.append('prompt', prompt);
  formData.append('search_prompt', search_prompt);
  formData.append('color', color);
  if (output_format) formData.append('output_format', output_format);
  if (seed) formData.append('seed', seed.toString());

  const response = await axios.post(
    'https://api.stability.ai/v2beta/stable-image/edit/search-recolor',
    formData,
    {
      headers: {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: 'image/webp',
        ...formData.getHeaders(),
      },
      responseType: 'arraybuffer',
    }
  );

  return Buffer.from(response.data, 'binary').toString('base64');
}

// Erase objects from image
export async function erase(
  image: string,
  mask: string,
  output_format?: string,
  seed?: number,
  grow_mask?: number
): Promise<string> {
  const formData = new FormData();
  formData.append('image', Buffer.from(image, 'base64'));
  formData.append('mask', Buffer.from(mask, 'base64'));
  if (output_format) formData.append('output_format', output_format);
  if (seed) formData.append('seed', seed.toString());
  if (grow_mask) formData.append('grow_mask', grow_mask.toString());

  const response = await axios.post(
    'https://api.stability.ai/v2beta/stable-image/edit/erase',
    formData,
    {
      headers: {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: 'image/webp',
        ...formData.getHeaders(),
      },
      responseType: 'arraybuffer',
    }
  );

  return Buffer.from(response.data, 'binary').toString('base64');
}

// Inpaint - fill masked areas with new content
export async function inpaint(
  image: string,
  prompt: string,
  output_format?: string,
  seed?: number,
  mask?: string,
  search_prompt?: string
): Promise<string> {
  const formData = new FormData();
  formData.append('image', Buffer.from(image, 'base64'));
  formData.append('prompt', prompt);
  if (output_format) formData.append('output_format', output_format);
  if (seed) formData.append('seed', seed.toString());
  if (mask) formData.append('mask', Buffer.from(mask, 'base64'));
  if (search_prompt) formData.append('search_prompt', search_prompt);

  const response = await axios.post(
    'https://api.stability.ai/v2alpha/generation/stable-image/inpaint',
    formData,
    {
      headers: {
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        Accept: 'image/webp',
        ...formData.getHeaders(),
      },
      responseType: 'arraybuffer',
    }
  );

  return Buffer.from(response.data, 'binary').toString('base64');
}