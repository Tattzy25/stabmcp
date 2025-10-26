import axios from 'axios';
import FormData from 'form-data';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Type definitions for Stability AI API responses
interface StabilityImageResult {
  images: Array<{ buffer: Buffer; seed: number }>;
  parameters: any;
}

interface ImageGenerationParams {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  sampler?: string;
  seed?: number;
  samples?: number;
}

interface ImageGenerationResult {
  images: Array<{ base64: string; seed: number }>;
  parameters: any;
}

// Configuration from environment variables
const STABILITY_API_KEY = process.env.STABILITY_API_KEY || '';
const STABILITY_ENGINE = process.env.STABILITY_ENGINE || 'stable-diffusion-xl-1024-v1-0';
const STABILITY_WIDTH = parseInt(process.env.STABILITY_WIDTH || '1024');
const STABILITY_HEIGHT = parseInt(process.env.STABILITY_HEIGHT || '1024');
const STABILITY_STEPS = parseInt(process.env.STABILITY_STEPS || '50');
const STABILITY_CFG_SCALE = parseInt(process.env.STABILITY_CFG_SCALE || '7');
const STABILITY_SAMPLER = process.env.STABILITY_SAMPLER || 'k_lms';

// Utility function to convert base64 to buffer
function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
}

// Utility function to convert buffer to base64
function bufferToBase64(buffer: Buffer, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Generate image with prompt using official Stability AI endpoint
async function generateImage(params: {
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
  } catch (error) {
    throw new Error(`Failed to generate image: ${error.message}`);
  }
}

// Generate image using Stable Diffusion 3.5 with official endpoint
async function generateImageSD35(params: {
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
  } catch (error) {
    throw new Error(`Failed to generate image with SD3.5: ${error.message}`);
  }
}

// Remove background from image
async function removeBackground(params: {
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

    const response = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/edit/remove-background',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      image: bufferToBase64(Buffer.from(response.data))
    };
  } catch (error) {
    throw new Error(`Failed to remove background: ${error.message}`);
  }
}

// Outpaint - extend image in any direction
async function outpaint(params: {
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

    const response = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/edit/outpaint',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      image: bufferToBase64(Buffer.from(response.data))
    };
  } catch (error) {
    throw new Error(`Failed to outpaint image: ${error.message}`);
  }
}

// Search and replace objects in image
async function searchAndReplace(params: {
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

    const response = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/edit/search-replace',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      image: bufferToBase64(Buffer.from(response.data))
    };
  } catch (error) {
    throw new Error(`Failed to search and replace: ${error.message}`);
  }
}

// Upscale image (fast 4x)
async function upscaleFast(params: {
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
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      image: bufferToBase64(Buffer.from(response.data))
    };
  } catch (error) {
    throw new Error(`Failed to upscale image (fast): ${error.message}`);
  }
}

// Upscale image (creative up to 4K)
async function upscaleCreative(params: {
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
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      image: bufferToBase64(Buffer.from(response.data))
    };
  } catch (error) {
    throw new Error(`Failed to upscale image (creative): ${error.message}`);
  }
}

// Control sketch - translate hand-drawn sketch to production-grade image
async function controlSketch(params: {
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
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      image: bufferToBase64(Buffer.from(response.data))
    };
  } catch (error) {
    throw new Error(`Failed to process sketch: ${error.message}`);
  }
}

// Control style - generate image in style of reference
async function controlStyle(params: {
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
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      image: bufferToBase64(Buffer.from(response.data))
    };
  } catch (error) {
    throw new Error(`Failed to apply style: ${error.message}`);
  }
}

// Control structure - maintain structure of reference
async function controlStructure(params: {
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
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      image: bufferToBase64(Buffer.from(response.data))
    };
  } catch (error) {
    throw new Error(`Failed to maintain structure: ${error.message}`);
  }
}

// Replace background and relight
async function replaceBackgroundAndRelight(params: {
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
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      image: bufferToBase64(Buffer.from(response.data))
    };
  } catch (error) {
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

export {
  generateImage,
  generateImageSD35,
  removeBackground,
  outpaint,
  searchAndReplace,
  upscaleFast,
  upscaleCreative,
  upscaleConservative,
  controlSketch,
  controlStyle,
  controlStructure,
  replaceBackgroundAndRelight,
  searchAndRecolor,
  erase,
  inpaint
};