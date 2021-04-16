import { ethers, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";
import { safeAddOwner } from "../scripts/utils";
import {
  STATE_PENDING,
  STATE_ACTIVE,
  createAProposal,
  YAY,
  createExampleDAO,
  mineABlock,
} from "./utils";

describe("ApproveHash", () => {
  let decisionEngine: Contract;
  let safe: Contract;
  let token: Contract;
  let accounts: any;

  beforeEach(async () => {
    const deployment = await createExampleDAO();
    decisionEngine = deployment.decisionEngine;
    safe = deployment.safe;
    token = deployment.token;
    accounts = await getNamedAccounts();

    // add a third owner, address1, and make it a 2/3 multisig
    await safeAddOwner(safe, accounts.deployer, accounts.address1, 2);
    await token.generateTokens(accounts.deployer, ethers.utils.parseEther("1"));
  });

  it("approveHash ", async () => {
    const { proposalId, tx } = await createAProposal(
      decisionEngine,
      token,
      accounts.address1
    );
    let onChainProposalState;
    let onChainProposal;

    // lets inspect the proposal state
    onChainProposal = await decisionEngine.proposals(proposalId);
    expect(onChainProposal.id).to.equal(proposalId);
    onChainProposalState = await decisionEngine.state(proposalId);
    expect(onChainProposalState).to.equal(STATE_PENDING);

    // proposal needs to be activated before voting, so we mine a block
    await mineABlock();

    // vote for the proposal
    await decisionEngine.castVote(proposalId, YAY);
    onChainProposalState = await decisionEngine.state(proposalId);
    expect(onChainProposalState).to.equal(STATE_ACTIVE);
    onChainProposal = await decisionEngine.proposals(proposalId);
    expect(onChainProposal.forVotes).to.equal(
      await token.balanceOf(accounts.deployer)
    );

    // wait for the period to end
    for (let step = 0; step < 10; step += 1) {
      // eslint-disable-next-line no-await-in-loop
      await mineABlock();
    }

    onChainProposalState = await decisionEngine.state(proposalId);

    await decisionEngine.queue(proposalId);

    // expect(await token.balanceOf(accounts.address1)).to.equal(0);
    // const receipt1 = await tx.wait();
    // expect(receipt1.events[receipt1.events.length - 1].event).to.equal(
    //   "ProposalExecuted"
    // );
    // expect(await token.balanceOf(accounts.address1)).to.equal(10);
  });
});
