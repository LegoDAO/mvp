import { expect } from "chai";
import { Contract, Transaction, utils } from "ethers";
import hre, { ethers, deployments, getNamedAccounts } from "hardhat";

import { deployDAO } from "../scripts/deployDAO";
import { deploySafe } from "../scripts/deploySafe";
import { IDAOConfig } from "../scripts/types";

import {
  YAY,
  decisionEngineConfig,
  exampleProposalData,
  mineABlock,
  STATE_PENDING,
  STATE_ACTIVE,
} from "./utils";

const parseEther = ethers.utils.parseEther;

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

  beforeEach(async () => {
    fixture = await deployments.fixture(["ERC20SnapshotExample"]);
    token = await ethers.getContractAt(
      "ERC20SnapshotExample",
      fixture.ERC20SnapshotExample.address
    );
    safe = (await deploySafe(hre, {})).safe;

    const daoConfig: IDAOConfig = {
      safe: { address: safe.address },
      token: { address: token.address, tokenType: "ERC20Snapshot" },
      decisionEngine: decisionEngineConfig,
    };

    const deployment = await deployDAO(hre, daoConfig);
    decisionEngine = deployment.decisionEngine;

    accounts = await getNamedAccounts();
    signers = await ethers.getSigners();
    signer = signers[0];
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

    // the quorum is 4%
    expect(await decisionEngine.quorumVotes()).to.equal(utils.parseEther("4"));
  });

  it("proposalThreshold is sane", async () => {
    // the threshold for proposing is 1%
    let tx: Transaction;
    expect(await decisionEngine.proposalThreshold()).to.equal(
      utils.parseEther("1")
    );
    // the deployer has a 1 token
    await token.mint(accounts.deployer, ethers.utils.parseEther("1"));
    expect(await token.balanceOf(accounts.deployer)).to.equal(
      ethers.utils.parseEther("1")
    );
    // 100 tokens to address1
    await token.mint(accounts.address1, ethers.utils.parseEther("100"));
    expect(await token.balanceOf(accounts.address1)).to.equal(
      ethers.utils.parseEther("100")
    );

    const {
      targets,
      values,
      signatures,
      calldatas,
    } = await exampleProposalData();

    tx = decisionEngine.propose(targets, values, signatures, calldatas, "");
    await expect(tx).to.be.revertedWith(
      "proposer votes below proposal threshold"
    );
    await token.mint(accounts.deployer, ethers.utils.parseEther("1"));
    // with this new token, accounts.deployer has reached the threshold, and can create a proposal
    await decisionEngine.propose(targets, values, signatures, calldatas, "");
  });

  it("quorumVotes behaves in a sane way", async () => {
    expect(await decisionEngine.quorumVotes()).to.equal(parseEther("4"));
  });

  it("Create, vote, and execute", async () => {
    let tx;
    let receipt;

    await token.mint(accounts.deployer, ethers.utils.parseEther("1"));

    const {
      targets,
      values,
      signatures,
      calldatas,
    } = await exampleProposalData();

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

    tx = await decisionEngine.execute(proposalId);
    receipt = await tx.wait();
    expect(receipt.events[receipt.events.length - 1].event).to.equal(
      "ProposalExecuted"
    );
    // TODO: check the execution on the mock contract
  });
});
