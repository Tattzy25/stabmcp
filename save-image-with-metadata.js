import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import fs from 'fs';

async function generateAndSaveImage() {
    try {
        // Create simple filename using timestamp
        const timestamp = new Date().getTime();
        const imageFilename = `image-${timestamp}.png`;
        const metadataFilename = `image-${timestamp}.json`;
        
        console.log('Connecting to MCP server...');
        
        // Connect to MCP server
        const transport = new SSEClientTransport(new URL('http://localhost:8080/sse'));
        
        const client = new Client({
            name: 'image-generator-client',
            version: '1.0.0'
        });
        
        await client.connect(transport);
        console.log('Connected to MCP server');
        
        // Call the image generation tool
        console.log('Generating 16:9 aspect ratio image...');
        const result = await client.callTool({
            name: 'generate-image-sd35',
            arguments: {
                prompt: 'A stunning 16:9 landscape of a futuristic city at sunset, neon lights reflecting on wet streets, cyberpunk architecture, highly detailed cinematic shot',
                negative_prompt: 'blurry, low quality, distorted, ugly, text, watermark',
                aspect_ratio: '16:9',
                seed: Math.floor(Math.random() * 1000000),
                model: 'sd3.5-medium',
                mode: 'text-to-image',
                steps: 30,
                cfg_scale: 7
            }
        });
        
        console.log('Image generated successfully');
        
        // Extract base64 image data from MCP response
        // The image data should be in result.content array
        let base64Data;
        if (result.content && result.content.length > 0) {
            // Try different possible response formats
            const content = result.content[0];
            if (content.text) {
                // Text content with base64 data URI
                base64Data = content.text.replace(/^data:image\/png;base64,/, '');
            } else if (content.data) {
                // Binary data
                base64Data = content.data.toString('base64');
            } else if (typeof content === 'string') {
                // Direct base64 string
                base64Data = content.replace(/^data:image\/png;base64,/, '');
            } else {
                throw new Error('Unexpected response format from MCP server');
            }
        } else {
            throw new Error('No image content received from MCP server');
        }
        
        // Save image to file
        fs.writeFileSync(imageFilename, base64Data, 'base64');
        console.log(`Image saved as: ${imageFilename}`);
        
        // Create and save metadata
        const metadata = {
            image_filename: imageFilename,
            metadata_filename: metadataFilename,
            generation_timestamp: new Date().toISOString(),
            prompt: 'A stunning 16:9 landscape of a futuristic city at sunset, neon lights reflecting on wet streets, cyberpunk architecture, highly detailed cinematic shot',
            negative_prompt: 'blurry, low quality, distorted, ugly, text, watermark',
            aspect_ratio: '16:9',
            seed: Math.floor(Math.random() * 1000000),
            model: 'sd3.5-medium',
            mode: 'text-to-image',
            steps: 30,
            cfg_scale: 7,
            mime_type: 'image/png',
            file_size: fs.statSync(imageFilename).size
        };
        
        fs.writeFileSync(metadataFilename, JSON.stringify(metadata, null, 2));
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