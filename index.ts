// Load environment variables
import 'dotenv/config';

// Polyfill for missing File class in Node.js
if (typeof File === 'undefined') {
  (globalThis as any).File = class File {
    constructor(blobParts: any[], fileName: string, options?: any) {}
  };
}

import { FastMCP, imageContent, audioContent, UserError } from "fastmcp";
import { z } from "zod"; // Or any validation library that supports Standard Schema
import * as fs from 'fs';
import * as path from 'path';

// Import Stability AI tools from organized structure
import {
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
} from './src/tools/stability/index';

// Environment configuration
const PORT = parseInt(process.env.PORT || '8080');
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVER_NAME = process.env.MCP_SERVER_NAME || 'TaaTTTy';
const SERVER_VERSION = process.env.MCP_SERVER_VERSION || '1.0.0';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const HEALTH_CHECK_PATH = process.env.HEALTH_CHECK_PATH || '/health';
const METRICS_PATH = process.env.METRICS_PATH || '/metrics';

// Ensure version format is correct (major.minor.patch)
const validatedVersion = SERVER_VERSION.match(/^\d+\.\d+\.\d+$/)
  ? SERVER_VERSION
  : '1.0.0';

const server = new FastMCP({
  name: SERVER_NAME,
  version: validatedVersion as `${number}.${number}.${number}`,
});

server.addTool({
  name: "add",
  description: "Add two numbers",
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async (args) => {
    return String(args.a + args.b);
  },
});

server.addTool({
  name: "fetch-zod",
  description: "Fetch the content of a url (using Zod)",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Fetching webpage content...", { url: args.url });
    
    reportProgress({ progress: 0, total: 100 });
    
    if (args.url.startsWith("https://example.com")) {
      throw new UserError("Example.com URLs are not allowed");
    }
    
    reportProgress({ progress: 50, total: 100 });
    
    const content = await fetchWebpageContent(args.url);
    
    reportProgress({ progress: 100, total: 100 });
    log.info("Successfully fetched webpage content", { url: args.url, contentLength: content.length });
    
    return content;
  },
});

server.addTool({
  name: "download-simple",
  description: "Download a file and return simple string",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args, { log }) => {
    log.info("Processing simple download...", { url: args.url });
    
    if (args.url.startsWith("https://example.com")) {
      throw new UserError("Example.com URLs are not allowed for simple downloads");
    }
    
    log.info("Completed simple download");
    return "Hello, world!";
  },
});

server.addTool({
  name: "download-multiple",
  description: "Download a file and return multiple messages",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args, { log }) => {
    log.info("Processing multiple message download...", { url: args.url });
    
    if (args.url.startsWith("https://example.com")) {
      throw new UserError("Example.com URLs are not allowed for multiple downloads");
    }
    
    log.info("Completed multiple message download");
    return {
      content: [
        { type: "text", text: "First message" },
        { type: "text", text: "Second message" },
      ],
    };
  },
});

server.addTool({
  name: "download-image",
  description: "Download an image file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Downloading image...", { url: args.url });
    
    reportProgress({ progress: 0, total: 100 });
    
    if (args.url.startsWith("https://example.com")) {
      throw new UserError("Example.com URLs are not allowed for images");
    }
    
    reportProgress({ progress: 50, total: 100 });
    
    const result = imageContent({
      url: args.url,
    });
    
    reportProgress({ progress: 100, total: 100 });
    log.info("Successfully downloaded image", { url: args.url });
    
    return result;
  },
});

server.addTool({
  name: "download-audio",
  description: "Download an audio file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Downloading audio...", { url: args.url });
    
    reportProgress({ progress: 0, total: 100 });
    
    if (args.url.startsWith("https://example.com")) {
      throw new UserError("Example.com URLs are not allowed for audio");
    }
    
    reportProgress({ progress: 50, total: 100 });
    
    const result = audioContent({
      url: args.url,
    });
    
    reportProgress({ progress: 100, total: 100 });
    log.info("Successfully downloaded audio", { url: args.url });
    
    return result;
  },
});

// Add resource for application logs
server.addResource({
  uri: "file:///logs/app.log",
  name: "Application Logs",
  mimeType: "text/plain",
  async load() {
    try {
      const logContent = await fs.promises.readFile('app.log', 'utf8');
      return {
        text: logContent,
      };
    } catch (error: any) {
      throw new UserError(`Failed to read log file: ${error.message}`);
    }
  },
});

// Add prompt for git commit messages
server.addPrompt({
  name: "git-commit",
  description: "Generate a Git commit message",
  arguments: [
    {
      name: "changes",
      description: "Git diff or description of changes",
      required: true,
    },
  ],
  load: async (args) => {
    return `Generate a concise but descriptive commit message for these changes:\n\n${args.changes}`;
  },
});

server.addTool({
  name: "diagnostic-reports",
  description: "Generate and manage Node.js diagnostic reports",
  parameters: z.object({
    action: z.enum(["generate", "list", "get"]).default("list"),
    filename: z.string().optional(),
  }),
  execute: async (args, { log }) => {
    const reportDir = process.cwd();
    const reportPattern = /^report\.[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*\.json$/;
    
    switch (args.action) {
      case "generate":
        log.info("Generating diagnostic report...");
        (process as any).report?.(
          args.filename 
            ? { filename: path.join(reportDir, args.filename) }
            : undefined
        );
        return `Diagnostic report ${args.filename || 'generated'} created successfully`;
        
      case "get":
        if (!args.filename) {
          throw new UserError("Filename is required for 'get' action");
        }
        
        const filePath = path.join(reportDir, args.filename);
        if (!fs.existsSync(filePath)) {
          throw new UserError(`Report file not found: ${args.filename}`);
        }
        
        try {
          const reportContent = fs.readFileSync(filePath, 'utf8');
          const reportData = JSON.parse(reportContent);
          
          log.info("Retrieved diagnostic report", { 
            filename: args.filename,
            size: reportContent.length,
            timestamp: reportData.header?.eventTimestamp
          });
          
          return `Diagnostic Report: ${args.filename}\nSize: ${reportContent.length} bytes\nTimestamp: ${reportData.header?.eventTimestamp || 'unknown'}\nContent:\n${JSON.stringify(reportData, null, 2)}`;
        } catch (error: any) {
          throw new UserError(`Error reading report file: ${error.message}`);
        }
        
      case "list":
      default:
        log.info("Listing diagnostic reports...");
        const files = fs.readdirSync(reportDir);
        const reports = files.filter((file: string) => reportPattern.test(file));
        
        const reportDetails = await Promise.all(
          reports.map(async (filename: string) => {
            try {
              const content = fs.readFileSync(path.join(reportDir, filename), 'utf8');
              const data = JSON.parse(content);
              return `${filename} (${content.length} bytes) - ${data.header?.eventTimestamp || 'unknown'} - ${data.header?.reportVersion || 'unknown'}`;
            } catch {
              return `${filename} (error reading file)`;
            }
          })
        );
        
        return `Found ${reports.length} diagnostic reports:\n${reportDetails.join('\n')}`;
    }
  },
});

// Add health check tool
server.addTool({
  name: "health-check",
  description: "Check server health status",
  parameters: z.object({}),
  execute: async (args, { log }) => {
    log.info("Health check requested");
    
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      server: SERVER_NAME,
      version: SERVER_VERSION,
      environment: NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
    
    return JSON.stringify(healthStatus, null, 2);
  },
});

// Add metrics tool
server.addTool({
  name: "server-metrics",
  description: "Get server performance metrics",
  parameters: z.object({}),
  execute: async (args, { log }) => {
    log.info("Metrics requested");
    
    const metrics = {
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform,
      },
      system: {
        arch: process.arch,
        cpus: require('os').cpus().length,
        totalMemory: require('os').totalmem(),
        freeMemory: require('os').freemem(),
      },
    };
    
    return JSON.stringify(metrics, null, 2);
  },
});

// Stability AI Tools
server.addTool({
  name: "generate-image",
  description: "Generate images from text prompts using Stability AI's text-to-image generation API. Supports multiple models, samplers, and configuration options for creative control.",
  parameters: z.object({
    prompt: z.string(),
    negative_prompt: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    aspect_ratio: z.string().optional(),
    steps: z.number().optional(),
    cfg_scale: z.number().optional(),
    sampler: z.string().optional(),
    seed: z.number().optional(),
    samples: z.number().optional(),
    output_format: z.enum(['jpeg', 'png']).optional(),
    model: z.string().optional(),
    mode: z.enum(['text-to-image', 'image-to-image']).optional(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Generating image with Stability AI", { prompt: args.prompt });
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await generateImage({
        prompt: args.prompt!,
        negative_prompt: args.negative_prompt,
        width: args.width,
        height: args.height,
        aspect_ratio: args.aspect_ratio,
        steps: args.steps,
        cfg_scale: args.cfg_scale,
        sampler: args.sampler,
        seed: args.seed,
        samples: args.samples,
        output_format: args.output_format,
        model: args.model,
        mode: args.mode
      });
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
        buffer: Buffer.from(result.images[0].base64, 'base64')
      });
    } catch (error: any) {
      throw new UserError(`Failed to generate image: ${error.message}`);
    }
  },
});

server.addTool({
  name: "generate-image-sd35",
  description: "Generate high-quality images using Stable Diffusion 3.5, Stability AI's most advanced text-to-image model with superior prompt adherence and professional-grade outputs.",
  parameters: z.object({
    prompt: z.string(),
    negative_prompt: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    aspect_ratio: z.string().optional(),
    steps: z.number().optional(),
    cfg_scale: z.number().optional(),
    sampler: z.string().optional(),
    seed: z.number().optional(),
    samples: z.number().optional(),
    output_format: z.enum(['jpeg', 'png']).optional(),
    model: z.string().optional(),
    mode: z.enum(['text-to-image', 'image-to-image']).optional(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Generating image with Stable Diffusion 3.5", { prompt: args.prompt });
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await generateImageSD35({
        prompt: args.prompt!,
        negative_prompt: args.negative_prompt,
        width: args.width,
        height: args.height,
        aspect_ratio: args.aspect_ratio,
        steps: args.steps,
        cfg_scale: args.cfg_scale,
        sampler: args.sampler,
        seed: args.seed,
        samples: args.samples,
        output_format: args.output_format,
        model: args.model,
        mode: args.mode
      });
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
          buffer: Buffer.from(result.images[0].base64, 'base64'),
        });
    } catch (error: any) {
      throw new UserError(`Failed to generate image with SD3.5: ${error.message}`);
    }
  },
});

server.addTool({
  name: "remove-background",
  description: "Automatically detect and remove backgrounds from images using Stability AI's background removal API. Returns transparent PNG images with foreground subjects isolated.",
  parameters: z.object({
    image: z.string(), // base64 encoded image
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Removing background from image");
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await removeBackground({ image: args.image! });
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
        buffer: Buffer.from(result.image, 'base64')
      });
    } catch (error: any) {
      throw new UserError(`Failed to remove background: ${error.message}`);
    }
  },
});

server.addTool({
  name: "outpaint",
  description: "Extend image boundaries with AI-generated content using Stability AI's outpainting technology. Expand canvas size while maintaining visual coherence with the original image.",
  parameters: z.object({
    image: z.string(), // base64 encoded image
    prompt: z.string(),
    direction: z.enum(['left', 'right', 'top', 'bottom', 'all']),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Outpainting image", { direction: args.direction });
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await outpaint({
        image: args.image!,
        prompt: args.prompt!,
        direction: args.direction!,
        width: args.width,
        height: args.height
      });
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
          buffer: Buffer.from(result.image, 'base64'),
        });
    } catch (error: any) {
      throw new UserError(`Failed to outpaint image: ${error.message}`);
    }
  },
});

server.addTool({
  name: "search-and-replace",
  description: "Find and replace specific elements within images using natural language descriptions. Identify target objects and specify replacement content with text prompts.",
  parameters: z.object({
    image: z.string(), // base64 encoded image
    search_prompt: z.string(),
    replace_prompt: z.string(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Searching and replacing objects in image", { 
      search: args.search_prompt, 
      replace: args.replace_prompt 
    });
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await searchAndReplace({
        image: args.image!,
        search_prompt: args.search_prompt!,
        replace_prompt: args.replace_prompt!
      });
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
          buffer: Buffer.from(result.image, 'base64'),
        });
    } catch (error: any) {
      throw new UserError(`Failed to search and replace: ${error.message}`);
    }
  },
});

server.addTool({
  name: "upscale-fast",
  description: "Increase image resolution 4x using Stability AI's fast upscaling model. Optimized for speed while maintaining image quality and detail preservation.",
  parameters: z.object({
    image: z.string(), // base64 encoded image
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Upscaling image (fast 4x)");
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await upscaleFast({ image: args.image! });
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
        buffer: Buffer.from(result.image, 'base64')
      });
    } catch (error: any) {
      throw new UserError(`Failed to upscale image (fast): ${error.message}`);
    }
  },
});

server.addTool({
  name: "upscale-creative",
  description: "Upscale images to 4K resolution with creative enhancement using Stability AI's advanced upscaling. Adds detail and improves image quality beyond simple resolution increase.",
  parameters: z.object({
    image: z.string(), // base64 encoded image
    creativity: z.number().min(0).max(1).optional(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Upscaling image (creative up to 4K)");
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await upscaleCreative({ image: args.image!, creativity: args.creativity });
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
        buffer: Buffer.from(result.image, 'base64')
      });
    } catch (error: any) {
      throw new UserError(`Failed to upscale image (creative): ${error.message}`);
    }
  },
});

server.addTool({
  name: "control-sketch",
  description: "Convert hand-drawn sketches into polished, production-ready images using Stability AI's sketch-to-image technology. Maintains the structure and composition of the original sketch while enhancing visual quality.",
  parameters: z.object({
    image: z.string(), // base64 encoded sketch image
    prompt: z.string(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Processing sketch to production image");
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await controlSketch({ image: args.image!, prompt: args.prompt! });
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
        buffer: Buffer.from(result.image, 'base64')
      });
    } catch (error: any) {
      throw new UserError(`Failed to process sketch: ${error.message}`);
    }
  },
});

server.addTool({
  name: "control-style",
  description: "Apply artistic styles from reference images to generated content using Stability AI's style transfer technology. Create images that match the visual characteristics of provided style references.",
  parameters: z.object({
    image: z.string(), // base64 encoded style reference image
    prompt: z.string(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Applying style to image");
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await controlStyle({ image: args.image!, prompt: args.prompt! });
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
        buffer: Buffer.from(result.image, 'base64')
      });
    } catch (error: any) {
      throw new UserError(`Failed to apply style: ${error.message}`);
    }
  },
});

server.addTool({
  name: "control-structure",
  description: "Generate new images while preserving the structural composition of reference images using Stability AI's structure control technology. Maintain layout, pose, and spatial relationships while changing content.",
  parameters: z.object({
    image: z.string(), // base64 encoded structure reference image
    prompt: z.string(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Maintaining structure while generating image");
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await controlStructure({ image: args.image!, prompt: args.prompt! });
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
        buffer: Buffer.from(result.image, 'base64')
      });
    } catch (error: any) {
      throw new UserError(`Failed to maintain structure: ${error.message}`);
    }
  },
});

server.addTool({
  name: "replace-background-and-relight",
  description: "Replace image backgrounds with AI-generated environments and apply realistic lighting adjustments using Stability AI's background replacement and relighting technology.",
  parameters: z.object({
    image: z.string(), // base64 encoded image
    background_prompt: z.string(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Replacing background and relighting image");
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await replaceBackgroundAndRelight({ image: args.image!, background_prompt: args.background_prompt! });
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
        buffer: Buffer.from(result.image, 'base64')
      });
    } catch (error: any) {
      throw new UserError(`Failed to replace background and relight: ${error.message}`);
    }
  },
});

server.addTool({
  name: "search-and-recolor",
  description: "Identify specific objects in images and apply color modifications using Stability AI's object detection and recoloring technology. Change colors of targeted elements while preserving image quality.",
  parameters: z.object({
    image: z.string(), // base64 encoded image
    prompt: z.string(),
    select_prompt: z.string(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Searching and recoloring objects in image", { 
      prompt: args.prompt, 
      select_prompt: args.select_prompt 
    });
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await searchAndRecolor(args.image!, args.prompt!, args.select_prompt!);
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
        buffer: Buffer.from(result, 'base64')
      });
    } catch (error: any) {
      throw new UserError(`Failed to search and recolor: ${error.message}`);
    }
  },
});

server.addTool({
  name: "upscale-conservative",
  description: "Increase image resolution while preserving original details and minimizing artifacts using Stability AI's conservative upscaling model. Ideal for archival and professional photography applications.",
  parameters: z.object({
    image: z.string(), // base64 encoded image
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Upscaling image (conservative - preserve details)");
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await upscaleConservative(args.image, "", undefined, undefined, undefined, undefined);
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
        buffer: Buffer.from(result, 'base64')
      });
    } catch (error: any) {
      throw new UserError(`Failed to upscale image (conservative): ${error.message}`);
    }
  },
});

server.addTool({
  name: "erase",
  description: "Remove unwanted objects from images using AI-powered object removal technology. Works with manual masks or automatic object detection to cleanly erase elements while preserving background integrity.",
  parameters: z.object({
    image: z.string(), // base64 encoded image
    mask: z.string(), // base64 encoded mask image
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Erasing objects from image");
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await erase(args.image!, args.mask!);
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
        buffer: Buffer.from(result, 'base64')
      });
    } catch (error: any) {
      throw new UserError(`Failed to erase objects: ${error.message}`);
    }
  },
});

server.addTool({
  name: "inpaint",
  description: "Fill in or replace specified image areas with AI-generated content using Stability AI's inpainting technology. Perfect for removing objects, repairing damage, or creatively modifying image regions.",
  parameters: z.object({
    image: z.string(), // base64 encoded image
    mask: z.string(), // base64 encoded mask image
    prompt: z.string(),
  }),
  execute: async (args, { log, reportProgress }) => {
    log.info("Inpainting image areas");
    reportProgress({ progress: 0, total: 100 });
    
    try {
      const result = await inpaint(args.image!, args.prompt!, undefined, undefined, args.mask!);
      reportProgress({ progress: 100, total: 100 });
      
      return imageContent({
        buffer: Buffer.from(result, 'base64')
      });
    } catch (error: any) {
      throw new UserError(`Failed to inpaint: ${error.message}`);
    }
  },
});

// Start server with enhanced configuration
server.start({
  transportType: "httpStream",
  httpStream: {
    endpoint: "/sse",
    port: PORT,
    host: HOST,
  },
});

console.log(`🚀 FastMCP Server ${SERVER_NAME} v${SERVER_VERSION} starting...`);
console.log(`📍 Environment: ${NODE_ENV}`);
console.log(`🌐 Server: http://${HOST}:${PORT}/sse`);
console.log(`❤️  Health: http://${HOST}:${PORT}${HEALTH_CHECK_PATH}`);
console.log(`📊 Metrics: http://${HOST}:${PORT}${METRICS_PATH}`);
console.log(`🔧 Log Level: ${LOG_LEVEL}`);


async function fetchWebpageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error: any) {
    console.error("Error fetching webpage content:", error);
    return `Error fetching content from ${url}: ${error.message ?? String(error)}`;
  }
}