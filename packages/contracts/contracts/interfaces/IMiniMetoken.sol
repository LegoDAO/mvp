// https://github.com/Giveth/minime/blob/master/contracts/MiniMeToken.sol
interface IMiniMetoken {
  function balanceOfAt(address account, uint256 blockNumber)
    external
    view
    returns (uint96);

  function totalSupplyAt(uint256 blockNumber) external view returns (uint256);
}
