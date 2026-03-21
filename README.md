# Chain Quest – The Decentralized Chronicles

A blockchain education RPG where players battle bosses to learn Web3 concepts and earn real Sepolia testnet tokens.

---

## Stack

- **Frontend**: React 18 + Vite + Phaser 3 + Tailwind CSS + Framer Motion + Zustand
- **Backend**: Node.js 22+ + Express + Socket.IO + SQLite (node:sqlite built-in)
- **Web3**: Ethers.js v6 + ERC-20 token on Sepolia testnet
- **Deployment**: Railway (single service, SQLite on persistent volume)

---

## Local Development

### Prerequisites
- Node.js >= 22.5.0 (required for built-in `node:sqlite`)
- npm >= 9

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd chain-quest
npm install

# 2. Create .env file
cp .env.example .env
# Edit .env and set at minimum:
#   JWT_SECRET=<generate with: openssl rand -base64 32>
#   DB_PATH=./chainquest.db

# 3. Start dev server (frontend + backend concurrently)
npm run dev
```

The app will be available at `http://localhost:5173` (frontend) and `http://localhost:3001` (API).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | **Yes** | Secret for signing JWT tokens. Generate: `openssl rand -base64 32` |
| `DB_PATH` | No | SQLite database path. Default: `./chainquest.db`. Railway: `/data/chainquest.db` |
| `PORT` | No | Server port. Default: `3001` |
| `ALLOWED_ORIGINS` | No | Comma-separated allowed CORS origins. Default: localhost |
| `SEPOLIA_RPC_URL` | Web3 only | Alchemy/Infura Sepolia RPC URL for contract interactions |
| `MINTER_PRIVATE_KEY` | Web3 only | Server hot wallet private key for minting CQT tokens |
| `VITE_CQT_CONTRACT_ADDRESS` | Web3 only | Deployed ChainQuestToken contract address |
| `VITE_NETWORK_CHAIN_ID` | Web3 only | Target chain ID. Default: `11155111` (Sepolia) |

> **Without Web3 variables**: The game is fully playable. Token claims will show as "Simulated" — no real tokens are minted. Set these variables after deploying the smart contract.

---

## Deployment on Railway

### 1. Create Railway project
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Connect your GitHub repo

### 2. Add Persistent Volume
1. In Railway dashboard → your service → **Volumes**
2. Add volume mounted at `/data`
3. This keeps the SQLite database across restarts

### 3. Set Environment Variables
In Railway → your service → **Variables**, add:
```
JWT_SECRET=<your-secret>
DB_PATH=/data/chainquest.db
ALLOWED_ORIGINS=https://your-app.railway.app
NODE_ENV=production
```

### 4. Deploy
Railway auto-deploys on every push to `main`. The build runs:
```
npm install && npm run build
```
And starts with:
```
NODE_ENV=production node server/index.js
```

### 5. Verify deployment
```bash
curl https://your-app.railway.app/health
# Expected: {"status":"ok","uptime":...}
```

---

## Enabling Real CQT Token Rewards (Optional)

### Deploy the smart contract

```bash
# Install Hardhat dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-ethers ethers

# Set in .env:
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<your-key>
MINTER_PRIVATE_KEY=0x<your-hot-wallet-private-key>

# Deploy to Sepolia (need Sepolia ETH for gas)
npx hardhat run scripts/deploy.js --network sepolia
```

After deployment, add to Railway environment variables:
```
VITE_CQT_CONTRACT_ADDRESS=0x<deployed-address>
MINTER_PRIVATE_KEY=0x<hot-wallet-private-key>
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<your-key>
```

Redeploy the Railway service for frontend env vars to take effect.

---

## Post-Deploy Checklist

- [ ] Health check responds: `GET /health` → `{"status":"ok"}`
- [ ] Register a new account
- [ ] Create avatar and enter world
- [ ] Battle World 1 and complete it
- [ ] Leaderboard shows your score
- [ ] Multiplayer: create room + join from another tab
- [ ] Check security headers: `curl -I https://your-app.railway.app` → `X-Frame-Options`, `X-Content-Type-Options` present

---

## Project Structure

```
├── server/
│   ├── index.js              # Express + Socket.IO server
│   ├── auth.js               # JWT + bcrypt helpers
│   ├── db.js                 # SQLite schema + helpers
│   ├── wallet.js             # Web3 minting logic
│   ├── routes/
│   │   ├── authRoutes.js     # Register, login, wallet link
│   │   ├── profileRoutes.js  # Profile, world completion, rewards
│   │   ├── leaderboardRoutes.js
│   │   └── shopRoutes.js
│   └── socket/
│       ├── socketHandlers.js # All Socket.IO event handlers
│       ├── worldManager.js   # Open world player state
│       ├── roomManager.js    # Multiplayer room management
│       └── gameSession.js    # Server-authoritative battle logic
├── src/
│   ├── data/
│   │   ├── curriculum.ts     # 7 worlds × 10 questions each
│   │   ├── heroes.ts         # 4 hero classes
│   │   └── worldZones.ts     # Open world zone configs
│   ├── game/
│   │   ├── scenes/OpenWorldScene.ts  # Phaser scene
│   │   └── PhaserGame.tsx    # React↔Phaser bridge
│   ├── components/
│   │   ├── pages/            # All page components
│   │   └── ui/               # Reusable UI components
│   ├── hooks/
│   │   ├── useSocket.ts      # Socket.IO singleton hook
│   │   └── useWeb3.ts        # MetaMask + contract hook
│   └── store/                # Zustand state stores
├── contracts/
│   └── ChainQuestToken.sol   # ERC-20 token contract
├── railway.toml              # Railway deployment config
└── .env.example              # Environment variable template
```

---

## Game Features

- **7 worlds** covering: Blockchain Basics, Wallets & Cryptography, Smart Contracts, DeFi, NFTs, DAOs, Layer 2
- **4 hero classes**: Validator, Miner, Degen, Archivist (each with unique passives)
- **Solo & Multiplayer** (up to 8 players per room)
- **Open world** with real-time multiplayer, chat, emotes, zone detection
- **CQT token rewards** on Sepolia testnet for completing worlds
- **Leaderboard** (global + per-world)
- **In-game shop** for consumables and cosmetics
