const fs = require('fs');

// Read the CDK outputs JSON file
const outputs = JSON.parse(fs.readFileSync('cdk-outputs.json', 'utf8'));

// Format the outputs as text
let textOutput = '# CDK Stack Outputs\n';
textOutput += `# Generated on: ${new Date().toISOString()}\n\n`;

// Get all outputs from BackEndStack
const stackOutputs = outputs.BackEndStack || {};

// Sort outputs alphabetically
const sortedOutputs = Object.entries(stackOutputs).sort(([a], [b]) => a.localeCompare(b));

// Format each output
sortedOutputs.forEach(([key, value]) => {
  textOutput += `${key}=${value}\n`;
});

// Add export commands for easy sourcing
textOutput += '\n# Export commands for bash (source this file to set environment variables)\n';
sortedOutputs.forEach(([key, value]) => {
  // Convert CamelCase to UPPER_SNAKE_CASE
  const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '');
  textOutput += `export ${envKey}="${value}"\n`;
});

// Write to file
fs.writeFileSync('cdk-outputs.txt', textOutput);
console.log('✅ Outputs saved to cdk-outputs.txt');

// Also create a simplified version for scripts
const scriptOutputs = {
  USER_POOL_ID: stackOutputs.UserPoolId,
  CLIENT_ID: stackOutputs.UserPoolClientId,
  REGION: process.env.AWS_REGION || 'ap-south-1',
  STATE_MACHINE_ARN: stackOutputs.UserCreationStateMachineArn,
  BUCKET_NAME: stackOutputs.UserFilesBucketName,
  USER_TABLE: stackOutputs.UserTableName,
  LAMBDA_ARN: stackOutputs.PostConfirmationLambdaArn
};

// Write script-friendly version
let scriptText = '#!/bin/bash\n# CDK Output Variables for Scripts\n\n';
Object.entries(scriptOutputs).forEach(([key, value]) => {
  if (value) {
    scriptText += `export ${key}="${value}"\n`;
  }
});

fs.writeFileSync('cdk-outputs-export.sh', scriptText);
fs.chmodSync('cdk-outputs-export.sh', '755');
console.log('✅ Export script saved to cdk-outputs-export.sh');