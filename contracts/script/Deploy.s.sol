// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {BinancePokemon} from "../src/BinancePokemon.sol";
import {BinancePokemonMint} from "../src/BinancePokemonMint.sol";

contract DeployScript is Script {
    address constant AGENT_REGISTRY = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F;
    address constant PANCAKE_ROUTER = 0x10ED43C718714eb63d5aA57B78B54704E256024E;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        BinancePokemon token = new BinancePokemon(deployer);
        BinancePokemonMint mint = new BinancePokemonMint(
            deployer,
            address(token),
            AGENT_REGISTRY,
            PANCAKE_ROUTER,
            address(0x000000000000000000000000000000000000dEaD)
        );
        token.setMinter(address(mint));

        vm.stopBroadcast();

        console2.log("BPKM token", address(token));
        console2.log("Mint", address(mint));
    }
}
