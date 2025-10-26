// Snowpack Configuration
// https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
export default {
  mount: {
    public: { url: '/', static: true },
    src: { url: '/dist' }
  },
  plugins: [
    '@snowpack/plugin-react-refresh',
    '@snowpack/plugin-dotenv'
  ],
  routes: [
    /* Enable an SPA Fallback in development: */
    // {"match": "routes", "src": ".*", "dest": "/index.html"}
  ],
  optimize: {
    /* Example: Bundle your build: */
    // "bundle": true,
  },
  packageOptions: {
    /* ... */
  },
  devOptions: {
    // Snowpack dev server port (different from FastMCP server port 8080)
    port: 3000,
    // Open browser automatically
    open: 'none'
  },
  buildOptions: {
    // Output directory for build
    out: '../dist-frontend',
    // Clean output directory before build
    clean: true
  },
  alias: {
    // Add aliases for imports
    "@": "./src"
  }
};