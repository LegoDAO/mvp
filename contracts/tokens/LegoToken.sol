pragma solidity ^0.7.3;
import "@openzeppelin/contracts/token/ERC20/ERC20Snapshot.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
  Lego DAO Token contract

  Parameters:
  - 10M fixed supply at launch
  - 2M to founding team -> sent to msg.sender
  - 8M to be distributed to community - to be minted

  NOTE: This Token inherits from ERC20Snapshot - so it is not useable in this MVP yet

  Q: Should we have a hard cap?

 */

contract LegoToken is ERC20Capped, ERC20Snapshot, Ownable {
  uint256 CAP = 10 * 10**6 * 10**18; // token is hard capped at 10M
  uint256 PREMINE = 2 * 10**6 * 10**18; // 2M tokens are premined and sent to creator

  constructor() ERC20("LegoDAO", "LGO") ERC20Capped(CAP) Ownable() {
    _mint(msg.sender, PREMINE);
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual override(ERC20Capped, ERC20Snapshot) {
    ERC20Capped._beforeTokenTransfer(from, to, amount);
    ERC20Snapshot._beforeTokenTransfer(from, to, amount);
  }

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

  function snapshot() public returns (uint256) {
    return _snapshot();
  }
}
