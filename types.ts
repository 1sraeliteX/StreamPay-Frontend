/**
 * On-chain stream states matching StreamPay-Contracts
 */
export enum ContractStreamStatus {
  DRAFT = 0,
  ACTIVE = 1,
  PAUSED = 2,
  SETTLED = 3,
  CANCELLED = 4,
}

/**
 * Representation of the Soroban Contract Storage for a Stream
 */
export interface OnChainStream {
  id: string;
  recipient_address: string;
  total_amount: bigint;
  released_amount: bigint;
  velocity: bigint; // flow rate per second/block
  last_update_timestamp: number;
  status: ContractStreamStatus;
}

export interface InvariantResult {
  isValid: boolean;
  error?: string;
}