import { Buffer } from "buffer";
import { Client as ContractClient, Spec as ContractSpec, } from "@stellar/stellar-sdk/contract";
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
        contractId: "CDNXWMOPB55DL2KT7VUEX4SWD7AWDV5FGN4HRKGA2RNKUZL3YIBYF3DT",
    }
};
export const RegistryError = {
    1: { message: "AlreadyInitialized" },
    2: { message: "NotInitialized" },
    3: { message: "Unauthorized" },
    4: { message: "ParticipantNotFound" },
    5: { message: "ParticipantAlreadyRegistered" },
    6: { message: "InvalidAddress" },
    7: { message: "InvalidMetadata" },
    8: { message: "ParticipantInactive" }
};
export class Client extends ContractClient {
    options;
    static async deploy(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options) {
        return ContractClient.deploy(null, options);
    }
    constructor(options) {
        super(new ContractSpec(["AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABgAAAAAAAAAAAAAABUFkbWluAAAAAAAAAAAAAAAAAAALSW5pdGlhbGl6ZWQAAAAAAQAAAAAAAAALUGFydGljaXBhbnQAAAAAAQAAABMAAAAAAAAAAAAAAA1DaGFubmVsUG9saWN5AAAAAAAAAAAAAAAAAAAQUGFydGljaXBhbnRDb3VudAAAAAAAAAAAAAAAD1Byb3RvY29sVmVyc2lvbgA=",
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
            "AAAAAAAAAAAAAAAXaW5jcmVtZW50X2NoYW5uZWxfY291bnQAAAAAAgAAAAAAAAAHYWRkcmVzcwAAAAATAAAAAAAAAAZjYWxsZXIAAAAAABMAAAABAAAD6QAAAAIAAAfQAAAADVJlZ2lzdHJ5RXJyb3IAAAA="]), options);
        this.options = options;
    }
    fromJSON = {
        get_admin: (this.txFromJSON),
        initialize: (this.txFromJSON),
        get_participant: (this.txFromJSON),
        protocol_version: (this.txFromJSON),
        participant_count: (this.txFromJSON),
        get_channel_policy: (this.txFromJSON),
        set_channel_policy: (this.txFromJSON),
        update_participant: (this.txFromJSON),
        register_participant: (this.txFromJSON),
        is_participant_active: (this.txFromJSON),
        increment_channel_count: (this.txFromJSON)
    };
}
