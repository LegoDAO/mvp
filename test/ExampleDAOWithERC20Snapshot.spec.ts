import { ethers, deployments, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { Contract, Transaction } from "ethers";
import { safeExecuteByOwner } from "../scripts/utils";
import { YAY } from "./utils";

const STATE_PENDING = 0;
const STATE_ACTIVE = 1;

function encodeParameters(types: string[], values: string[]) {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
}

describe("Example DAO with ERC20Snapshot Token", () => {
  let decisionEngine: Contract;
  let safe: Contract;
  let token: Contract;
  let accounts: any;
  let signers: any[];
  let signer: any;
  let fixture: any;
  let NOOP_PROPOSAL: any;
  let ProposalToMint10TokensToAddress1: any;

  beforeEach(async () => {
    fixture = await deployments.fixture(["ExampleDAOWithERC20Snapshot"]);
    decisionEngine = await ethers.getContractAt(
      "DecisionEngine01",
      fixture.DecisionEngine01.address
    );
    token = await ethers.getContractAt(
      "ERC20SnapshotExample",
      fixture.ERC20SnapshotExample.address
    );
    safe = await ethers.getContractAt("GnosisSafe", fixture.GnosisSafe.address);
    accounts = await getNamedAccounts();
    signers = await ethers.getSigners();
    signer = signers[0];

    // for the purposes of this test, make the decision engine the sole owner of the safe
    // safeSwapOwner(safe, accounts.deployer, decisionEngine.address);

    // and send some ether to the safe so it has some money to spend
    // Send 1 ether to an ens name.
    // const tx = await signer.sendTransaction({
    //   to: safe.address,
    //   value: ethers.utils.parseEther("0.1"),
    // });

    ProposalToMint10TokensToAddress1 = {
      targets: [token.address],
      values: ["0"],
      signatures: ["mint(address,uint256)"],
      calldatas: [
        encodeParameters(["address", "uint"], [accounts.address1, 10]),
      ],
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
    expect(await token.owner()).to.equal(safe.address);

    // the quorum is 4%
    expect(await decisionEngine.quorumVotes()).to.equal(4);
  });

  it("proposalThreshold seems sane", async () => {
    // the threshold for proposing is 10%
    let tx: Transaction;
    let data: string;
    expect(await decisionEngine.proposalThreshold()).to.equal(10);
    // the deployer already has a 1000 tokens
    expect(await token.balanceOf(accounts.deployer)).to.equal(
      ethers.utils.parseEther("1000")
    );
    // send 10.000 tokens to address1
    data = token.interface.encodeFunctionData("mint", [
      accounts.address1,
      ethers.utils.parseEther("10000"),
    ]);
    await safeExecuteByOwner(safe, accounts.deployer, token.address, data);
    expect(await token.balanceOf(accounts.address1)).to.equal(
      ethers.utils.parseEther("10000")
    );

    const {
      targets,
      values,
      signatures,
      calldatas,
    } = ProposalToMint10TokensToAddress1;
    tx = decisionEngine.propose(targets, values, signatures, calldatas, "");
    await expect(tx).to.be.revertedWith(
      "proposer votes below proposal threshold"
    );
    data = token.interface.encodeFunctionData("mint", [
      accounts.deployer,
      ethers.utils.parseEther("1000"),
    ]);
    await safeExecuteByOwner(safe, accounts.deployer, token.address, data);

    // with this new token, accounts.deployer has reached the threshold, and can create a proposal
    await decisionEngine.propose(targets, values, signatures, calldatas, "");
  });

  it("quorumVotes behaves in a sane way", async () => {
    expect(await decisionEngine.quorumVotes()).to.equal(4);
  });

  it("Create, vote, and execute", async () => {
    let tx;
    let receipt;

    // const { targets, values, signatures, calldatas } = NOOP_PROPOSAL;
    const {
      targets,
      values,
      signatures,
      calldatas,
    } = ProposalToMint10TokensToAddress1;

    tx = await decisionEngine.propose(
      targets,
      values,
      signatures,
      calldatas,
      "hello world"
    );
    receipt = await tx.wait();
    const event = receipt.events[1];
    expect(event.event).to.equal("ProposalCreated");
    const proposalId = event.args.id;
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

    // no need to approve in this test because the DecisionEngine is the only owner in the Safe
    // (if the DecisionEngine would only be one of the signers of the Safe, we would only approve the Hashh)
    // await decisionEngine.approveHash(proposalId)

    expect(await token.balanceOf(accounts.address1)).to.equal(0);
    tx = await decisionEngine.execute(proposalId);
    receipt = await tx.wait();
    expect(receipt.events[receipt.events.length - 1].event).to.equal(
      "ProposalExecuted"
    );
    expect(await token.balanceOf(accounts.address1)).to.equal(10);
  });
});
