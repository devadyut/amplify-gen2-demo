# Post-Deployment Setup

## Post-Confirmation Lambda Permissions

After deploying the Amplify application for the first time, you need to grant IAM permissions to the post-confirmation Lambda function.

### Why is this needed?

The post-confirmation Lambda automatically sets the `custom:role` attribute to "user" for new signups. However, granting the IAM permission (`cognito-idp:AdminUpdateUserAttributes`) during deployment creates a circular dependency in CloudFormation:

```
User Pool → Lambda Trigger → Lambda Function → IAM Policy → User Pool (circular!)
```

### Solution

Run the provided script after deployment:

```bash
cd cognito-chatbot-app
./scripts/grant-post-confirmation-permissions.sh
```

### What the script does:

1. Finds the post-confirmation Lambda IAM role
2. Finds the Cognito User Pool ID
3. Creates an inline IAM policy granting `AdminUpdateUserAttributes` permission
4. Attaches the policy to the Lambda role

### Verification

After running the script:

1. Sign up a new user
2. Check the user attributes in Cognito Console
3. Verify that `custom:role` is set to "user"

### Manual Alternative

If you prefer to grant permissions manually:

1. Go to AWS Console → IAM → Roles
2. Search for a role containing "postconfirmationlambda"
3. Click "Add permissions" → "Create inline policy"
4. Use JSON policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "cognito-idp:AdminUpdateUserAttributes",
      "Resource": "arn:aws:cognito-idp:REGION:ACCOUNT_ID:userpool/USER_POOL_ID"
    }
  ]
}
```

Replace `REGION`, `ACCOUNT_ID`, and `USER_POOL_ID` with your values.

### Troubleshooting

**Script can't find the role:**
- Ensure the Amplify app is fully deployed
- Check that the post-confirmation Lambda exists in AWS Console

**Script can't find the User Pool:**
- Verify the Cognito User Pool was created
- Check the pool name contains "amplify"

**Permission denied errors:**
- Ensure your AWS CLI has permissions to modify IAM roles
- You need `iam:PutRolePolicy` permission

### CloudWatch Logs

To verify the Lambda is working, check CloudWatch Logs:

```bash
aws logs tail /aws/lambda/post-confirmation-<environment> --follow
```

Look for log entries showing successful role assignment or permission errors.
