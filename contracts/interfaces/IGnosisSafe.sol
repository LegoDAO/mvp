interface IGnosisSafe {
  enum Operation {Call, DelegateCall}

  function approveHash(bytes32 hashToApprove) external;

  /**
   */
  function execTransaction(
    address to,
    uint256 value,
    bytes calldata data,
    Operation operation,
    uint256 safeTxGas,
    uint256 baseGas,
    uint256 gasPrice,
    address gasToken,
    address payable refundReceiver,
    bytes calldata signatures
  ) external payable returns (bool success);
}
