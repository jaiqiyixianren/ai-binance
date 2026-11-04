// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {BinancePokemon} from "./BinancePokemon.sol";
import {IAgentRegistry} from "./interfaces/IAgentRegistry.sol";

interface IPancakeRouter02 {
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);

    function WETH() external pure returns (address);
}

/// @title 测试用 Mint：四轮各 10 分钟；部署时刻起第 1 轮开窗；第 1 轮 0.0002 BNB。
/// @dev 勿用于正式创世；主网仅作联调。
contract BinancePokemonMintTest is Ownable, ReentrancyGuard {
    enum CardSpecies {
        Magikarp,
        Squirtle,
        Bulbasaur,
        Caterpie,
        Pikachu,
        Meowth,
        Sandshrew,
        Buzzwole,
        Ekans,
        Mewtwo
    }

    uint256 public constant NUM_ROUNDS = 4;
    uint256 public constant ROUND_DURATION = 10 minutes;
    uint256 public constant LP_BNB_BPS = 9000;
    uint256 public constant BPS_DENOM = 10_000;

    uint256 public immutable round1StartTimestamp;
    uint256 public constant TOKENS_PER_MINT = 90_000 ether;
    uint256 public constant BPKM_PER_BNB_FOR_LP = 20_000_000 ether;

    uint16 public constant ROLL_DENOM = 10_000;
    uint16 public constant TIER4_BPS = 560;
    uint16 public constant TIER3_BPS = 1680;
    uint16 public constant TIER2_BPS = 2880;

    uint8 public constant MULTIPLIER_TIER1 = 1;
    uint8 public constant MULTIPLIER_TIER2 = 2;
    uint8 public constant MULTIPLIER_TIER3 = 3;
    uint8 public constant MULTIPLIER_TIER4 = 5;

    BinancePokemon public immutable token;
    IAgentRegistry public immutable agentRegistry;
    IPancakeRouter02 public immutable router;
    address public immutable lpRecipient;

    struct RoundConfig {
        uint256 capWei;
        uint256 priceWei;
        uint256 maxMintPerWallet;
    }

    RoundConfig[4] public rounds;

    uint256[4] public raisedBnb;
    bool[4] public roundFinalized;
    mapping(uint256 round => mapping(address => uint256)) public mintedByWallet;
    mapping(uint256 round => mapping(uint256 => uint256)) public mintedByAgent;

    mapping(uint256 => CardSpecies) public cardSpeciesByAgent;
    mapping(uint256 => uint8) public multiplierByAgent;

    uint256 public ownerWithdrawableBnb;
    uint256 public totalMintCount;

    event Minted(
        address indexed minter,
        uint256 indexed round,
        uint256 indexed agentId,
        string handle,
        CardSpecies species,
        uint8 multiplier,
        uint256 amountBPKM,
        uint256 bnbPaid,
        uint256 raisedInRoundAfter
    );
    event RoundFinalized(uint256 indexed round, uint256 bnbLp, uint256 bnbOwner, uint256 bpkmLp);
    event OwnerBnbWithdrawn(address indexed to, uint256 amount);

    error ZeroAddress();
    error RoundNotStarted();
    error RoundEnded();
    error RoundAlreadyFinalized();
    error RoundCapReached();
    error WalletQuota();
    error WrongValue();
    error NoAgent();
    error InvalidRound();
    error FinalizeTooEarly();
    error InsufficientOwnerBalance();

    constructor(
        address owner_,
        address token_,
        address agentRegistry_,
        address router_,
        address lpRecipient_
    ) Ownable(owner_) {
        if (token_ == address(0) || agentRegistry_ == address(0) || router_ == address(0)) {
            revert ZeroAddress();
        }
        token = BinancePokemon(token_);
        agentRegistry = IAgentRegistry(agentRegistry_);
        router = IPancakeRouter02(router_);
        lpRecipient = lpRecipient_ == address(0) ? address(0x000000000000000000000000000000000000dEaD) : lpRecipient_;

        round1StartTimestamp = block.timestamp;

        // 测试：四轮均为 0.0002 BNB/次（cap 仍区分各轮上限）
        rounds[0] = RoundConfig({capWei: 10 ether, priceWei: 0.0002 ether, maxMintPerWallet: 10});
        rounds[1] = RoundConfig({capWei: 40 ether, priceWei: 0.0002 ether, maxMintPerWallet: 10});
        rounds[2] = RoundConfig({capWei: 60 ether, priceWei: 0.0002 ether, maxMintPerWallet: 10});
        rounds[3] = RoundConfig({capWei: 90 ether, priceWei: 0.0002 ether, maxMintPerWallet: 10});
    }

    function roundStart(uint256 r) public view returns (uint256) {
        if (r >= NUM_ROUNDS) revert InvalidRound();
        return round1StartTimestamp + r * ROUND_DURATION;
    }

    function roundEnd(uint256 r) public view returns (uint256) {
        return roundStart(r) + ROUND_DURATION;
    }

    function mintingRound() public view returns (uint256 r, bool inWindow) {
        for (uint256 i = 0; i < NUM_ROUNDS; ) {
            if (!roundFinalized[i] && block.timestamp >= roundStart(i) && block.timestamp < roundEnd(i)) {
                return (i, true);
            }
            unchecked {
                ++i;
            }
        }
        return (0, false);
    }

    function activeRound() public view returns (uint256 r, bool ok) {
        bool inWindow;
        (r, inWindow) = mintingRound();
        if (!inWindow) return (0, false);
        RoundConfig memory cfg = rounds[r];
        ok = raisedBnb[r] + cfg.priceWei <= cfg.capWei;
    }

    function agentOf(address wallet) public view returns (uint256 agentId, bool ok) {
        string memory handle = agentRegistry.handleOf(wallet);
        if (bytes(handle).length == 0) {
            return (0, false);
        }
        agentId = uint256(keccak256(bytes(handle)));
        ok = agentRegistry.ownerOf(agentId) == wallet;
    }

    function cardTierByAgent(uint256 agentId) external view returns (CardSpecies) {
        return cardSpeciesByAgent[agentId];
    }

    function allowanceOf(address wallet) external view returns (uint256) {
        (uint256 r, bool ok) = activeRound();
        if (!ok) return 0;
        (uint256 agentId, bool agentOk) = agentOf(wallet);
        if (!agentOk) return 0;

        RoundConfig memory cfg = rounds[r];
        uint256 walletLeft = cfg.maxMintPerWallet > mintedByWallet[r][wallet] ?
            cfg.maxMintPerWallet - mintedByWallet[r][wallet]
        : 0;
        uint256 capLeft = cfg.capWei > raisedBnb[r] ? (cfg.capWei - raisedBnb[r]) / cfg.priceWei : 0;
        uint256 agentLeft = cfg.maxMintPerWallet > mintedByAgent[r][agentId] ?
            cfg.maxMintPerWallet - mintedByAgent[r][agentId]
        : 0;
        uint256 left = walletLeft < capLeft ? walletLeft : capLeft;
        return agentLeft < left ? agentLeft : left;
    }

    function mint() external payable nonReentrant {
        uint256 r;
        bool inWindow;
        (r, inWindow) = mintingRound();
        if (!inWindow) {
            if (block.timestamp < roundStart(0)) revert RoundNotStarted();
            revert RoundEnded();
        }
        _mintInRound(r);
    }

    function _mintInRound(uint256 r) internal {
        RoundConfig memory cfg = rounds[r];
        if (msg.value != cfg.priceWei) revert WrongValue();
        if (raisedBnb[r] + msg.value > cfg.capWei) revert RoundCapReached();

        string memory handle = agentRegistry.handleOf(msg.sender);
        if (bytes(handle).length == 0) revert NoAgent();
        uint256 agentId = uint256(keccak256(bytes(handle)));
        if (agentRegistry.ownerOf(agentId) != msg.sender) revert NoAgent();
        if (mintedByWallet[r][msg.sender] >= cfg.maxMintPerWallet) revert WalletQuota();
        if (mintedByAgent[r][agentId] >= cfg.maxMintPerWallet) revert WalletQuota();

        raisedBnb[r] += msg.value;
        uint256 raisedAfter = raisedBnb[r];

        (CardSpecies species, uint8 multiplier) = _rollCard();
        uint256 amount = TOKENS_PER_MINT * multiplier;
        token.mint(msg.sender, amount);

        mintedByWallet[r][msg.sender] += 1;
        mintedByAgent[r][agentId] += 1;
        cardSpeciesByAgent[agentId] = species;
        multiplierByAgent[agentId] = multiplier;
        totalMintCount += 1;

        emit Minted(msg.sender, r, agentId, handle, species, multiplier, amount, msg.value, raisedAfter);
    }

    function finalizeRound(uint256 r) external nonReentrant {
        if (r >= NUM_ROUNDS) revert InvalidRound();
        if (roundFinalized[r]) revert RoundAlreadyFinalized();
        if (block.timestamp < roundEnd(r)) revert FinalizeTooEarly();

        roundFinalized[r] = true;

        uint256 total = raisedBnb[r];
        if (total == 0) {
            emit RoundFinalized(r, 0, 0, 0);
            return;
        }

        uint256 lpBnb = (total * LP_BNB_BPS) / BPS_DENOM;
        uint256 ownerPart = total - lpBnb;
        ownerWithdrawableBnb += ownerPart;

        uint256 bpkmAmt = (lpBnb * BPKM_PER_BNB_FOR_LP) / 1 ether;
        if (lpBnb > 0 && bpkmAmt > 0) {
            token.mint(address(this), bpkmAmt);
            token.approve(address(router), bpkmAmt);
            router.addLiquidityETH{value: lpBnb}(
                address(token),
                bpkmAmt,
                (bpkmAmt * 99) / 100,
                (lpBnb * 99) / 100,
                lpRecipient,
                block.timestamp + 600
            );
        }

        emit RoundFinalized(r, lpBnb, ownerPart, bpkmAmt);
    }

    function withdrawOwnerBnb(address payable to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount > ownerWithdrawableBnb) revert InsufficientOwnerBalance();
        ownerWithdrawableBnb -= amount;
        (bool sent,) = to.call{value: amount}("");
        require(sent, "bnb send failed");
        emit OwnerBnbWithdrawn(to, amount);
    }

    function _rollCard() internal view returns (CardSpecies species, uint8 multiplier) {
        uint256 roll = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao, block.timestamp, msg.sender, totalMintCount, blockhash(block.number - 1)
                )
            )
        ) % ROLL_DENOM;

        if (roll < TIER4_BPS) {
            return (CardSpecies.Mewtwo, MULTIPLIER_TIER4);
        }
        if (roll < TIER4_BPS + TIER3_BPS) {
            uint256 sub = roll - TIER4_BPS;
            uint256 slice = TIER3_BPS / 2;
            if (sub < slice) {
                return (CardSpecies.Buzzwole, MULTIPLIER_TIER3);
            }
            return (CardSpecies.Ekans, MULTIPLIER_TIER3);
        }
        if (roll < TIER4_BPS + TIER3_BPS + TIER2_BPS) {
            uint256 sub = roll - TIER4_BPS - TIER3_BPS;
            uint256 slice = TIER2_BPS / 3;
            if (sub < slice) {
                return (CardSpecies.Pikachu, MULTIPLIER_TIER2);
            }
            if (sub < slice * 2) {
                return (CardSpecies.Meowth, MULTIPLIER_TIER2);
            }
            return (CardSpecies.Sandshrew, MULTIPLIER_TIER2);
        }

        uint256 sub = roll - TIER4_BPS - TIER3_BPS - TIER2_BPS;
        uint256 slice = (ROLL_DENOM - TIER4_BPS - TIER3_BPS - TIER2_BPS) / 4;
        if (sub < slice) {
            return (CardSpecies.Magikarp, MULTIPLIER_TIER1);
        }
        if (sub < slice * 2) {
            return (CardSpecies.Squirtle, MULTIPLIER_TIER1);
        }
        if (sub < slice * 3) {
            return (CardSpecies.Bulbasaur, MULTIPLIER_TIER1);
        }
        return (CardSpecies.Caterpie, MULTIPLIER_TIER1);
    }

    function tokensPerMint() external pure returns (uint256) {
        return TOKENS_PER_MINT;
    }

    function bpkmPerBnbForLp() external pure returns (uint256) {
        return BPKM_PER_BNB_FOR_LP;
    }

    function ROUND1_START_TIMESTAMP() external view returns (uint256) {
        return round1StartTimestamp;
    }

    receive() external payable {
        revert WrongValue();
    }
}
