pragma solidity ^0.7.3;

import "hardhat/console.sol";
import "../interfaces/IMiniMetoken.sol";
import "../interfaces/IComp.sol";

contract CompAdapter is IMiniMetoken {
  IComp public adapted;

  constructor(IComp _adapted) {
    adapted = _adapted;
  }

  function balanceOfAt(address account, uint256 blockNumber)
    external
    view
    override
    returns (uint96)
  {
    return adapted.getPriorVotes(account, blockNumber);
  }

  function totalSupplyAt(uint256 blockNumber)
    external
    view
    override
    returns (uint256)
  {
    // Comp.sol has a fixed supply, so no need (or even possibility) to read a snapshot value
    return adapted.totalSupply();
  }
}
