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

describe("DecisionEngine01 configuration and voting power", () => {
  let decisionEngine: Contract;
  let safe: Contract;
  let token: Contract;
  let accounts: any;
  let signers: any[];
  let signer: any;
  let fixture: any;

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
  });

  it("_setVotingDelay works", async () => {
    // the decisionEngins "safe" address is as expected
    
    expect(await decisionEngine.MIN_VOTING_DELAY()).to.be.equal(1);
    expect(await decisionEngine.MAX_VOTING_DELAY()).to.be.equal(40320);
    await decisionEngine._setVotingDelay(1) 
    expect(await decisionEngine.votingDelay()).to.be.equal(1);
    await decisionEngine._setVotingDelay(100) 
    expect(await decisionEngine.votingDelay()).to.be.equal(100);
    
    await expect(decisionEngine._setVotingDelay(0)).to.be.revertedWith(
      "invalid voting delay"
    );
    await expect(decisionEngine._setVotingDelay(1000000)).to.be.revertedWith(
      "invalid voting delay"
    );
  });

  it("_setVotingPeriod works", async () => {
    expect(await decisionEngine.MIN_VOTING_PERIOD()).to.be.equal(10);
    expect(await decisionEngine.MAX_VOTING_PERIOD()).to.be.equal(80640);
    await decisionEngine._setVotingPeriod(10) 
    expect(await decisionEngine.votingPeriod()).to.be.equal(10);
    await decisionEngine._setVotingPeriod(11) 
    expect(await decisionEngine.votingPeriod()).to.be.equal(11);
    await decisionEngine._setVotingPeriod(80640) 
    expect(await decisionEngine.votingPeriod()).to.be.equal(80640);
    
    await expect(decisionEngine._setVotingPeriod(0)).to.be.revertedWith(
      "invalid voting period"
    );
    await expect(decisionEngine._setVotingPeriod(80641)).to.be.revertedWith(
      "invalid voting period"
    );
    await expect(decisionEngine._setVotingPeriod(1000000)).to.be.revertedWith(
      "invalid voting period"
    );
  });

  it("_setProposalThreshold works", async () => {
    expect(await decisionEngine.MIN_PROPOSAL_THRESHOLD()).to.be.equal(0);
    expect(await decisionEngine.MAX_PROPOSAL_THRESHOLD()).to.be.equal(100);
    await decisionEngine._setProposalThreshold(1) 
    expect(await decisionEngine.proposalThreshold()).to.be.equal(1);
    await decisionEngine._setProposalThreshold(100) 
    expect(await decisionEngine.proposalThreshold()).to.be.equal(100);
    
    await expect(decisionEngine._setProposalThreshold(101)).to.be.revertedWith(
      "invalid proposal threshold"
    );
  });

  it("_setQuorumVotes works", async () => {
    expect(await decisionEngine.MIN_QUORUM_VOTES()).to.be.equal(0);
    expect(await decisionEngine.MAX_QUORUM_VOTES()).to.be.equal(100);
    await decisionEngine._setQuorumVotes(1) 
    expect(await decisionEngine.quorumVotes()).to.be.equal(1);
    await decisionEngine._setQuorumVotes(100) 
    expect(await decisionEngine.quorumVotes()).to.be.equal(100);
    
    await expect(decisionEngine._setQuorumVotes(101)).to.be.revertedWith(
      "invalid quorum"
    );
    await expect(decisionEngine._setQuorumVotes(1000000)).to.be.revertedWith(
      "invalid quorum"
    );
  });

  it("votingPower works", async () => {
    expect(await decisionEngine.votingPower(0, 100)).to.be.equal(0);
    expect(await decisionEngine.votingPower(1, 100)).to.be.equal(1);
    expect(await decisionEngine.votingPower(10, 100)).to.be.equal(10);
    expect(await decisionEngine.votingPower(100, 100)).to.be.equal(100);
    expect(await decisionEngine.votingPower(1000001, 10000000)).to.be.equal(10);
    expect(await decisionEngine.votingPower(1100001, 10000000)).to.be.equal(11);
    expect(await decisionEngine.votingPower(1, 2)).to.be.equal(50);
    expect(await decisionEngine.votingPower(100, 200)).to.be.equal(50);
  });
})
