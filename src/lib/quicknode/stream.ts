import axios, { AxiosError } from 'axios';
import {
  CreateStreamConfig,
  StreamConfig,
  StreamError,
  ErrorResponse,
  NetworkType,
  DatasetType,
//   StreamStatus,
  DestinationType,
//   MetadataLocation,
//   WebhookDestinationAttributes,
//   FunctionDestinationAttributes,
  StreamDestinationAttributes,
  CreateStreamResponse
} from '@/types/quicknode';

interface CreateStreamOptions {
  name: string;
  network?: NetworkType;
  dataset?: DatasetType;
  webhookUrl?: string;
  functionId?: string;
  notificationEmail?: string;
  region?: string;
  endRange?: number;
  keepDistanceFromTip?: number;
}

export class QuickNodeStream {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.quicknode.com/streams/rest/v1/streams';

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('QuickNode API key is required');
    this.apiKey = apiKey;
  }

  private createFilterFunction(): string {
    const filterCode = `
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const PUMP_FUN_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const PUMP_FUN_CREATE_IX_DISCRIMINATOR = [24, 30, 200, 40, 5, 28, 7, 119];
const FILTER_CONFIG = {
    programIds: [PUMP_FUN_PROGRAM_ID],
    skipFailed: true,
    instructionDiscriminators: [PUMP_FUN_CREATE_IX_DISCRIMINATOR]
};
const ACCOUNTS_TO_INCLUDE = [{
    name: "mint",
    index: 0
}];

function main(stream) {
    try {
        const data = stream.data ? stream.data : stream;
        const blockData = Array.isArray(data) ? data[0] : data;

        if (!blockData?.transactions?.length) {
            return null;
        }

        const newTokens = blockData.transactions
            .filter(matchesFilter)
            .map(tx => formatTransaction(tx, blockData))
            .filter(Boolean); 

        if (newTokens.length === 0) {
            return null;
        }        

        return { 
            blockTime: blockData.blockTime,
            slot: blockData.slot,
            newTokens
        };
    } catch (error) {
        console.error('Error in main function:', error);
        return { error: error.message };
    }
}

function matchesFilter(tx) {
    if (FILTER_CONFIG.skipFailed && tx.meta?.err !== null) {
        return false;
    }

    const programIds = new Set(tx.transaction.message.instructions.map(ix => ix.programId));
    if (!FILTER_CONFIG.programIds.some(id => programIds.has(id))) {
        return false;
    }

    return tx.transaction.message.instructions.some(matchesInstructionDiscriminator);
}

function matchesInstructionDiscriminator(ix) {
    if (!ix?.data) return false;
    const decodedData = decodeBase58(ix.data);
    return FILTER_CONFIG.instructionDiscriminators.some(discriminator =>
        discriminator.length === 8 && discriminator.every((byte, index) => byte === decodedData[index])
    );
}

function decodeBase58(encoded) {
    if (typeof encoded !== 'string') return [];
    const result = [];
    for (let i = 0; i < encoded.length; i++) {
        let carry = BASE58_ALPHABET.indexOf(encoded[i]);
        if (carry < 0) return [];
        for (let j = 0; j < result.length; j++) {
            carry += result[j] * 58;
            result[j] = carry & 0xff;
            carry >>= 8;
        }
        while (carry > 0) {
            result.push(carry & 0xff);
            carry >>= 8;
        }
    }
    for (let i = 0; i < encoded.length && encoded[i] === '1'; i++) {
        result.push(0);
    }
    return result.reverse();
}

function formatTransaction(tx, blockData) {
    try {
        const matchingInstruction = tx.transaction.message.instructions.find(matchesInstructionDiscriminator);
        if (!matchingInstruction) return null;

        const accounts = ACCOUNTS_TO_INCLUDE.reduce((acc, { name, index }) => {
            const accountKey = matchingInstruction.accounts[index];
            if (accountKey !== undefined) {
                acc[name] = accountKey;
            }
            return acc;
        }, {});

        return {
            mintAddress: accounts.mint,
            name: '',
            symbol: '',
            decimals: 9,
            createdAt: blockData.blockTime,
            signature: tx.transaction.signatures[0],
            age: 0,
            marketCap: 0,
            volume24h: 0,
            priceUSD: 0,
            change24h: 0,
            links: {
                pump: 'https://pump.fun/coin/' + accounts.mint,
                telegram: '',
                twitter: '',
                website: ''
            }
        };
    } catch (error) {
        console.error('Error in formatTransaction:', error);
        return null;
    }
}`;

    return Buffer.from(filterCode).toString('base64');
}

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    data?: unknown
  ): Promise<T> {
    try {
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
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
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

  private createDestinationAttributes(
    webhookUrl?: string,
    functionId?: string
  ): { 
    destination: DestinationType; 
    attributes: StreamDestinationAttributes;
  } {
    if (functionId) {
      return {
        destination: 'function',
        attributes: {
          function_id: functionId,
          max_retry: 3,
          retry_interval_sec: 60
        }
      };
    }
    
    if (webhookUrl) {
      return {
        destination: 'webhook',
        attributes: {
          url: webhookUrl,
          compression: "none",
          max_retry: 3,
          retry_interval_sec: 60,
          post_timeout_sec: 30
        }
      };
    }

    throw new Error('Either webhookUrl or functionId must be provided');
  }

  public async createStream({
    name,
    network = "solana-mainnet",
    dataset = "block",
    webhookUrl,
    functionId,
    notificationEmail,
    region,
    endRange,
    keepDistanceFromTip
  }: CreateStreamOptions): Promise<CreateStreamResponse> {
    if (!webhookUrl && !functionId) {
      throw new Error('Either webhookUrl or functionId must be provided');
    }

    const { destination, attributes } = this.createDestinationAttributes(webhookUrl, functionId);

    const streamConfig: CreateStreamConfig = {
      name,
      network,
      dataset,
      filter_function: this.createFilterFunction(),
      region,
      start_range: "latest",
      end_range: endRange,
      dataset_batch_size: 1,
      include_stream_metadata: "body",
      status: "active",
      notification_email: notificationEmail,
      destination,
      destination_attributes: attributes
    };

    return this.makeRequest<CreateStreamResponse>('POST', this.baseUrl, streamConfig);
  }

  public async updateStreamDestination(
    streamId: string,
    functionId: string
  ): Promise<StreamConfig> {
    const { destination, attributes } = this.createDestinationAttributes(undefined, functionId);

    return this.makeRequest<StreamConfig>(
      'PATCH',
      `${this.baseUrl}/${streamId}`,
      { destination, destination_attributes: attributes }
    );
  }

  public async getStream(streamId: string): Promise<StreamConfig> {
    return this.makeRequest<StreamConfig>(
      'GET',
      `${this.baseUrl}/${streamId}`
    );
  }

  public async listStreams(
    limit = 20,
    offset = 0
  ): Promise<{ data: StreamConfig[] }> {
    return this.makeRequest<{ data: StreamConfig[] }>(
      'GET',
      `${this.baseUrl}?limit=${limit}&offset=${offset}`
    );
  }

  public async deleteStream(streamId: string): Promise<void> {
    await this.makeRequest<void>(
      'DELETE',
      `${this.baseUrl}/${streamId}`
    );
  }
}