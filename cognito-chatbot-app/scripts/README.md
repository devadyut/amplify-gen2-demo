# Deployment Scripts

This directory contains deployment and setup scripts for the Cognito Chatbot Application.

## Available Scripts

### setup-local.sh

Sets up the local development environment.

**Usage:**
```bash
./scripts/setup-local.sh
# or
npm run setup
```

**What it does:**
- Checks for Node.js and npm installation
- Installs project dependencies
- Creates `.env.local` from `.env.example`
- Creates knowledge base directory
- Provides next steps for local development

**Requirements:**
- Node.js 18+
- npm

---

### deploy-staging.sh

Deploys the application to the staging environment.

**Usage:**
```bash
./scripts/deploy-staging.sh
# or
npm run deploy:staging
```

**What it does:**
- Sets `AMPLIFY_ENV=staging`
- Installs dependencies with `npm ci`
- Runs linting checks
- Builds the Next.js application
- Deploys backend to AWS using Amplify
- Generates deployment outputs

**Requirements:**
- AWS CLI configured
- Valid AWS credentials
- `AWS_APP_ID` environment variable (optional)

**Environment Variables:**
- `AWS_APP_ID` - Amplify app ID for staging (defaults to "staging")

---

### deploy-production.sh

Deploys the application to the production environment with safety checks.

**Usage:**
```bash
./scripts/deploy-production.sh
# or
npm run deploy:production
```

**What it does:**
- Prompts for confirmation (production deployment)
- Checks current git branch (warns if not main/master)
- Checks for uncommitted changes
- Sets `AMPLIFY_ENV=production`
- Installs dependencies with `npm ci`
- Runs linting checks (fails if errors)
- Builds the Next.js application
- Deploys backend to AWS using Amplify
- Generates deployment outputs
- Creates git tag with timestamp
- Pushes tag to remote repository

**Requirements:**
- AWS CLI configured
- Valid AWS credentials
- Git repository initialized
- `AWS_APP_ID` environment variable (optional)
- On main/master branch (recommended)
- No uncommitted changes (recommended)

**Environment Variables:**
- `AWS_APP_ID` - Amplify app ID for production (defaults to "production")

**Safety Features:**
- Confirmation prompt before deployment
- Branch verification
- Uncommitted changes check
- Linting enforcement
- Automatic git tagging

---

## Script Permissions

All scripts should be executable. If you encounter permission errors, run:

```bash
chmod +x scripts/*.sh
```

## Environment Variables

### Required for Deployment

- `AWS_ACCESS_KEY_ID` - AWS access key (configured via AWS CLI)
- `AWS_SECRET_ACCESS_KEY` - AWS secret key (configured via AWS CLI)
- `AWS_REGION` - AWS region (configured via AWS CLI or .env)

### Optional

- `AWS_APP_ID` - Amplify app ID (defaults to environment name)
- `AMPLIFY_ENV` - Environment name (set by scripts)

## Troubleshooting

### Script fails with "command not found"

**Issue:** Required command (node, npm, aws, git) not found

**Solution:** Install the missing tool:
- Node.js: https://nodejs.org/
- AWS CLI: https://aws.amazon.com/cli/
- Git: https://git-scm.com/

### AWS credentials not configured

**Issue:** Script fails with AWS authentication error

**Solution:** Configure AWS CLI:
```bash
aws configure
```

### Permission denied

**Issue:** Script cannot be executed

**Solution:** Make script executable:
```bash
chmod +x scripts/deploy-staging.sh
```

### Linting errors prevent deployment

**Issue:** Deployment fails due to linting errors

**Solution:** Fix linting errors:
```bash
npm run lint
```

## Best Practices

1. **Test locally first** - Always test changes in local development before deploying
2. **Deploy to staging** - Test in staging before production
3. **Review changes** - Check git diff before deploying
4. **Monitor logs** - Watch CloudWatch logs after deployment
5. **Keep scripts updated** - Update scripts as deployment process evolves

## Adding New Scripts

When adding new deployment scripts:

1. Create the script in this directory
2. Make it executable: `chmod +x scripts/your-script.sh`
3. Add npm script in `package.json`
4. Document it in this README
5. Test thoroughly before committing

## CI/CD Integration

These scripts can be integrated into CI/CD pipelines:

**GitHub Actions:**
```yaml
- name: Deploy to Staging
  run: npm run deploy:staging
```

**GitLab CI:**
```yaml
deploy:staging:
  script:
    - npm run deploy:staging
```

**Jenkins:**
```groovy
sh 'npm run deploy:staging'
```

## Support

For issues with deployment scripts:
1. Check script output for error messages
2. Verify AWS credentials and permissions
3. Check CloudWatch logs for backend errors
4. Review DEPLOYMENT.md for detailed deployment guide


---

## Testing and Verification Scripts

### verify-wiring.js

Verifies that all components are properly wired together. Checks configuration, imports, and integration points between frontend and backend.

**Usage:**
```bash
node scripts/verify-wiring.js
# or
npm run verify:wiring
```

**What it checks:**
- Backend infrastructure files (CDK resources)
- API Gateway configuration (REST API, authorizer, CORS)
- Lambda function implementations (handlers, validation)
- Frontend components (pages, layouts, middleware)
- Next.js API routes (session validation, forwarding)
- Middleware and auth utilities
- Integration points between all layers

**Exit codes:**
- `0` - All verifications passed
- `1` - Some verifications failed

**Requirements:**
- Node.js installed
- All source files present

---

### test-integration.js

Tests end-to-end wiring between frontend and backend APIs. Provides comprehensive information about authentication flows, chatbot interaction, and admin access.

**Usage:**
```bash
node scripts/test-integration.js
# or
npm run test:integration
```

**What it tests:**
- API Gateway connectivity
- CORS configuration
- Lambda function endpoints
- Authentication flow documentation
- Chatbot interaction flow
- Admin access flow

**What it provides:**
- Manual testing instructions
- API testing commands (curl examples)
- Flow diagrams and documentation
- Next steps for full testing

**Requirements:**
- Backend deployed (amplify_outputs.json must exist)
- Node.js installed
- Network access to API Gateway endpoints

---

### test-cors-security.js

Tests CORS configuration and API Gateway security settings.

**Usage:**
```bash
node scripts/test-cors-security.js
# or
npm run test:cors-security
```

**What it tests:**
- CORS preflight requests from different origins
- Authentication requirement enforcement
- Rate limiting configuration
- Security headers presence
- Authorization flow

**What it provides:**
- CORS configuration details
- Security headers documentation
- Rate limiting information
- Authorization flow explanation

**Requirements:**
- Backend deployed (amplify_outputs.json must exist)
- Node.js installed
- Network access to API Gateway endpoints

---

## Testing Workflow

### 1. Initial Verification
After setting up the project or making changes:

```bash
# Verify all components are wired correctly
npm run verify:wiring
```

### 2. Integration Testing
After deploying the backend:

```bash
# Test API connectivity and get testing instructions
npm run test:integration
```

### 3. Security Testing
Before deploying to production:

```bash
# Test CORS and security configuration
npm run test:cors-security
```

### 4. Manual Testing
Follow the instructions provided by the integration test script to:
- Create test users with custom:role attributes
- Test authentication flows
- Test chatbot interaction
- Test admin access
- Test unauthorized access scenarios

---

## Script Comparison

| Script | Purpose | Requires Backend | Exit on Failure |
|--------|---------|------------------|-----------------|
| verify-wiring.js | Static code verification | No | Yes |
| test-integration.js | API connectivity & docs | Yes | No |
| test-cors-security.js | CORS & security testing | Yes | No |

---

## Troubleshooting Testing Scripts

### "amplify_outputs.json not found"

**Issue:** Testing script cannot find backend configuration

**Solution:** Deploy the backend first:
```bash
npx ampx sandbox
# or
npm run deploy:staging
```

### "API endpoint not configured"

**Issue:** Backend deployment incomplete or failed

**Solution:** 
1. Check backend deployment status
2. Verify amplify_outputs.json contains API endpoint
3. Redeploy if necessary

### "Connection refused" errors

**Issue:** Cannot connect to API Gateway

**Solution:**
1. Verify API Gateway is deployed
2. Check AWS Console for API Gateway status
3. Verify network connectivity
4. Check security groups and VPC settings

### Verification failures

**Issue:** verify-wiring.js reports failures

**Solution:**
1. Review specific failures in output
2. Check for missing files
3. Verify imports are correct
4. Ensure configuration patterns match

### CORS test failures

**Issue:** CORS preflight requests fail

**Solution:**
1. Verify API Gateway CORS configuration
2. Check allowed origins in amplify/api/resource.ts
3. Ensure OPTIONS method is enabled
4. Review API Gateway logs

---

## Additional Documentation

For more information about specific topics:

- **CORS and Security:** See [docs/CORS_AND_SECURITY.md](../docs/CORS_AND_SECURITY.md)
- **API Gateway:** See [docs/API_GATEWAY.md](../docs/API_GATEWAY.md)
- **Authentication:** See [docs/AUTH_SETUP.md](../docs/AUTH_SETUP.md)
- **Deployment:** See [DEPLOYMENT.md](../DEPLOYMENT.md)
