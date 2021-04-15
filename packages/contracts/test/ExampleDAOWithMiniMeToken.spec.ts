import { ethers, deployments, getNamedAccounts, getChainId } from "hardhat";
import { expect } from "chai";
import { Contract, Transaction, Signer } from "ethers";
import { safeExecuteByOwner, encodeParameters } from "../scripts/utils";
import { createAProposal } from "./utils";

const STATE_PENDING = 0;
const STATE_ACTIVE = 1;

const parseEther = ethers.utils.parseEther;

describe("Example DAO with Minime Token", () => {
  let decisionEngine: Contract;
  let safe: Contract;
  let token: Contract;
  let accounts: any;
  let signers: Signer[];
  let signer: Signer;
  let signer1: Signer;
  let fixture: any;
  let NOOP_PROPOSAL: any;

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
    signer1 = signers[1];

    // for the purposes of this test, make the decision engine the sole owner of the safe
    // safeSwapOwner(safe, accounts.deployer, decisionEngine.address);

    // and send some ether to the safe so it has some money to spend
    // Send 1 ether to an ens name.
    // const tx = await signer.sendTransaction({
    //   to: safe.address,
    //   value: ethers.utils.parseEther("0.1"),
    // });
    NOOP_PROPOSAL = {
      targets: [accounts.address1],
      values: ["0"],
      signatures: ["getBalanceOf(address)"],
      callDatas: [encodeParameters(["address"], [accounts.deployer])],
      calldatas: ["0x"],
    };
  });

  it("Governance should have sane settings", async () => {
    // the decisionEngins "safe" address is as expected
    expect(await decisionEngine.safe()).to.be.equal(safe.address);
    // the decisionEngins "token" address is as expected
    expect(await decisionEngine.token()).to.be.equal(token.address);
    // the owners (i.e. signers) of the safe are the deployer and the decision engine's address
    expect(await safe.getOwners()).deep.equal([
      decisionEngine.address,
      accounts.deployer,
    ]);
    // the safe is a 1/2 multisig
    expect(await safe.getThreshold()).to.equal(1);

    // the token is owned by the safe
    expect(await token.controller()).to.equal(safe.address);

    // the quorum is 4%
    expect(await decisionEngine.quorumVotes()).to.equal(parseEther("4"));
  });

  // it("Safe sanity", async () => {
  //   // safe expects the caller to encode the ABI
  //   const data = token.interface.encodeFunctionData("generateTokens", [
  //     accounts.address1,
  //     10,
  //   ]);
  //   await safeExecuteByOwner(safe, accounts.deployer, token.address, data);
  // });

  it("proposalThreshold works sane way", async () => {
    // the threshold for proposing is 10%
    let tx: Transaction;
    let data: string;
    expect(await decisionEngine.proposalThreshold()).to.equal(parseEther("1"));
    // the deployer already has a 1000 tokens
    expect(await token.balanceOf(accounts.deployer)).to.equal(parseEther("1"));
    // send 10 tokens to address1
    data = token.interface.encodeFunctionData("generateTokens", [
      await signer1.getAddress(),
      parseEther("100"),
    ]);
    await safeExecuteByOwner(safe, accounts.deployer, token.address, data);
    expect(await token.balanceOf(await signer1.getAddress())).to.equal(
      parseEther("100")
    );
    const { targets, values, signatures, calldatas } = NOOP_PROPOSAL;

    tx = decisionEngine.propose(targets, values, signatures, calldatas, "");
    await expect(tx).to.be.revertedWith(
      "proposer votes below proposal threshold"
    );

    data = token.interface.encodeFunctionData("generateTokens", [
      accounts.deployer,
      parseEther("0.2"),
    ]);
    await safeExecuteByOwner(safe, accounts.deployer, token.address, data);

    // with this new token, accounts.deployer has reached the threshold, and can create a proposal
    await decisionEngine.propose(targets, values, signatures, calldatas, "");
  });

  it("quorumVotes behaves in a sane way", async () => {
    expect(await decisionEngine.quorumVotes()).to.equal(parseEther("4"));
  });

  it("Create, vote, and execute", async () => {
    const { proposalId } = await createAProposal(
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
    const VOTE_FOR = 1;
    await decisionEngine.castVote(proposalId, VOTE_FOR);

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

    expect(await token.balanceOf(accounts.address1)).to.equal(0);
    const tx = await decisionEngine.execute(proposalId);
    const receipt = await tx.wait();
    expect(receipt.events[receipt.events.length - 1].event).to.equal(
      "ProposalExecuted"
    );
    expect(await token.balanceOf(accounts.address1)).to.equal(10);
  });
});
