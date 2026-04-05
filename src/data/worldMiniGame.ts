export interface WorldGameConfig {
  sceneKey: string;
  route: string;
  label: string;
  emoji: string;
  description: string;
}

export const WORLD_MINI_GAME: Record<number, WorldGameConfig> = {
  1:  { sceneKey: 'JumperScene',       route: '/game/jumper',   label: 'Platform Climb',    emoji: '🪂', description: 'Climb the blockchain. Answer every 3rd platform.' },
  2:  { sceneKey: 'HashPuzzleScene',   route: '/game/hash',     label: 'Hash Puzzle',       emoji: '🔐', description: 'Mine the correct hash. Questions after each solve.' },
  3:  { sceneKey: 'NodeDefenderScene', route: '/game/defender', label: 'Node Defender',     emoji: '🛡', description: 'Defend the contracts from waves. Answer between waves.' },
  4:  { sceneKey: 'BlockRacerScene',   route: '/game/racer',    label: 'Block Racer',       emoji: '🏎', description: 'Race the liquidity. Questions every 5 valid blocks.' },
  5:  { sceneKey: 'JumperScene',       route: '/game/jumper',   label: 'NFT Tower',         emoji: '🪂', description: 'Jump through the NFT Nexus.' },
  6:  { sceneKey: 'DuelScene',         route: '/game/duel',     label: 'Governance Duel',   emoji: '⚔',  description: '1v1 AI battle — governance questions decide the vote.' },
  7:  { sceneKey: 'NodeDefenderScene', route: '/game/defender', label: 'Trilemma Defense',  emoji: '🛡', description: 'Defend the Web3 frontier from waves.' },
  8:  { sceneKey: 'BlockRacerScene',   route: '/game/racer',    label: 'DApp Racer',        emoji: '🏎', description: 'Race to deploy your DApp.' },
  9:  { sceneKey: 'HashPuzzleScene',   route: '/game/hash',     label: 'Factory Puzzle',    emoji: '🔐', description: 'Solve the factory pair creation puzzle.' },
  10: { sceneKey: 'BlockRacerScene',   route: '/game/racer',    label: 'Router Racer',      emoji: '🏎', description: 'Route the swap through the ridges.' },
  11: { sceneKey: 'HashPuzzleScene',   route: '/game/hash',     label: 'Proxy Puzzle',      emoji: '🔐', description: 'Crack the proxy storage slot pattern.' },
  12: { sceneKey: 'DuelScene',         route: '/game/duel',     label: 'Abstraction Duel',  emoji: '⚔',  description: 'Duel the EOA Tyrant with smart account knowledge.' },
  13: { sceneKey: 'BlockRacerScene',   route: '/game/racer',    label: 'Rollup Racer',      emoji: '🏎', description: 'Race a thousand TPS down the rollup.' },
  14: { sceneKey: 'DuelScene',         route: '/game/duel',     label: 'Governance Battle', emoji: '⚔',  description: 'Out-vote the Autocrat in the Governance Hall.' },
  15: { sceneKey: 'JumperScene',       route: '/game/jumper',   label: 'NFT Nexus Climber', emoji: '🪂', description: 'Climb deep into ERC-721 territory.' },
  16: { sceneKey: 'NodeDefenderScene', route: '/game/defender', label: 'Summit Defense',    emoji: '🛡', description: 'Defend the Summit from the Unchained.' },
};
