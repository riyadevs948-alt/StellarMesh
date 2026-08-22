import { Client as MeshChannelClient } from './src/contracts/mesh_channel/dist/index.js';
import { Keypair, Networks } from '@stellar/stellar-sdk';

function xlmToStroops(xlm: string) { return BigInt(parseFloat(xlm) * 1e7); }

async function main() {
  const payer = Keypair.random();
  const payee = Keypair.random();
  
  const client = new MeshChannelClient({
    networkPassphrase: Networks.TESTNET,
    contractId: 'CAJDG4UWXFBW6TT2O5LOQZ7KUOMEBESAESXAQWDFDCMISMVHATXTFNDA',
    rpcUrl: 'https://soroban-testnet.stellar.org',
  });

  const sessionKey = Keypair.random();
  const payerPubkey = sessionKey.rawPublicKey();
  const expiresAtUnix = Math.floor(Date.now() / 1000) + 30 * 86400;
  const limitStroops = BigInt(xlmToStroops('100').toString());

  console.log('Simulating...');
  const tx = await client.create_channel({
    payer: payer.publicKey(),
    payer_pubkey: Buffer.from(payerPubkey),
    payee: payee.publicKey(),
    limit_amount: limitStroops,
    expires_at: BigInt(expiresAtUnix),
  });

  console.log(JSON.stringify(tx.simulation, null, 2));
}

main().catch(console.error);
