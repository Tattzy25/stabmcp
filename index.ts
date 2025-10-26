import { FastMCP, imageContent, audioContent, UserError } from "fastmcp";
import { z } from "zod"; // Or any validation library that supports Standard Schema
import * as fs from 'fs';
import * as path from 'path';

const server = new FastMCP({
  name: "TaaTTTy",
  version: "1.0.0",
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

server.start({
  transportType: "httpStream",
  httpStream: {
    endpoint: "/sse",
    port: 8080,
  },
});


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