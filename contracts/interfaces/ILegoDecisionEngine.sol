pragma experimental ABIEncoderV2;

import "../interfaces/ICompoundDecisionEngine.sol";
import "../interfaces/IGnosisSafe.sol";
import "../interfaces/IMiniMetoken.sol";
import "../interfaces/IERC20Snapshot.sol";

interface ILegoDecisionEngine is ICompoundDecisionEngine {
  /// @notice The address of the Gnosis Safe

  function safe() external returns (IGnosisSafe);

  /// @notice The address of the governance token
  function token() external returns (address);

  function tokenType() external returns (TokenType);

  enum TokenType {Minime, ERC20Snapshot}
}
