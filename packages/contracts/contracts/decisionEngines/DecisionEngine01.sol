pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interfaces/IGnosisSafe.sol";
import "../interfaces/IMiniMetoken.sol";
import "../interfaces/IERC20Snapshot.sol";
import "../interfaces/IGovernorBravoDecisionEngine.sol";

/**
This is a stripped-down version of [GovernorBravo contracts](https://github.com/compound-finance/compound-protocol/blob/master/contracts/Governance/)

- basically, we only kept the "propose - vote -execute" flow
- add configuration options to the constructor:
  - `safe` -> the address of a Gnosis safe that holds the assets and will execut the proposals
  - `token` -> the address of a token that determines the Voting Power
  - `tokenType` -> the kind of token (either Minime or ERC20snapshot)
  - `quorumVotes`
  - `proposalThreshold`
  - `votingDelay`
  - `votingPeriod`
- rename `timelock` to `safe`, and `comp` to `token`
- upgrade to solidity 0.7.3, which required some changes in syntax

- call `token.balanceOfAt()` instead of `token.getPriorVotes()`
- base all voting logic on the basis of the voting power distribution at proposal creation
  (GovernorAlpha checks the voting proposalThreshold at the block bf proposal creation, and counts the votes
  from the start time of the proposal)
- change the semantics of `quorumvotes` and `proposalThreshold` to percentages, not absolute figures

- change the semantics of `queue` so that is queues the transaction for execution in the Gnosis safe (by alling `approveHash`)
- change the semantics of `execute` so the proposal will be executed in the Gnosis Safe
-
- (todo: removed the logic related to timelocks, because in Lego this kind of safety mechanism has a better place on the Gnosis Safe )
- (todo: removed the logic related to the guardian, becuase in the Lego Architecture this kind of permissioning is easier handled on the Gnosis Safe)
- (todo: removed the delegator pattern, and use openzeppelin style proxies instead)d
 */

contract DecisionEngine01 is IGovernorBravoDecisionEngine {
  using SafeMath for uint256;
  /// @notice The name of this contract
  string public constant NAME = "Lego Decision Engine";

  // with how much precision percentages are expressed (i.e. 1.23% is represent as 1.123*PCT_PRECISION)
  uint256 public constant PCT_PRECISION = 1e18;
  /// @notice The minimum setable proposal threshold, in percent
  uint256 public constant MIN_PROPOSAL_THRESHOLD = 0; // 0 Comp

  /// @notice The maximum setable proposal threshold
  uint256 public constant MAX_PROPOSAL_THRESHOLD = 100 * PCT_PRECISION; //100%

  /// @notice The minimum setable quorum
  uint256 public constant MIN_QUORUM_VOTES = 0; // 0 Comp

  /// @notice The maximum setable quorum
  uint256 public constant MAX_QUORUM_VOTES = 100; //100%

  /// @notice The minimum settable voting period, in
  // TODO: 10 is very low, 5760, About 24 hours, is a more reasonable value
  uint256 public constant MIN_VOTING_PERIOD = 10; //

  /// @notice The max settable voting period
  uint256 public constant MAX_VOTING_PERIOD = 80640; // About 2 weeks

  /// @notice The min settable voting delay
  uint256 public constant MIN_VOTING_DELAY = 1;

  /// @notice The max settable voting delay
  uint256 public constant MAX_VOTING_DELAY = 40320; // About 1 week

  /// @notice The EIP-712 typehash for the contract's domain
  bytes32 public constant DOMAIN_TYPEHASH =
    keccak256(
      "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
    );

  /// @notice The EIP-712 typehash for the ballot struct used by the contract
  bytes32 public constant BALLOT_TYPEHASH =
    keccak256("Ballot(uint256 proposalId,uint8 support)");

  /// @notice The maximum number of actions that can be included in a proposal
  uint256 public constant proposalMaxOperations = 10; // 10 actions

  // Receipts of ballots for the entire set of voters
  mapping(uint256 => mapping(address => Receipt)) public receipts;

  /// @notice Administrator for this contract
  address public admin;

  /// @notice The address of the Gnosis Safe
  IGnosisSafe public safe;

  /// @notice The address of the governance token
  address public token;

  TokenType public tokenType;

  /// @notice The official record of all proposals ever proposed
  mapping(uint256 => Proposal) public proposals;

  /// @notice The delay before voting on a proposal may take place, once proposed, in blocks
  uint256 public votingDelay;

  /// @notice The duration of voting on a proposal, in blocks
  uint256 public votingPeriod;

  /// @notice The number of votes required in order for a voter to become a proposer
  uint256 public proposalThreshold;

  /**
   * @dev The percentage of votes in support of a proposal required in order for a quorum to be reached and for a vote to succeed
   */
  uint256 public quorumVotes;

  /// @notice Initial proposal id set at become
  uint256 public initialProposalId;

  /// @notice The total number of proposals
  uint256 public proposalCount;

  /// @notice The latest proposal for each proposer
  mapping(address => uint256) public latestProposalIds;

  /**
   * @notice Used to initialize the contract during delegator contructor
   * @param safe_ The address of the Timelock
   * @param token_ The address of the COMP token
   * @param votingPeriod_ The initial voting period
   * @param votingDelay_ The initial voting delay
   * @param proposalThreshold_ The initial proposal threshold
   * @param quorumVotes_ The amount of votes
   */
  function initialize(
    address owner_,
    address safe_,
    address token_,
    TokenType tokenType_,
    uint256 votingPeriod_,
    uint256 votingDelay_,
    uint256 proposalThreshold_,
    uint256 quorumVotes_
  ) public {
    require(
      address(safe) == address(0),
      "GovernorBravo::initialize: can only initialize once"
    );
    // require(msg.sender == admin, "GovernorBravo::initialize: admin only");
    require(
      safe_ != address(0),
      "GovernorBravo::initialize: invalid timelock address"
    );
    require(
      token_ != address(0),
      "GovernorBravo::initialize: invalid comp address"
    );
    require(
      votingPeriod_ >= MIN_VOTING_PERIOD && votingPeriod_ <= MAX_VOTING_PERIOD,
      "GovernorBravo::initialize: invalid voting period"
    );
    require(
      votingDelay_ >= MIN_VOTING_DELAY && votingDelay_ <= MAX_VOTING_DELAY,
      "GovernorBravo::initialize: invalid voting delay"
    );
    require(
      proposalThreshold_ >= MIN_PROPOSAL_THRESHOLD &&
        proposalThreshold_ <= MAX_PROPOSAL_THRESHOLD,
      "GovernorBravo::initialize: invalid proposal threshold"
    );
    require(
      quorumVotes_ >= MIN_PROPOSAL_THRESHOLD &&
        quorumVotes_ <= MAX_PROPOSAL_THRESHOLD,
      "GovernorBravo::initialize: invalid quorum"
    );

    admin = owner_;
    safe = IGnosisSafe(safe_);
    tokenType = tokenType_;
    token = token_;
    votingPeriod = votingPeriod_;
    votingDelay = votingDelay_;
    proposalThreshold = proposalThreshold_;
    quorumVotes = quorumVotes_;
  }

  /* @dev return the voting power of member at the given blockNumber as a percentage of the total voting pwoer
   * NB: the voting power is rounded down to the nearest percentage point,
   * (which is fine for where it is used to check the proposalThreshold and quorumVotes, which are expressed in percentages)
   *
   * TODO: more precision...
   **/
  function votingPower(uint256 balance, uint256 totalBalance)
    public
    pure
    returns (uint256)
  {
    if (totalBalance == 0) {
      return 0;
    }
    require(
      balance <= totalBalance,
      "DecisionEngine:votingPower: balance must be less than totalBalance"
    );
    return balance.mul(PCT_PRECISION).div(totalBalance).mul(100);
  }

  /** @dev propose to execute a series of transactions
   */
  function propose(
    address[] memory targets,
    uint256[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    string memory description
  ) public override returns (uint256) {
    uint256 startBlock = block.number.add(votingDelay);
    uint256 endBlock = startBlock.add(votingPeriod);
    uint256 snapshotId;
    if (tokenType == TokenType.Minime) {
      snapshotId = block.number - 1;
    } else if (tokenType == TokenType.ERC20Snapshot) {
      snapshotId = IERC20Snapshot(token).snapshot();
    }
    // note that the check if for > proposalTreshold rather than >= proposalThreshold
    // so the error message is slightly off. We keep this to stay faithful to GovernorBravoDelegate.sol
    require(
      votingPower(
        IMiniMetoken(token).balanceOfAt(msg.sender, snapshotId),
        IMiniMetoken(token).totalSupplyAt(snapshotId)
      ) > proposalThreshold,
      "GovernorBravo::propose: proposer votes below proposal threshold"
    );

    require(
      targets.length == values.length && targets.length == calldatas.length,
      "GovernorBravo::propose: proposal function information arity mismatch"
    );
    require(
      targets.length != 0,
      "GovernorBravo::propose: must provide actions"
    );
    require(
      targets.length <= proposalMaxOperations,
      "GovernorBravo::propose: too many actions"
    );

    uint256 latestProposalId = latestProposalIds[msg.sender];
    if (latestProposalId != 0) {
      ProposalState proposersLatestProposalState = state(latestProposalId);
      require(
        proposersLatestProposalState != ProposalState.Active,
        "GovernorBravo::propose: one live proposal per proposer, found an already active proposal"
      );
      require(
        proposersLatestProposalState != ProposalState.Pending,
        "GovernorBravo::propose: one live proposal per proposer, found an already pending proposal"
      );
    }

    proposalCount++;
    Proposal storage newProposal = proposals[proposalCount];
    newProposal.id = proposalCount;
    newProposal.proposer = msg.sender;
    newProposal.eta = 0;
    newProposal.targets = targets;
    newProposal.values = values;
    newProposal.signatures = signatures;
    newProposal.calldatas = calldatas;
    newProposal.startBlock = startBlock;
    newProposal.endBlock = endBlock;
    newProposal.forVotes = 0;
    newProposal.againstVotes = 0;
    newProposal.canceled = false;
    newProposal.executed = false;
    newProposal.snapshotId = snapshotId;

    latestProposalIds[newProposal.proposer] = newProposal.id;

    emit ProposalCreated(
      newProposal.id,
      msg.sender,
      targets,
      values,
      signatures,
      calldatas,
      startBlock,
      endBlock,
      description,
      snapshotId
    );
    return newProposal.id;
  }

  /** approve the Hash of the transaction in gnosis safe, to be executed there
  
   */
  function queue(uint256 proposalId) public override {
    require(
      state(proposalId) == ProposalState.Succeeded,
      "GovernorAlpha::execute: proposal can only be approved if it is Succeeded"
    );
    Proposal storage proposal = proposals[proposalId];
    uint256 nonce = safe.nonce();

    // TODO: THIS IS THE WRONG APPROACH; we should approve the hash of a single encoded multisend transction here
    for (uint256 i = 0; i < proposal.targets.length; i++) {
      bytes memory payload =
        abi.encodePacked(
          bytes4(keccak256(bytes(proposal.signatures[i]))),
          proposal.calldatas[i]
        );
      bytes32 txHash =
        safe.getTransactionHash(
          proposal.targets[i], //     address to,
          proposal.values[i], //     uint256 value,
          payload, //     bytes calldata data,
          IGnosisSafe.Operation.Call, //     Enum.Operation operation,
          0, //     uint256 safeTxGas,
          0, //     uint256 baseGas,
          0, //     uint256 gasPrice,
          address(0), //     address gasToken,
          address(0), //     address payable refundReceiver,
          nonce
        );
      // TODO: feels like the nonce logic needs some love
      nonce++;
      safe.approveHash(txHash);
    }
  }

  /** 

  */
  function execute(uint256 proposalId) public override {
    require(
      state(proposalId) == ProposalState.Succeeded,
      "GovernorAlpha::execute: proposal can only be executed if it is Succeeded"
    );
    Proposal storage proposal = proposals[proposalId];
    proposal.executed = true;

    // we assume the Decision Engine is an owner of the multisig, and so we do
    // not need to actually sign the transaction, but just send over the address
    bytes memory sig =
      abi.encodePacked(bytes12(0), address(this), bytes32(0), uint8(1));

    // TODO: THIS IS THE WRONG APPROACH; we should send a single transaction using MultiSend
    for (uint256 i = 0; i < proposal.targets.length; i++) {
      bytes memory payload =
        abi.encodePacked(
          bytes4(keccak256(bytes(proposal.signatures[i]))),
          proposal.calldatas[i]
        );
      bool result =
        safe.execTransaction(
          proposal.targets[i], //     address to,
          proposal.values[i], //     uint256 value,
          payload, //     bytes calldata data,
          IGnosisSafe.Operation.Call, //     Enum.Operation operation,
          0, //     uint256 safeTxGas,
          0, //     uint256 baseGas,
          0, //     uint256 gasPrice,
          address(0), //     address gasToken,
          address(0), //     address payable refundReceiver,
          sig
        );
      require(result, "Execution of transaction on safe failed");
    }
    emit ProposalExecuted(proposalId);
  }

  function getActions(uint256 proposalId)
    public
    view
    override
    returns (
      address[] memory targets,
      uint256[] memory values,
      bytes[] memory calldatas
    )
  {
    Proposal storage p = proposals[proposalId];
    return (p.targets, p.values, p.calldatas);
  }

  function getReceipt(uint256 proposalId, address voter)
    public
    view
    override
    returns (Receipt memory)
  {
    return receipts[proposalId][voter];
  }

  function state(uint256 proposalId) public view returns (ProposalState) {
    require(
      proposalCount >= proposalId && proposalId > 0,
      "GovernorAlpha::state: invalid proposal id"
    );
    Proposal storage proposal = proposals[proposalId];

    // TODO: decide if we want to cancel proposals in our in our decision machine
    if (proposal.canceled) {
      return ProposalState.Canceled;
    } else if (block.number <= proposal.startBlock) {
      return ProposalState.Pending;
    } else if (block.number <= proposal.endBlock) {
      return ProposalState.Active;
    } else if (
      votingPower(
        proposal.forVotes,
        IERC20Snapshot(token).totalSupplyAt(proposal.snapshotId)
      ) < quorumVotes
    ) {
      return ProposalState.Defeated;
      // TODO: we are not using eta eta, so it is always 0, and the cases stop here!
    } else if (proposal.eta == 0) {
      return ProposalState.Succeeded;
    } else if (proposal.executed) {
      return ProposalState.Executed;
      // } else if (block.timestamp >= add256(proposal.eta, safe.GRACE_PERIOD())) {
    } else if (block.timestamp >= proposal.eta) {
      return ProposalState.Expired;
    } else {
      return ProposalState.Queued;
    }
  }

  /**
   * @notice Cast a vote for a proposal
   * @param proposalId The id of the proposal to vote on
   * @param support The support value for the vote. 0=against, 1=for, 2=abstain
   */
  function castVote(uint256 proposalId, uint8 support) external override {
    emit VoteCast(
      msg.sender,
      proposalId,
      support,
      castVoteInternal(msg.sender, proposalId, support),
      ""
    );
  }

  /**
   * @notice Cast a vote for a proposal with a reason
   * @param proposalId The id of the proposal to vote on
   * @param support The support value for the vote. 0=against, 1=for, 2=abstain
   * @param reason The reason given for the vote by the voter
   */
  function castVoteWithReason(
    uint256 proposalId,
    uint8 support,
    string calldata reason
  ) external override {
    emit VoteCast(
      msg.sender,
      proposalId,
      support,
      castVoteInternal(msg.sender, proposalId, support),
      reason
    );
  }

  /**
   * @notice Cast a vote for a proposal by signature
   * @dev External function that accepts EIP-712 signatures for voting on proposals.
   */
  function castVoteBySig(
    uint256 proposalId,
    uint8 support,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    bytes32 domainSeparator =
      keccak256(
        abi.encode(
          DOMAIN_TYPEHASH,
          keccak256(bytes(NAME)),
          getChainIdInternal(),
          address(this)
        )
      );
    bytes32 structHash =
      keccak256(abi.encode(BALLOT_TYPEHASH, proposalId, support));
    bytes32 digest =
      keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    address signatory = ecrecover(digest, v, r, s);
    require(
      signatory != address(0),
      "GovernorBravo::castVoteBySig: invalid signature"
    );
    emit VoteCast(
      signatory,
      proposalId,
      support,
      castVoteInternal(signatory, proposalId, support),
      ""
    );
  }

  /**
   * @notice Internal function that caries out voting logic
   * @param voter The voter that is casting their vote
   * @param proposalId The id of the proposal to vote on
   * @param support The support value for the vote. 0=against, 1=for, 2=abstain
   * @return The number of votes cast
   */
  function castVoteInternal(
    address voter,
    uint256 proposalId,
    uint8 support
  ) internal returns (uint96) {
    require(
      state(proposalId) == ProposalState.Active,
      "GovernorBravo::castVoteInternal: voting is closed"
    );
    require(support <= 2, "GovernorBravo::castVoteInternal: invalid vote type");
    Proposal storage proposal = proposals[proposalId];
    Receipt storage receipt = proposal.receipts[voter];
    require(
      receipt.hasVoted == false,
      "GovernorBravo::castVoteInternal: voter already voted"
    );
    uint96 votes =
      IERC20Snapshot(token).balanceOfAt(voter, proposal.snapshotId);

    if (support == 0) {
      proposal.againstVotes = add256(proposal.againstVotes, votes);
    } else if (support == 1) {
      proposal.forVotes = add256(proposal.forVotes, votes);
    } else if (support == 2) {
      proposal.abstainVotes = add256(proposal.abstainVotes, votes);
    }

    receipt.hasVoted = true;
    receipt.support = support;
    receipt.votes = votes;

    return votes;
  }

  /**
   * @notice Admin function for setting the voting delay
   * @param newVotingDelay new voting delay, in blocks
   */
  function _setVotingDelay(uint256 newVotingDelay) external {
    require(msg.sender == admin, "GovernorBravo::_setVotingDelay: admin only");
    require(
      newVotingDelay >= MIN_VOTING_DELAY && newVotingDelay <= MAX_VOTING_DELAY,
      "GovernorBravo::_setVotingDelay: invalid voting delay"
    );
    uint256 oldVotingDelay = votingDelay;
    votingDelay = newVotingDelay;

    emit VotingDelaySet(oldVotingDelay, votingDelay);
  }

  /**
   * @notice Admin function for setting the voting period
   * @param newVotingPeriod new voting period, in blocks
   */
  function _setVotingPeriod(uint256 newVotingPeriod) external {
    require(msg.sender == admin, "GovernorBravo::_setVotingPeriod: admin only");
    require(
      newVotingPeriod >= MIN_VOTING_PERIOD &&
        newVotingPeriod <= MAX_VOTING_PERIOD,
      "GovernorBravo::_setVotingPeriod: invalid voting period"
    );
    uint256 oldVotingPeriod = votingPeriod;
    votingPeriod = newVotingPeriod;

    emit VotingPeriodSet(oldVotingPeriod, votingPeriod);
  }

  /**
   * @notice Admin function for setting the proposal threshold
   * @dev newProposalThreshold must be greater than the hardcoded min
   * @param newProposalThreshold new proposal threshold
   */
  function _setProposalThreshold(uint256 newProposalThreshold) external {
    require(
      msg.sender == admin,
      "GovernorBravo::_setProposalThreshold: admin only"
    );
    require(
      newProposalThreshold >= MIN_PROPOSAL_THRESHOLD &&
        newProposalThreshold <= MAX_PROPOSAL_THRESHOLD,
      "GovernorBravo::_setProposalThreshold: invalid proposal threshold"
    );
    uint256 oldProposalThreshold = proposalThreshold;
    proposalThreshold = newProposalThreshold;

    emit ProposalThresholdSet(oldProposalThreshold, proposalThreshold);
  }

  /**
   * @notice Admin function for setting the proposal threshold
   * @dev newQuorumVotes must be greater than the hardcoded min
   * @param newQuorumVotes new quorum votes
   */
  function _setQuorumVotes(uint256 newQuorumVotes) external {
    require(msg.sender == admin, "GovernorBravo::_setQuorumVotes: admin only");
    require(
      newQuorumVotes >= MIN_QUORUM_VOTES && newQuorumVotes <= MAX_QUORUM_VOTES,
      "GovernorBravo::_setQuorumVotes: invalid quorum"
    );
    uint256 oldQuorumVotes = quorumVotes;
    quorumVotes = newQuorumVotes;
    emit QuorumVotesSet(oldQuorumVotes, newQuorumVotes);
  }

  // /**
  //   * @notice Begins transfer of admin rights. The newPendingAdmin must call `_acceptAdmin` to finalize the transfer.
  //   * @dev Admin function to begin change of admin. The newPendingAdmin must call `_acceptAdmin` to finalize the transfer.
  //   * @param newPendingAdmin New pending admin.
  //   */
  // function _setPendingAdmin(address newPendingAdmin) external {
  //     // Check caller = admin
  //     require(msg.sender == admin, "GovernorBravo:_setPendingAdmin: admin only");

  //     // Save current value, if any, for inclusion in log
  //     address oldPendingAdmin = pendingAdmin;

  //     // Store pendingAdmin with value newPendingAdmin
  //     pendingAdmin = newPendingAdmin;

  //     // Emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin)
  //     emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin);
  // }

  // /**
  //   * @notice Accepts transfer of admin rights. msg.sender must be pendingAdmin
  //   * @dev Admin function for pending admin to accept role and update admin
  //   */
  // function _acceptAdmin() external {
  //     // Check caller is pendingAdmin and pendingAdmin ≠ address(0)
  //     require(msg.sender == pendingAdmin && msg.sender != address(0), "GovernorBravo:_acceptAdmin: pending admin only");

  //     // Save current values for inclusion in log
  //     address oldAdmin = admin;
  //     address oldPendingAdmin = pendingAdmin;

  //     // Store admin with value pendingAdmin
  //     admin = pendingAdmin;

  //     // Clear the pending value
  //     pendingAdmin = address(0);

  //     emit NewAdmin(oldAdmin, admin);
  //     emit NewPendingAdmin(oldPendingAdmin, pendingAdmin);
  // }

  function add256(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a, "addition overflow");
    return c;
  }

  function sub256(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b <= a, "subtraction underflow");
    return a - b;
  }

  function getChainIdInternal() internal pure returns (uint256) {
    uint256 chainId;
    assembly {
      chainId := chainid()
    }
    return chainId;
  }
}
