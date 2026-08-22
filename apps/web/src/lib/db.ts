// ============================================================
// Veyra — IndexedDB Persistence Layer
// ============================================================
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  WalletSession, Channel, Voucher, SettlementAttempt,
  Participant, NetworkSnapshot, VoucherLifecycleStatus,
} from '@stellar-mesh/shared';

const DB_NAME = 'stellar-mesh';
const DB_VERSION = 1;

interface VeyraDB extends DBSchema {
  wallet_sessions: {
    key: string;
    value: WalletSession;
    indexes: { by_address: string };
  };
  channels: {
    key: string;
    value: Channel;
    indexes: { by_payer: string; by_payee: string; by_status: string };
  };
  vouchers: {
    key: string;
    value: Voucher;
    indexes: {
      by_channel: string;
      by_payer: string;
      by_payee: string;
      by_status: string;
    };
  };
  settlement_attempts: {
    key: string;
    value: SettlementAttempt;
    indexes: { by_voucher: string; by_status: string };
  };
  participants: {
    key: string;
    value: Participant;
  };
  network_snapshots: {
    key: string;
    value: NetworkSnapshot;
    indexes: { by_timestamp: string };
  };
}

let dbInstance: IDBPDatabase<VeyraDB> | null = null;

async function getDB(): Promise<IDBPDatabase<VeyraDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<VeyraDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // wallet_sessions
      const sessionStore = db.createObjectStore('wallet_sessions', { keyPath: 'id' });
      sessionStore.createIndex('by_address', 'address');

      // channels
      const channelStore = db.createObjectStore('channels', { keyPath: 'id' });
      channelStore.createIndex('by_payer', 'payer');
      channelStore.createIndex('by_payee', 'payee');
      channelStore.createIndex('by_status', 'status');

      // vouchers
      const voucherStore = db.createObjectStore('vouchers', { keyPath: 'voucherId' });
      voucherStore.createIndex('by_channel', 'channelId');
      voucherStore.createIndex('by_payer', 'payer');
      voucherStore.createIndex('by_payee', 'payee');
      voucherStore.createIndex('by_status', 'localStatus');

      // settlement_attempts
      const settlementStore = db.createObjectStore('settlement_attempts', { keyPath: 'id' });
      settlementStore.createIndex('by_voucher', 'voucherId');
      settlementStore.createIndex('by_status', 'status');

      // participants
      db.createObjectStore('participants', { keyPath: 'address' });

      // network_snapshots
      const netStore = db.createObjectStore('network_snapshots', { keyPath: 'id' });
      netStore.createIndex('by_timestamp', 'capturedAt');
    },
  });

  return dbInstance;
}

// ─── Wallet Sessions ───────────────────────────────────────────
export const WalletSessionRepo = {
  async save(session: WalletSession): Promise<void> {
    const db = await getDB();
    await db.put('wallet_sessions', session);
  },
  async getByAddress(address: string): Promise<WalletSession | undefined> {
    const db = await getDB();
    const all = await db.getAllFromIndex('wallet_sessions', 'by_address', address);
    return all[0];
  },
  async getAll(): Promise<WalletSession[]> {
    const db = await getDB();
    return db.getAll('wallet_sessions');
  },
  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('wallet_sessions', id);
  },
};

// ─── Channels ──────────────────────────────────────────────────
export const ChannelRepo = {
  async save(channel: Channel): Promise<void> {
    const db = await getDB();
    await db.put('channels', channel);
  },
  async get(id: string): Promise<Channel | undefined> {
    const db = await getDB();
    return db.get('channels', id);
  },
  async getAll(): Promise<Channel[]> {
    const db = await getDB();
    return db.getAll('channels');
  },
  async getByPayer(payer: string): Promise<Channel[]> {
    const db = await getDB();
    return db.getAllFromIndex('channels', 'by_payer', payer);
  },
  async getByPayee(payee: string): Promise<Channel[]> {
    const db = await getDB();
    return db.getAllFromIndex('channels', 'by_payee', payee);
  },
  async getByAddress(address: string): Promise<Channel[]> {
    const [asPayer, asPayee] = await Promise.all([
      ChannelRepo.getByPayer(address),
      ChannelRepo.getByPayee(address),
    ]);
    // Merge deduped
    const seen = new Set<string>();
    return [...asPayer, ...asPayee].filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  },
};

// ─── Vouchers ──────────────────────────────────────────────────
export const VoucherRepo = {
  async save(voucher: Voucher): Promise<void> {
    const db = await getDB();
    await db.put('vouchers', voucher);
  },
  async get(voucherId: string): Promise<Voucher | undefined> {
    const db = await getDB();
    return db.get('vouchers', voucherId);
  },
  async getAll(): Promise<Voucher[]> {
    const db = await getDB();
    return db.getAll('vouchers');
  },
  async getByChannel(channelId: string): Promise<Voucher[]> {
    const db = await getDB();
    return db.getAllFromIndex('vouchers', 'by_channel', channelId);
  },
  async getPendingSettlement(): Promise<Voucher[]> {
    const db = await getDB();
    return db.getAllFromIndex('vouchers', 'by_status', 'PENDING_SETTLEMENT');
  },
  async updateStatus(voucherId: string, status: VoucherLifecycleStatus): Promise<void> {
    const db = await getDB();
    const voucher = await db.get('vouchers', voucherId);
    if (voucher) {
      await db.put('vouchers', { ...voucher, localStatus: status });
    }
  },
  async markSettled(voucherId: string, txHash: string, ledger: number): Promise<void> {
    const db = await getDB();
    const voucher = await db.get('vouchers', voucherId);
    if (voucher) {
      await db.put('vouchers', {
        ...voucher,
        localStatus: 'SETTLED',
        settlementTxHash: txHash,
        settlementLedger: ledger,
      });
    }
  },
};

// ─── Settlement Attempts ───────────────────────────────────────
export const SettlementAttemptRepo = {
  async save(attempt: SettlementAttempt): Promise<void> {
    const db = await getDB();
    await db.put('settlement_attempts', attempt);
  },
  async get(id: string): Promise<SettlementAttempt | undefined> {
    const db = await getDB();
    return db.get('settlement_attempts', id);
  },
  async getByVoucher(voucherId: string): Promise<SettlementAttempt[]> {
    const db = await getDB();
    return db.getAllFromIndex('settlement_attempts', 'by_voucher', voucherId);
  },
  async getAll(): Promise<SettlementAttempt[]> {
    const db = await getDB();
    return db.getAll('settlement_attempts');
  },
};

// ─── Network Snapshots ─────────────────────────────────────────
export const NetworkSnapshotRepo = {
  async save(snapshot: NetworkSnapshot): Promise<void> {
    const db = await getDB();
    await db.put('network_snapshots', snapshot);
  },
  async getLatest(): Promise<NetworkSnapshot | undefined> {
    const db = await getDB();
    const all = await db.getAll('network_snapshots');
    return all.sort((a, b) =>
      new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
    )[0];
  },
};
