import axios from 'axios';
import FormData from 'form-data';

// Configuration from environment variables - REQUIRED
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
if (!STABILITY_API_KEY) {
  throw new Error('STABILITY_API_KEY environment variable is required');
}

const STABILITY_ENGINE = process.env.STABILITY_ENGINE;
const STABILITY_WIDTH = process.env.STABILITY_WIDTH ? parseInt(process.env.STABILITY_WIDTH) : undefined;
const STABILITY_HEIGHT = process.env.STABILITY_HEIGHT ? parseInt(process.env.STABILITY_HEIGHT) : undefined;
const STABILITY_STEPS = process.env.STABILITY_STEPS ? parseInt(process.env.STABILITY_STEPS) : undefined;
const STABILITY_CFG_SCALE = process.env.STABILITY_CFG_SCALE ? parseFloat(process.env.STABILITY_CFG_SCALE) : undefined;
const STABILITY_SAMPLER = process.env.STABILITY_SAMPLER;

// SD3.5 specific configuration
const STABILITY_SD35_MODEL = process.env.STABILITY_SD35_MODEL;
const STABILITY_SD35_WIDTH = process.env.STABILITY_SD35_WIDTH ? parseInt(process.env.STABILITY_SD35_WIDTH) : undefined;
const STABILITY_SD35_HEIGHT = process.env.STABILITY_SD35_HEIGHT ? parseInt(process.env.STABILITY_SD35_HEIGHT) : undefined;
const STABILITY_SD35_STEPS = process.env.STABILITY_SD35_STEPS ? parseInt(process.env.STABILITY_SD35_STEPS) : undefined;
const STABILITY_SD35_CFG_SCALE = process.env.STABILITY_SD35_CFG_SCALE ? parseFloat(process.env.STABILITY_SD35_CFG_SCALE) : undefined;
const STABILITY_SD35_SAMPLER = process.env.STABILITY_SD35_SAMPLER;

// Utility function to convert buffer to base64
function bufferToBase64(buffer: Buffer, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Generate image with prompt using official Stability AI endpoint
export async function generateImage(params: {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  steps?: number;
  cfg_scale?: number;
  sampler?: string;
  seed?: number;
  samples?: number;
  output_format?: string;
  model?: string;
  mode?: string;
}): Promise<{
  images: Array<{ base64: string; seed: number }>;
  parameters: any;
}> {
  try {
    const formData = new FormData();
    formData.append('prompt', params.prompt);
    
    // Handle aspect ratio or width/height
    if (params.aspect_ratio) {
      formData.append('aspect_ratio', params.aspect_ratio);
    } else {
      formData.append('width', (params.width || STABILITY_WIDTH || 1024).toString());
      formData.append('height', (params.height || STABILITY_HEIGHT || 1024).toString());
    }
    
    // Optional parameters
    if (params.negative_prompt) formData.append('negative_prompt', params.negative_prompt);
    formData.append('steps', (params.steps || STABILITY_STEPS || 30).toString());
    formData.append('cfg_scale', (params.cfg_scale || STABILITY_CFG_SCALE || 7.0).toString());
    formData.append('sampler', params.sampler || STABILITY_SAMPLER || 'k_dpm_2');
    if (params.seed) formData.append('seed', params.seed.toString());
    formData.append('samples', (params.samples || 1).toString());
    formData.append('output_format', params.output_format || 'png');
    if (params.model) formData.append('model', params.model);
    if (params.mode) formData.append('mode', params.mode);

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
  negative_prompt?: string;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  steps?: number;
  cfg_scale?: number;
  sampler?: string;
  seed?: number;
  samples?: number;
  output_format?: string;
  model?: string;
  mode?: string;
}): Promise<{
  images: Array<{ base64: string; seed: number }>;
  parameters: any;
}> {
  try {
    const formData = new FormData();
    formData.append('prompt', params.prompt);
    
    // Handle aspect ratio or width/height
    if (params.aspect_ratio) {
      formData.append('aspect_ratio', params.aspect_ratio);
    } else {
      formData.append('width', (params.width || STABILITY_SD35_WIDTH || 1024).toString());
      formData.append('height', (params.height || STABILITY_SD35_HEIGHT || 1024).toString());
    }
    
    // Optional parameters
    if (params.negative_prompt) formData.append('negative_prompt', params.negative_prompt);
    formData.append('steps', (params.steps || STABILITY_SD35_STEPS || 20).toString());
    formData.append('cfg_scale', (params.cfg_scale || STABILITY_SD35_CFG_SCALE || 5.0).toString());
    formData.append('sampler', params.sampler || STABILITY_SD35_SAMPLER || 'k_dpm_2');
    if (params.seed) formData.append('seed', params.seed.toString());
    formData.append('samples', (params.samples || 1).toString());
    formData.append('output_format', params.output_format || 'png');
    formData.append('model', params.model || STABILITY_SD35_MODEL); // SD3.5 model
    if (params.mode) formData.append('mode', params.mode);

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