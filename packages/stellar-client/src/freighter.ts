// ============================================================
// StellarMesh — Freighter Wallet Integration
// ============================================================
import {
  isConnected,
  getAddress,
  getNetwork,
  signTransaction,
  requestAccess,
  isAllowed,
  setAllowed,
  getNetworkDetails,
} from '@stellar/freighter-api';
import type { WalletSession } from '@stellar-mesh/shared';
import {
  WalletError,
  STELLAR_TESTNET_PASSPHRASE,
} from '@stellar-mesh/shared';

export interface FreighterNetworkDetails {
  network: string;
  networkUrl: string;
  networkPassphrase: string;
}

/**
 * Check if Freighter is installed.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

/**
 * Connect Freighter wallet and return wallet session data.
 */
export async function connectFreighter(): Promise<{ address: string; networkDetails: FreighterNetworkDetails }> {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw new WalletError('WALLET_NOT_INSTALLED', 'Freighter wallet is not installed. Please install it from freighter.app');
  }

  let access;
  try {
    access = await requestAccess();
  } catch (e) {
    throw new WalletError('WALLET_REJECTED', 'Freighter access request was rejected');
  }

  if (access.error) {
    throw new WalletError('WALLET_REJECTED', `Freighter rejected access: ${access.error}`);
  }

  const [addressResult, networkResult] = await Promise.all([
    getAddress(),
    getNetworkDetails(),
  ]);

  if (addressResult.error || !addressResult.address) {
    throw new WalletError('WALLET_DISCONNECTED', 'Could not retrieve wallet address from Freighter');
  }
  if (networkResult.error) {
    throw new WalletError('WRONG_NETWORK', `Could not retrieve network details: ${networkResult.error}`);
  }

  const networkPassphrase = networkResult.networkPassphrase ?? '';
  if (networkPassphrase !== STELLAR_TESTNET_PASSPHRASE) {
    throw new WalletError(
      'WRONG_NETWORK',
      `Please switch Freighter to Stellar Testnet. Current network: "${networkResult.network ?? 'unknown'}"`
    );
  }

  return {
    address: addressResult.address,
    networkDetails: {
      network: networkResult.network ?? 'testnet',
      networkUrl: networkResult.networkUrl ?? '',
      networkPassphrase,
    },
  };
}

/**
 * Get current connected wallet address (if already allowed).
 */
export async function getConnectedAddress(): Promise<string | null> {
  try {
    const allowed = await isAllowed();
    if (!allowed.isAllowed) return null;
    const result = await getAddress();
    if (result.error || !result.address) return null;
    return result.address;
  } catch {
    return null;
  }
}

/**
 * Sign an XDR-encoded transaction envelope using Freighter.
 * Returns signed XDR string.
 */
export async function signTransactionWithFreighter(
  xdr: string,
  address: string,
  networkPassphrase: string
): Promise<string> {
  try {
    const result = await signTransaction(xdr, {
      address,
      networkPassphrase,
    });
    if (result.error) {
      throw new WalletError('SIGNING_FAILED', `Freighter signing failed: ${result.error}`);
    }
    if (!result.signedTxXdr) {
      throw new WalletError('SIGNING_FAILED', 'Freighter returned no signed XDR');
    }
    return result.signedTxXdr;
  } catch (e) {
    if (e instanceof WalletError) throw e;
    throw new WalletError('WALLET_REJECTED', 'Transaction signing was rejected or cancelled');
  }
}

/**
 * Get current network details from Freighter.
 */
export async function getCurrentNetworkDetails(): Promise<FreighterNetworkDetails> {
  const result = await getNetworkDetails();
  if (result.error) {
    throw new WalletError('WRONG_NETWORK', `Could not get network details: ${result.error}`);
  }
  return {
    network: result.network ?? 'unknown',
    networkUrl: result.networkUrl ?? '',
    networkPassphrase: result.networkPassphrase ?? '',
  };
}

/**
 * Build a WalletSession object from connection data.
 */
export function buildWalletSession(
  address: string,
  networkDetails: FreighterNetworkDetails
): WalletSession {
  const now = new Date().toISOString();
  return {
    id: `${address}-${Date.now()}`,
    address,
    network: networkDetails.network,
    networkPassphrase: networkDetails.networkPassphrase,
    connectedAt: now,
    lastActive: now,
  };
}
