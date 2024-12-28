// scripts/setup-quicknode.ts
import dotenv from 'dotenv';
import { QuickNodeStream } from '../lib/quicknode/stream';
import { QuickNodeFunction } from '../lib/quicknode/function';
import { CreateStreamResponse } from '@/types/quicknode';

dotenv.config();

const requiredEnvVars = [
  'QUICKNODE_API_KEY',
  'WEBHOOK_URL'
] as const;

// Type-safe environment variables
const env = {} as Record<typeof requiredEnvVars[number], string>;

// Validate environment variables
for (const key of requiredEnvVars) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable is required`);
  }
  env[key] = value;
}

interface SetupResult {
  functionId: string;
  streamId: string;
  functionUrl: string;
  streamConfig: CreateStreamResponse;
}

async function setupQuickNode(): Promise<SetupResult> {
  try {
    console.log('\n🚀 Starting QuickNode setup...\n');

    // Initialize clients
    const functionClient = new QuickNodeFunction(env.QUICKNODE_API_KEY);
    const streamClient = new QuickNodeStream(env.QUICKNODE_API_KEY);

    // Step 1: Create token processor function
    console.log('📝 Creating token processor function...');
    const newFunction = await functionClient.createFunction({
      name: "swiftape",
      description: "Production function for processing Solana tokens on pump.fun",
      timeout: 30000
    });
    console.log('✅ Function created:', newFunction.id);

    // Step 2: Create token detection stream
    console.log('\n📝 Creating token detection stream...');
    const streamConfig = await streamClient.createStream({
      name: "swiftape",
      functionId: newFunction.id,
      notificationEmail: process.env.NOTIFICATION_EMAIL // Optional
    });
    console.log('✅ Stream created:', streamConfig.id);

    // Step 3: Test function
    console.log('\n📝 Testing function...');
    const testResult = await functionClient.invokeFunction(newFunction.id, {
      user_data: { action: 'getTokens' },
      result_only: true
    });
    console.log('✅ Function test successful:', testResult);

    const functionUrl = `https://api.quicknode.com/functions/rest/v1/functions/${newFunction.id}/invoke`;
    
    // Return setup information
    const setupResult: SetupResult = {
      functionId: newFunction.id,
      streamId: streamConfig.id,
      functionUrl,
      streamConfig
    };

    // Log setup information
    console.log('\n✨ Setup completed successfully!');
    console.log('Setup information:');
    console.log(JSON.stringify(setupResult, null, 2));

    return setupResult;
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run if directly executed
if (require.main === module) {
  setupQuickNode().catch(console.error);
}

export { setupQuickNode };