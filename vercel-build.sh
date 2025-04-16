#!/bin/bash

# Build the frontend
echo "Building frontend with Vite..."
npm run build

# Create directory for the API
echo "Preparing API directory..."
mkdir -p .vercel/output/functions/api
mkdir -p .vercel/output/static

# Copy the built assets to the output directory
echo "Copying static assets..."
cp -r dist/* .vercel/output/static/

# Create the Vercel serverless function
echo "Creating serverless function for API..."
cat > .vercel/output/functions/api.func/index.js << EOL
import { createServer } from 'http'
import { server } from '../../server/index.js'

const app = server()
export default app
EOL

# Create the config for the function
echo "Creating function configuration..."
cat > .vercel/output/functions/api.func/config.json << EOL
{
  "runtime": "nodejs16.x",
  "handler": "index.js",
  "launcherType": "Nodejs"
}
EOL

# Create the config for Vercel
echo "Creating Vercel configuration..."
cat > .vercel/output/config.json << EOL
{
  "version": 3,
  "routes": [
    {
      "src": "^/api/(.*)",
      "dest": "/api"
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "^/(.*)",
      "dest": "/$1"
    }
  ]
}
EOL

echo "Build completed successfully!"