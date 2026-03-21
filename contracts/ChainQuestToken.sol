// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChainQuestToken (CQT)
 * @notice Reward token for CHAIN QUEST game — earned by defeating bosses on Sepolia testnet
 * @dev ERC-20 with minter role. Server hot wallet holds minter role and mints on boss defeat.
 */
contract ChainQuestToken is ERC20, Ownable {

    address public minter;

    uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18; // 10 million CQT

    event MinterUpdated(address indexed oldMinter, address indexed newMinter);
    event TokensEarned(address indexed player, uint256 amount, uint256 worldId);

    modifier onlyMinter() {
        require(msg.sender == minter || msg.sender == owner(), "ChainQuestToken: Not authorized to mint");
        _;
    }

    constructor(address _minter) ERC20("ChainQuestToken", "CQT") Ownable(msg.sender) {
        minter = _minter;
    }

    /**
     * @notice Mint CQT rewards to a player's wallet (called by server after boss defeat)
     * @param to Player wallet address
     * @param amount Amount of CQT in wei (18 decimals)
     */
    function mint(address to, uint256 amount) external onlyMinter {
        require(totalSupply() + amount <= MAX_SUPPLY, "ChainQuestToken: Max supply exceeded");
        _mint(to, amount);
    }

    /**
     * @notice Mint with world tracking for event indexing
     */
    function mintForWorld(address to, uint256 amount, uint256 worldId) external onlyMinter {
        require(totalSupply() + amount <= MAX_SUPPLY, "ChainQuestToken: Max supply exceeded");
        _mint(to, amount);
        emit TokensEarned(to, amount, worldId);
    }

    /**
     * @notice Update the minter address
     */
    function setMinter(address _minter) external onlyOwner {
        emit MinterUpdated(minter, _minter);
        minter = _minter;
    }

    /**
     * @notice Burn tokens (for spending in-game shop via transfer to dead address or burn)
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @notice Get token info
     */
    function tokenInfo() external view returns (
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        uint256 maxSupply_,
        address minter_
    ) {
        return (name(), symbol(), totalSupply(), MAX_SUPPLY, minter);
    }
}
