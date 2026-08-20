#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo, Events},
    Address, Env, String,
};

fn create_env() -> Env {
    let env = Env::default();
    env.mock_all_auths();
    env
}

fn setup_registry(env: &Env) -> (MeshRegistryClient, Address) {
    let contract_id = env.register(MeshRegistry, ());
    let client = MeshRegistryClient::new(env, &contract_id);
    let admin = Address::generate(env);
    client.initialize(&admin);
    (client, admin)
}

// ======================== Init Tests ========================

#[test]
fn test_initialize_success() {
    let env = create_env();
    let (client, admin) = setup_registry(&env);
    assert_eq!(client.protocol_version(), 1);
    assert_eq!(client.participant_count(), 0);
    assert_eq!(client.get_admin(), admin);
}

#[test]
#[should_panic(expected = "AlreadyInitialized")]
fn test_initialize_twice_fails() {
    let env = create_env();
    let (client, admin) = setup_registry(&env);
    client.initialize(&admin); // second call must fail
}

// ======================== Policy Tests ========================

#[test]
fn test_get_default_policy() {
    let env = create_env();
    let (client, _) = setup_registry(&env);
    let policy = client.get_channel_policy();
    assert_eq!(policy.min_amount, 1_000_000);
    assert_eq!(policy.max_amount, 100_000_000_000);
    assert_eq!(policy.require_registration, false);
    assert_eq!(policy.max_channels_per_user, 10);
}

#[test]
fn test_set_channel_policy_by_admin() {
    let env = create_env();
    let (client, admin) = setup_registry(&env);
    let new_policy = ChannelPolicy {
        min_amount: 2_000_000,
        max_amount: 50_000_000_000,
        max_expiry_seconds: 48 * 3600,
        min_expiry_seconds: 7200,
        require_registration: true,
        max_channels_per_user: 5,
        updated_at: 0,
    };
    client.set_channel_policy(&admin, &new_policy);
    let fetched = client.get_channel_policy();
    assert_eq!(fetched.min_amount, 2_000_000);
    assert_eq!(fetched.require_registration, true);
}

#[test]
#[should_panic(expected = "Unauthorized")]
fn test_set_channel_policy_non_admin_fails() {
    let env = create_env();
    let (client, _) = setup_registry(&env);
    let non_admin = Address::generate(&env);
    let policy = client.get_channel_policy();
    client.set_channel_policy(&non_admin, &policy);
}

// ======================== Participant Tests ========================

#[test]
fn test_register_participant_success() {
    let env = create_env();
    let (client, _) = setup_registry(&env);
    let user = Address::generate(&env);
    let label = String::from_str(&env, "Alice");
    let info = client.register_participant(&user, &label);
    assert_eq!(info.address, user);
    assert_eq!(info.active, true);
    assert_eq!(client.participant_count(), 1);
}

#[test]
fn test_register_participant_twice_fails() {
    let env = create_env();
    let (client, _) = setup_registry(&env);
    let user = Address::generate(&env);
    let label = String::from_str(&env, "Alice");
    client.register_participant(&user, &label);
    let result = client.try_register_participant(&user, &label);
    assert!(result.is_err());
}

#[test]
fn test_get_participant_success() {
    let env = create_env();
    let (client, _) = setup_registry(&env);
    let user = Address::generate(&env);
    let label = String::from_str(&env, "Bob");
    client.register_participant(&user, &label);
    let info = client.get_participant(&user);
    assert_eq!(info.label, label);
    assert_eq!(info.active, true);
}

#[test]
#[should_panic(expected = "ParticipantNotFound")]
fn test_get_nonexistent_participant_fails() {
    let env = create_env();
    let (client, _) = setup_registry(&env);
    let user = Address::generate(&env);
    client.get_participant(&user);
}

#[test]
fn test_update_participant() {
    let env = create_env();
    let (client, _) = setup_registry(&env);
    let user = Address::generate(&env);
    client.register_participant(&user, &String::from_str(&env, "Alice"));
    let new_label = String::from_str(&env, "Alice Updated");
    let info = client.update_participant(&user, &new_label, &true);
    assert_eq!(info.label, new_label);
}

#[test]
fn test_deactivate_participant() {
    let env = create_env();
    let (client, _) = setup_registry(&env);
    let user = Address::generate(&env);
    client.register_participant(&user, &String::from_str(&env, "Carol"));
    client.update_participant(&user, &String::from_str(&env, "Carol"), &false);
    let info = client.get_participant(&user);
    assert_eq!(info.active, false);
}

// ======================== is_participant_active Tests ========================

#[test]
fn test_is_participant_active_open_mode() {
    let env = create_env();
    let (client, _) = setup_registry(&env);
    // require_registration = false by default, so any address is "active"
    let random = Address::generate(&env);
    assert_eq!(client.is_participant_active(&random), true);
}

#[test]
fn test_is_participant_active_strict_mode_not_registered() {
    let env = create_env();
    let (client, admin) = setup_registry(&env);
    let mut policy = client.get_channel_policy();
    policy.require_registration = true;
    client.set_channel_policy(&admin, &policy);
    let user = Address::generate(&env);
    assert_eq!(client.is_participant_active(&user), false);
}

#[test]
fn test_is_participant_active_strict_mode_registered() {
    let env = create_env();
    let (client, admin) = setup_registry(&env);
    let mut policy = client.get_channel_policy();
    policy.require_registration = true;
    client.set_channel_policy(&admin, &policy);
    let user = Address::generate(&env);
    client.register_participant(&user, &String::from_str(&env, "Dave"));
    assert_eq!(client.is_participant_active(&user), true);
}

#[test]
fn test_is_participant_active_deactivated() {
    let env = create_env();
    let (client, admin) = setup_registry(&env);
    let mut policy = client.get_channel_policy();
    policy.require_registration = true;
    client.set_channel_policy(&admin, &policy);
    let user = Address::generate(&env);
    client.register_participant(&user, &String::from_str(&env, "Eve"));
    client.update_participant(&user, &String::from_str(&env, "Eve"), &false);
    assert_eq!(client.is_participant_active(&user), false);
}

// ======================== Event Tests ========================

#[test]
fn test_register_emits_event() {
    let env = create_env();
    let (client, _) = setup_registry(&env);
    let user = Address::generate(&env);
    client.register_participant(&user, &String::from_str(&env, "Frank"));
    let events = env.events().all();
    // At least one event was emitted during registration
    assert!(!events.is_empty());
}

// ======================== Multi-participant Tests ========================

#[test]
fn test_multiple_participants() {
    let env = create_env();
    let (client, _) = setup_registry(&env);
    for i in 0..5u32 {
        let user = Address::generate(&env);
        let label = String::from_str(&env, "user");
        client.register_participant(&user, &label);
    }
    assert_eq!(client.participant_count(), 5);
}
