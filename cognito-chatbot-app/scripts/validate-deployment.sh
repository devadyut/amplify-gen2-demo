#!/bin/bash

# Comprehensive deployment validation script
# Validates all deployed AWS resources and their configurations

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters for validation results
PASSED=0
FAILED=0
WARNINGS=0

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"
}

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    print_success "AWS CLI is installed"
}

# Function to get the main CloudFormation stack name
get_main_stack_name() {
    STACK_NAME=$(aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
        --query "StackSummaries[?contains(StackName, 'amplify')].StackName" \
        --output text | head -n 1)
    
    if [ -z "$STACK_NAME" ]; then
        print_error "Could not find Amplify CloudFormation stack"
        exit 1
    fi
    
    print_info "Found main stack: $STACK_NAME"
    echo "$STACK_NAME"
}

# 1. Validate CloudFormation stacks
validate_cloudformation() {
    print_header "CloudFormation Stack Validation"
    
    STACK_NAME=$(get_main_stack_name)
    
    # Check main stack status
    MAIN_STATUS=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].StackStatus" \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [[ "$MAIN_STATUS" == "CREATE_COMPLETE" ]] || [[ "$MAIN_STATUS" == "UPDATE_COMPLETE" ]]; then
        print_success "Main stack is in healthy state: $MAIN_STATUS"
    else
        print_error "Main stack is in unhealthy state: $MAIN_STATUS"
        return 1
    fi
    
    # Check nested stacks
    NESTED_STACKS=$(aws cloudformation list-stack-resources \
        --stack-name "$STACK_NAME" \
        --query "StackResourceSummaries[?ResourceType=='AWS::CloudFormation::Stack'].PhysicalResourceId" \
        --output text)
    
    if [ -n "$NESTED_STACKS" ]; then
        print_info "Checking nested stacks..."
        for NESTED_STACK in $NESTED_STACKS; do
            NESTED_STATUS=$(aws cloudformation describe-stacks \
                --stack-name "$NESTED_STACK" \
                --query "Stacks[0].StackStatus" \
                --output text 2>/dev/null || echo "NOT_FOUND")
            
            if [[ "$NESTED_STATUS" == "CREATE_COMPLETE" ]] || [[ "$NESTED_STATUS" == "UPDATE_COMPLETE" ]]; then
                print_success "Nested stack $(basename $NESTED_STACK) is healthy: $NESTED_STATUS"
            else
                print_error "Nested stack $(basename $NESTED_STACK) is unhealthy: $NESTED_STATUS"
            fi
        done
    else
        print_info "No nested stacks found"
    fi
}

# 2. Validate S3 bucket
validate_s3_bucket() {
    print_header "S3 Bucket Validation"
    
    # Find knowledge base bucket
    BUCKET_NAME=$(aws s3api list-buckets \
        --query "Buckets[?contains(Name, 'knowledge-base') || contains(Name, 'knowledgebase')].Name" \
        --output text | head -n 1)
    
    if [ -z "$BUCKET_NAME" ]; then
        print_warning "Knowledge base bucket not found (may not be created yet)"
        return 0
    fi
    
    print_success "Found S3 bucket: $BUCKET_NAME"
    
    # Check encryption
    ENCRYPTION=$(aws s3api get-bucket-encryption \
        --bucket "$BUCKET_NAME" \
        --query "ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm" \
        --output text 2>/dev/null || echo "NONE")
    
    if [[ "$ENCRYPTION" != "NONE" ]]; then
        print_success "Bucket encryption is enabled: $ENCRYPTION"
    else
        print_error "Bucket encryption is not enabled"
    fi
    
    # Check public access block
    PUBLIC_ACCESS=$(aws s3api get-public-access-block \
        --bucket "$BUCKET_NAME" \
        --query "PublicAccessBlockConfiguration.BlockPublicAcls" \
        --output text 2>/dev/null || echo "false")
    
    if [[ "$PUBLIC_ACCESS" == "True" ]]; then
        print_success "Public access is blocked"
    else
        print_warning "Public access blocking may not be fully configured"
    fi
}

# 3. Validate DynamoDB table
validate_dynamodb_table() {
    print_header "DynamoDB Table Validation"
    
    # Find app data table
    TABLE_NAME=$(aws dynamodb list-tables \
        --query "TableNames[?contains(@, 'app-data') || contains(@, 'AppData')]" \
        --output text | head -n 1)
    
    if [ -z "$TABLE_NAME" ]; then
        print_warning "App data table not found (may not be created yet)"
        return 0
    fi
    
    print_success "Found DynamoDB table: $TABLE_NAME"
    
    # Check table status
    TABLE_STATUS=$(aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --query "Table.TableStatus" \
        --output text)
    
    if [[ "$TABLE_STATUS" == "ACTIVE" ]]; then
        print_success "Table status is ACTIVE"
    else
        print_error "Table status is not ACTIVE: $TABLE_STATUS"
    fi
    
    # Check billing mode
    BILLING_MODE=$(aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --query "Table.BillingModeSummary.BillingMode" \
        --output text 2>/dev/null || echo "PROVISIONED")
    
    if [[ "$BILLING_MODE" == "PAY_PER_REQUEST" ]]; then
        print_success "Billing mode is on-demand (PAY_PER_REQUEST)"
    else
        print_info "Billing mode: $BILLING_MODE"
    fi
    
    # Check encryption
    ENCRYPTION_TYPE=$(aws dynamodb describe-table \
        --table-name "$TABLE_NAME" \
        --query "Table.SSEDescription.SSEType" \
        --output text 2>/dev/null || echo "NONE")
    
    if [[ "$ENCRYPTION_TYPE" != "NONE" ]]; then
        print_success "Table encryption is enabled: $ENCRYPTION_TYPE"
    else
        print_warning "Table encryption status unclear"
    fi
}

# 4. Validate Lambda functions
validate_lambda_functions() {
    print_header "Lambda Function Validation"
    
    # Check chatbot Lambda
    CHATBOT_LAMBDA=$(aws lambda list-functions \
        --query "Functions[?contains(FunctionName, 'chatbot') || contains(FunctionName, 'Chatbot')].FunctionName" \
        --output text | head -n 1)
    
    if [ -n "$CHATBOT_LAMBDA" ]; then
        print_success "Found chatbot Lambda: $CHATBOT_LAMBDA"
        
        # Check Lambda configuration
        CHATBOT_STATE=$(aws lambda get-function \
            --function-name "$CHATBOT_LAMBDA" \
            --query "Configuration.State" \
            --output text)
        
        if [[ "$CHATBOT_STATE" == "Active" ]]; then
            print_success "Chatbot Lambda is Active"
        else
            print_error "Chatbot Lambda state: $CHATBOT_STATE"
        fi
    else
        print_warning "Chatbot Lambda not found (may not be created yet)"
    fi
    
    # Check admin Lambda
    ADMIN_LAMBDA=$(aws lambda list-functions \
        --query "Functions[?contains(FunctionName, 'admin') || contains(FunctionName, 'Admin')].FunctionName" \
        --output text | head -n 1)
    
    if [ -n "$ADMIN_LAMBDA" ]; then
        print_success "Found admin Lambda: $ADMIN_LAMBDA"
        
        ADMIN_STATE=$(aws lambda get-function \
            --function-name "$ADMIN_LAMBDA" \
            --query "Configuration.State" \
            --output text)
        
        if [[ "$ADMIN_STATE" == "Active" ]]; then
            print_success "Admin Lambda is Active"
        else
            print_error "Admin Lambda state: $ADMIN_STATE"
        fi
    else
        print_warning "Admin Lambda not found (may not be created yet)"
    fi
    
    # Check post-confirmation Lambda
    POST_CONF_LAMBDA=$(aws lambda list-functions \
        --query "Functions[?contains(FunctionName, 'post-confirmation') || contains(FunctionName, 'postConfirmation')].FunctionName" \
        --output text | head -n 1)
    
    if [ -n "$POST_CONF_LAMBDA" ]; then
        print_success "Found post-confirmation Lambda: $POST_CONF_LAMBDA"
        
        POST_CONF_STATE=$(aws lambda get-function \
            --function-name "$POST_CONF_LAMBDA" \
            --query "Configuration.State" \
            --output text)
        
        if [[ "$POST_CONF_STATE" == "Active" ]]; then
            print_success "Post-confirmation Lambda is Active"
        else
            print_error "Post-confirmation Lambda state: $POST_CONF_STATE"
        fi
    else
        print_warning "Post-confirmation Lambda not found"
    fi
}

# 5. Validate API Gateway
validate_api_gateway() {
    print_header "API Gateway Validation"
    
    # Find REST API
    API_ID=$(aws apigateway get-rest-apis \
        --query "items[?contains(name, 'Chatbot') || contains(name, 'chatbot')].id" \
        --output text | head -n 1)
    
    if [ -z "$API_ID" ]; then
        print_warning "Chatbot API not found (may not be created yet)"
        return 0
    fi
    
    print_success "Found API Gateway: $API_ID"
    
    # Check API resources
    RESOURCES=$(aws apigateway get-resources \
        --rest-api-id "$API_ID" \
        --query "items[].path" \
        --output text)
    
    if echo "$RESOURCES" | grep -q "/chatbot"; then
        print_success "Found /chatbot endpoint"
    else
        print_warning "/chatbot endpoint not found"
    fi
    
    if echo "$RESOURCES" | grep -q "/admin"; then
        print_success "Found /admin endpoint"
    else
        print_warning "/admin endpoint not found"
    fi
    
    # Get API endpoint URL
    REGION=$(aws configure get region)
    API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod"
    print_info "API endpoint: $API_URL"
}

# 6. Validate Cognito User Pool
validate_cognito() {
    print_header "Cognito User Pool Validation"
    
    # Find User Pool
    USER_POOL_ID=$(aws cognito-idp list-user-pools \
        --max-results 10 \
        --query "UserPools[?contains(Name, 'amplify')].Id" \
        --output text | head -n 1)
    
    if [ -z "$USER_POOL_ID" ]; then
        print_error "Cognito User Pool not found"
        return 1
    fi
    
    print_success "Found User Pool: $USER_POOL_ID"
    
    # Check custom attributes
    CUSTOM_ATTRS=$(aws cognito-idp describe-user-pool \
        --user-pool-id "$USER_POOL_ID" \
        --query "UserPool.SchemaAttributes[?contains(Name, 'custom:')].Name" \
        --output text)
    
    if echo "$CUSTOM_ATTRS" | grep -q "custom:role"; then
        print_success "Custom attribute 'custom:role' is configured"
    else
        print_error "Custom attribute 'custom:role' is not configured"
    fi
    
    if echo "$CUSTOM_ATTRS" | grep -q "custom:department"; then
        print_success "Custom attribute 'custom:department' is configured"
    else
        print_warning "Custom attribute 'custom:department' is not configured"
    fi
    
    # Check Lambda triggers
    TRIGGERS=$(aws cognito-idp describe-user-pool \
        --user-pool-id "$USER_POOL_ID" \
        --query "UserPool.LambdaConfig" \
        --output json)
    
    if echo "$TRIGGERS" | grep -q "PostConfirmation"; then
        print_success "Post-confirmation trigger is configured"
    else
        print_warning "Post-confirmation trigger is not configured"
    fi
}

# 7. Validate IAM permissions for post-confirmation Lambda
validate_iam_permissions() {
    print_header "IAM Permissions Validation"
    
    # Find post-confirmation Lambda
    POST_CONF_LAMBDA=$(aws lambda list-functions \
        --query "Functions[?contains(FunctionName, 'post-confirmation') || contains(FunctionName, 'postConfirmation')].FunctionName" \
        --output text | head -n 1)
    
    if [ -z "$POST_CONF_LAMBDA" ]; then
        print_warning "Post-confirmation Lambda not found, skipping IAM validation"
        return 0
    fi
    
    # Get Lambda execution role
    ROLE_ARN=$(aws lambda get-function \
        --function-name "$POST_CONF_LAMBDA" \
        --query "Configuration.Role" \
        --output text)
    
    ROLE_NAME=$(echo "$ROLE_ARN" | cut -d'/' -f2)
    
    print_info "Checking role: $ROLE_NAME"
    
    # Check inline policies
    INLINE_POLICIES=$(aws iam list-role-policies \
        --role-name "$ROLE_NAME" \
        --output text)
    
    if [ -n "$INLINE_POLICIES" ]; then
        print_success "Found inline policies attached to role"
        
        # Check for AdminUpdateUserAttributes permission
        for POLICY_NAME in $INLINE_POLICIES; do
            POLICY_DOC=$(aws iam get-role-policy \
                --role-name "$ROLE_NAME" \
                --policy-name "$POLICY_NAME" \
                --query "PolicyDocument" \
                --output json)
            
            if echo "$POLICY_DOC" | grep -q "AdminUpdateUserAttributes"; then
                print_success "AdminUpdateUserAttributes permission found in policy: $POLICY_NAME"
            fi
        done
    else
        print_warning "No inline policies found (may need to run grant-post-confirmation-permissions.sh)"
    fi
    
    # Check attached managed policies
    MANAGED_POLICIES=$(aws iam list-attached-role-policies \
        --role-name "$ROLE_NAME" \
        --query "AttachedPolicies[].PolicyName" \
        --output text)
    
    if [ -n "$MANAGED_POLICIES" ]; then
        print_info "Attached managed policies: $MANAGED_POLICIES"
    fi
}

# 8. Validate user data
validate_user_data() {
    print_header "User Data Validation"
    
    # Find User Pool
    USER_POOL_ID=$(aws cognito-idp list-user-pools \
        --max-results 10 \
        --query "UserPools[?contains(Name, 'amplify')].Id" \
        --output text | head -n 1)
    
    if [ -z "$USER_POOL_ID" ]; then
        print_warning "User Pool not found, skipping user data validation"
        return 0
    fi
    
    # List users
    USERS=$(aws cognito-idp list-users \
        --user-pool-id "$USER_POOL_ID" \
        --query "Users[].Username" \
        --output text)
    
    if [ -z "$USERS" ]; then
        print_info "No users found in User Pool (this is normal for new deployments)"
        return 0
    fi
    
    USER_COUNT=$(echo "$USERS" | wc -w)
    print_info "Found $USER_COUNT user(s) in User Pool"
    
    # Check each user for custom:role attribute
    for USERNAME in $USERS; do
        USER_ATTRS=$(aws cognito-idp admin-get-user \
            --user-pool-id "$USER_POOL_ID" \
            --username "$USERNAME" \
            --query "UserAttributes[?Name=='custom:role'].Value" \
            --output text)
        
        if [ -n "$USER_ATTRS" ]; then
            print_success "User $USERNAME has custom:role attribute: $USER_ATTRS"
        else
            print_warning "User $USERNAME does not have custom:role attribute set"
        fi
    done
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║        Amplify Deployment Validation Script                  ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    print_info "Starting deployment validation..."
    print_info "Region: $(aws configure get region)"
    echo ""
    
    # Check prerequisites
    check_aws_cli
    
    # Run all validations
    validate_cloudformation || true
    validate_s3_bucket || true
    validate_dynamodb_table || true
    validate_lambda_functions || true
    validate_api_gateway || true
    validate_cognito || true
    validate_iam_permissions || true
    validate_user_data || true
    
    # Print summary
    print_header "Validation Summary"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        print_success "All critical validations passed!"
        echo ""
        print_info "Next steps:"
        echo "  1. Test user signup flow to verify post-confirmation trigger"
        echo "  2. Test API endpoints with authenticated requests"
        echo "  3. Verify Lambda functions can access S3 and DynamoDB"
        echo ""
        exit 0
    else
        print_error "Some validations failed. Please review the errors above."
        echo ""
        exit 1
    fi
}

# Run main function
main
