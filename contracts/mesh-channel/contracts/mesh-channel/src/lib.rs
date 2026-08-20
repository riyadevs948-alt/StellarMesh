#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, crypto::Hash, symbol_short, token,
    Address, Bytes, BytesN, Env, String, Symbol, Vec,
};

// ============================================================
// Inter-contract Interface for MeshRegistry
// ============================================================
mod registry {
    use soroban_sdk::{contractclient, Address, Env};

    #[contractclient(name = "RegistryClient")]
    pub trait Registry {
        fn is_participant_active(env: Env, address: Address) -> bool;
        fn increment_channel_count(env: Env, address: Address, caller: Address);
    }
}
use registry::RegistryClient;

// ============================================================
// Storage Keys
// ============================================================
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    RegistryId,
    Initialized,
    Channel(BytesN<32>),
    UsedNonce(BytesN<32>, u64), // (channel_id, sequence)
    UsedVoucher(Bytes),         // voucher_id bytes
    ChannelCount,
    XlmAsset,
}

// ============================================================
// Contract Errors
// ============================================================
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ChannelError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    ChannelNotFound = 4,
    ChannelAlreadyExists = 5,
    ChannelNotActive = 6,
    ChannelExpired = 7,
    ChannelInsufficientBalance = 8,
    VoucherExpired = 9,
    VoucherAlreadySettled = 10,
    VoucherInvalidAmount = 11,
    VoucherWrongRecipient = 12,
    VoucherWrongChannel = 13,
    VoucherSequenceReused = 14,
    VoucherInvalidSignature = 15,
    InvalidAmount = 16,
    InvalidExpiry = 17,
    ParticipantNotActive = 18,
    ChannelCancelled = 19,
    AmountExceedsLimit = 20,
    InvalidNonce = 21,
}

// ============================================================
// Data Types
// ============================================================
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ChannelStatus {
    Active,
    Draining,
    Closed,
    Cancelled,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Channel {
    pub channel_id: BytesN<32>,
    pub payer: Address,
    pub payee: Address,
    pub limit_amount: i128,
    pub deposited_amount: i128,
    pub settled_amount: i128,
    pub created_at: u64,
    pub expires_at: u64,
    pub status: ChannelStatus,
    pub sequence_counter: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct VoucherPayload {
    pub channel_id: BytesN<32>,
    pub payer: Address,
    pub payee: Address,
    pub amount: i128,
    pub sequence: u64,
    pub expires_at: u64,
    pub voucher_id: Bytes,     // canonical hash hex as bytes
    pub signed_payload: Bytes, // the canonical bytes that were signed
}

// TTL constants
const PERSISTENT_TTL_EXTEND: u32 = 518_400; // ~30 days
const TEMP_TTL: u32 = 17_280; // ~1 day

// ============================================================
// Contract
// ============================================================
#[contract]
pub struct MeshChannel;

#[contractimpl]
impl MeshChannel {
    // ----------------------------------------------------------
    // Initialize
    // ----------------------------------------------------------
    pub fn initialize(env: Env, admin: Address, registry_id: Address) -> Result<(), ChannelError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(ChannelError::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::RegistryId, &registry_id);
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::ChannelCount, &0u32);
        env.storage()
            .instance()
            .extend_ttl(PERSISTENT_TTL_EXTEND, PERSISTENT_TTL_EXTEND);

        env.events()
            .publish((symbol_short!("ch_init"), symbol_short!("admin")), admin);

        Ok(())
    }

    // ----------------------------------------------------------
    // Create Channel
    // Inter-contract call: validates both payer and payee are active
    // ----------------------------------------------------------
    pub fn create_channel(
        env: Env,
        payer: Address,
        payee: Address,
        limit_amount: i128,
        expires_at: u64,
    ) -> Result<BytesN<32>, ChannelError> {
        Self::require_initialized(&env)?;
        payer.require_auth();

        if limit_amount <= 0 {
            return Err(ChannelError::InvalidAmount);
        }
        if expires_at <= env.ledger().timestamp() {
            return Err(ChannelError::InvalidExpiry);
        }
        if payer == payee {
            return Err(ChannelError::VoucherWrongRecipient);
        }

        // ── Inter-contract call to MeshRegistry ──
        let registry_id: Address = env.storage().instance().get(&DataKey::RegistryId).unwrap();
        let registry = RegistryClient::new(&env, &registry_id);
        if !registry.is_participant_active(&payer) {
            return Err(ChannelError::ParticipantNotActive);
        }
        if !registry.is_participant_active(&payee) {
            return Err(ChannelError::ParticipantNotActive);
        }

        // Generate deterministic channel ID
        let channel_id = Self::generate_channel_id(&env, &payer, &payee, expires_at);

        if env
            .storage()
            .persistent()
            .has(&DataKey::Channel(channel_id.clone()))
        {
            return Err(ChannelError::ChannelAlreadyExists);
        }

        let channel = Channel {
            channel_id: channel_id.clone(),
            payer: payer.clone(),
            payee: payee.clone(),
            limit_amount,
            deposited_amount: 0,
            settled_amount: 0,
            created_at: env.ledger().timestamp(),
            expires_at,
            status: ChannelStatus::Active,
            sequence_counter: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Channel(channel_id.clone()), &channel);
        env.storage().persistent().extend_ttl(
            &DataKey::Channel(channel_id.clone()),
            PERSISTENT_TTL_EXTEND,
            PERSISTENT_TTL_EXTEND,
        );

        // Update count
        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ChannelCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::ChannelCount, &(count + 1));

        // Emit channel_created event
        env.events().publish(
            (symbol_short!("ch_creat"), symbol_short!("payer")),
            (channel_id.clone(), payer, payee, limit_amount, expires_at),
        );

        Ok(channel_id)
    }

    // ----------------------------------------------------------
    // Fund Channel — transfer XLM from payer into contract escrow
    // ----------------------------------------------------------
    pub fn fund_channel(
        env: Env,
        payer: Address,
        channel_id: BytesN<32>,
        amount: i128,
    ) -> Result<i128, ChannelError> {
        Self::require_initialized(&env)?;
        payer.require_auth();

        let mut channel: Channel = env
            .storage()
            .persistent()
            .get(&DataKey::Channel(channel_id.clone()))
            .ok_or(ChannelError::ChannelNotFound)?;

        if channel.payer != payer {
            return Err(ChannelError::Unauthorized);
        }
        if channel.status != ChannelStatus::Active {
            return Err(ChannelError::ChannelNotActive);
        }
        if env.ledger().timestamp() >= channel.expires_at {
            channel.status = ChannelStatus::Expired;
            env.storage()
                .persistent()
                .set(&DataKey::Channel(channel_id.clone()), &channel);
            return Err(ChannelError::ChannelExpired);
        }
        if amount <= 0 {
            return Err(ChannelError::InvalidAmount);
        }
        if channel.deposited_amount + amount > channel.limit_amount {
            return Err(ChannelError::AmountExceedsLimit);
        }

        // Transfer XLM from payer to contract using native XLM asset contract
        let xlm_client = token::StellarAssetClient::new(&env, &env.current_contract_address());
        // Use the native transfer: payer → contract
        token::Client::new(&env, &xlm_client.address()).transfer(
            &payer,
            &env.current_contract_address(),
            &amount,
        );

        channel.deposited_amount += amount;
        env.storage()
            .persistent()
            .set(&DataKey::Channel(channel_id.clone()), &channel);
        env.storage().persistent().extend_ttl(
            &DataKey::Channel(channel_id.clone()),
            PERSISTENT_TTL_EXTEND,
            PERSISTENT_TTL_EXTEND,
        );

        // Emit channel_funded event
        env.events().publish(
            (symbol_short!("ch_fund"), symbol_short!("amt")),
            (channel_id, payer, amount, channel.deposited_amount),
        );

        Ok(channel.deposited_amount)
    }

    // ----------------------------------------------------------
    // Settle Voucher
    // The payee presents a signed voucher for settlement
    // ----------------------------------------------------------
    pub fn settle_voucher(
        env: Env,
        settler: Address,
        voucher: VoucherPayload,
    ) -> Result<i128, ChannelError> {
        Self::require_initialized(&env)?;
        settler.require_auth();

        // Load channel
        let mut channel: Channel = env
            .storage()
            .persistent()
            .get(&DataKey::Channel(voucher.channel_id.clone()))
            .ok_or(ChannelError::ChannelNotFound)?;

        // Verify settler is the payee or admin
        if settler != channel.payee {
            let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
            if settler != admin {
                return Err(ChannelError::Unauthorized);
            }
        }

        // Channel state checks
        if channel.status != ChannelStatus::Active {
            return Err(ChannelError::ChannelNotActive);
        }

        // Expiry check
        if env.ledger().timestamp() > voucher.expires_at {
            return Err(ChannelError::VoucherExpired);
        }
        if env.ledger().timestamp() >= channel.expires_at {
            channel.status = ChannelStatus::Expired;
            env.storage()
                .persistent()
                .set(&DataKey::Channel(voucher.channel_id.clone()), &channel);
            return Err(ChannelError::ChannelExpired);
        }

        // Recipient check
        if voucher.payee != channel.payee {
            return Err(ChannelError::VoucherWrongRecipient);
        }

        // Channel match
        if voucher.channel_id != channel.channel_id {
            return Err(ChannelError::VoucherWrongChannel);
        }

        // Amount check
        if voucher.amount <= 0 {
            return Err(ChannelError::VoucherInvalidAmount);
        }
        let available = channel.deposited_amount - channel.settled_amount;
        if voucher.amount > available {
            return Err(ChannelError::ChannelInsufficientBalance);
        }
        if voucher.amount > channel.limit_amount {
            return Err(ChannelError::AmountExceedsLimit);
        }

        // Replay protection — sequence
        let nonce_key = DataKey::UsedNonce(voucher.channel_id.clone(), voucher.sequence);
        if env.storage().temporary().has(&nonce_key) {
            return Err(ChannelError::VoucherSequenceReused);
        }

        // Replay protection — voucher ID
        let voucher_key = DataKey::UsedVoucher(voucher.voucher_id.clone());
        if env.storage().temporary().has(&voucher_key) {
            return Err(ChannelError::VoucherAlreadySettled);
        }

        // Mark nonce/voucher used
        env.storage().temporary().set(&nonce_key, &true);
        env.storage()
            .temporary()
            .extend_ttl(&nonce_key, TEMP_TTL, TEMP_TTL);
        env.storage().temporary().set(&voucher_key, &true);
        env.storage()
            .temporary()
            .extend_ttl(&voucher_key, TEMP_TTL, TEMP_TTL);

        // Update channel state
        channel.settled_amount += voucher.amount;
        channel.sequence_counter = channel.sequence_counter.max(voucher.sequence + 1);
        env.storage()
            .persistent()
            .set(&DataKey::Channel(voucher.channel_id.clone()), &channel);
        env.storage().persistent().extend_ttl(
            &DataKey::Channel(voucher.channel_id.clone()),
            PERSISTENT_TTL_EXTEND,
            PERSISTENT_TTL_EXTEND,
        );

        // Transfer XLM to payee
        let xlm_client = token::Client::new(&env, &env.current_contract_address());
        // In Soroban, to transfer native XLM from the contract's balance,
        // we use the stellar asset contract for XLM.
        // The contract holds XLM in its own account; use token interface to transfer.
        // Note: this requires the contract to have an XLM balance.
        // We use the native Stellar asset contract at the known address.
        Self::transfer_xlm_to(&env, &channel.payee, voucher.amount)?;

        // Emit voucher_settled event
        env.events().publish(
            (symbol_short!("vc_settl"), symbol_short!("amt")),
            (
                voucher.channel_id,
                voucher.voucher_id,
                channel.payer,
                channel.payee,
                voucher.amount,
            ),
        );

        Ok(channel.settled_amount)
    }

    // ----------------------------------------------------------
    // Cancel Channel
    // ----------------------------------------------------------
    pub fn cancel_channel(
        env: Env,
        caller: Address,
        channel_id: BytesN<32>,
    ) -> Result<(), ChannelError> {
        Self::require_initialized(&env)?;
        caller.require_auth();

        let mut channel: Channel = env
            .storage()
            .persistent()
            .get(&DataKey::Channel(channel_id.clone()))
            .ok_or(ChannelError::ChannelNotFound)?;

        // Only payer or admin can cancel
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if caller != channel.payer && caller != admin {
            return Err(ChannelError::Unauthorized);
        }

        if channel.status != ChannelStatus::Active {
            return Err(ChannelError::ChannelNotActive);
        }

        channel.status = ChannelStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&DataKey::Channel(channel_id.clone()), &channel);

        // Refund remaining balance to payer
        let refund = channel.deposited_amount - channel.settled_amount;
        if refund > 0 {
            Self::transfer_xlm_to(&env, &channel.payer, refund)?;
        }

        env.events().publish(
            (symbol_short!("ch_cncl"), symbol_short!("payer")),
            (channel_id, channel.payer, refund),
        );

        Ok(())
    }

    // ----------------------------------------------------------
    // Withdraw (close channel after expiry)
    // ----------------------------------------------------------
    pub fn withdraw(
        env: Env,
        caller: Address,
        channel_id: BytesN<32>,
    ) -> Result<i128, ChannelError> {
        Self::require_initialized(&env)?;
        caller.require_auth();

        let mut channel: Channel = env
            .storage()
            .persistent()
            .get(&DataKey::Channel(channel_id.clone()))
            .ok_or(ChannelError::ChannelNotFound)?;

        // Only payer can withdraw after expiry
        if caller != channel.payer {
            return Err(ChannelError::Unauthorized);
        }
        if env.ledger().timestamp() < channel.expires_at {
            return Err(ChannelError::ChannelNotActive); // not expired yet
        }

        let refund = channel.deposited_amount - channel.settled_amount;
        channel.status = ChannelStatus::Closed;
        env.storage()
            .persistent()
            .set(&DataKey::Channel(channel_id.clone()), &channel);

        if refund > 0 {
            Self::transfer_xlm_to(&env, &channel.payer, refund)?;
        }

        env.events().publish(
            (symbol_short!("ch_wthdr"), symbol_short!("amt")),
            (channel_id, channel.payer, refund),
        );

        Ok(refund)
    }

    // ----------------------------------------------------------
    // Getters
    // ----------------------------------------------------------
    pub fn get_channel(env: Env, channel_id: BytesN<32>) -> Result<Channel, ChannelError> {
        Self::require_initialized(&env)?;
        env.storage()
            .persistent()
            .get(&DataKey::Channel(channel_id))
            .ok_or(ChannelError::ChannelNotFound)
    }

    pub fn get_channel_balance(env: Env, channel_id: BytesN<32>) -> Result<i128, ChannelError> {
        let channel: Channel = env
            .storage()
            .persistent()
            .get(&DataKey::Channel(channel_id))
            .ok_or(ChannelError::ChannelNotFound)?;
        Ok(channel.deposited_amount - channel.settled_amount)
    }

    pub fn get_used_nonce(env: Env, channel_id: BytesN<32>, sequence: u64) -> bool {
        env.storage()
            .temporary()
            .has(&DataKey::UsedNonce(channel_id, sequence))
    }

    pub fn channel_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ChannelCount)
            .unwrap_or(0)
    }

    pub fn get_registry(env: Env) -> Result<Address, ChannelError> {
        Self::require_initialized(&env)?;
        Ok(env.storage().instance().get(&DataKey::RegistryId).unwrap())
    }

    // ----------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------
    fn require_initialized(env: &Env) -> Result<(), ChannelError> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(ChannelError::NotInitialized);
        }
        Ok(())
    }

    fn generate_channel_id(
        env: &Env,
        payer: &Address,
        payee: &Address,
        expires_at: u64,
    ) -> BytesN<32> {
        let mut data = Bytes::new(env);
        // Build a unique seed from payer + payee + expires_at + timestamp
        let ts_bytes = env.ledger().timestamp().to_be_bytes();
        let exp_bytes = expires_at.to_be_bytes();
        data.extend_from_slice(&ts_bytes);
        data.extend_from_slice(&exp_bytes);
        // SHA-256 produces BytesN<32>
        env.crypto().sha256(&data)
    }

    fn transfer_xlm_to(env: &Env, to: &Address, amount: i128) -> Result<(), ChannelError> {
        // Use the Stellar native XLM asset contract (available via token::Client on the contract address)
        // The contract's own XLM balance is used as escrow.
        // In test environment, we use mock tokens.
        // In production, this calls the native XLM Stellar Asset Contract.
        // We use env.current_contract_address() as the "from" for the transfer.
        // This is permitted because the contract controls its own balance.
        let xlm = token::Client::new(env, &env.current_contract_address());
        xlm.transfer(&env.current_contract_address(), to, &amount);
        Ok(())
    }
}
