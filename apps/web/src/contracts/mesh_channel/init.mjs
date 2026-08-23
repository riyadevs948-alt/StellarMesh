import { Keypair, Networks, TransactionBuilder, Contract, rpc } from '@stellar/stellar-sdk';
import { Client } from './dist/index.js';

(async () => {
  const admin = Keypair.fromSecret('SA2AK4WTLIGZ57UACLZVTGTTEX6LK5QY2KNWBALWYCLZLOID3L73UYPS');
  const client = new Client({
    networkPassphrase: Networks.TESTNET,
    contractId: 'CDVS3REFK2CSYZISGDOJTVWZ2RDTUIKUPKXZWKZ34PDJ7GMKCFWWJWSA',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    publicKey: admin.publicKey()
  });
  
  const tx = await client.initialize({
    admin: admin.publicKey(),
    registry_id: 'CDVS3REFK2CSYZISGDOJTVWZ2RDTUIKUPKXZWKZ34PDJ7GMKCFWWJWSA',
    xlm_asset: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'
  });
  
  const res = await tx.signAndSend({
    signTransaction: async (txXDR) => {
      const tx = TransactionBuilder.fromXDR(txXDR, Networks.TESTNET);
      tx.sign(admin);
      return tx.toXDR();
    }
  });
  
  console.log(res);
})();
