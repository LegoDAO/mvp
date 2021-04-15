pragma experimental ABIEncoderV2;

import "../interfaces/IGnosisSafe.sol";
import "../interfaces/IMiniMetoken.sol";
import "../interfaces/IERC20Snapshot.sol";

// import "@gnosis.pm/safe-contracts/contracts/libraries/MultiSend.sol";

/*** This interface is based on the GovernorBravo interface


 */
interface IGovernorBravoDecisionEngine {
  enum TokenType {Minime, ERC20Snapshot}

  /// @notice An event emitted when a new proposal is created
  event ProposalCreated(
    uint256 id,
    address proposer,
    address[] targets,
    uint256[] values,
    string[] signatures,
    bytes[] calldatas,
    uint256 startBlock,
    uint256 endBlock,
    string description,
    uint256 snapshotId
  );

  /// @notice An event emitted when a vote has been cast on a proposal
  /// @param voter The address which casted a vote
  /// @param proposalId The proposal id which was voted on
  /// @param support Support value for the vote. 0=against, 1=for, 2=abstain
  /// @param votes Number of votes which were cast by the voter
  /// @param reason The reason given for the vote by the voter
  event VoteCast(
    address indexed voter,
    uint256 proposalId,
    uint8 support,
    uint256 votes,
    string reason
  );

  /// @notice An event emitted when a proposal has been canceled
  event ProposalCanceled(uint256 id);

  /// @notice An event emitted when a proposal has been queued in the Timelock
  event ProposalQueued(uint256 id, uint256 eta);

  /// @notice An event emitted when a proposal has been executed in the Timelock
  event ProposalExecuted(uint256 id);

  /// @notice An event emitted when the voting delay is set
  event VotingDelaySet(uint256 oldVotingDelay, uint256 newVotingDelay);

  /// @notice An event emitted when the voting period is set
  event VotingPeriodSet(uint256 oldVotingPeriod, uint256 newVotingPeriod);

  /// @notice An event emitted when the voting period is set
  event QuorumVotesSet(uint256 oldQuorumVotes, uint256 newQuorumVotes);

  /// @notice Emitted when implementation is changed
  event NewImplementation(address oldImplementation, address newImplementation);

  /// @notice Emitted when proposal threshold is set
  event ProposalThresholdSet(
    uint256 oldProposalThreshold,
    uint256 newProposalThreshold
  );

  /// @notice Emitted when pendingAdmin is changed
  event NewPendingAdmin(address oldPendingAdmin, address newPendingAdmin);

  /// @notice Emitted when pendingAdmin is accepted, which means admin is updated
  event NewAdmin(address oldAdmin, address newAdmin);
  struct Proposal {
    // @notice Unique id for looking up a proposal
    uint256 id;
    // @notice Creator of the proposal
    address proposer;
    // @notice The timestamp that the proposal will be available for execution, set once the vote succeeds
    uint256 eta;
    // @notice the ordered list of target addresses for calls to be made
    address[] targets;
    // @notice The ordered list of values (i.e. msg.value) to be passed to the calls to be made
    uint256[] values;
    // @notice The ordered list of function signatures to be called
    string[] signatures;
    // @notice The ordered list of calldata to be passed to each call
    bytes[] calldatas;
    // @notice The block at which voting begins: holders must delegate their votes prior to this block
    uint256 startBlock;
    // @notice The block at which voting ends: votes must be cast prior to this block
    uint256 endBlock;
    // @notice Current number of votes in favor of this proposal
    uint256 forVotes;
    // @notice Current number of votes in oppositioggn to this proposal
    uint256 againstVotes;
    // @notice Current number of votes for abstaining for this proposal
    uint256 abstainVotes;
    // @notice Flag marking whether the proposal has been canceled
    bool canceled;
    // @notice Flag marking whether the proposal has been executed
    bool executed;
    // @notice Receipts of ballots for the entire set of voters
    mapping(address => Receipt) receipts;
    uint256 snapshotId;
  }

  /// @notice Ballot receipt record for a voter
  struct Receipt {
    // @notice Whether or not a vote has been cast
    bool hasVoted;
    // @notice Whether or not the voter supports the proposal or abstains
    uint8 support;
    // @notice The number of votes the voter had, which were cast
    uint96 votes;
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

  function propose(
    address[] memory targets,
    uint256[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    string memory description
  ) external returns (uint256);

  function castVote(uint256 proposalId, uint8 support) external;

  function castVoteWithReason(
    uint256 proposalId,
    uint8 support,
    string calldata reason
  ) external;

  function castVoteBySig(
    uint256 proposalId,
    uint8 support,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external;

  function queue(uint256 proposalId) external;

  function execute(uint256 proposalId) external;

  function getActions(uint256 proposalId)
    external
    returns (
      address[] memory targets,
      uint256[] memory values,
      bytes[] memory calldatas
    );

  function getReceipt(uint256 proposalId, address voter)
    external
    returns (Receipt memory);
}
