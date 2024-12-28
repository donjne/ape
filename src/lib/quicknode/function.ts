import axios, { AxiosError } from 'axios';
import { StreamError, ErrorResponse } from '@/types/quicknode';

export type FunctionRuntime = "nodejs-qn:20";

export interface CreateFunctionConfig {
  name: string;
  description?: string;
  kind: FunctionRuntime;
  code: string;
  binary: boolean;
  limits: {
    timeout: number; // milliseconds between 5000 and 60000
  };
}

export interface FunctionConfig extends CreateFunctionConfig {
  id: string;
  created_at: string;
  updated_at: string;
  qn_account_id: string;
  exec: {
    kind: FunctionRuntime;
    code: string;
    binary: boolean;
  };
}

export interface UpdateFunctionConfig {
  description?: string;
  kind?: FunctionRuntime;
  code?: string;
  binary?: boolean;
  limits?: {
    timeout: number;
  };
}

export interface CreateFunctionResponse extends FunctionConfig {}

export interface InvokeFunctionOptions {
  network?: string;  // Optional network parameter
  dataset?: string;  // Optional dataset parameter
  block_number?: number;  // Optional block number
  user_data?: Record<string, unknown>;
  stream_data?: Record<string, unknown>;
  result_only?: boolean;
}

export class QuickNodeFunction {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.quicknode.com/functions/rest/v1/functions';

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('QuickNode API key is required');
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    data?: unknown
  ): Promise<T> {
    try {
      console.log('Making request with data:', JSON.stringify(data, null, 2));
      const response = await axios({
        method,
        url,
        data,
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': this.apiKey
        }
      });
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Axios error:', {
          status: error.response?.status,
          data: error.response?.data
        });
        const streamError: StreamError = new Error(
          (error.response?.data as ErrorResponse)?.message || 'Request failed'
        );
        streamError.code = error.code;
        streamError.response = error.response?.data;
        streamError.status = error.response?.status;
        throw streamError;
      }
      throw new Error('Unknown error occurred');
    }
  }

//   private createTokenProcessorCode(): string {
//     const functionCode = `
// function main(params) {
//     console.log('Received params:', params);
//     console.log('Params type:', typeof params);
//     console.log('Stream data:', params?.stream_data);

//     // Handle both direct params and nested params structure
//     const actualParams = params.params || params;
//     console.log('Raw params:', JSON.stringify(params));
//     console.log('Actual params:', JSON.stringify(actualParams));
    
//     try {
//         // Initialize pump_tokens list if it doesn't exist
//         if (!qnLib.qnGetList('pump_tokens')) {
//             qnLib.qnUpsertList('pump_tokens', {
//                 add_items: []  // Start with empty list
//             });
//         }

//         // Check if params exists and has the right structure
//         if (!params) {
//             return { error: 'No params received' };
//         }

//         if (!params.stream_data && !params.user_data) {
//             return { error: 'Neither stream_data nor user_data present' };
//         }

//         // Handle stream data (from webhook)
//         if (params.stream_data) {
//             console.log('Processing stream_data:', JSON.stringify(params.stream_data));
//             const { newTokens } = params.stream_data;
//             if (!newTokens) {
//                 return { error: 'No newTokens in stream_data' };
//             }
            
//             if (!Array.isArray(newTokens)) {
//                 return { error: 'newTokens is not an array' };
//             }

//             // Process each new token
//             const processedTokens = [];
//             for (const token of newTokens) {
//                 try {
//                     // Check if token already exists
//                     const existingTokens = qnLib.qnGetList('pump_tokens') || [];
//                     if (existingTokens.some(t => {
//                         try {
//                             return JSON.parse(t).mintAddress === token.mintAddress;
//                         } catch {
//                             return false;
//                         }
//                     })) {
//                         console.log('Token already exists:', token.mintAddress);
//                         continue;
//                     }

//                     // Add basic token info
//                     const tokenInfo = {
//                         mintAddress: token.mintAddress,
//                         createdAt: token.createdAt,
//                         signature: token.signature,
//                         age: 0,
//                         marketCap: 0,
//                         volume24h: 0,
//                         priceUSD: 0,
//                         change24h: 0,
//                         links: {
//                             pump: 'https://pump.fun/coin/' + token.mintAddress,
//                             telegram: '',
//                             twitter: '',
//                             website: ''
//                         }
//                     };

//                     // Store token data
//                     qnLib.qnUpsertList('pump_tokens', {
//                         add_items: [JSON.stringify(tokenInfo)]
//                     });
//                     qnLib.qnAddSet(
//                         'token:' + token.mintAddress, 
//                         JSON.stringify(tokenInfo)
//                     );

//                     processedTokens.push(tokenInfo);
//                 } catch (tokenError) {
//                     console.error('Error processing token:', token.mintAddress, tokenError);
//                 }
//             }

//             return {
//                 message: 'Successfully processed new tokens',
//                 processed: processedTokens.length,
//                 tokens: processedTokens
//             };
//         }

//         // Handle user data (API requests)
//         if (params.user_data) {
//             const data = params.user_data;
            
//             switch (data.action) {
//                 case 'getTokens': {
//                     const tokens = qnLib.qnGetList('pump_tokens') || [];
//                     return {
//                         tokens: Array.isArray(tokens) ? 
//                             tokens.map(t => {
//                                 try {
//                                     return JSON.parse(t);
//                                 } catch {
//                                     return null;
//                                 }
//                             }).filter(Boolean) : []
//                     };
//                 }

//                 case 'getToken': {
//                     if (!data.mintAddress) {
//                         return { error: 'Mint address required' };
//                     }
//                     const tokenData = qnLib.qnGetSet('token:' + data.mintAddress);
//                     return {
//                         token: tokenData ? JSON.parse(tokenData) : null
//                     };
//                 }

//                 case 'testConnection': {
//                     return {
//                         message: 'Connection successful',
//                         timestamp: Date.now()
//                     };
//                 }

//                 default:
//                     return { error: 'Invalid action. Available actions: getTokens, getToken, testConnection' };
//             }
//         }

//         return { error: 'Invalid request type' };
//     } catch (error) {
//         console.error('Error:', error);
//         return { error: error.message };
//     }
// }

// module.exports = { main };`;

//     return Buffer.from(functionCode).toString('base64');
// }

private createTokenProcessorCode(): string {
  const functionCode = `
function main(params) {
    console.log('1. Starting function');
    console.log('2. Raw params:', JSON.stringify(params));
    console.log('3. User data:', JSON.stringify(params?.user_data));

    try {
        let tokensToProcess;

        // For testing through dashboard (user_data)
        if (params?.user_data) {
            if (params.user_data.action) {
                // Handle API actions
                switch (params.user_data.action) {
                    case 'getTokens': {
                        const tokens = qnLib.qnGetList('pump_tokens') || [];
                        return {
                            tokens: tokens.map(t => {
                                try {
                                    return JSON.parse(t);
                                } catch {
                                    return null;
                                }
                            }).filter(Boolean)
                        };
                    }
                    case 'getToken': {
                        if (!params.user_data.mintAddress) {
                            return { error: 'Mint address required' };
                        }
                        const tokenData = qnLib.qnGetSet('token:' + params.user_data.mintAddress);
                        return {
                            token: tokenData ? JSON.parse(tokenData) : null
                        };
                    }
                    default:
                        tokensToProcess = params.user_data.newTokens;
                }
            } else {
                tokensToProcess = params.user_data.newTokens;
            }
            console.log('4a. Using user_data tokens:', JSON.stringify(tokensToProcess));
        }
        // For actual webhook (stream_data)
        else if (params?.stream_data) {
            tokensToProcess = params.stream_data.newTokens;
            console.log('4b. Using stream_data tokens:', JSON.stringify(tokensToProcess));
        }

        if (!tokensToProcess || !Array.isArray(tokensToProcess)) {
            console.log('5. No valid tokens found in input');
            return { error: 'Invalid or missing tokens data' };
        }

        // Initialize storage if it doesn't exist
        if (!qnLib.qnGetList('pump_tokens')) {
            qnLib.qnUpsertList('pump_tokens', {
                add_items: []
            });
        }

        // Process tokens
        const processedTokens = tokensToProcess.map(token => ({
            mintAddress: token.mintAddress,
            createdAt: token.createdAt || Date.now(),
            signature: token.signature || 'test-signature',
            age: 0,
            marketCap: 0,
            volume24h: 0,
            priceUSD: 0,
            change24h: 0,
            links: {
                pump: \`https://pump.fun/coin/\${token.mintAddress}\`,
                telegram: '',
                twitter: '',
                website: ''
            }
        }));

        // Store each token
        for (const token of processedTokens) {
            qnLib.qnUpsertList('pump_tokens', {
                add_items: [JSON.stringify(token)]
            });
            qnLib.qnAddSet(
                'token:' + token.mintAddress, 
                JSON.stringify(token)
            );
        }

        console.log('6. Successfully processed tokens:', JSON.stringify(processedTokens));
        return {
            message: 'Successfully processed new tokens',
            processed: processedTokens.length,
            tokens: processedTokens
        };

    } catch (error) {
        console.error('7. Error:', error);
        return { error: error.message };
    }
}

module.exports = { main };`;

  return Buffer.from(functionCode).toString('base64');
}

  public async createFunction(options: {
    name: string;
    description?: string;
    timeout?: number;
  }): Promise<CreateFunctionResponse> {
    const functionConfig: CreateFunctionConfig = {
      name: options.name,
      description: options.description,
      kind: "nodejs-qn:20",
      code: this.createTokenProcessorCode(),
      binary: false,
      limits: {
        timeout: options.timeout || 30000 // default 30 seconds
      }
    };

    return this.makeRequest<CreateFunctionResponse>(
      'POST',
      this.baseUrl,
      functionConfig
    );
  }

  public async updateFunction(
    functionId: string,
    updates: UpdateFunctionConfig
  ): Promise<FunctionConfig> {
    return this.makeRequest<FunctionConfig>(
      'PATCH',
      `${this.baseUrl}/${functionId}`,
      updates
    );
  }

  public async getFunction(functionId: string): Promise<FunctionConfig> {
    return this.makeRequest<FunctionConfig>(
      'GET',
      `${this.baseUrl}/${functionId}`
    );
  }

  public async listFunctions(): Promise<{ data: FunctionConfig[] }> {
    return this.makeRequest<{ data: FunctionConfig[] }>(
      'GET',
      this.baseUrl
    );
  }

  public async deleteFunction(functionId: string): Promise<void> {
    await this.makeRequest<void>(
      'DELETE',
      `${this.baseUrl}/${functionId}`
    );
  }

  public async invokeFunction(
    functionId: string,
    options: InvokeFunctionOptions
  ): Promise<unknown> {
    const queryParams = options.result_only ? '?result_only=true' : '';
    
    // Directly pass the data object instead of wrapping it
    const data = {
      ...options.stream_data,  // Directly spread stream_data if it exists
      ...options.user_data && { user_data: options.user_data },  // Only include if exists
      block_number: options.block_number,
      network: options.network,
      dataset: options.dataset
    };
  
    return this.makeRequest<unknown>(
      'POST',
      `${this.baseUrl}/${functionId}/call${queryParams}`,
      data
    );
  }
}