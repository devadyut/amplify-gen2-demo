# Deployment Guide

This guide covers deploying the Cognito Chatbot Application to different environments.

## Prerequisites

- Node.js 18+ installed
- AWS CLI configured with appropriate credentials
- AWS Amplify Gen 2 CLI installed (`npm install -g @aws-amplify/backend-cli`)
- Git repository initialized

## Environment Configuration

The application supports three environments:

1. **Development** (`dev`) - Local development with Amplify sandbox
2. **Staging** (`staging`) - Pre-production testing environment
3. **Production** (`production`) - Live production environment

### AWS Region

**All environments are deployed to eu-west-1 (Ireland) region** for:
- GDPR compliance and data residency requirements
- Lower latency for European users
- Bedrock model availability in EU region

The region is configured in:
- Deployment scripts (automatically set to eu-west-1)
- Backend configuration (`amplify/backend.ts`)
- Lambda environment variables
- Bedrock ARN references

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Update the following variables:
- `NEXT_PUBLIC_AWS_REGION` - AWS region (set to `eu-west-1`)
- `AWS_REGION` - AWS region (set to `eu-west-1`)
- `AMPLIFY_ENV` - Environment name (dev/staging/production)

## Local Development Setup

### Quick Setup

Run the setup script:

```bash
npm run setup
```

This script will:
- Install all dependencies
- Create `.env.local` from `.env.example`
- Set up the knowledge base directory

### Manual Setup

1. Install dependencies:
```bash
npm install
```

2. Start Amplify sandbox:
```bash
npm run amplify:sandbox
```

3. In another terminal, start Next.js dev server:
```bash
npm run dev
```

4. Open http://localhost:3000

### Amplify Sandbox

The Amplify sandbox provides a personal cloud development environment in eu-west-1:

```bash
npm run amplify:sandbox
```

Or manually with region set:
```bash
AWS_REGION=eu-west-1 NEXT_PUBLIC_AWS_REGION=eu-west-1 npx ampx sandbox
```

Features:
- Automatic deployment of backend changes to eu-west-1
- Isolated resources per developer
- Real-time updates
- No impact on shared environments

## Staging Deployment

Deploy to staging for testing before production:

```bash
npm run deploy:staging
```

Or manually:

```bash
export AMPLIFY_ENV=staging
export AWS_REGION=eu-west-1
export NEXT_PUBLIC_AWS_REGION=eu-west-1
npm ci
npm run lint
npm run build
npx ampx pipeline-deploy --branch staging --app-id $AWS_APP_ID --region eu-west-1
```

### Staging Environment Setup

1. Configure AWS App ID:
```bash
export AWS_APP_ID=your-staging-app-id
```

2. Run deployment script:
```bash
./scripts/deploy-staging.sh
```

3. Verify deployment:
- Check CloudWatch logs
- Test authentication flow
- Test chatbot functionality
- Verify admin access

## Production Deployment

Deploy to production with safety checks:

```bash
npm run deploy:production
```

Or manually:

```bash
export AMPLIFY_ENV=production
export AWS_REGION=eu-west-1
export NEXT_PUBLIC_AWS_REGION=eu-west-1
npm ci
npm run lint
npm run build
npx ampx pipeline-deploy --branch production --app-id $AWS_APP_ID --region eu-west-1
```

### Production Deployment Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] Staging environment tested thoroughly
- [ ] No uncommitted changes
- [ ] On main/master branch
- [ ] Code reviewed and approved
- [ ] Backup plan in place
- [ ] Monitoring configured

### Production Safety Features

The production deployment script includes:
- Confirmation prompts
- Branch verification
- Uncommitted changes check
- Linting enforcement
- Automatic git tagging
- Deployment logging

## CI/CD Pipeline

### GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches:
      - main
      - staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linter
        run: npm run lint
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Amplify
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: ${{ secrets.AWS_REGION }}
        run: |
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            export AMPLIFY_ENV=production
            npx ampx pipeline-deploy --branch production --app-id ${{ secrets.AWS_APP_ID }}
          else
            export AMPLIFY_ENV=staging
            npx ampx pipeline-deploy --branch staging --app-id ${{ secrets.AWS_APP_ID }}
          fi
```

### Required Secrets

Configure in GitHub repository settings:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_APP_ID`

## Amplify Hosting

### Connect Repository

1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Connect your Git repository
4. Configure build settings using `amplify.yml`
5. Deploy

### Build Configuration

The `amplify.yml` file configures:
- Backend deployment
- Frontend build
- Caching strategy
- Environment variables

### Custom Domain

1. In Amplify Console, go to "Domain management"
2. Add your custom domain
3. Configure DNS records
4. Wait for SSL certificate provisioning

## Monitoring and Logs

### CloudWatch Logs

View Lambda function logs:

```bash
aws logs tail /aws/lambda/chatbot-function --follow
aws logs tail /aws/lambda/admin-function --follow
```

### Amplify Console

Monitor deployments:
1. Go to AWS Amplify Console
2. Select your app
3. View build history and logs

### Metrics

Key metrics to monitor:
- Lambda invocation count
- Lambda error rate
- API Gateway latency
- Cognito authentication success rate
- Bedrock API usage

## Rollback

### Quick Rollback

If issues occur in production:

1. Identify the previous working git tag:
```bash
git tag -l "production-*"
```

2. Checkout the previous version:
```bash
git checkout production-YYYYMMDD-HHMMSS
```

3. Redeploy:
```bash
npm run deploy:production
```

### Amplify Console Rollback

1. Go to Amplify Console
2. Select your app
3. Find the previous successful deployment
4. Click "Redeploy this version"

## Troubleshooting

### Common Issues

**Issue: Deployment fails with authentication error**
- Solution: Verify AWS credentials with `aws sts get-caller-identity`

**Issue: Build fails with dependency errors**
- Solution: Delete `node_modules` and `package-lock.json`, then run `npm install`

**Issue: Lambda function timeout**
- Solution: Increase timeout in `amplify/functions/*/resource.ts`

**Issue: API Gateway 403 errors**
- Solution: Check Cognito authorizer configuration and JWT token validity

### Debug Mode

Enable verbose logging:

```bash
export DEBUG=*
npm run deploy:staging
```

## Best Practices

1. **Always test in staging first** - Never deploy directly to production
2. **Use feature branches** - Merge to main/staging via pull requests
3. **Tag releases** - Production deployments automatically create git tags
4. **Monitor after deployment** - Watch CloudWatch logs for 15-30 minutes
5. **Keep dependencies updated** - Regularly update npm packages
6. **Backup configuration** - Store environment variables securely
7. **Document changes** - Update CHANGELOG.md with each deployment

## Support

For issues or questions:
- Check CloudWatch logs
- Review Amplify Console build logs
- Consult AWS Amplify documentation: https://docs.amplify.aws/
- Check Next.js documentation: https://nextjs.org/docs
