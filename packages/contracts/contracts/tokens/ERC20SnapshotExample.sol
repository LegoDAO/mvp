pragma solidity ^0.7.3;
import "@openzeppelin/contracts/token/ERC20/ERC20Snapshot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
  This is an example contract for ERC20Snapshot that is used for testing (and as an example :))

  NOTE: This Token inherits from ERC20Snapshot - so it is not useable in this MVP yet

  Q: Should we have a hard cap?

 */

contract ERC20SnapshotExample is ERC20Snapshot, Ownable {
  constructor() ERC20("ERC20Snapshot", "SNS") Ownable() {}

  /**
   * @dev Creates `amount` new tokens for `to`.
   *
   * See {ERC20-_mint}.
   *
   * Requirements:
   *
   * - the caller must be the owner
   */
  function mint(address to, uint256 amount) public onlyOwner {
    _mint(to, amount);
  }

  /**
   * snapshot() method calleable by all
   */
  function snapshot() public returns (uint256) {
    return _snapshot();
  }
}
