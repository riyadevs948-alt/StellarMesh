import { Buffer } from "buffer";
import { AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions, Result } from "@stellar/stellar-sdk/contract";
import type { u32, u64, i128 } from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";
export declare const networks: {
    readonly testnet: {
        readonly networkPassphrase: "Test SDF Network ; September 2015";
        readonly contractId: "CDNXWMOPB55DL2KT7VUEX4SWD7AWDV5FGN4HRKGA2RNKUZL3YIBYF3DT";
    };
};
export type DataKey = {
    tag: "Admin";
    values: void;
} | {
    tag: "Initialized";
    values: void;
} | {
    tag: "Participant";
    values: readonly [string];
} | {
    tag: "ChannelPolicy";
    values: void;
} | {
    tag: "ParticipantCount";
    values: void;
} | {
    tag: "ProtocolVersion";
    values: void;
};
export interface ChannelPolicy {
    max_amount: i128;
    max_channels_per_user: u32;
    max_expiry_seconds: u64;
    min_amount: i128;
    min_expiry_seconds: u64;
    require_registration: boolean;
    updated_at: u64;
}
export declare const RegistryError: {
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
};
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
    get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>;
    /**
     * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    initialize: ({ admin }: {
        admin: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a get_participant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_participant: ({ address }: {
        address: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<ParticipantInfo>>>;
    /**
     * Construct and simulate a protocol_version transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    protocol_version: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
    /**
     * Construct and simulate a participant_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    participant_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
    /**
     * Construct and simulate a get_channel_policy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_channel_policy: (options?: MethodOptions) => Promise<AssembledTransaction<Result<ChannelPolicy>>>;
    /**
     * Construct and simulate a set_channel_policy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    set_channel_policy: ({ admin, policy }: {
        admin: string;
        policy: ChannelPolicy;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a update_participant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    update_participant: ({ address, label, active }: {
        address: string;
        label: string;
        active: boolean;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<ParticipantInfo>>>;
    /**
     * Construct and simulate a register_participant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    register_participant: ({ address, label }: {
        address: string;
        label: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<ParticipantInfo>>>;
    /**
     * Construct and simulate a is_participant_active transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    is_participant_active: ({ address }: {
        address: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>;
    /**
     * Construct and simulate a increment_channel_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    increment_channel_count: ({ address, caller }: {
        address: string;
        caller: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
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
        get_admin: (json: string) => AssembledTransaction<Result<string, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        initialize: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_participant: (json: string) => AssembledTransaction<Result<ParticipantInfo, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        protocol_version: (json: string) => AssembledTransaction<number>;
        participant_count: (json: string) => AssembledTransaction<number>;
        get_channel_policy: (json: string) => AssembledTransaction<Result<ChannelPolicy, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        set_channel_policy: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        update_participant: (json: string) => AssembledTransaction<Result<ParticipantInfo, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        register_participant: (json: string) => AssembledTransaction<Result<ParticipantInfo, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        is_participant_active: (json: string) => AssembledTransaction<boolean>;
        increment_channel_count: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
    };
}
