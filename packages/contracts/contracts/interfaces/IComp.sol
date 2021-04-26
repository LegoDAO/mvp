import "hardhat/console.sol";

interface IComp {
  function getPriorVotes(address account, uint256 blockNumber)
    external
    view
    returns (uint96);

  function totalSupply() external pure returns (uint256);
}
