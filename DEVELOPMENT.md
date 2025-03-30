# Development Guide for DropMapp

This guide provides instructions for setting up the development environment, running the application locally, and deploying it to AWS.

## Technology Stack
- **Frontend:** React + Vite, TypeScript, Material UI (MUI), Leaflet
- **Backend:** Python, AWS Lambda
- **Infrastructure:** AWS CDK
- **Storage:** S3, DynamoDB
- **API:** API Gateway
- **CDN:** CloudFront

## Getting Started

### Prerequisites
- Node.js 16+
- Python 3.9+
- AWS CLI configured (with credentials for deployment)
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- jq (for parsing JSON in the deployment script, usually available via package managers like `brew install jq` or `apt-get install jq`)

### Installation

#### macOS/Linux
```bash
# Clone the repository
git clone https://github.com/tedlano/nntin-uubrella.git
cd nntin-uubrella

# Install root and frontend dependencies
npm install

# Set up Python virtual environment and install dependencies
cd infrastructure
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Optional: Install dev requirements if needed
# pip install -r requirements-dev.txt
cd ..
```

#### Windows
```bash
# Clone the repository
git clone https://github.com/tedlano/nntin-uubrella.git
cd nntin-uubrella

# Install root and frontend dependencies
npm install

# Set up Python virtual environment and install dependencies
cd infrastructure
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
# Optional: Install dev requirements if needed
# pip install -r requirements-dev.txt
cd ..
```

### Local Development
```bash
# Start the frontend development server from the root directory
# This will typically run the Vite server for the frontend
npm run dev
```
The frontend should now be accessible, usually at `http://localhost:5173`. Note that backend functionality (creating items) requires deployment as it relies on AWS Lambda and API Gateway.

## Deployment to AWS

Deploying DropMapp involves setting up the backend infrastructure (Lambda, API Gateway, S3, DynamoDB) and deploying the frontend code to be served via CloudFront.

### Option 1: Using the Automated Deployment Script (Recommended)
We've provided a deployment script (`deploy.sh`) that automates the entire process. This is the easiest way to get started.

```bash
# Make the script executable (if not already)
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

The script performs the following steps:
1.  Builds the frontend application (`npm run build` in the `frontend` directory).
2.  Activates the Python virtual environment for the infrastructure.
3.  Deploys the infrastructure using AWS CDK (`cdk deploy`).
4.  Parses the CDK output to find the API Gateway URL and CloudFront distribution URL.
5.  Outputs the API URL and Website URL.

*Note: The script assumes a Unix-like environment (macOS, Linux, WSL on Windows). You might need to adjust paths or commands slightly if running directly on Windows CMD/PowerShell.*

### Option 2: Manual Deployment

If you prefer to deploy step-by-step or encounter issues with the script:

#### Step 1: Build the Frontend
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies if you haven't already
npm install

# Build the production-ready static files
npm run build

# Navigate back to the root directory
cd ..
```
This creates optimized static assets in the `frontend/dist` directory.

#### Step 2: Deploy Infrastructure with CDK
```bash
# Navigate to the infrastructure directory
cd infrastructure

# Activate the Python virtual environment
# macOS/Linux:
source .venv/bin/activate
# Windows:
# .venv\Scripts\activate

# Install CDK dependencies (if needed, though usually handled by root npm install)
# npm install

# Synthesize the CloudFormation template (optional check)
# cdk synth

# Deploy the stack to your configured AWS account/region
npx cdk deploy --outputs-file cdk-outputs.json
```
This command provisions all the necessary AWS resources. Wait for it to complete. It will output the API Gateway endpoint URL and the CloudFront distribution domain name. The `--outputs-file` flag saves these outputs to `cdk-outputs.json`.

#### Step 3: Configure Frontend (If Necessary)
The CDK setup attempts to automatically pass the API Gateway URL to the frontend during the CloudFront deployment. If you encounter issues where the frontend cannot reach the API:
1.  Check the `cdk-outputs.json` file for the API URL.
2.  Manually create/update the `frontend/.env.production` file:
    ```
    VITE_API_URL=YOUR_API_GATEWAY_URL
    ```
3.  Re-run the frontend build (`cd frontend && npm run build && cd ..`).
4.  Re-deploy the CDK stack (`cd infrastructure && npx cdk deploy && cd ..`).

### Verifying Deployment
After deployment (either via script or manually), access your application using the **Website URL** (CloudFront distribution domain name) provided in the deployment outputs. Test the core functionality:
1.  Create a new hidden item using the form.
2.  Verify you receive a shareable link.
3.  Open the shareable link in a different browser or incognito window to view the item details, image, and map.