// lib/quicknode/types.ts
import { AxiosResponse } from 'axios';

export type NetworkType = 
  | "solana-mainnet" 
  | "solana-devnet" 
  | "solana-testnet";

export type DatasetType = 
  | "block"
  | "programs_with_logs";

export type StreamStatus = 
  | "active" 
  | "paused" 
  | "terminated" 
  | "completed";

export type DestinationType = 
  | "webhook" 
  | "function" 
  | "s3" 
  | "postgres" 
  | "snowflake";

export type MetadataLocation = 
  | "body" 
  | "header" 
  | "none";

export interface StreamError extends Error {
  code?: string;
  response?: AxiosResponse['data'];
  status?: number;
}

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

// Base configuration for creating a stream
export interface CreateStreamConfig {
  name: string;
  network: NetworkType;
  dataset: DatasetType;
  filter_function?: string;
  region?: string;
  start_range: number | "latest";
  end_range?: number;
  dataset_batch_size: number;
  include_stream_metadata: MetadataLocation;
  destination: DestinationType;
  status: StreamStatus;
  notification_email?: string;
  destination_attributes: StreamDestinationAttributes;
}

// Full stream configuration including response fields
export interface StreamConfig extends CreateStreamConfig {
  id: string;
  created_at: string;
  updated_at: string;
  fix_block_reorgs?: number;
  keep_distance_from_tip?: number;
  sequence?: number;
  current_hash?: string;
}

export interface WebhookDestinationAttributes {
  url: string;
  compression: "none" | "gzip";
  headers?: Record<string, string>;
  max_retry: number;
  retry_interval_sec: number;
  post_timeout_sec: number;
  security_token?: string;
}

export interface FunctionDestinationAttributes {
  function_id: string;
  max_retry: number;
  retry_interval_sec: number;
}

export type StreamDestinationAttributes = 
  | WebhookDestinationAttributes 
  | FunctionDestinationAttributes;

// The response when creating a new stream
export interface CreateStreamResponse extends StreamConfig {}