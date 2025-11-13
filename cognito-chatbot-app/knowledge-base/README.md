# Knowledge Base Documents

This directory contains sample knowledge base documents that will be uploaded to the S3 bucket for use by the chatbot.

## Document Structure

Each document is a JSON file with the following structure:

```json
{
  "documentId": "unique-identifier",
  "title": "Document Title",
  "content": "Full text content that the chatbot will use as context",
  "metadata": {
    "category": "category-name",
    "lastUpdated": "ISO8601 timestamp",
    "tags": ["tag1", "tag2"]
  }
}
```

## Available Documents

1. **product-faq.json** - Frequently asked questions about the product
2. **technical-docs.json** - Technical documentation and architecture details
3. **user-guide.json** - User guide for getting started and troubleshooting

## Uploading Documents to S3

After deploying the Amplify backend, you can upload these documents to S3:

### Using AWS CLI

```bash
# Get the bucket name from Amplify outputs
BUCKET_NAME=$(cat amplify_outputs.json | grep -A 5 '"storage"' | grep 'bucketName' | cut -d'"' -f4)

# Upload all documents
aws s3 cp knowledge-base/ s3://$BUCKET_NAME/knowledge-base/ --recursive --exclude "README.md"
```

### Using AWS Console

1. Navigate to the S3 console
2. Find the bucket named `amplify-knowledgebase-*`
3. Create a folder named `knowledge-base`
4. Upload the JSON files to this folder

### Using Amplify CLI

```bash
# After deployment, use the Amplify storage commands
npx amplify storage upload --path knowledge-base/product-faq.json
npx amplify storage upload --path knowledge-base/technical-docs.json
npx amplify storage upload --path knowledge-base/user-guide.json
```

## Adding New Documents

To add new knowledge base documents:

1. Create a new JSON file following the structure above
2. Ensure the `documentId` is unique
3. Add relevant content that the chatbot should reference
4. Upload the file to the S3 bucket in the `knowledge-base/` prefix
5. The chatbot will automatically use the new document as context

## Best Practices

- Keep documents focused on specific topics
- Use clear, concise language
- Update the `lastUpdated` timestamp when modifying documents
- Use descriptive tags for better organization
- Test chatbot responses after adding new documents
