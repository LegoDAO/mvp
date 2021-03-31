interface IERC20Snapshot {
  function balanceOfAt(address account, uint256 blockNumber)
    external
    view
    returns (uint96);

  function totalSupplyAt(uint256 blockNumber) external view returns (uint256);

  function snapshot() external returns (uint256);
}
