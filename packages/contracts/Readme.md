# Lego DAO MVP

<b>work in progress, all contributions welcome!</b>

[Lego DAO](https://www.notion.so/LEGO-DAO-43b1905a888b47b987456b6df568d5cc) uses a simple reusable pattern for creating DAOs on-chain.

This repository is an MVP - at the moment, it is a fork (and a simplification) of Compound's GovernorAlpha contract, using Gnosis Safe as the "asset holder" and "executor" of the decisions. The pattern supports two different types of tokens: ERC20Snapshot (i.e. tokens that use the [ERC20Snapshot-style](https://docs.openzeppelin.com/contracts/3.x/api/token/erc20#ERC20Snapshot) where a snapshot must be "taken" calling the `snapshot()` function, and the [MiniMe](https://github.com/Giveth/minime/blob/master/contracts/MiniMeToken.sol) approach, where a snapshot is available for each block.

<p align="center">
<img src="https://user-images.githubusercontent.com/1306173/112619339-815a9c80-8e27-11eb-89b9-0c69326dceae.png" height="400" align="center">
</p>

This repository contains a simple proof-of-concept of a single "Lego DAO":

<p align="center">
<img src="https://user-images.githubusercontent.com/1306173/112619224-596b3900-8e27-11eb-95dd-04aa60c12b99.png" height="400" align="center">
</p>

In essence, this MVP is an adaption of [Compounds GovernorAlpha contract](https://github.com/compound-finance/compound-protocol/blob/master/contracts/Governance/GovernorAlpha.sol) that is adapted so that:

- It can use any token that implements the ERC20Snapshot or the Minime standard as its Voting Power source
- It works with Gnosis Safe-style transactions, and uses a vanilla Gnosis Safe as it's execution engine

In addition, this respository contains a number of tests that show how to deploy and use this configuration.

- Gnosis Safe: [https://www.npmjs.com/package/@gnosis.pm/safe-contracts](https://www.npmjs.com/package/@gnosis.pm/safe-contracts)
- Compound Governance
- OpenZeppelin ERC20Mintable, ERC20Snapshot

### Usage

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

## Changes made from Compound GovernorAlpha.sol

This is a stripped-down version of GovernorAlpha -

- basically, we only kept the "propose - vote -execute" flow
- upgrade to solidity 0.7.3, which required some changes in syntax
- call `token.balanceOfAt()` instead of `token.getPriorVotes()`
- base all voting logic on the basis of the voting power distribution at proposal creation
  (GovernorAlpha checks the voting proposalThreshold at the block bf proposal creation, and counts the votes
  from the start time of the proposal)
- add configuration options to the constructor:
  - `safe` -> the address of a Gnosis safe that holds the assets and will execut the proposals
  - `token` -> the address of a token that determines the Voting Power
  - `quorumVotes`
  - `proposalThreshold`
  - `votingDelay`
  - `votingPeriod`
- change the semantics of `quorumvotes` and `proposalThreshold` to percentages, not absolute figures
- rename `timelock` to `safe`
- removed the logic related to timelocks, because in Lego this kind of safety mechanism has a better place on the Gnosis Safe
- removed the logic related to the guardian, becuase in the Lego Architecture this kind of permissioning is easier handled on the Gnosis Safe
- rename Comp to "token"
- added a new parameter to the constructor called tokenType - it can either be ERC20Snapshot or Minime

## Next steps

- [ ] Use Gnosis DAO Module
- [ ] improve and clean up the governance contract
- [x] upgrade to new Compound GovernorBravo contract
- [ ] Check licensing
- [ ] create tooling to configure and deploy "Lego DAOs"
- [x] we should support other ERC20 tokens (e.g. those that re not "minime", like `ERC20Snapshot` of OpenZeppelin. Perhaps also generic ERC20 token)
- [ ] Integrate with some UI system (Gnosis Safe Module, boardroom.io, sybil) (which also implies creating a subgraph)
- [ ] Continuous integration
- [ ] migrate tests from compound protocol to this repository
- [ ] calculate votingPower with much more precision
- [ ] give the quorumVotes and proposalThreshold much more precision
- [ ] (perhaps) make DecisionEngine01 Ownable and remove the admin stuff

## Contributions welcome

Contributions welcome! :) <3
