# Interfaces beteween the DecisionEngine and the Gnosis Safe

<p align="center">
<img src="https://user-images.githubusercontent.com/1306173/112619224-596b3900-8e27-11eb-95dd-04aa60c12b99.png" height="400" align="center">
</p>

We are talking about the arrow between "compound Fork" and "Gnosis Safe" here.

The question is: after a proposal is approved in the Decision Engine, how does it get executed in the Safe?

## Two approaches

There are two different approaches:

- DecisionEngine is a multisig owner
- DecisionEngine has special access to the Safe via a Gnosis Safe module

Each has it pros and cons.

DecisionEngine as a multisig owner. This means that we can use a vanilla multsig, with no customizations. This is good for security (no custom code) and also for UX (one can continue to use concepts such as approval and execution familiar to multisig users, and also use gnosis safe UI). The drawback here is lack of flexibility: this gives us just one, limited, security model.

Decision Engine interfaces with Safe via a Gnosis Safe Module. This is the most flexible approach. For example, to implement the "fast-track plus veto" pattern, or a timelock, we should be using this.

## Execution Flow

Typical flow for DAOs decisions a propose-vote-queue-execute pattern (where the "queue" step is sometimes skipped).

This maps as follows between the
[Compound API](../contracts/interfaces/ICompoundDecisionEngine.sol)
to the
[Gnosis Safe API](../contracts/interfaces/IGnosisSafe.sol)

| action     | Compound API   | Gnosis Safe API   |
| ---------- | -------------- | ----------------- |
| 1. Propose | `propose(..)`  | na                |
| 2. Vote    | `castVote(..)` | na                |
| 3. Queue   | `queue(..)`    | `approveHash(..)` |
| 4. Execute | `execute(..)`  | `execute( )`      |

### If the decision Engine is the multsig owner

Gnosis Safe support different styles of transaction approval, both on-chain and off-chain.

0. After a Proposal has `Succeeded` in the decision engine, it is ready to be approved.

1. Approval is done by calling the `queue(proposalId)` on the Decision Engine contract. This function does the following:

   a. The decision engine encodes the cascade of transactions associated with the proposal, and calculated the `transactionHash` of the proposal using `GnosisSafe.calculateTransactionhash()`

   b. The decision engine calls `approveHash(transactionHash)` f

   [DecisionEngine01.sol](../contracts/DecisionEngine01.sol) has an implementation (still needs work!)

2. After the proposal is approved by the enough other multisig signers, the transaction can be executed. With the approval of enough signers, anyone can call the `execute` method on the Safe. Transaction approvals can be either signed on-chain (using approveHash, as in the step abouve), or be signed off-chain and submitted as an argument to the `execute` method.

> Question: what type of execution should be supported by the Decision engine here? What is a natural UX flow?

## If the decision engine is a module

TODO: work out some specific patterns here
