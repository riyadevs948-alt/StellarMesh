import { Buffer } from "buffer";
import { AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions, Result } from "@stellar/stellar-sdk/contract";
import type { u32, u64, i128 } from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";
export declare const networks: {
    readonly testnet: {
        readonly networkPassphrase: "Test SDF Network ; September 2015";
        readonly contractId: "CDSTAPEEGU4L62QEROZOSEAFRQKIC2SEC6HJNPKIOIXAOBRAKIQ3254J";
    };
};
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
export type DataKey = {
    tag: "Admin";
    values: void;
} | {
    tag: "RegistryId";
    values: void;
} | {
    tag: "Initialized";
    values: void;
} | {
    tag: "Channel";
    values: readonly [Buffer];
} | {
    tag: "UsedNonce";
    values: readonly [Buffer, u64];
} | {
    tag: "UsedVoucher";
    values: readonly [Buffer];
} | {
    tag: "ChannelCount";
    values: void;
} | {
    tag: "XlmAsset";
    values: void;
};
export declare const ChannelError: {
    1: {
        message: string;
    };
    2: {
        message: string;
    };
    3: {
        message: string;
    };
    4: {
        message: string;
    };
    5: {
        message: string;
    };
    6: {
        message: string;
    };
    7: {
        message: string;
    };
    8: {
        message: string;
    };
    9: {
        message: string;
    };
    10: {
        message: string;
    };
    11: {
        message: string;
    };
    12: {
        message: string;
    };
    13: {
        message: string;
    };
    14: {
        message: string;
    };
    15: {
        message: string;
    };
    16: {
        message: string;
    };
    17: {
        message: string;
    };
    18: {
        message: string;
    };
    19: {
        message: string;
    };
    20: {
        message: string;
    };
    21: {
        message: string;
    };
};
export type ChannelStatus = {
    tag: "Active";
    values: void;
} | {
    tag: "Draining";
    values: void;
} | {
    tag: "Closed";
    values: void;
} | {
    tag: "Cancelled";
    values: void;
} | {
    tag: "Expired";
    values: void;
};
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
    withdraw: ({ caller, channel_id }: {
        caller: string;
        channel_id: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>;
    /**
     * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    initialize: ({ admin, registry_id }: {
        admin: string;
        registry_id: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a get_channel transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_channel: ({ channel_id }: {
        channel_id: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<Channel>>>;
    /**
     * Construct and simulate a fund_channel transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    fund_channel: ({ payer, channel_id, amount }: {
        payer: string;
        channel_id: Buffer;
        amount: i128;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>;
    /**
     * Construct and simulate a get_registry transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_registry: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>;
    /**
     * Construct and simulate a channel_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    channel_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
    /**
     * Construct and simulate a cancel_channel transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    cancel_channel: ({ caller, channel_id }: {
        caller: string;
        channel_id: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a create_channel transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    create_channel: ({ payer, payer_pubkey, payee, limit_amount, expires_at }: {
        payer: string;
        payer_pubkey: Buffer;
        payee: string;
        limit_amount: i128;
        expires_at: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<Buffer>>>;
    /**
     * Construct and simulate a get_used_nonce transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_used_nonce: ({ channel_id, sequence }: {
        channel_id: Buffer;
        sequence: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>;
    /**
     * Construct and simulate a settle_voucher transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    settle_voucher: ({ settler, voucher }: {
        settler: string;
        voucher: VoucherPayload;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>;
    /**
     * Construct and simulate a get_channel_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_channel_balance: ({ channel_id }: {
        channel_id: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<i128>>>;
}
export declare class Client extends ContractClient {
    readonly options: ContractClientOptions;
    static deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions & Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
    }): Promise<AssembledTransaction<T>>;
    constructor(options: ContractClientOptions);
    readonly fromJSON: {
        withdraw: (json: string) => AssembledTransaction<Result<bigint, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        initialize: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_channel: (json: string) => AssembledTransaction<Result<Channel, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        fund_channel: (json: string) => AssembledTransaction<Result<bigint, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_registry: (json: string) => AssembledTransaction<Result<string, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        channel_count: (json: string) => AssembledTransaction<number>;
        cancel_channel: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        create_channel: (json: string) => AssembledTransaction<Result<Buffer<ArrayBufferLike>, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_used_nonce: (json: string) => AssembledTransaction<boolean>;
        settle_voucher: (json: string) => AssembledTransaction<Result<bigint, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_channel_balance: (json: string) => AssembledTransaction<Result<bigint, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
    };
}
