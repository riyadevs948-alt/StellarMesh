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
    contractId: "CAPTCEQ5C2ZX7EYO23YQQCX73OM2E2XUDSIO72AQV6NENAVSUUIWDHZG",
  }
} as const

export type DataKey = {tag: "Admin", values: void} | {tag: "Initialized", values: void} | {tag: "Participant", values: readonly [string]} | {tag: "ChannelPolicy", values: void} | {tag: "ParticipantCount", values: void} | {tag: "ProtocolVersion", values: void};


export interface ChannelPolicy {
  max_amount: i128;
  max_channels_per_user: u32;
  max_expiry_seconds: u64;
  min_amount: i128;
  min_expiry_seconds: u64;
  require_registration: boolean;
  updated_at: u64;
}

export const RegistryError = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  3: {message:"Unauthorized"},
  4: {message:"ParticipantNotFound"},
  5: {message:"ParticipantAlreadyRegistered"},
  6: {message:"InvalidAddress"},
  7: {message:"InvalidMetadata"},
  8: {message:"ParticipantInactive"}
}


export interface ParticipantInfo {
  active: boolean;
  address: string;
  channel_count: u32;
  label: string;
  max_channel_amount: i128;
  registered_at: u64;
  updated_at: u64;
}

export interface Client {
  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({admin}: {admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_participant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_participant: ({address}: {address: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<ParticipantInfo>>>

  /**
   * Construct and simulate a protocol_version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  protocol_version: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a participant_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  participant_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_channel_policy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_channel_policy: (options?: MethodOptions) => Promise<AssembledTransaction<Result<ChannelPolicy>>>

  /**
   * Construct and simulate a set_channel_policy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_channel_policy: ({admin, policy}: {admin: string, policy: ChannelPolicy}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a update_participant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  update_participant: ({address, label, active}: {address: string, label: string, active: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<Result<ParticipantInfo>>>

  /**
   * Construct and simulate a register_participant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  register_participant: ({address, label}: {address: string, label: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<ParticipantInfo>>>

  /**
   * Construct and simulate a is_participant_active transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_participant_active: ({address}: {address: string}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a increment_channel_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  increment_channel_count: ({address, caller}: {address: string, caller: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

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
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABgAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAALSW5pdGlhbGl6ZWQAAAAAAQAAAAAAAAALUGFydGljaXBhbnQAAAAAAQAAABMAAAAAAAAAAAAAAA1DaGFubmVsUG9saWN5AAAAAAAAAAAAAAAAAAAQUGFydGljaXBhbnRDb3VudAAAAAAAAAAAAAAAD1Byb3RvY29sVmVyc2lvbgA=",
        "AAAAAQAAAAAAAAAAAAAADUNoYW5uZWxQb2xpY3kAAAAAAAAHAAAAAAAAAAptYXhfYW1vdW50AAAAAAALAAAAAAAAABVtYXhfY2hhbm5lbHNfcGVyX3VzZXIAAAAAAAAEAAAAAAAAABJtYXhfZXhwaXJ5X3NlY29uZHMAAAAAAAYAAAAAAAAACm1pbl9hbW91bnQAAAAAAAsAAAAAAAAAEm1pbl9leHBpcnlfc2Vjb25kcwAAAAAABgAAAAAAAAAUcmVxdWlyZV9yZWdpc3RyYXRpb24AAAABAAAAAAAAAAp1cGRhdGVkX2F0AAAAAAAG",
        "AAAABAAAAAAAAAAAAAAADVJlZ2lzdHJ5RXJyb3IAAAAAAAAIAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAAAEAAAAAAAAADk5vdEluaXRpYWxpemVkAAAAAAACAAAAAAAAAAxVbmF1dGhvcml6ZWQAAAADAAAAAAAAABNQYXJ0aWNpcGFudE5vdEZvdW5kAAAAAAQAAAAAAAAAHFBhcnRpY2lwYW50QWxyZWFkeVJlZ2lzdGVyZWQAAAAFAAAAAAAAAA5JbnZhbGlkQWRkcmVzcwAAAAAABgAAAAAAAAAPSW52YWxpZE1ldGFkYXRhAAAAAAcAAAAAAAAAE1BhcnRpY2lwYW50SW5hY3RpdmUAAAAACA==",
        "AAAAAAAAAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAPpAAAAEwAAB9AAAAANUmVnaXN0cnlFcnJvcgAAAA==",
        "AAAAAQAAAAAAAAAAAAAAD1BhcnRpY2lwYW50SW5mbwAAAAAHAAAAAAAAAAZhY3RpdmUAAAAAAAEAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAAAAAANY2hhbm5lbF9jb3VudAAAAAAAAAQAAAAAAAAABWxhYmVsAAAAAAAAEAAAAAAAAAASbWF4X2NoYW5uZWxfYW1vdW50AAAAAAALAAAAAAAAAA1yZWdpc3RlcmVkX2F0AAAAAAAABgAAAAAAAAAKdXBkYXRlZF9hdAAAAAAABg==",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAQAAA+kAAAACAAAH0AAAAA1SZWdpc3RyeUVycm9yAAAA",
        "AAAAAAAAAAAAAAAPZ2V0X3BhcnRpY2lwYW50AAAAAAEAAAAAAAAAB2FkZHJlc3MAAAAAEwAAAAEAAAPpAAAH0AAAAA9QYXJ0aWNpcGFudEluZm8AAAAH0AAAAA1SZWdpc3RyeUVycm9yAAAA",
        "AAAAAAAAAAAAAAAQcHJvdG9jb2xfdmVyc2lvbgAAAAAAAAABAAAABA==",
        "AAAAAAAAAAAAAAARcGFydGljaXBhbnRfY291bnQAAAAAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAASZ2V0X2NoYW5uZWxfcG9saWN5AAAAAAAAAAAAAQAAA+kAAAfQAAAADUNoYW5uZWxQb2xpY3kAAAAAAAfQAAAADVJlZ2lzdHJ5RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAASc2V0X2NoYW5uZWxfcG9saWN5AAAAAAACAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAABnBvbGljeQAAAAAH0AAAAA1DaGFubmVsUG9saWN5AAAAAAAAAQAAA+kAAAACAAAH0AAAAA1SZWdpc3RyeUVycm9yAAAA",
        "AAAAAAAAAAAAAAASdXBkYXRlX3BhcnRpY2lwYW50AAAAAAADAAAAAAAAAAdhZGRyZXNzAAAAABMAAAAAAAAABWxhYmVsAAAAAAAAEAAAAAAAAAAGYWN0aXZlAAAAAAABAAAAAQAAA+kAAAfQAAAAD1BhcnRpY2lwYW50SW5mbwAAAAfQAAAADVJlZ2lzdHJ5RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAUcmVnaXN0ZXJfcGFydGljaXBhbnQAAAACAAAAAAAAAAdhZGRyZXNzAAAAABMAAAAAAAAABWxhYmVsAAAAAAAAEAAAAAEAAAPpAAAH0AAAAA9QYXJ0aWNpcGFudEluZm8AAAAH0AAAAA1SZWdpc3RyeUVycm9yAAAA",
        "AAAAAAAAAAAAAAAVaXNfcGFydGljaXBhbnRfYWN0aXZlAAAAAAAAAQAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAQAAAAE=",
        "AAAAAAAAAAAAAAAXaW5jcmVtZW50X2NoYW5uZWxfY291bnQAAAAAAgAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAAAAAAZjYWxsZXIAAAAAABMAAAABAAAD6QAAAAIAAAfQAAAADVJlZ2lzdHJ5RXJyb3IAAAA=" ]),
      options
    )
  }
  public readonly fromJSON = {
    get_admin: this.txFromJSON<Result<string>>,
        initialize: this.txFromJSON<Result<void>>,
        get_participant: this.txFromJSON<Result<ParticipantInfo>>,
        protocol_version: this.txFromJSON<u32>,
        participant_count: this.txFromJSON<u32>,
        get_channel_policy: this.txFromJSON<Result<ChannelPolicy>>,
        set_channel_policy: this.txFromJSON<Result<void>>,
        update_participant: this.txFromJSON<Result<ParticipantInfo>>,
        register_participant: this.txFromJSON<Result<ParticipantInfo>>,
        is_participant_active: this.txFromJSON<boolean>,
        increment_channel_count: this.txFromJSON<Result<void>>
  }
}