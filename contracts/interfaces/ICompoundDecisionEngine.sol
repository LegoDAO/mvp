pragma experimental ABIEncoderV2;

import "../interfaces/IGnosisSafe.sol";
import "../interfaces/IERC20Snapshot.sol";

interface ICompoundDecisionEngine {
  function propose(
    address[] memory targets,
    uint256[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    string memory description
  ) external returns (uint256);

  function castVote(uint256 proposalId, bool support) external;

  function queue(uint256 proposalId) external;

  function execute(uint256 proposalId) external;

  /**
   * @dev The percentage of votes in support of a proposal required in order for a quorum to be reached and for a vote to succeed
   */
  function quorumVotes() external returns (uint256);

  function proposalThreshold() external returns (uint256);

  function proposalMaxOperations() external returns (uint256);

  function votingDelay() external returns (uint256);

  function votingPeriod() external returns (uint256);

  function proposalCount() external returns (uint256);

  // We change the Proposal struct so we can vote on Gnosis Safe transactions
  struct Proposal {
    // Unique id for looking up a proposal
    uint256 id;
    // Creator of the proposal
    address proposer;
    // The timestamp that the proposal will be available for execution, set once the vote succeeds
    uint256 eta;
    // the ordered list of target addresses for calls to be made
    address[] targets;
    // The ordered list of values (i.e. msg.value) to be passed to the calls to be made
    uint256[] values;
    // The ordered list of function signatures to be called
    string[] signatures;
    // notice The ordered list of calldata to be passed to each call
    bytes[] calldatas;
    // The block at which voting begins: holders must delegate their votes prior to this block
    uint256 startBlock;
    // The block at which voting ends: votes must be cast prior to this block
    uint256 endBlock;
    // number of votes in favor of this proposal
    uint256 forVotes;
    // Current number of votes in opposition to this proposal
    uint256 againstVotes;
    // Flag marking whether the proposal has been canceled
    bool canceled;
    // Flag marking whether the proposal has been executed
    bool executed;
    // id of the snapshot
    uint256 snapshotId;
  }

  /// @notice Ballot receipt record for a voter
  struct Receipt {
    // @notice Whether or not a vote has been cast
    bool hasVoted;
    // Whether or not the voter supports the proposal
    bool support;
    // The number of votes the voter had, which were cast
    uint256 votes;
  }

  /// @notice Possible states that a proposal may be in
  enum ProposalState {
    Pending,
    Active,
    Canceled,
    Defeated,
    Succeeded,
    Queued,
    Expired,
    Executed
  }
}
