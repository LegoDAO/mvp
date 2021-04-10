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
