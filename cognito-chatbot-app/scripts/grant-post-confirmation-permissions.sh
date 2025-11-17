#!/bin/bash

# Script to grant IAM permissions to post-confirmation Lambda
# Run this after deploying the Amplify app

set -e

echo "Granting AdminUpdateUserAttributes permission to post-confirmation Lambda..."

# Get the AWS region and account ID
REGION=$(aws configure get region)
if [ -z "$REGION" ]; then
  REGION="eu-west-1"  # Default region
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Find the post-confirmation Lambda role
ROLE_NAME=$(aws iam list-roles --query "Roles[?contains(RoleName, 'postconfirmationlambda')].RoleName" --output text | awk '{print $1}')

if [ -z "$ROLE_NAME" ]; then
  echo "Error: Could not find post-confirmation Lambda role"
  echo "Please ensure the Amplify app is deployed"
  exit 1
fi

echo "Found role: $ROLE_NAME"

# Find the User Pool ID - get the most recent one
USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 --region "$REGION" --query "UserPools | sort_by(@, &CreationDate) | [-1].Id" --output text)

if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" == "None" ]; then
  echo "Error: Could not find Cognito User Pool"
  exit 1
fi

echo "Found User Pool: $USER_POOL_ID"

# Create a temporary file for the policy document
POLICY_FILE=$(mktemp)
cat > "$POLICY_FILE" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "cognito-idp:AdminUpdateUserAttributes",
      "Resource": "arn:aws:cognito-idp:${REGION}:${ACCOUNT_ID}:userpool/${USER_POOL_ID}"
    }
  ]
}
EOF

# Put the inline policy
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "PostConfirmationCognitoAccess" \
  --policy-document "file://$POLICY_FILE"

# Clean up
rm "$POLICY_FILE"

echo "✓ Successfully granted AdminUpdateUserAttributes permission"
echo "  Role: $ROLE_NAME"
echo "  User Pool: $USER_POOL_ID"
echo ""
echo "The post-confirmation Lambda can now set custom:role attribute for new users"
echo "Try signing up a new user to test!"
