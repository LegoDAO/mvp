pragma solidity ^0.7.3;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interfaces/IMiniMetoken.sol";
import "../interfaces/IGnosisSafe.sol";
import "../interfaces/IERC20Snapshot.sol";

import "hardhat/console.sol";

/**
  An adaptation of the GovernorAlpha contract
  Forked from https://github.com/compound-finance/compound-protocol/blob/compound/2.8/contracts/Governance/GovernorAlpha.sol
  but with many changes


  - basically, we only kept the "propose - vote -execute" flow of thione decision mechanism
  - add configuration options to the constructor:
    - `safe` -> the address of a Gnosis safe that holds the assets and will execut the proposals
    - `token` -> the address of a token that determines the Voting Power
    - `tokenType` -> type of the token contract, either Minime or ERC20Snapshot
     -`quorumVotes`
    - `proposalThreshold`
    - `votingDelay`
    - `votingPeriod`
  - changed the execute semantics to call the Gnosis safe
  - added an `approveHash` function that call `approveHash` on the safe
  - upgrade to solidity 0.7.3, which required some changes in syntax
  - call `token.balanceOfAt()` instead of `token.getPriorVotes()`
  - base all voting logic on the basis of the voting power distribution at proposal creation
   (GovernorAlpha checks the voting proposalThreshold at the block bf proposal creation, and counts the votes
   from the start time of the proposal)
  - add configuration options to the constructor:
    - `safe` -> the address of a Gnosis safe that holds the assets and will execut the proposals
    - `token` -> the address of a token that determines the Voting Power
    - `tokenType` -> type of the token contract, either Minime or ERC20Snapshot
     -`quorumVotes`
    - `proposalThreshold`
    - `votingDelay`
    - `votingPeriod`
  - change the semantics of `quorumvotes` and `proposalThreshold` to percentages, not absolute figures
  - rename `timelock` to `safe`
  - removed the logic related to timelocks, because in Lego this kind of safety mechanism has a better place on the Gnosis Safe
  - removed the logic related to the guardian, becuase in the Lego Architecture this kind of permissioning is easier handled on the Gnosis Safe - rename Comp to "token"
  - added a new parameter to the constructor called tokenType - it can either be ERC20Snapshot or Minime
 */

contract DecisionEngine01 {
  using SafeMath for uint256;
  /// @notice The name of this contract
  string public constant NAME = "GovernorAlpha.v2.Simplified.And.Parametrized";

  /**
   * @dev The percentage of votes in support of a proposal required in order for a quorum to be reached and for a vote to succeed
   */
  uint256 public quorumVotes;

  /** @dev The percentage of votes required in order for a voter to become a proposer
   *
   */
  uint256 public proposalThreshold;

  // @notice The maximum number of actions that can be included in a proposal
  uint256 public proposalMaxOperations;

  /// @dev The delay before voting on a proposal may take place, once proposed
  uint256 private _votingDelay = 1; // 1 block

  function votingDelay() public view returns (uint256) {
    return _votingDelay;
  } // 1 block

  /// @dev The duration of voting on a proposal, in blocks
  uint256 public votingPeriod;

  /// @notice The address of the Gnosis Safe
  IGnosisSafe public safe;

  /// @notice The address of the governance token
  address public token;
  TokenType public tokenType;

  /// @notice The total number of proposals
  uint256 public proposalCount;

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

  enum TokenType {Minime, ERC20Snapshot}

  /// @notice The official record of all proposals ever proposed
  mapping(uint256 => Proposal) public proposals;

  // Receipts of ballots for the entire set of voters
  mapping(uint256 => mapping(address => Receipt)) public receipts;

  /// @notice The latest proposal for each proposer
  mapping(address => uint256) public latestProposalIds;

  /// @notice The EIP-712 typehash for the contract's domain
  bytes32 public constant DOMAIN_TYPEHASH =
    keccak256(
      "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
    );

  /// @notice The EIP-712 typehash for the ballot struct used by the contract
  bytes32 public constant BALLOT_TYPEHASH =
    keccak256("Ballot(uint256 proposalId,bool support)");

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
  event VoteCast(
    address voter,
    uint256 proposalId,
    bool support,
    uint256 votes
  );

  /// @notice An event emitted when a proposal has been canceled
  event ProposalCanceled(uint256 id);

  /// @notice An event emitted when a proposal has been queued in the safe
  event ProposalQueued(uint256 id, uint256 eta);

  /// @notice An event emitted when a proposal has been executed in the safe
  event ProposalExecuted(uint256 id);

  constructor(
    address safe_,
    address token_,
    TokenType tokenType_,
    uint256 proposalThreshold_,
    uint256 quorumVotes_,
    uint256 votingPeriod_,
    uint256 proposalMaxOperations_
  ) public {
    safe = IGnosisSafe(safe_);
    tokenType = tokenType_;
    token = token_;
    proposalThreshold = proposalThreshold_;
    quorumVotes = quorumVotes_;
    votingPeriod = votingPeriod_;
    proposalMaxOperations = proposalMaxOperations_;
  }

  /* @dev return the voting power of member at the given blockNumber as a percentage of the total voting pwoer
   * NB: the voting power is rounded down to the nearest percentage point,
   * (which is fine for where it is used to check the proposalThreshold and quorumVotes, which are expressed in percentages)
   *
   * TODO: this will throw if the member's balance is very large (when balance * 100 is too large for the evm to handle)
   **/
  function votingPower(uint256 balance, uint256 totalBalance)
    internal
    view
    returns (uint256)
  {
    if (totalBalance == 0) {
      return 0;
    }
    return balance.mul(100).div(totalBalance);
  }

  /** @dev propose to execute a series of transactions
   */
  function propose(
    address[] memory targets,
    uint256[] memory values,
    string[] memory signatures,
    bytes[] memory calldatas,
    string memory description
  ) public returns (uint256) {
    uint256 startBlock = block.number.add(votingDelay());
    uint256 endBlock = startBlock.add(votingPeriod);
    uint256 snapshotId;
    if (tokenType == TokenType.Minime) {
      snapshotId = block.number;
    } else if (tokenType == TokenType.ERC20Snapshot) {
      snapshotId = IERC20Snapshot(token).snapshot();
    }
    require(
      votingPower(
        IMiniMetoken(token).balanceOfAt(msg.sender, snapshotId),
        IMiniMetoken(token).totalSupplyAt(snapshotId)
      ) > proposalThreshold,
      "GovernorAlpha::propose: proposer votes below proposal threshold"
    );

    require(
      targets.length == values.length && targets.length == calldatas.length,
      "GovernorAlpha::propose: proposal function information arity mismatch"
    );
    require(
      targets.length != 0,
      "GovernorAlpha::propose: must provide actions"
    );
    require(
      targets.length <= proposalMaxOperations,
      "GovernorAlpha::propose: too many actions"
    );

    uint256 latestProposalId = latestProposalIds[msg.sender];
    if (latestProposalId != 0) {
      ProposalState proposersLatestProposalState = state(latestProposalId);
      require(
        proposersLatestProposalState != ProposalState.Active,
        "GovernorAlpha::propose: one live proposal per proposer, found an already active proposal"
      );
      require(
        proposersLatestProposalState != ProposalState.Pending,
        "GovernorAlpha::propose: one live proposal per proposer, found an already pending proposal"
      );
    }

    proposalCount++;
    Proposal memory newProposal =
      Proposal({
        id: proposalCount,
        proposer: msg.sender,
        eta: 0,
        targets: targets,
        values: values,
        signatures: signatures,
        calldatas: calldatas,
        startBlock: startBlock,
        endBlock: endBlock,
        forVotes: 0,
        againstVotes: 0,
        canceled: false,
        executed: false,
        snapshotId: snapshotId
      });

    proposals[newProposal.id] = newProposal;
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

  // function queue(uint proposalId) public {
  //     require(state(proposalId) == ProposalState.Succeeded, "GovernorAlpha::queue: proposal can only be queued if it is succeeded");
  //     Proposal storage proposal = proposals[proposalId];
  //     uint eta = add256(block.timestamp, safe.delay());
  //     for (uint i = 0; i < proposal.targets.length; i++) {
  //         _queueOrRevert(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], eta);
  //     }
  //     proposal.eta = eta;
  //     emit ProposalQueued(proposalId, eta);
  // }

  // function _queueOrRevert(address target, uint value, string memory signature, bytes memory data, uint eta) internal {
  //     require(!safe.queuedTransactions(keccak256(abi.encode(target, value, signature, data, eta))), "GovernorAlpha::_queueOrRevert: proposal action already queued at eta");
  //     safe.queueTransaction(target, value, signature, data, eta);
  // }

  function approveHash(uint256 proposalId) public {
    require(
      state(proposalId) == ProposalState.Succeeded,
      "GovernorAlpha::execute: proposal can only be approved if it is Succeeded"
    );
    Proposal storage proposal = proposals[proposalId];
    uint256 nonce = safe.nonce();
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
  function execute(uint256 proposalId) public {
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

  // function cancel(uint256 proposalId) public {
  //   ProposalState state = state(proposalId);
  //   require(
  //     state != ProposalState.Executed,
  //     "GovernorAlpha::cancel: cannot cancel executed proposal"
  //   );

  //   Proposal storage proposal = proposals[proposalId];
  //   // TBD:
  //   // require(msg.sender == guardian || token.getPriorVotes(proposal.proposer, sub256(block.number, 1)) < proposalThreshold(), "GovernorAlpha::cancel: proposer above threshold");
  //   require(
  //     msg.sender == guardian ||
  //       token.balanceOfAt(proposal.proposer, sub256(block.number, 1)) <
  //       proposalThreshold(),
  //     "GovernorAlpha::cancel: proposer above threshold"
  //   );

  //   proposal.canceled = true;
  //   for (uint256 i = 0; i < proposal.targets.length; i++) {
  //     safe.cancelTransaction(
  //       proposal.targets[i],
  //       proposal.values[i],
  //       proposal.calldatas[i],
  //       proposal.eta
  //     );
  //   }

  //   emit ProposalCanceled(proposalId);
  // }

  function getActions(uint256 proposalId)
    public
    view
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
    if (proposal.canceled) {
      return ProposalState.Canceled;
    } else if (block.number <= proposal.startBlock) {
      return ProposalState.Pending;
    } else if (block.number <= proposal.endBlock) {
      return ProposalState.Active;
    } else if (
      proposal.forVotes <= proposal.againstVotes ||
      votingPower(proposal.forVotes, proposal.startBlock) < quorumVotes
    ) {
      return ProposalState.Defeated;
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

  function castVote(uint256 proposalId, bool support) public {
    return _castVote(msg.sender, proposalId, support);
  }

  function castVoteBySig(
    uint256 proposalId,
    bool support,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public {
    bytes32 domainSeparator =
      keccak256(
        abi.encode(
          DOMAIN_TYPEHASH,
          keccak256(bytes(NAME)),
          getChainId(),
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
      "GovernorAlpha::castVoteBySig: invalid signature"
    );
    return _castVote(signatory, proposalId, support);
  }

  function _castVote(
    address voter,
    uint256 proposalId,
    bool support
  ) internal {
    require(
      state(proposalId) == ProposalState.Active,
      "GovernorAlpha::_castVote: voting is closed"
    );
    Proposal storage proposal = proposals[proposalId];
    Receipt storage receipt = receipts[proposalId][voter];
    require(
      receipt.hasVoted == false,
      "GovernorAlpha::_castVote: voter already voted"
    );

    //
    uint256 votes = IMiniMetoken(token).balanceOfAt(voter, proposal.snapshotId);

    if (support) {
      proposal.forVotes = proposal.forVotes.add(votes);
    } else {
      proposal.againstVotes = proposal.againstVotes.add(votes);
    }

    receipt.hasVoted = true;
    receipt.support = support;
    receipt.votes = votes;

    emit VoteCast(voter, proposalId, support, votes);
  }

  function sub256(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b <= a, "subtraction underflow");
    return a - b;
  }

  function getChainId() internal pure returns (uint256) {
    uint256 chainId;
    assembly {
      chainId := chainid()
    }
    return chainId;
  }
}
