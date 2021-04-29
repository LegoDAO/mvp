import { expect } from "chai";
import { Contract, Transaction, Signer } from "ethers";
import hre, { ethers, deployments, getNamedAccounts } from "hardhat";

import { deployDAO } from "../scripts/deployDAO";
import { deploySafe } from "../scripts/deploySafe";
import { IDAOConfig, IDecisionEngineConfig } from "../scripts/types";
import { encodeParameters } from "../scripts/utils";

import { createAProposal, mineABlock } from "./utils";

const STATE_PENDING = 0;
const STATE_ACTIVE = 1;

const parseEther = ethers.utils.parseEther;

const decisionEngineConfig: IDecisionEngineConfig = {
  type: "DecisionEngine01",
  proposalThreshold: 1, // in percentage
  quorumVotes: 4, // in percentage
  votingPeriod: 10, // in blocks
  votingDelay: 1,
  proposalMaxOperations: 10,
};

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
    fixture = await deployments.fixture(["MiniMeToken"]);
    token = await ethers.getContractAt(
      "MiniMeToken",
      fixture.MiniMeToken.address
    );
    const safeDeployment = await deploySafe(hre, {});
    safe = safeDeployment.safe;

    const daoConfig: IDAOConfig = {
      safe: { address: safe.address },
      token: { address: token.address },
      decisionEngine: decisionEngineConfig,
    };

    const deployment = await deployDAO(hre, daoConfig);
    decisionEngine = deployment.decisionEngine;

    accounts = await getNamedAccounts();
    signers = await ethers.getSigners();
    signer = signers[0];
    signer1 = signers[1];

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

    // the quorum is 4%
    expect(await decisionEngine.quorumVotes()).to.equal(parseEther("4"));
  });

  it("proposalThreshold works", async () => {
    let tx: Transaction;
    let data: string;
    expect(await decisionEngine.proposalThreshold()).to.equal(parseEther("1"));
    // the deployer has 1 tokens
    await token.generateTokens(accounts.deployer, parseEther("1"));
    expect(await token.balanceOf(accounts.deployer)).to.equal(parseEther("1"));

    //  address1 has 100 tokens
    await token.generateTokens(accounts.address1, parseEther("100"));
    expect(await token.balanceOf(await signer1.getAddress())).to.equal(
      parseEther("100")
    );
    const { targets, values, signatures, calldatas } = NOOP_PROPOSAL;

    tx = decisionEngine.propose(targets, values, signatures, calldatas, "");
    await expect(tx).to.be.revertedWith(
      "proposer votes below proposal threshold"
    );

    await token.generateTokens(accounts.deployer, parseEther("0.2"));

    await decisionEngine.propose(targets, values, signatures, calldatas, "");
  });

  it("quorumVotes behaves in a sane way", async () => {
    expect(await decisionEngine.quorumVotes()).to.equal(parseEther("4"));
  });

  it("Create, vote, and execute", async () => {
    await token.generateTokens(accounts.deployer, parseEther("1"));

    const { proposalId } = await createAProposal(
      decisionEngine,
      token,
      accounts.address1
    );
    let onChainProposalState;
    let onChainProposal;

    // inspect the proposal state
    onChainProposal = await decisionEngine.proposals(proposalId);
    expect(onChainProposal.id).to.equal(proposalId);
    onChainProposalState = await decisionEngine.state(proposalId);
    expect(onChainProposalState).to.equal(STATE_PENDING);

    // proposal needs to be activated before voting, so we mine a block
    await mineABlock();

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
      await mineABlock();
    }

    onChainProposalState = await decisionEngine.state(proposalId);

    expect(await token.balanceOf(accounts.address1)).to.equal(0);
    const tx = await decisionEngine.execute(proposalId);
    const receipt = await tx.wait();
    expect(receipt.events[receipt.events.length - 1].event).to.equal(
      "ProposalExecuted"
    );
    // todo: check if the mock has been called
  });
});
