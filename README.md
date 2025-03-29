# UUbrella - Hidden Items Application

![UUbrella Logo](https://via.placeholder.com/150x150.png?text=UUbrella)

## Project Overview
UUbrella is a web application that enables users to discretely share the location of found items. Users can hide items in the city, post a photo with GPS coordinates, and share a secure link with the item's owner for retrieval.

## Technology Stack
- Frontend: React + Vite, TypeScript, TailwindCSS
- Backend: Python, AWS Lambda
- Infrastructure: AWS CDK
- Storage: S3, DynamoDB
- CDN: CloudFront
- API: API Gateway

## Getting Started

### Prerequisites
- Node.js 16+
- Python 3.9+
- AWS CLI configured
- CDK CLI installed
- jq (for parsing JSON in deployment script)

### Installation

#### macOS/Linux
```bash
# Clone the repository
git clone https://github.com/yourusername/uubrella.git
cd uubrella

# Install dependencies
npm install

# Install Python dependencies
cd infrastructure
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

#### Windows
```bash
# Clone the repository
git clone https://github.com/yourusername/uubrella.git
cd uubrella

# Install dependencies
npm install

# Install Python dependencies
cd infrastructure
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### Local Development
```bash
# Start the frontend development server
npm run dev

# Or run the frontend directly
cd frontend
npm install
npm run dev
```

## Deployment to AWS

### Option 1: Using the Automated Deployment Script
We've provided a deployment script that automates the entire process:

```bash
# Make the script executable (if not already)
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

The script will:
1. Build the frontend application
2. Deploy the infrastructure using CDK
3. Output the API URL and Website URL

### Option 2: Manual Deployment

#### Step 1: Build the Frontend
```bash
# Build the frontend
cd frontend
npm install
npm run build
cd ..
```

#### Step 2: Deploy with CDK
```bash
# Deploy the infrastructure
cd infrastructure
npm install
npx cdk deploy
cd ..
```

#### Step 3: Update Environment Variables
After deployment, CDK will output the API URL. You'll need to update the frontend's environment variables with this URL and redeploy if necessary.

### Verifying Deployment
After deployment, you can access your application at the CloudFront URL provided in the CDK outputs. The application should be fully functional with:

1. The ability to create hidden items with photos and GPS locations
2. Shareable links for item retrieval
3. Mobile-optimized interface for both creation and viewing

## Implementation Plan

### 1. Frontend Development (Week 1-2)

#### 1.1 Project Setup
- Initialize React + Vite project with TypeScript
- Configure TailwindCSS
- Set up development environment
- Configure build process

#### 1.2 Core Components
- Map Viewer Component (Leaflet)
  * Interactive map display
  * Location picker
  * Marker placement
- Image Upload Component
  * Drag and drop support
  * Image preview
  * File validation
- Item Form Component
  * Title and description inputs
  * Location display
  * Submit functionality
- Share Link Component
  * Link generation
  * Copy to clipboard
  * QR code generation (optional)

#### 1.3 Pages
- Home Page
  * Item creation form
  * Map integration
- Item View Page
  * Item details display
  * Location map
  * Image display

#### 1.4 State Management & API Integration
- API client setup
- Error handling
- Loading states
- Form validation

### 2. Backend Enhancements (Week 2-3)

#### 2.1 Image Processing
- Create Sharp Lambda layer
- Implement image optimization:
  * Resize large images (max 1600px)
  * Convert to WebP format
  * Optimize quality (80%)
  * Preserve EXIF data
- Update create_item Lambda function
- Add image validation

#### 2.2 Security Improvements
- Input validation
  * File type verification
  * Size limits
  * Content validation
- Rate limiting implementation
  * Per-IP limits
  * Token bucket algorithm
- Error handling
  * Detailed error messages
  * Error logging
  * Recovery procedures

### 3. Infrastructure Improvements (Week 3-4)

#### 3.1 Security Configuration
- WAF Rules
  * Rate limiting rules
  * IP-based blocking
  * Geographic restrictions
  * SQL injection prevention
- CloudFront Security Headers
  * Content-Security-Policy
  * X-Frame-Options
  * X-Content-Type-Options
  * Referrer-Policy

#### 3.2 Performance Optimization
- S3 Lifecycle Rules
  * Transition to IA after 30 days
  * Delete after 90 days
- API Gateway Throttling
  * Configure burst limits
  * Set steady-state rates
- Cache Policy
  * Browser caching
  * CloudFront caching
  * Cache invalidation strategy

### 4. Testing & Documentation (Throughout)

#### 4.1 Testing
- Unit Tests
  * Frontend component tests
  * Lambda function tests
  * Infrastructure tests
- Integration Tests
  * API endpoint tests
  * Frontend-backend integration
  * Image processing pipeline
- Performance Tests
  * Load testing
  * Stress testing

#### 4.2 Documentation
- API Documentation
  * Endpoint specifications
  * Request/response formats
  * Error codes
- User Guide
  * Installation instructions
  * Usage guidelines
  * Troubleshooting
- Deployment Guide
  * Infrastructure setup
  * Configuration
  * Monitoring

## Cost Optimization

### Storage
- Image optimization to reduce storage costs
- S3 lifecycle rules for old items
- DynamoDB on-demand pricing

### Compute
- Lambda function optimization
- CloudFront caching
- API Gateway caching

## Security Considerations

### Data Protection
- Secure random URLs for items
- Input validation and sanitization
- File type verification
- Content-Security-Policy headers

### Access Control
- Rate limiting on API endpoints
- WAF rules for attack prevention
- Geographic restrictions (optional)

### Monitoring
- CloudWatch Logs
- API Gateway metrics
- Lambda function metrics
- S3 access logs

## Development Workflow
1. Create feature branch
2. Implement changes
3. Write tests
4. Submit pull request
5. Code review
6. Merge to main
7. Deploy to staging
8. Deploy to production

## Monitoring & Maintenance

### Monitoring
- CloudWatch dashboards
- Error tracking
- Performance metrics
- Cost analysis

### Maintenance
- Regular security updates
- Dependency updates
- Performance optimization
- Cost optimization

## Future Enhancements
1. Item expiration
2. Multiple images per item
3. Optional contact information
4. Report inappropriate content
5. Analytics dashboard

## Contributing

We welcome contributions to the UUbrella project! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure to update tests as appropriate and adhere to the existing coding style.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Leaflet](https://leafletjs.com/) for the interactive maps
- [React](https://reactjs.org/) for the frontend framework
- [AWS CDK](https://aws.amazon.com/cdk/) for infrastructure as code
- All contributors who have helped shape this project