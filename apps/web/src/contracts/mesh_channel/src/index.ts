import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CDSTAPEEGU4L62QEROZOSEAFRQKIC2SEC6HJNPKIOIXAOBRAKIQ3254J",
  }
} as const


export interface Channel {
  channel_id: Buffer;
  created_at: u64;
  deposited_amount: i128;
  expires_at: u64;
  limit_amount: i128;
  payee: string;
  payer: string;
  payer_pubkey: Buffer;
  sequence_counter: u64;
  settled_amount: i128;
  status: ChannelStatus;
}

export type DataKey = {tag: "Admin", values: void} | {tag: "RegistryId", values: void} | {tag: "Initialized", values: void} | {tag: "Channel", values: readonly [Buffer]} | {tag: "UsedNonce", values: readonly [Buffer, u64]} | {tag: "UsedVoucher", values: readonly [Buffer]} | {tag: "ChannelCount", values: void} | {tag: "XlmAsset", values: void};

export const ChannelError = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  3: {message:"Unauthorized"},
  4: {message:"ChannelNotFound"},
  5: {message:"ChannelAlreadyExists"},
  6: {message:"ChannelNotActive"},
  7: {message:"ChannelExpired"},
  8: {message:"ChannelInsufficientBalance"},
  9: {message:"VoucherExpired"},
  10: {message:"VoucherAlreadySettled"},
  11: {message:"VoucherInvalidAmount"},
  12: {message:"VoucherWrongRecipient"},
  13: {message:"VoucherWrongChannel"},
  14: {message:"VoucherSequenceReused"},
  15: {message:"VoucherInvalidSignature"},
  16: {message:"InvalidAmount"},
  17: {message:"InvalidExpiry"},
  18: {message:"ParticipantNotActive"},
  19: {message:"ChannelCancelled"},
  20: {message:"AmountExceedsLimit"},
  21: {message:"InvalidNonce"}
}

export type ChannelStatus = {tag: "Active", values: void} | {tag: "Draining", values: void} | {tag: "Closed", values: void} | {tag: "Cancelled", values: void} | {tag: "Expired", values: void};


export interface VoucherPayload {
  amount: i128;
  channel_id: Buffer;
  expires_at: u64;
  payee: string;
  payer: string;
  sequence: u64;
  signature: Buffer;
  signed_payload: Buffer;
  voucher_id: Buffer;
}

export interface Client {
  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  withdraw: ({caller, channel_id}: {caller: string, channel_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({admin, registry_id}: {admin: string, registry_id: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_channel transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_channel: ({channel_id}: {channel_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Channel>>>

  /**
   * Construct and simulate a fund_channel transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  fund_channel: ({payer, channel_id, amount}: {payer: string, channel_id: Buffer, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a get_registry transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_registry: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a channel_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  channel_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a cancel_channel transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel_channel: ({caller, channel_id}: {caller: string, channel_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a create_channel transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_channel: ({payer, payer_pubkey, payee, limit_amount, expires_at}: {payer: string, payer_pubkey: Buffer, payee: string, limit_amount: i128, expires_at: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Buffer>>>

  /**
   * Construct and simulate a get_used_nonce transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_used_nonce: ({channel_id, sequence}: {channel_id: Buffer, sequence: u64}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a settle_voucher transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  settle_voucher: ({settler, voucher}: {settler: string, voucher: VoucherPayload}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

  /**
   * Construct and simulate a get_channel_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_channel_balance: ({channel_id}: {channel_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAQAAAAAAAAAAAAAAB0NoYW5uZWwAAAAACwAAAAAAAAAKY2hhbm5lbF9pZAAAAAAD7gAAACAAAAAAAAAACmNyZWF0ZWRfYXQAAAAAAAYAAAAAAAAAEGRlcG9zaXRlZF9hbW91bnQAAAALAAAAAAAAAApleHBpcmVzX2F0AAAAAAAGAAAAAAAAAAxsaW1pdF9hbW91bnQAAAALAAAAAAAAAAVwYXllZQAAAAAAABMAAAAAAAAABXBheWVyAAAAAAAAEwAAAAAAAAAMcGF5ZXJfcHVia2V5AAAD7gAAACAAAAAAAAAAEHNlcXVlbmNlX2NvdW50ZXIAAAAGAAAAAAAAAA5zZXR0bGVkX2Ftb3VudAAAAAAACwAAAAAAAAAGc3RhdHVzAAAAAAfQAAAADUNoYW5uZWxTdGF0dXMAAAA=",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAACAAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAAKUmVnaXN0cnlJZAAAAAAAAAAAAAAAAAALSW5pdGlhbGl6ZWQAAAAAAQAAAAAAAAAHQ2hhbm5lbAAAAAABAAAD7gAAACAAAAABAAAAAAAAAAlVc2VkTm9uY2UAAAAAAAACAAAD7gAAACAAAAAGAAAAAQAAAAAAAAALVXNlZFZvdWNoZXIAAAAAAQAAAA4AAAAAAAAAAAAAAAxDaGFubmVsQ291bnQAAAAAAAAAAAAAAAhYbG1Bc3NldA==",
        "AAAABAAAAAAAAAAAAAAADENoYW5uZWxFcnJvcgAAABUAAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAAAQAAAAAAAAAOTm90SW5pdGlhbGl6ZWQAAAAAAAIAAAAAAAAADFVuYXV0aG9yaXplZAAAAAMAAAAAAAAAD0NoYW5uZWxOb3RGb3VuZAAAAAAEAAAAAAAAABRDaGFubmVsQWxyZWFkeUV4aXN0cwAAAAUAAAAAAAAAEENoYW5uZWxOb3RBY3RpdmUAAAAGAAAAAAAAAA5DaGFubmVsRXhwaXJlZAAAAAAABwAAAAAAAAAaQ2hhbm5lbEluc3VmZmljaWVudEJhbGFuY2UAAAAAAAgAAAAAAAAADlZvdWNoZXJFeHBpcmVkAAAAAAAJAAAAAAAAABVWb3VjaGVyQWxyZWFkeVNldHRsZWQAAAAAAAAKAAAAAAAAABRWb3VjaGVySW52YWxpZEFtb3VudAAAAAsAAAAAAAAAFVZvdWNoZXJXcm9uZ1JlY2lwaWVudAAAAAAAAAwAAAAAAAAAE1ZvdWNoZXJXcm9uZ0NoYW5uZWwAAAAADQAAAAAAAAAVVm91Y2hlclNlcXVlbmNlUmV1c2VkAAAAAAAADgAAAAAAAAAXVm91Y2hlckludmFsaWRTaWduYXR1cmUAAAAADwAAAAAAAAANSW52YWxpZEFtb3VudAAAAAAAABAAAAAAAAAADUludmFsaWRFeHBpcnkAAAAAAAARAAAAAAAAABRQYXJ0aWNpcGFudE5vdEFjdGl2ZQAAABIAAAAAAAAAEENoYW5uZWxDYW5jZWxsZWQAAAATAAAAAAAAABJBbW91bnRFeGNlZWRzTGltaXQAAAAAABQAAAAAAAAADEludmFsaWROb25jZQAAABU=",
        "AAAAAAAAAAAAAAAId2l0aGRyYXcAAAACAAAAAAAAAAZjYWxsZXIAAAAAABMAAAAAAAAACmNoYW5uZWxfaWQAAAAAA+4AAAAgAAAAAQAAA+kAAAALAAAH0AAAAAxDaGFubmVsRXJyb3I=",
        "AAAAAgAAAAAAAAAAAAAADUNoYW5uZWxTdGF0dXMAAAAAAAAFAAAAAAAAAAAAAAAGQWN0aXZlAAAAAAAAAAAAAAAAAAhEcmFpbmluZwAAAAAAAAAAAAAABkNsb3NlZAAAAAAAAAAAAAAAAAAJQ2FuY2VsbGVkAAAAAAAAAAAAAAAAAAAHRXhwaXJlZAA=",
        "AAAAAQAAAAAAAAAAAAAADlZvdWNoZXJQYXlsb2FkAAAAAAAJAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAACmNoYW5uZWxfaWQAAAAAA+4AAAAgAAAAAAAAAApleHBpcmVzX2F0AAAAAAAGAAAAAAAAAAVwYXllZQAAAAAAABMAAAAAAAAABXBheWVyAAAAAAAAEwAAAAAAAAAIc2VxdWVuY2UAAAAGAAAAAAAAAAlzaWduYXR1cmUAAAAAAAPuAAAAQAAAAAAAAAAOc2lnbmVkX3BheWxvYWQAAAAAAA4AAAAAAAAACnZvdWNoZXJfaWQAAAAAAA4=",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAtyZWdpc3RyeV9pZAAAAAATAAAAAQAAA+kAAAACAAAH0AAAAAxDaGFubmVsRXJyb3I=",
        "AAAAAAAAAAAAAAALZ2V0X2NoYW5uZWwAAAAAAQAAAAAAAAAKY2hhbm5lbF9pZAAAAAAD7gAAACAAAAABAAAD6QAAB9AAAAAHQ2hhbm5lbAAAAAfQAAAADENoYW5uZWxFcnJvcg==",
        "AAAAAAAAAAAAAAAMZnVuZF9jaGFubmVsAAAAAwAAAAAAAAAFcGF5ZXIAAAAAAAATAAAAAAAAAApjaGFubmVsX2lkAAAAAAPuAAAAIAAAAAAAAAAGYW1vdW50AAAAAAALAAAAAQAAA+kAAAALAAAH0AAAAAxDaGFubmVsRXJyb3I=",
        "AAAAAAAAAAAAAAAMZ2V0X3JlZ2lzdHJ5AAAAAAAAAAEAAAPpAAAAEwAAB9AAAAAMQ2hhbm5lbEVycm9y",
        "AAAAAAAAAAAAAAANY2hhbm5lbF9jb3VudAAAAAAAAAAAAAABAAAABA==",
        "AAAAAAAAAAAAAAAOY2FuY2VsX2NoYW5uZWwAAAAAAAIAAAAAAAAABmNhbGxlcgAAAAAAEwAAAAAAAAAKY2hhbm5lbF9pZAAAAAAD7gAAACAAAAABAAAD6QAAAAIAAAfQAAAADENoYW5uZWxFcnJvcg==",
        "AAAAAAAAAAAAAAAOY3JlYXRlX2NoYW5uZWwAAAAAAAUAAAAAAAAABXBheWVyAAAAAAAAEwAAAAAAAAAMcGF5ZXJfcHVia2V5AAAD7gAAACAAAAAAAAAABXBheWVlAAAAAAAAEwAAAAAAAAAMbGltaXRfYW1vdW50AAAACwAAAAAAAAAKZXhwaXJlc19hdAAAAAAABgAAAAEAAAPpAAAD7gAAACAAAAfQAAAADENoYW5uZWxFcnJvcg==",
        "AAAAAAAAAAAAAAAOZ2V0X3VzZWRfbm9uY2UAAAAAAAIAAAAAAAAACmNoYW5uZWxfaWQAAAAAA+4AAAAgAAAAAAAAAAhzZXF1ZW5jZQAAAAYAAAABAAAAAQ==",
        "AAAAAAAAAAAAAAAOc2V0dGxlX3ZvdWNoZXIAAAAAAAIAAAAAAAAAB3NldHRsZXIAAAAAEwAAAAAAAAAHdm91Y2hlcgAAAAfQAAAADlZvdWNoZXJQYXlsb2FkAAAAAAABAAAD6QAAAAsAAAfQAAAADENoYW5uZWxFcnJvcg==",
        "AAAAAAAAAAAAAAATZ2V0X2NoYW5uZWxfYmFsYW5jZQAAAAABAAAAAAAAAApjaGFubmVsX2lkAAAAAAPuAAAAIAAAAAEAAAPpAAAACwAAB9AAAAAMQ2hhbm5lbEVycm9y" ]),
      options
    )
  }
  public readonly fromJSON = {
    withdraw: this.txFromJSON<Result<i128>>,
        initialize: this.txFromJSON<Result<void>>,
        get_channel: this.txFromJSON<Result<Channel>>,
        fund_channel: this.txFromJSON<Result<i128>>,
        get_registry: this.txFromJSON<Result<string>>,
        channel_count: this.txFromJSON<u32>,
        cancel_channel: this.txFromJSON<Result<void>>,
        create_channel: this.txFromJSON<Result<Buffer>>,
        get_used_nonce: this.txFromJSON<boolean>,
        settle_voucher: this.txFromJSON<Result<i128>>,
        get_channel_balance: this.txFromJSON<Result<i128>>
  }
}