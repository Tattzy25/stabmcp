"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fastmcp_1 = require("fastmcp");
const zod_1 = require("zod"); // Or any validation library that supports Standard Schema
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const server = new fastmcp_1.FastMCP({
    name: "TaaTTTy",
    version: "1.0.0",
});
server.addTool({
    name: "add",
    description: "Add two numbers",
    parameters: zod_1.z.object({
        a: zod_1.z.number(),
        b: zod_1.z.number(),
    }),
    execute: async (args) => {
        return String(args.a + args.b);
    },
});
server.addTool({
    name: "fetch-zod",
    description: "Fetch the content of a url (using Zod)",
    parameters: zod_1.z.object({
        url: zod_1.z.string(),
    }),
    execute: async (args, { log, reportProgress }) => {
        log.info("Fetching webpage content...", { url: args.url });
        reportProgress({ progress: 0, total: 100 });
        if (args.url.startsWith("https://example.com")) {
            throw new fastmcp_1.UserError("Example.com URLs are not allowed");
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
    parameters: zod_1.z.object({
        url: zod_1.z.string(),
    }),
    execute: async (args, { log }) => {
        log.info("Processing simple download...", { url: args.url });
        if (args.url.startsWith("https://example.com")) {
            throw new fastmcp_1.UserError("Example.com URLs are not allowed for simple downloads");
        }
        log.info("Completed simple download");
        return "Hello, world!";
    },
});
server.addTool({
    name: "download-multiple",
    description: "Download a file and return multiple messages",
    parameters: zod_1.z.object({
        url: zod_1.z.string(),
    }),
    execute: async (args, { log }) => {
        log.info("Processing multiple message download...", { url: args.url });
        if (args.url.startsWith("https://example.com")) {
            throw new fastmcp_1.UserError("Example.com URLs are not allowed for multiple downloads");
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
    parameters: zod_1.z.object({
        url: zod_1.z.string(),
    }),
    execute: async (args, { log, reportProgress }) => {
        log.info("Downloading image...", { url: args.url });
        reportProgress({ progress: 0, total: 100 });
        if (args.url.startsWith("https://example.com")) {
            throw new fastmcp_1.UserError("Example.com URLs are not allowed for images");
        }
        reportProgress({ progress: 50, total: 100 });
        const result = (0, fastmcp_1.imageContent)({
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
    parameters: zod_1.z.object({
        url: zod_1.z.string(),
    }),
    execute: async (args, { log, reportProgress }) => {
        log.info("Downloading audio...", { url: args.url });
        reportProgress({ progress: 0, total: 100 });
        if (args.url.startsWith("https://example.com")) {
            throw new fastmcp_1.UserError("Example.com URLs are not allowed for audio");
        }
        reportProgress({ progress: 50, total: 100 });
        const result = (0, fastmcp_1.audioContent)({
            url: args.url,
        });
        reportProgress({ progress: 100, total: 100 });
        log.info("Successfully downloaded audio", { url: args.url });
        return result;
    },
});
server.addTool({
    name: "diagnostic-reports",
    description: "Generate and manage Node.js diagnostic reports",
    parameters: zod_1.z.object({
        action: zod_1.z.enum(["generate", "list", "get"]).default("list"),
        filename: zod_1.z.string().optional(),
    }),
    execute: async (args, { log }) => {
        const reportDir = process.cwd();
        const reportPattern = /^report\.[0-9]*\.[0-9]*\.[0-9]*\.[0-9]*\.json$/;
        switch (args.action) {
            case "generate":
                log.info("Generating diagnostic report...");
                process.report?.(args.filename
                    ? { filename: path.join(reportDir, args.filename) }
                    : undefined);
                return `Diagnostic report ${args.filename || 'generated'} created successfully`;
            case "get":
                if (!args.filename) {
                    throw new fastmcp_1.UserError("Filename is required for 'get' action");
                }
                const filePath = path.join(reportDir, args.filename);
                if (!fs.existsSync(filePath)) {
                    throw new fastmcp_1.UserError(`Report file not found: ${args.filename}`);
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
                }
                catch (error) {
                    throw new fastmcp_1.UserError(`Error reading report file: ${error.message}`);
                }
            case "list":
            default:
                log.info("Listing diagnostic reports...");
                const files = fs.readdirSync(reportDir);
                const reports = files.filter((file) => reportPattern.test(file));
                const reportDetails = await Promise.all(reports.map(async (filename) => {
                    try {
                        const content = fs.readFileSync(path.join(reportDir, filename), 'utf8');
                        const data = JSON.parse(content);
                        return `${filename} (${content.length} bytes) - ${data.header?.eventTimestamp || 'unknown'} - ${data.header?.reportVersion || 'unknown'}`;
                    }
                    catch {
                        return `${filename} (error reading file)`;
                    }
                }));
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
async function fetchWebpageContent(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    }
    catch (error) {
        console.error("Error fetching webpage content:", error);
        return `Error fetching content from ${url}: ${error.message ?? String(error)}`;
    }
}
