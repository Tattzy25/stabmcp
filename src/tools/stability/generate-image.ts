import axios from 'axios';
import FormData from 'form-data';

// Configuration from environment variables
const STABILITY_API_KEY = process.env.STABILITY_API_KEY || '';
const STABILITY_ENGINE = process.env.STABILITY_ENGINE || 'stable-diffusion-xl-1024-v1-0';
const STABILITY_WIDTH = parseInt(process.env.STABILITY_WIDTH || '1024');
const STABILITY_HEIGHT = parseInt(process.env.STABILITY_HEIGHT || '1024');
const STABILITY_STEPS = parseInt(process.env.STABILITY_STEPS || '50');
const STABILITY_CFG_SCALE = parseInt(process.env.STABILITY_CFG_SCALE || '7');
const STABILITY_SAMPLER = process.env.STABILITY_SAMPLER || 'k_lms';

// Utility function to convert buffer to base64
function bufferToBase64(buffer: Buffer, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Generate image with prompt using official Stability AI endpoint
export async function generateImage(params: {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  sampler?: string;
  seed?: number;
  samples?: number;
}): Promise<{
  images: Array<{ base64: string; seed: number }>;
  parameters: any;
}> {
  try {
    const formData = new FormData();
    formData.append('prompt', params.prompt);
    formData.append('output_format', 'png');
    
    if (params.width) formData.append('width', params.width.toString());
    if (params.height) formData.append('height', params.height.toString());
    if (params.steps) formData.append('steps', params.steps.toString());
    if (params.cfg_scale) formData.append('cfg_scale', params.cfg_scale.toString());
    if (params.sampler) formData.append('sampler', params.sampler);
    if (params.seed) formData.append('seed', params.seed.toString());
    if (params.samples) formData.append('samples', params.samples.toString());

    const response = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/generate/core',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );

    // For core generation, we get a single image back
    const imageBuffer = Buffer.from(response.data);
    
    return {
      images: [{
        base64: bufferToBase64(imageBuffer),
        seed: params.seed || Math.floor(Math.random() * 1000000)
      }],
      parameters: {
        prompt: params.prompt,
        width: params.width || STABILITY_WIDTH,
        height: params.height || STABILITY_HEIGHT,
        steps: params.steps || STABILITY_STEPS,
        cfg_scale: params.cfg_scale || STABILITY_CFG_SCALE,
        sampler: params.sampler || STABILITY_SAMPLER,
        seed: params.seed,
        samples: params.samples || 1,
        engine: STABILITY_ENGINE
      }
    };
  } catch (error: any) {
    throw new Error(`Failed to generate image: ${error.message}`);
  }
}

// Generate image using Stable Diffusion 3.5 with official endpoint
export async function generateImageSD35(params: {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  sampler?: string;
  seed?: number;
  samples?: number;
}): Promise<{
  images: Array<{ base64: string; seed: number }>;
  parameters: any;
}> {
  try {
    const formData = new FormData();
    formData.append('prompt', params.prompt);
    formData.append('output_format', 'png');
    formData.append('model', 'sd3.5-medium'); // SD3.5 model
    
    if (params.width) formData.append('width', params.width.toString());
    if (params.height) formData.append('height', params.height.toString());
    if (params.steps) formData.append('steps', params.steps.toString());
    if (params.cfg_scale) formData.append('cfg_scale', params.cfg_scale.toString());
    if (params.sampler) formData.append('sampler', params.sampler);
    if (params.seed) formData.append('seed', params.seed.toString());
    if (params.samples) formData.append('samples', params.samples.toString());

    const response = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/generate/sd3',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );

    const imageBuffer = Buffer.from(response.data);
    
    return {
      images: [{
        base64: bufferToBase64(imageBuffer),
        seed: params.seed || Math.floor(Math.random() * 1000000)
      }],
      parameters: {
        prompt: params.prompt,
        width: params.width || STABILITY_WIDTH,
        height: params.height || STABILITY_HEIGHT,
        steps: params.steps || STABILITY_STEPS,
        cfg_scale: params.cfg_scale || STABILITY_CFG_SCALE,
        sampler: params.sampler || STABILITY_SAMPLER,
        seed: params.seed,
        samples: params.samples || 1,
        engine: 'stable-diffusion-3.5-medium'
      }
    };
  } catch (error: any) {
    throw new Error(`Failed to generate image with SD3.5: ${error.message}`);
  }
}