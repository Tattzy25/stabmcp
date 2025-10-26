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

// Upscale image (fast 4x)
export async function upscaleFast(params: {
  image: string; // base64 encoded image
}): Promise<{
  image: string; // base64 encoded upscaled image
}> {
  try {
    const formData = new FormData();
    const imageBuffer = base64ToBuffer(params.image);
    
    formData.append('image', imageBuffer, {
      filename: 'image.png',
      contentType: 'image/png'
    });

    const response = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/upscale/fast',
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
    throw new Error(`Failed to upscale image (fast): ${error.message}`);
  }
}

// Upscale image (creative up to 4K)
export async function upscaleCreative(params: {
  image: string; // base64 encoded image
  creativity?: number; // 0.0 to 1.0
}): Promise<{
  image: string; // base64 encoded upscaled image
}> {
  try {
    const formData = new FormData();
    const imageBuffer = base64ToBuffer(params.image);
    
    formData.append('image', imageBuffer, {
      filename: 'image.png',
      contentType: 'image/png'
    });
    
    if (params.creativity !== undefined) {
      formData.append('creativity', params.creativity.toString());
    }

    const response = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/upscale/creative',
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
    throw new Error(`Failed to upscale image (creative): ${error.message}`);
  }
}

// Conservative upscale - minimal alterations
export async function upscaleConservative(
  image: string,
  prompt: string,
  output_format?: string,
  seed?: number,
  negative_prompt?: string,
  creativity?: number
): Promise<string> {
  const formData = new FormData();
  formData.append('image', Buffer.from(image, 'base64'));
  formData.append('prompt', prompt);
  if (output_format) formData.append('output_format', output_format);
  if (seed) formData.append('seed', seed.toString());
  if (negative_prompt) formData.append('negative_prompt', negative_prompt);
  if (creativity) formData.append('creativity', creativity.toString());

  const response = await axios.post(
    'https://api.stability.ai/v2beta/stable-image/upscale/conservative',
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