// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimpleDEX {
    IERC20 public tokenA;
    IERC20 public tokenB;
    address public owner;
    uint256 public rate; // How many TokenB per TokenA (e.g., 1 TokenA = 2 TokenB)

    constructor(address _tokenA, address _tokenB, uint256 _rate) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
        owner = msg.sender;
        rate = _rate;
    }

    // Swap TokenA for TokenB
    function swapAtoB(uint256 amountA) external {
        uint256 amountB = amountA * rate;
        require(tokenA.transferFrom(msg.sender, address(this), amountA), "Transfer of TokenA failed");
        require(tokenB.transfer(msg.sender, amountB), "Transfer of TokenB failed");
    }

    // Swap TokenB for TokenA
    function swapBtoA(uint256 amountB) external {
        uint256 amountA = amountB / rate;
        require(tokenB.transferFrom(msg.sender, address(this), amountB), "Transfer of TokenB failed");
        require(tokenA.transfer(msg.sender, amountA), "Transfer of TokenA failed");
    }

    // Owner can deposit tokens into the DEX
    function depositTokens(address token, uint256 amount) external {
        require(msg.sender == owner, "Only owner can deposit");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }

    // Owner can withdraw tokens (for testing)
    function withdrawTokens(address token, uint256 amount) external {
        require(msg.sender == owner, "Only owner can withdraw");
        IERC20(token).transfer(msg.sender, amount);
    }
}