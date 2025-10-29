# Railway Deployment Guide

This guide will help you deploy the Stability AI MCP Server to Railway for public use.

## 🚀 Quick Deployment

### Option 1: One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id?referralCode=your-code)

### Option 2: Manual Deployment

1. **Fork this repository** to your GitHub account
2. **Go to [Railway](https://railway.app)** and sign up/login
3. **Create New Project** → "Deploy from GitHub repo"
4. **Select your forked repository**
5. **Railway will automatically deploy** your server

## ⚙️ Environment Configuration

After deployment, configure these environment variables in Railway Dashboard → Settings → Variables:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
# Note: Users provide their own API keys as tool parameters
```

## 🔗 Getting Your Server URL

Once deployed, your server will be available at:
```
https://your-project-name.up.railway.app
```

You can find this URL in the Railway dashboard under your project's "Domains" section.

## 🧪 Testing Your Deployment

### Health Check
```bash
curl https://your-project-name.up.railway.app/health
```

### Server Info
```bash
curl https://your-project-name.up.railway.app/
```

### MCP Endpoint Test
```bash
curl -X POST https://your-project-name.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}},"id":1}'
```

## 👥 User Configuration

### For Claude Desktop Users

Users can connect to your public server by adding this to their Claude Desktop configuration:

```json
{
  "mcpServers": {
    "stability-ai-public": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/sdk",
        "connect",
        "https://your-project-name.up.railway.app/mcp"
      ]
    }
  }
}
```

### For Other MCP Clients

Clients can connect using the standard MCP connection URL:
```
https://your-project-name.up.railway.app/mcp
```

## 🛠️ Tool Usage

Users must provide their own API keys when calling tools:

### Image Generation Example
```json
{
  "prompt": "a beautiful sunset over mountains",
  "api_key": "user_own_stability_api_key",
  "model": "sd3.5-large-turbo",
  "aspect_ratio": "16:9"
}
```

### Text-to-Speech Example
```json
{
  "text": "Hello, this is a test message",
  "api_key": "user_own_elevenlabs_api_key",
  "voice_id": "21m00Tcm4TlvDq8ikWAM"
}
```

## 📊 Monitoring & Logs

- **Logs**: View in Railway Dashboard → Logs
- **Metrics**: CPU, Memory, Network in Railway Dashboard → Metrics
- **Health**: Automatic monitoring via `/health` endpoint
- **Uptime**: 99.9% SLA with Railway

## 🔧 Troubleshooting

### Common Issues

1. **Build Fails**: Check that all dependencies are in package.json
2. **Port Issues**: Railway provides PORT env variable automatically
3. **CORS Errors**: CORS is enabled for all origins in production
4. **API Timeouts**: Increase timeout in railway.json if needed

### Log Investigation

Check logs in Railway Dashboard for:
- Startup errors
- API key validation issues
- Memory usage spikes
- Connection timeouts

## 📈 Scaling

Your server automatically scales:
- **1-3 replicas** based on load
- **CPU-based scaling**: 80% threshold
- **Memory-based scaling**: 80% threshold
- **No configuration needed** - Railway handles it automatically

## 🔒 Security Considerations

- ✅ **No authentication required** for server connection
- ✅ **Users provide their own API keys**
- ✅ **No data storage** on the server
- ✅ **HTTPS encryption** for all traffic
- ✅ **CORS enabled** for cross-origin requests
- ✅ **Rate limiting** built into Railway

## 🚨 Emergency Procedures

### Restart Server
```bash
# Via Railway Dashboard → Deployments → Redeploy
# Or via CLI:
railway restart
```

### Rollback Deployment
In Railway Dashboard → Deployments, select a previous deployment and click "Redeploy"

### Check Status
```bash
railway status
```

## 📞 Support

- 📖 [Railway Documentation](https://docs.railway.app)
- 🐛 [GitHub Issues](https://github.com/your-username/stabmcp/issues)
- 💬 [Railway Discord](https://discord.gg/railway)
- 🎫 [Railway Support](https://railway.app/support)

## 🎯 Success Metrics

Your deployment is successful when:
- ✅ Health check returns status: "ok"
- ✅ MCP initialize method works
- ✅ Users can connect from Claude Desktop
- ✅ Tools respond with proper error messages for missing API keys
- ✅ Server handles multiple concurrent users

---

**Happy deploying! 🚀**