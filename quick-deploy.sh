#!/bin/bash

###############################################################################
# DERA PROTOCOL - QUICK DEPLOYMENT SCRIPT
###############################################################################
#
# This script provides the fastest way to deploy Dera Protocol for judges.
#
# Usage:
#   chmod +x quick-deploy.sh
#   ./quick-deploy.sh
#
# Or using npm:
#   npm run quick-deploy
#
###############################################################################

set -e  # Exit on any error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                                                            ║${NC}"
echo -e "${MAGENTA}║           DERA PROTOCOL - QUICK DEPLOYMENT                ║${NC}"
echo -e "${MAGENTA}║                 (5-Minute Setup)                          ║${NC}"
echo -e "${MAGENTA}║                                                            ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env exists
if [ ! -f "contracts/.env" ]; then
    echo -e "${RED}❌ Error: contracts/.env file not found${NC}"
    echo -e "${YELLOW}Please create contracts/.env from contracts/.env.example${NC}"
    echo -e "${YELLOW}and configure your Hedera credentials.${NC}"
    echo ""
    echo -e "${CYAN}Quick setup:${NC}"
    echo "  cp contracts/.env.example contracts/.env"
    echo "  nano contracts/.env  # Add your credentials"
    exit 1
fi

# Load environment variables
source contracts/.env 2>/dev/null || true

# Validate required variables
if [ -z "$HEDERA_OPERATOR_ID" ] || [ -z "$HEDERA_OPERATOR_KEY" ] || [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}❌ Error: Missing required environment variables${NC}"
    echo -e "${YELLOW}Please ensure the following are set in contracts/.env:${NC}"
    echo "  - HEDERA_OPERATOR_ID"
    echo "  - HEDERA_OPERATOR_KEY"
    echo "  - PRIVATE_KEY"
    exit 1
fi

echo -e "${GREEN}✅ Environment configuration validated${NC}"
echo ""

# Step 1: Install dependencies
echo -e "${CYAN}📦 Step 1/5: Installing dependencies...${NC}"
npm install --silent > /dev/null 2>&1 &
INSTALL_PID=$!

# Show spinner
spin='-\|/'
i=0
while kill -0 $INSTALL_PID 2>/dev/null; do
  i=$(( (i+1) %4 ))
  printf "\r${YELLOW}⏳ Installing... ${spin:$i:1}${NC}"
  sleep .1
done
wait $INSTALL_PID
printf "\r${GREEN}✅ Dependencies installed          ${NC}\n"

# Step 2: Install contracts dependencies
echo -e "${CYAN}📦 Step 2/5: Installing contract dependencies...${NC}"
cd contracts
npm install --silent > /dev/null 2>&1
cd ..
echo -e "${GREEN}✅ Contract dependencies installed${NC}"

# Step 3: Compile contracts
echo -e "${CYAN}🔨 Step 3/5: Compiling contracts...${NC}"
cd contracts
npx hardhat compile --quiet
cd ..
echo -e "${GREEN}✅ Contracts compiled${NC}"

# Step 4: Deploy contracts
echo -e "${CYAN}🚀 Step 4/5: Deploying contracts to Hedera Testnet...${NC}"
echo -e "${YELLOW}⏱️  This will take 3-5 minutes. Please wait...${NC}"
cd contracts
npx hardhat run scripts/deploy-complete.js --network testnet
cd ..
echo -e "${GREEN}✅ Contracts deployed${NC}"

# Step 5: Create HCS topics
echo -e "${CYAN}📡 Step 5/5: Creating HCS topics...${NC}"
cd contracts
node scripts/create-hcs-topics.js
cd ..
echo -e "${GREEN}✅ HCS topics created${NC}"

# Display deployment summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║              🎉 DEPLOYMENT SUCCESSFUL! 🎉                 ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Read and display contract addresses
if [ -f "contracts/deployment-info.json" ]; then
    echo -e "${CYAN}📋 Deployed Contracts:${NC}"
    echo ""
    cat contracts/deployment-info.json | grep -A 100 '"addresses"' | sed 's/^/   /'
    echo ""
fi

# Read and display HCS topics
if [ -f "contracts/hcs-topics.json" ]; then
    echo -e "${CYAN}📡 HCS Topics:${NC}"
    echo ""
    cat contracts/hcs-topics.json | grep -A 100 '"topics"' | sed 's/^/   /'
    echo ""
fi

echo -e "${CYAN}🚀 Next Steps:${NC}"
echo ""
echo -e "${YELLOW}   1. Install frontend dependencies:${NC}"
echo "      cd frontend && npm install"
echo ""
echo -e "${YELLOW}   2. Start the development server:${NC}"
echo "      npm run dev"
echo ""
echo -e "${YELLOW}   3. Open your browser:${NC}"
echo "      http://localhost:3000"
echo ""
echo -e "${YELLOW}   4. Connect your HashPack wallet and test the protocol!${NC}"
echo ""

echo -e "${BLUE}📄 Deployment details saved to:${NC}"
echo "   - contracts/deployment-info.json"
echo "   - contracts/hcs-topics.json"
echo ""

echo -e "${GREEN}✅ Deployment complete! Total time: $SECONDS seconds${NC}"
echo ""
