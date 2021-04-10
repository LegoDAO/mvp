# Lego DAO MVP

<b>work in progress, all contributions welcome!</b>

[Lego DAO](https://www.notion.so/LEGO-DAO-43b1905a888b47b987456b6df568d5cc) proposes a simple reusable pattern for creating and managing DAOs - you can find more information on our [pages on notion](https://www.notion.so/LEGO-DAO-43b1905a888b47b987456b6df568d5cc)

<p align="center">
<img src="https://user-images.githubusercontent.com/1306173/114262574-083f7580-99e1-11eb-91e9-621ce0dfbf77.png" height="400" align="center">
</p>


This repository is an MVP and a work in progress. 



At the moment we have:

- A Proof of Concept implementation of a Lego DAO, which contains of a generic ERC20Snapshot token, a fork of Compounds GovernorBravo contract, and a Gnosis Safe instance, that interact in a coherent way.
- A fork of [Compound's GovernorBravo contracts](https://github.com/compound-finance/compound-protocol/blob/master/contracts/Governance/)  contract that 
  1. is adapted to queue transactions into a Gnosis Safe for execution (rather than the native Timelock functionality)
  2. can read Voting power from any ERC20 token that either implements the  [MiniMe](https://github.com/Giveth/minime/blob/master/contracts/MiniMeToken.sol) interface or OpenZeppelin's [ERC20Snapshot](https://docs.openzeppelin.com/contracts/3.x/api/token/erc20#ERC20Snapshot)
  3. We also added some more configuration options, and removed some of the timelock logic
  
- Deploymnet scripts and tests that demonstrate the concept - i.e. how to deploy a [Gnosis Safe](https://www.npmjs.com/package/@gnosis.pm/safe-contracts), a token, and a Decision Egnine, and how they play together.
- Definitions of interfaces 

## Next steps

- [ ] improve and clean up the governance contract, test it, etc.
  - [ ] calculate votingPower with much more precision
  - [ ] give the quorumVotes and proposalThreshold much more precision 
  - [ ] migrate tests from compound protocol to this repository
- [x] upgrade from GovernorAlpha to Compound GovernorBravo interface
- [ ] Provide other ways for Decisiion Engine --> Gnosis Safe interactaction
  - [ ] Create a Gnosis DAO Module for optimistic execution
- [ ] Check licensing
- [ ] create tooling to configure and deploy "Lego DAOs"
- [x] we should support other ERC20 tokens (e.g. those that re not "minime", like `ERC20Snapshot` of OpenZeppelin. Perhaps also generic ERC20 token)
- [ ] Give these contracts some UI (Gnosis Safe Module, boardroom.io, sybil) 
- [ ] Continuous integration
- [ ] Write a Delegation Adaptor that allows to add delegation to any ERC20 token, which is useful in and of itself, but also makes it easier to plug in the token into systems such a Sybil or Boardroom.



# Usage

Clone and build the repository:

```sh
git clone https://github.com/LegoDAO/mvp.git
cd mvp
yarn
```

Compile the contracts

```
yarn build
```

Run the tests

```
yarn test
```

# Main contracts in this repository

## DecisionEngine01.sol

This is a stripped-down version of [GovernorBravo contracts](https://github.com/compound-finance/compound-protocol/blob/master/contracts/Governance/)

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
- (todo: removed the delegator pattern, and use openzeppelin style proxies instead)





## Contributions welcome

Contributions welcome! :) <3
