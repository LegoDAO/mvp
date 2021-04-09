import { ethers, deployments, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";
import { safeAddOwner, } from "../scripts/utils";
import { createAProposal, YAY } from "./utils";

const STATE_PENDING = 0;
const STATE_ACTIVE = 1;

describe("Example DAO with Minime Token", () => {
  let decisionEngine: Contract;
  let safe: Contract;
  let token: Contract;
  let accounts: any;
  let signers: any[];
  let signer: any;
  let fixture: any;

  beforeEach(async () => {
    fixture = await deployments.fixture(["ExampleDAOWithMiniMeToken"]);
    decisionEngine = await ethers.getContractAt(
      "DecisionEngine01",
      fixture.DecisionEngine01.address
    );
    token = await ethers.getContractAt(
      "MiniMeToken",
      fixture.MiniMeToken.address
    );
    safe = await ethers.getContractAt("GnosisSafe", fixture.GnosisSafe.address);
    accounts = await getNamedAccounts();
    signers = await ethers.getSigners();
    signer = signers[0];

    // add a third owner, address1, and make it a 2/3 multisig
    await safeAddOwner(safe, accounts.deployer, accounts.address1, 2);
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
    ethers.provider.send("evm_mine", []);

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
      await ethers.provider.send("evm_mine", []);
    }

    onChainProposalState = await decisionEngine.state(proposalId);

    // execution of the proposal by the decisionEgine is expected to fail
    // TODO: make this work
    // const tx1 = await decisionEngine.execute(proposalId);
    // no need to approve in this test because the DecisionEngine is the only owner in the Safe
    // (if the DecisionEngine would only be one of the signers of the Safe, we would only approve the Hashh)

    // await decisionEngine.approveHash(proposalId);

    // expect(await token.balanceOf(accounts.address1)).to.equal(0);
    // const receipt1 = await tx.wait();
    // expect(receipt1.events[receipt1.events.length - 1].event).to.equal(
    //   "ProposalExecuted"
    // );
    // expect(await token.balanceOf(accounts.address1)).to.equal(10);
  });
});
