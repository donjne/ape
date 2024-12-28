// scripts/test-quicknode.ts
import dotenv from 'dotenv';
import { QuickNodeStream } from '../lib/quicknode/stream';
import { QuickNodeFunction } from '../lib/quicknode/function';

dotenv.config();

const requiredEnvVars = ['QUICKNODE_API_KEY'] as const;

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

async function testQuickNodeSetup() {
  try {
    console.log('\n🚀 Starting QuickNode integration tests...\n');

    // Initialize clients with type-safe API key
    const functionClient = new QuickNodeFunction(env.QUICKNODE_API_KEY);
    const streamClient = new QuickNodeStream(env.QUICKNODE_API_KEY);

    // Test 1: Create Function
    console.log('📝 Test 1: Creating token processor function...');
    const newFunction = await functionClient.createFunction({
      name: "swiftape",
      description: "Test function for processing Solana tokens",
      timeout: 30000
    });
    console.log('✅ Function created:', newFunction.id);

    // Test 2: Create Stream
    console.log('\n📝 Test 2: Creating token detection stream...');
    const newStream = await streamClient.createStream({
      name: "swiftape",
      functionId: newFunction.id
    });
    console.log('✅ Stream created:', newStream.id);

    // Test 3: Test function with mock data
    console.log('\n📝 Test 3: Testing function with mock token data...');
    const mockTokenData = {
      newTokens: [{
        mintAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        blockTime: Date.now() / 1000,
        signature: "test_signature_123",
        slot: 12345678
      }]
    };

    const functionResult = await functionClient.invokeFunction(newFunction.id, {
      stream_data: mockTokenData,
      result_only: true
    });
    console.log('✅ Function test result:', functionResult);

    // Test 4: Verify stored data
    console.log('\n📝 Test 4: Verifying stored token data...');
    const verificationResult = await functionClient.invokeFunction(newFunction.id, {
      user_data: { action: 'getTokens' },
      result_only: true
    });
    console.log('✅ Stored tokens:', verificationResult);

    // Cleanup (optional)
    if (process.env.CLEANUP === 'true') {
      console.log('\n🧹 Cleaning up test resources...');
      await streamClient.deleteStream(newStream.id);
      await functionClient.deleteFunction(newFunction.id);
      console.log('✅ Cleanup complete');
    }

    console.log('\n✨ All tests completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if directly executed
if (require.main === module) {
  testQuickNodeSetup().catch(console.error);
}

export { testQuickNodeSetup };