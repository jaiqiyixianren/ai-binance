// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title 币安宝可梦 (Binance Pokemon) — BSC BEP-20
contract BinancePokemon is ERC20, Ownable {
    address public minter;
    /// @dev 四轮 cap 全满最多 80_000 次 mint × 90_000 × 最高 5 倍 = 360 亿用户侧；
    ///      加池 4×2500 万 = 1 亿；再留约 10% 冗余 → 400 亿枚上限（与 BinancePokemonMint 轮次单价一致）。
    ///      若第一轮改为 0.002 BNB/次，全满最坏约 158.5 亿，仍低于本上限。
    uint256 public constant MAX_SUPPLY = 40_000_000_000 ether;

    error NotMinter();
    error ExceedsMaxSupply();

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    constructor(address owner_) ERC20("Binance Pokemon", "BPKM") Ownable(owner_) {}

    function setMinter(address minter_) external onlyOwner {
        minter = minter_;
    }

    function mint(address to, uint256 amount) external onlyMinter {
        if (totalSupply() + amount > MAX_SUPPLY) revert ExceedsMaxSupply();
        _mint(to, amount);
    }
}
