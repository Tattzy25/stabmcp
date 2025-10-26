import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import fs from 'fs';

async function generateAndSaveImage() {
    try {
        // Create simple filename using timestamp
        const timestamp = new Date().getTime();
        const imageFilename = `image-${timestamp}.png`;
        const metadataFilename = `image-${timestamp}.txt`;
        
        console.log('Connecting to MCP server...');
        
        // Connect to MCP server
        const transport = new SSEClientTransport(new URL('http://localhost:8080/sse'));
        
        const client = new Client({
            name: 'image-generator-client',
            version: '1.0.0'
        });
        
        await client.connect(transport);
        console.log('Connected to MCP server');
        
        // Generate a single seed to use everywhere
        const seed = Math.floor(Math.random() * 1000000);

        // Call the image generation tool
        console.log('Generating 16:9 aspect ratio image...');
        const result = await client.callTool({
            name: 'generate-image-sd35',
            arguments: {
                prompt: 'A stunning 16:9 landscape of a futuristic city at sunset, neon lights reflecting on wet streets, cyberpunk architecture, highly detailed cinematic shot',
                negative_prompt: 'blurry, low quality, distorted, ugly, text, watermark',
                aspect_ratio: '16:9',
                seed: seed,
                model: 'sd3.5-medium',
                mode: 'text-to-image',
                steps: 30,
                cfg_scale: 7
            }
        });
        
        console.log('Image generated successfully');
        
        // Extract and debug MCP response to understand the format
        console.log('MCP Response content type:', typeof result.content);
        if (result.content && result.content.length > 0) {
            const content = result.content[0];
            console.log('First content item type:', typeof content);
            console.log('Content keys:', Object.keys(content));
            
            // Debug the actual content to understand the format
            if (content.type === 'image') {
                console.log('Image content detected');
                if (content.data) {
                    console.log('Data property exists, length:', content.data.length);
                    // Check the first few characters to see what format it is
                    console.log('First 50 chars of data:', content.data.substring(0, 50));
                }
            }
        }
        
        // Extract image data from MCP response
        // The MCP server returns image content with base64 data
        let imageBuffer;
        if (result.content && result.content.length > 0) {
            const content = result.content[0];
            
            if (content.type === 'image' && content.data) {
                // Handle base64 image data
                const base64Data = content.data;
                console.log('Base64 data length:', base64Data.length);
                
                let cleanBase64;
                
                // Check if the data is JSON containing an image field
                if (base64Data.trim().startsWith('{"image":')) {
                    try {
                        console.log('JSON format detected, parsing...');
                        const jsonData = JSON.parse(base64Data);
                        if (jsonData.image) {
                            cleanBase64 = jsonData.image;
                            console.log('Extracted image data from JSON');
                        } else {
                            throw new Error('JSON does not contain image field');
                        }
                    } catch (jsonError) {
                        console.error('JSON parsing failed:', jsonError.message);
                        throw new Error('Failed to parse JSON image data');
                    }
                } else if (base64Data.startsWith('dataimage/pngbase64')) {
                    // Handle the malformed format: dataimage/pngbase64...
                    console.log('Malformed data URI format detected');
                    cleanBase64 = base64Data.replace(/^dataimage\/pngbase64/, '');
                    console.log('Extracted clean base64 data');
                } else if (base64Data.startsWith('data:image/')) {
                    // Handle proper data URI format
                    cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
                } else {
                    // Assume it's already pure base64
                    cleanBase64 = base64Data;
                }
                
                imageBuffer = Buffer.from(cleanBase64, 'base64');
                console.log('Decoded image buffer length:', imageBuffer.length);
                
            } else if (typeof content === 'string' && content.startsWith('data:image')) {
                // Handle string format with data URI
                const base64Data = content.replace(/^data:image\/\w+;base64,/, '');
                imageBuffer = Buffer.from(base64Data, 'base64');
                console.log('Decoded image buffer length:', imageBuffer.length);
                
            } else {
                console.error('Unexpected response format:', content);
                throw new Error('Unexpected response format from MCP server');
            }
        } else {
            throw new Error('No image content received from MCP server');
        }
        
        // Save image to file
        fs.writeFileSync(imageFilename, imageBuffer);
        console.log(`Image saved as: ${imageFilename}`);
        
        // Create and save metadata as TXT file
        const metadataText = `Image Filename: ${imageFilename}
Metadata Filename: ${metadataFilename}
Generation Timestamp: ${new Date().toISOString()}
Prompt: A stunning 16:9 landscape of a futuristic city at sunset, neon lights reflecting on wet streets, cyberpunk architecture, highly detailed cinematic shot
Negative Prompt: blurry, low quality, distorted, ugly, text, watermark
Aspect Ratio: 1:1
Seed: ${seed}
Model: sd3.5-medium
Mode: text-to-image
Steps: 30
CFG Scale: 7
MIME Type: png
File Size: ${fs.statSync(imageFilename).size} bytes`;
        
        fs.writeFileSync(metadataFilename, metadataText);
        console.log(`Metadata saved as: ${metadataFilename}`);
        
        console.log('\n✅ Image generation completed successfully!');
        console.log(`📁 Image: ${imageFilename}`);
        console.log(`📋 Metadata: ${metadataFilename}`);
        
        await client.close();
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the function
generateAndSaveImage();