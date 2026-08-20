#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env, String, Symbol, Vec, symbol_short,
    log,
};

// ============================================================
// Storage Keys
// ============================================================
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Initialized,
    Participant(Address),
    ChannelPolicy,
    ParticipantCount,
    ProtocolVersion,
}

// ============================================================
// Contract Errors
// ============================================================
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RegistryError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    ParticipantNotFound = 4,
    ParticipantAlreadyRegistered = 5,
    InvalidAddress = 6,
    InvalidMetadata = 7,
    ParticipantInactive = 8,
}

// ============================================================
// Data Types
// ============================================================
#[contracttype]
#[derive(Clone, Debug)]
pub struct ParticipantInfo {
    pub address: Address,
    pub label: String,
    pub registered_at: u64,  // ledger timestamp
    pub updated_at: u64,
    pub active: bool,
    pub channel_count: u32,
    pub max_channel_amount: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ChannelPolicy {
    pub min_amount: i128,
    pub max_amount: i128,
    pub max_expiry_seconds: u64,
    pub min_expiry_seconds: u64,
    pub require_registration: bool,
    pub max_channels_per_user: u32,
    pub updated_at: u64,
}

// Default policy values
const DEFAULT_MIN_AMOUNT: i128 = 1_000_000;         // 0.1 XLM in stroops
const DEFAULT_MAX_AMOUNT: i128 = 100_000_000_000;    // 10,000 XLM in stroops
const DEFAULT_MAX_EXPIRY_SECS: u64 = 72 * 3600;     // 72 hours
const DEFAULT_MIN_EXPIRY_SECS: u64 = 3600;           // 1 hour
const DEFAULT_MAX_CHANNELS: u32 = 10;
const PROTOCOL_VERSION: u32 = 1;

// Storage TTL extensions (in ledgers; ~5s per ledger)
const PERSISTENT_TTL_EXTEND: u32 = 518_400; // ~30 days

// ============================================================
// Contract
// ============================================================
#[contract]
pub struct MeshRegistry;

#[contractimpl]
impl MeshRegistry {
    // ----------------------------------------------------------
    // Initialize
    // ----------------------------------------------------------
    pub fn initialize(env: Env, admin: Address) -> Result<(), RegistryError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(RegistryError::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::ProtocolVersion, &PROTOCOL_VERSION);
        env.storage().instance().set(&DataKey::ParticipantCount, &0u32);

        // Default channel policy
        let policy = ChannelPolicy {
            min_amount: DEFAULT_MIN_AMOUNT,
            max_amount: DEFAULT_MAX_AMOUNT,
            max_expiry_seconds: DEFAULT_MAX_EXPIRY_SECS,
            min_expiry_seconds: DEFAULT_MIN_EXPIRY_SECS,
            require_registration: false, // Open for testnet
            max_channels_per_user: DEFAULT_MAX_CHANNELS,
            updated_at: env.ledger().timestamp(),
        };
        env.storage().instance().set(&DataKey::ChannelPolicy, &policy);
        env.storage().instance().extend_ttl(PERSISTENT_TTL_EXTEND, PERSISTENT_TTL_EXTEND);

        // Emit event
        env.events().publish(
            (symbol_short!("reg_init"), symbol_short!("admin")),
            admin,
        );

        Ok(())
    }

    // ----------------------------------------------------------
    // Register Participant
    // ----------------------------------------------------------
    pub fn register_participant(
        env: Env,
        address: Address,
        label: String,
    ) -> Result<ParticipantInfo, RegistryError> {
        Self::require_initialized(&env)?;
        address.require_auth();

        let key = DataKey::Participant(address.clone());

        if env.storage().persistent().has(&key) {
            // Allow re-registration to update label if inactive
            let existing: ParticipantInfo = env.storage().persistent().get(&key).unwrap();
            if existing.active {
                return Err(RegistryError::ParticipantAlreadyRegistered);
            }
        }

        let info = ParticipantInfo {
            address: address.clone(),
            label: label.clone(),
            registered_at: env.ledger().timestamp(),
            updated_at: env.ledger().timestamp(),
            active: true,
            channel_count: 0,
            max_channel_amount: DEFAULT_MAX_AMOUNT,
        };

        env.storage().persistent().set(&key, &info);
        env.storage().persistent().extend_ttl(&key, PERSISTENT_TTL_EXTEND, PERSISTENT_TTL_EXTEND);

        // Update count
        let count: u32 = env.storage().instance().get(&DataKey::ParticipantCount).unwrap_or(0);
        env.storage().instance().set(&DataKey::ParticipantCount, &(count + 1));

        // Emit event
        env.events().publish(
            (symbol_short!("reg_part"), symbol_short!("addr")),
            (address, label),
        );

        Ok(info)
    }

    // ----------------------------------------------------------
    // Update Participant
    // ----------------------------------------------------------
    pub fn update_participant(
        env: Env,
        address: Address,
        label: String,
        active: bool,
    ) -> Result<ParticipantInfo, RegistryError> {
        Self::require_initialized(&env)?;
        address.require_auth();

        let key = DataKey::Participant(address.clone());
        let mut info: ParticipantInfo = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(RegistryError::ParticipantNotFound)?;

        info.label = label;
        info.active = active;
        info.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&key, &info);
        env.storage().persistent().extend_ttl(&key, PERSISTENT_TTL_EXTEND, PERSISTENT_TTL_EXTEND);

        Ok(info)
    }

    // ----------------------------------------------------------
    // Get Participant
    // ----------------------------------------------------------
    pub fn get_participant(
        env: Env,
        address: Address,
    ) -> Result<ParticipantInfo, RegistryError> {
        Self::require_initialized(&env)?;
        env.storage()
            .persistent()
            .get(&DataKey::Participant(address))
            .ok_or(RegistryError::ParticipantNotFound)
    }

    // ----------------------------------------------------------
    // Is Participant Active
    // ----------------------------------------------------------
    pub fn is_participant_active(
        env: Env,
        address: Address,
    ) -> bool {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return false;
        }

        // If registration is not required, all addresses are "active"
        let policy: ChannelPolicy = env.storage().instance().get(&DataKey::ChannelPolicy).unwrap();
        if !policy.require_registration {
            return true;
        }

        env.storage()
            .persistent()
            .get::<DataKey, ParticipantInfo>(&DataKey::Participant(address))
            .map(|p| p.active)
            .unwrap_or(false)
    }

    // ----------------------------------------------------------
    // Increment Channel Count (called by MeshChannel)
    // ----------------------------------------------------------
    pub fn increment_channel_count(
        env: Env,
        address: Address,
        caller: Address,
    ) -> Result<(), RegistryError> {
        Self::require_initialized(&env)?;
        caller.require_auth();

        let key = DataKey::Participant(address.clone());
        if let Some(mut info) = env.storage().persistent().get::<DataKey, ParticipantInfo>(&key) {
            info.channel_count += 1;
            info.updated_at = env.ledger().timestamp();
            env.storage().persistent().set(&key, &info);
            env.storage().persistent().extend_ttl(&key, PERSISTENT_TTL_EXTEND, PERSISTENT_TTL_EXTEND);
        }
        // If participant not found, silently succeed (open registration mode)
        Ok(())
    }

    // ----------------------------------------------------------
    // Set Channel Policy (admin only)
    // ----------------------------------------------------------
    pub fn set_channel_policy(
        env: Env,
        admin: Address,
        policy: ChannelPolicy,
    ) -> Result<(), RegistryError> {
        Self::require_initialized(&env)?;
        Self::require_admin(&env, &admin)?;
        admin.require_auth();

        env.storage().instance().set(&DataKey::ChannelPolicy, &policy);

        env.events().publish(
            (symbol_short!("policy_up"), symbol_short!("admin")),
            admin,
        );

        Ok(())
    }

    // ----------------------------------------------------------
    // Get Channel Policy
    // ----------------------------------------------------------
    pub fn get_channel_policy(env: Env) -> Result<ChannelPolicy, RegistryError> {
        Self::require_initialized(&env)?;
        Ok(env.storage().instance().get(&DataKey::ChannelPolicy).unwrap())
    }

    // ----------------------------------------------------------
    // Get Protocol Version
    // ----------------------------------------------------------
    pub fn protocol_version(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::ProtocolVersion).unwrap_or(PROTOCOL_VERSION)
    }

    // ----------------------------------------------------------
    // Get Admin
    // ----------------------------------------------------------
    pub fn get_admin(env: Env) -> Result<Address, RegistryError> {
        Self::require_initialized(&env)?;
        Ok(env.storage().instance().get(&DataKey::Admin).unwrap())
    }

    // ----------------------------------------------------------
    // Get Participant Count
    // ----------------------------------------------------------
    pub fn participant_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::ParticipantCount).unwrap_or(0)
    }

    // ----------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------
    fn require_initialized(env: &Env) -> Result<(), RegistryError> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(RegistryError::NotInitialized);
        }
        Ok(())
    }

    fn require_admin(env: &Env, caller: &Address) -> Result<(), RegistryError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if &admin != caller {
            return Err(RegistryError::Unauthorized);
        }
        Ok(())
    }
}
