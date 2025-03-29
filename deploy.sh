#!/bin/bash
set -e

echo "🚀 Starting deployment process for UUbrella application..."

# Step 1: Build the frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Step 2: Deploy the infrastructure
echo "🏗️ Deploying infrastructure with CDK..."
cd infrastructure
npm install
npx cdk deploy --outputs-file cdk-outputs.json
cd ..

# Step 3: Get the API URL from the CDK outputs
API_URL=$(cat infrastructure/cdk-outputs.json | jq -r '.InfrastructureStack.ApiUrl')
WEBSITE_URL=$(cat infrastructure/cdk-outputs.json | jq -r '.InfrastructureStack.WebsiteUrl')

echo "✅ Deployment completed successfully!"
echo "📝 API URL: $API_URL"
echo "🌐 Website URL: $WEBSITE_URL"
echo ""
echo "You can now access your application at: $WEBSITE_URL"