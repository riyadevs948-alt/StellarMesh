#!/bin/bash
set -e

# Setup identity if secret is provided
if [ -n "$STELLAR_DEPLOYER_SECRET" ]; then
    echo "Setting up Stellar CLI identity..."
    stellar keys add deployer --secret-key "$STELLAR_DEPLOYER_SECRET"
    export STELLAR_ACCOUNT=deployer
else
    echo "No STELLAR_DEPLOYER_SECRET found. Please provide one."
    exit 1
fi

echo "Building MeshRegistry..."
cd contracts/mesh-registry
stellar contract build
cd ../..

echo "Building MeshChannel..."
cd contracts/mesh-channel
stellar contract build
cd ../..

# We'll use a simple find command to get the actual wasm path since it varies based on target
REGISTRY_WASM=$(find contracts/mesh-registry/target -name "mesh_registry.wasm" | grep "release" | head -n 1)
CHANNEL_WASM=$(find contracts/mesh-channel/target -name "mesh_channel.wasm" | grep "release" | head -n 1)

if [ -z "$REGISTRY_WASM" ]; then
    echo "Could not find mesh_registry.wasm"
    exit 1
fi

if [ -z "$CHANNEL_WASM" ]; then
    echo "Could not find mesh_channel.wasm"
    exit 1
fi

echo "Deploying MeshRegistry..."
REGISTRY_ID=$(stellar contract deploy --wasm $REGISTRY_WASM --source $STELLAR_ACCOUNT --network testnet)
echo "Registry ID: $REGISTRY_ID"

echo "Deploying MeshChannel..."
CHANNEL_ID=$(stellar contract deploy --wasm $CHANNEL_WASM --source $STELLAR_ACCOUNT --network testnet)
echo "Channel ID: $CHANNEL_ID"

echo "Initializing MeshChannel..."
ADMIN_ADDRESS=$(stellar keys address deployer)
stellar contract invoke --id $CHANNEL_ID --source $STELLAR_ACCOUNT --network testnet -- initialize --admin $ADMIN_ADDRESS --registry_id $REGISTRY_ID

echo "Writing environment variables..."
cat << EOF > apps/web/.env.production
VITE_STELLAR_NETWORK=testnet
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_EXPLORER_BASE_URL=https://stellar.expert/explorer/testnet
VITE_MESH_REGISTRY_CONTRACT_ID=$REGISTRY_ID
VITE_MESH_CHANNEL_CONTRACT_ID=$CHANNEL_ID
EOF

echo "Deployment complete! Contract IDs saved to apps/web/.env.production"
