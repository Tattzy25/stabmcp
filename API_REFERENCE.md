# Stability AI API Reference

## Response Codes and Headers

### 200 - Generation Successful

**Response Headers:**
- `x-request-id`: string - A unique identifier for this request
- `content-type`: string - Format of the generated image
  - `image/png` - raw bytes
  - `application/json; type=image/png` - base64 encoded
  - `image/jpeg` - raw bytes
  - `application/json; type=image/jpeg` - base64 encoded
  - `image/webp` - raw bytes
  - `application/json; type=image/webp` - base64 encoded
- `finish-reason`: string - Indicates the reason the generation finished
  - `SUCCESS` = successful generation
  - `CONTENT_FILTERED` = successful generation, but output violated content policy
- `seed`: string - The seed used as random noise for this generation

**Response Schema:**
- `image/png`: string <binary> - The bytes of the generated image

### 400 - Invalid Parameters

**Response Schema:** application/json
```json
{
  "id": "string",
  "name": "string",
  "errors": ["string"]
}
```

### 403 - Content Moderation Flagged

**Response Schema:** application/json
```json
{
  "id": "string",
  "name": "content_moderation",
  "errors": ["string"]
}
```

### 413 - Request Too Large

**Response Schema:** application/json
```json
{
  "id": "string",
  "name": "string",
  "errors": ["string"]
}
```

### 422 - Request Rejected

**Response Schema:** application/json
```json
{
  "id": "string",
  "name": "string",
  "errors": ["string"]
}
```

### 429 - Rate Limit Exceeded

**Response Schema:** application/json
```json
{
  "id": "string",
  "name": "string",
  "errors": ["string"]
}
```

### 500 - Internal Error

**Response Schema:** application/json
```json
{
  "id": "string",
  "name": "string",
  "errors": ["string"]
}
```

## API Key Management

This MCP server implements automatic API key fallback with the following features:

### Environment Variables
```bash
STABILITY_API_KEY=your-primary-api-key-here
STABILITY_API_KEY_ALT=your-alternate-api-key-here
```

### Fallback Behavior
1. **Primary Key**: Always used first
2. **Automatic Rotation**: On authentication errors (401/403)
3. **Retry Logic**: Exponential backoff with up to 3 retries
4. **Health Monitoring**: Health check reports key configuration status

### Error Handling
- Clear user-friendly error messages
- Automatic key rotation on auth failures
- Comprehensive logging for debugging

## Usage Notes

- To receive raw image bytes, specify `image/*` in the Accept header
- To receive base64 encoded JSON, specify `application/json` in the Accept header
- The `finish-reason` and `seed` headers are absent in JSON responses (present in body)
- Content moderation violations result in blurred outputs but no charges