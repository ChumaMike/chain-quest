// ─── Karabo — The Angel Guardian ─────────────────────────────────────────────
// "Karabo" means "answer" in Sesotho. She is the player's permanent companion
// across all 16 worlds — guide, hint-giver, lore narrator, and emotional coach.

export const KARABO_INTRO: Record<number, string> = {
  1: "Welcome to the Genesis Plains. Every block here holds a truth waiting to be verified. My name is Karabo — it means Answer. I will be with you for all sixteen worlds.",
  2: "The Wallet Wastes. Dangerous territory — key thieves lurk everywhere. Your private key is the only proof you exist on this chain. Guard it well.",
  3: "The Contract Citadel. Code here is law. Every function you understand is a wall the Bugcasters cannot breach. Let us study the contracts before we fight.",
  4: "The DeFi Dungeon. Liquidity flows like blood here — and the Rug Baron feeds on careless traders. Know the mechanics of the pool before you step into it.",
  5: "The NFT Nexus. Every pixel here claims to be unique. The Counterfeit army is vast. Only those who understand true ownership can see through the forgeries.",
  6: "The DAO Dominion. Governance is power, and power corrupts. The Vote Manipulator has been buying tokens for months. Your knowledge is your vote — and your shield.",
  7: "The Web3 Frontier. This is where all roads converge — rollups, oracles, bridges. The Trilemma Phantom feeds on confusion. Stay clear-headed.",
  8: "DApp Dominion. The Centralist has never heard of self-custody. Show him that decentralised applications need no master. Front-end meets chain here.",
  9: "The Factory Fortress. Pairs are born and destroyed here. The Clone Factory stamps out fraudulent pools by the thousands. Know how true pairs are created.",
  10: "The Router Ridges. Every swap you make traces a path through these mountains. The Pathfinder has corrupted the routing algorithms. Learn the true path.",
  11: "The Proxy Peaks. Here, code evolves without changing address. The Immutable fears this power. Master delegatecall and storage slots — the tools of living contracts.",
  12: "Abstraction Arcana. The seed phrase era ends here. Smart accounts, session keys, and Paymasters open Web3 to everyone. The EOA Tyrant fights this change with everything.",
  13: "The Rollup Realm. A thousand transactions per second, compressed onto Ethereum's shoulders. The Gas Warden charges for every byte. Blobs will set us free.",
  14: "The Governance Hall. Every protocol's fate is decided here. The Autocrat holds the treasury. One vote, one truth — if we can gather enough of both.",
  15: "The NFT Nexus, deep tier. The Counterfeiter floods the market with stolen metadata. Only those who understand ERC-721 from bytecode to IPFS can see through the fog.",
  16: "The Summit. This is the final world, brave developer. The Unchained is not a villain — it is the blockchain itself in its most complex form. Show it everything you have learned.",
};

export const KARABO_HINTS: Record<string, string[]> = {
  // World 1 concepts
  'What is a blockchain':              ['Think about what "chain" means...', 'It\'s distributed — no one company controls it.'],
  'Decentralization':                  ['Who controls the network?', 'The answer is: no one — and everyone.'],
  'Cryptographic hashing':             ['What is a fingerprint of data?', 'A tiny change in input completely changes the output.'],
  'Immutability':                      ['What happens to a chain if one link changes?', 'Every subsequent block\'s hash would break.'],
  'Consensus mechanism':               ['How do thousands of strangers agree?', 'PoW uses computation; PoS uses staked value.'],
  // World 2 concepts
  'Private vs public keys':            ['One is kept secret; one is shared freely.', 'Your address is derived from your public key.'],
  'Wallet types':                       ['Hot means connected; cold means offline.', 'Hardware wallets keep keys off the internet.'],
  'Seed phrase':                        ['12 words that unlock everything...', 'It is a human-readable private key backup.'],
  // World 3 concepts
  'Smart contract':                     ['Code that runs autonomously...', 'Once deployed, no one can stop a smart contract from executing.'],
  'EVM':                                ['Every node runs the same code...', 'It\'s a virtual machine that runs Solidity bytecode.'],
  'Reentrancy':                         ['What if a function calls back into itself?', 'Update state BEFORE calling external contracts.'],
  // World 4 concepts
  'AMM':                                ['No order book — just a formula...', 'x × y = k: the constant product formula.'],
  'Impermanent loss':                   ['What happens when the ratio of tokens changes?', 'You would have had more value just holding the tokens.'],
  'Flash loan':                         ['Borrow and repay in one transaction...', 'No collateral needed if everything settles in one block.'],
  // World 5 concepts
  'ERC-721':                            ['Each token is unique...', 'tokenId makes them non-fungible.'],
  'tokenURI':                           ['Where does the image live?', 'It returns a URL pointing to the metadata JSON.'],
  'NFT metadata':                       ['On-chain vs off-chain...', 'On-chain is permanent; off-chain requires pinning.'],
  // World 6 concepts
  'DAO governance':                     ['How do token holders decide together?', 'Propose → Vote → Timelock → Execute.'],
  'Timelock':                           ['Why wait before executing?', 'To give the community time to react to malicious proposals.'],
  // World 7 concepts
  'Blockchain trilemma':                ['Three properties — only two at once...', 'Security, Scalability, Decentralisation — pick two.'],
  'ZK proof':                           ['Prove you know something without revealing it...', 'ZK-SNARKs let a prover convince a verifier without sharing the secret.'],
  // World 8 concepts
  'What is a DApp':                     ['The backend runs where?', 'On a smart contract — no centralised server for core logic.'],
  'ethers.js basics':                   ['What connects browser to blockchain?', 'ethers.js provides Provider and Signer objects.'],
  'Provider vs Signer':                 ['One reads; one writes...', 'Provider is read-only; Signer holds a private key to sign transactions.'],
  // World 9 concepts
  'Factory pattern':                    ['Who creates the pools?', 'The Factory deploys a new Pair contract for each token pair.'],
  'createPair':                         ['What happens when you call createPair?', 'A new Pair contract is deployed and registered.'],
  'CREATE2 opcode':                     ['Can you predict a contract\'s address before deploying?', 'CREATE2 makes deployment addresses deterministic based on factory + salt + init code.'],
  // World 10 concepts
  'Router purpose':                     ['Who calls the pairs?', 'The Router is the user-facing contract that handles routing and safety checks.'],
  'amountOutMin slippage':              ['What if the price moves against you?', 'amountOutMin causes the swap to revert if output is too low.'],
  'Multi-hop routing':                  ['What if there\'s no direct pool?', 'Route through WETH: Token A → WETH → Token B.'],
  // World 11 concepts
  'Why proxy':                          ['How do you change code at the same address?', 'The proxy delegates all calls to an upgradeable implementation.'],
  'delegatecall':                       ['Whose storage is used?', 'delegatecall runs the implementation\'s code in the proxy\'s context.'],
  'Storage slots':                      ['What is an EIP-1967 slot?', 'A pseudo-random high storage slot that prevents collision with implementation variables.'],
  // World 12 concepts
  'EOA vs Smart Account':              ['What if you lose your private key?', 'A Smart Account can have guardian recovery; an EOA cannot.'],
  'UserOperation':                      ['It\'s not a transaction...', 'A UserOp is a pseudo-transaction processed by the EntryPoint.'],
  'Paymaster':                          ['Who pays the gas?', 'A Paymaster contract can sponsor fees on behalf of users.'],
  // World 13 concepts
  'Why rollups':                        ['15 TPS is not enough...', 'Rollups execute off-chain and post compressed data to L1.'],
  'Optimistic rollup':                  ['Innocent until proven guilty...', '7-day fraud window for challengers.'],
  'ZK rollup':                          ['Mathematical proof of correctness...', 'Validity proofs enable instant finality — no challenge period.'],
  // World 14 concepts
  'On-chain governance':               ['How does code govern itself?', 'Propose → Vote → Timelock → Execute automatically.'],
  'Flash loan governance':             ['Borrow tokens to vote, then repay...', 'Use historical balance snapshots to prevent flash loan attacks.'],
  // World 15 concepts
  'ERC-721 standard':                  ['What makes each token unique?', 'A unique uint256 tokenId with its own ownerOf mapping.'],
  'Minting mechanics':                  ['What must happen when a token is created?', 'Set owner, increment balance, emit Transfer from address(0).'],
  'On-chain vs off-chain metadata':    ['Which lasts longer?', 'On-chain SVG is permanent; off-chain IPFS requires pinning.'],
  // World 16 concepts
  'Full stack overview':               ['Layer by layer...', 'User → Wallet → Frontend → Contracts → Chain.'],
  'Smart contract audit':              ['How do experts find bugs?', 'Manual review + automated tools + severity-rated report.'],
  'Reentrancy defence':                ['Checks first, then effects, then interactions...', 'Update state BEFORE making external calls.'],
};

export const KARABO_WIN: string[] = [
  "Block confirmed. That's consensus! ✓",
  "Knowledge is power — and you have both.",
  "The chain holds. Well done, developer.",
  "Another world falls to the truth.",
  "Your transaction just cleared with zero reverts.",
  "The network validates your understanding.",
];

export const KARABO_LOSE: string[] = [
  "Wrong answer reverses nothing — the chain holds your lesson.",
  "Even failed transactions teach something. Try again.",
  "A wrong answer is just an unconfirmed block. Resubmit.",
  "The truth was there. We will find it together.",
  "This is not a setback — it is a pending transaction.",
];

export const KARABO_STREAK: string[] = [
  "Streak building... the multiplier grows.",
  "Three in a row. The Validator nods in approval.",
  "You are on fire — the mempool clears for you.",
];

export const KARABO_HINT_USED: string = "The Archivist's scrolls reveal one false path. Choose wisely.";

export const KARABO_BOSS_NEAR: string = "The boss stirs. Everything you have learned leads to this moment.";

export const KARABO_WORLD_COMPLETE: string = "The portal opens. I will fly ahead and wait for you in the next world.";
