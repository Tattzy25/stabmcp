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

// Control sketch - translate hand-drawn sketch to production-grade image
export async function controlSketch(params: {
  image: string; // base64 encoded sketch image
  prompt: string;
}): Promise<{
  image: string; // base64 encoded production image
}> {
  try {
    const formData = new FormData();
    const imageBuffer = base64ToBuffer(params.image);
    
    formData.append('image', imageBuffer, {
      filename: 'sketch.png',
      contentType: 'image/png'
    });
    formData.append('prompt', params.prompt);

    const response = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/control/sketch',
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
    throw new Error(`Failed to process sketch: ${error.message}`);
  }
}

// Control style - generate image in style of reference
export async function controlStyle(params: {
  image: string; // base64 encoded style reference image
  prompt: string;
}): Promise<{
  image: string; // base64 encoded styled image
}> {
  try {
    const formData = new FormData();
    const imageBuffer = base64ToBuffer(params.image);
    
    formData.append('image', imageBuffer, {
      filename: 'style.png',
      contentType: 'image/png'
    });
    formData.append('prompt', params.prompt);

    const response = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/control/style',
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
    throw new Error(`Failed to apply style: ${error.message}`);
  }
}

// Control structure - maintain structure of reference
export async function controlStructure(params: {
  image: string; // base64 encoded structure reference image
  prompt: string;
}): Promise<{
  image: string; // base64 encoded structured image
}> {
  try {
    const formData = new FormData();
    const imageBuffer = base64ToBuffer(params.image);
    
    formData.append('image', imageBuffer, {
      filename: 'structure.png',
      contentType: 'image/png'
    });
    formData.append('prompt', params.prompt);

    const response = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/control/structure',
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
    throw new Error(`Failed to maintain structure: ${error.message}`);
  }
}