// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BinancePokemon} from "../src/BinancePokemon.sol";
import {BinancePokemonMint} from "../src/BinancePokemonMint.sol";

contract MockRegistry {
    mapping(address => string) public handles;
    mapping(uint256 => address) public owners;

    function setHandle(address w, string calldata h) external {
        handles[w] = h;
        owners[uint256(keccak256(bytes(h)))] = w;
    }

    function handleOf(address owner) external view returns (string memory) {
        return handles[owner];
    }

    function ownerOf(uint256 id) external view returns (address) {
        return owners[id];
    }

    function ownerOfHandle(string calldata) external pure returns (address) {
        return address(0);
    }
}

contract MockRouter {
    function WETH() external pure returns (address) {
        return address(0);
    }

    function addLiquidityETH(
        address,
        uint256,
        uint256,
        uint256,
        address,
        uint256
    ) external payable returns (uint256, uint256, uint256) {
        return (1, 1, 1);
    }
}

contract BinancePokemonMintTest is Test {
    function testMintInRound1() public {
        BinancePokemon token = new BinancePokemon(address(this));
        MockRegistry reg = new MockRegistry();
        BinancePokemonMint mint = new BinancePokemonMint(
            address(this),
            address(token),
            address(reg),
            address(new MockRouter()),
            address(0xdead)
        );
        token.setMinter(address(mint));

        vm.warp(mint.ROUND1_START_TIMESTAMP());

        address user = address(0xBEEF);
        reg.setHandle(user, "alice");
        vm.deal(user, 1 ether);

        vm.prank(user);
        mint.mint{value: 0.0002 ether}();

        assertGe(token.balanceOf(user), 90_000 ether);
        assertEq(mint.raisedBnb(0), 0.0002 ether);
    }

    function testFinalizeSplits90_10() public {
        BinancePokemon token = new BinancePokemon(address(this));
        MockRegistry reg = new MockRegistry();
        BinancePokemonMint mint = new BinancePokemonMint(
            address(this),
            address(token),
            address(reg),
            address(new MockRouter()),
            address(0xdead)
        );
        token.setMinter(address(mint));
        vm.warp(mint.ROUND1_START_TIMESTAMP());

        address user = address(0xBEEF);
        reg.setHandle(user, "alice");
        vm.deal(user, 1 ether);
        vm.prank(user);
        mint.mint{value: 0.0002 ether}();

        vm.warp(mint.roundEnd(0));
        mint.finalizeRound(0);

        assertEq(mint.ownerWithdrawableBnb(), (0.0002 ether * 1000) / 10_000);
        assertTrue(mint.roundFinalized(0));
    }
}
