// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice SPACE ID Agent ID registry on BSC mainnet (0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F).
interface IAgentRegistry {
    function handleOf(address owner) external view returns (string memory);

    function ownerOfHandle(string calldata handle) external view returns (address);

    function ownerOf(uint256 tokenId) external view returns (address);
}
