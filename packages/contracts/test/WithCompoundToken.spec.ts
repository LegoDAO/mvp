import { ethers, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { IDAOConfig, IDecisionEngineConfig } from "../scripts/types";
import { Contract, Signer } from "ethers";
import { deployDAO } from "../scripts/deployDAO";
import { deploySafe } from "../scripts/deploySafe";
import { mineABlock, STATE_ACTIVE, STATE_PENDING } from "./utils";
import { encodeParameters } from "../scripts/utils";

const parseEther = ethers.utils.parseEther;

const decisionEngineConfig: IDecisionEngineConfig = {
  type: "DecisionEngine01",
  proposalThreshold: 1, // in percentage
  quorumVotes: 4, // in percentage
  votingPeriod: 10, // in blocks
  votingDelay: 1,
  proposalMaxOperations: 10,
};

describe("Example DAO with Comp Token", () => {
  let decisionEngine: Contract;
  let safe: Contract;
  let token: Contract;
  let tokenAdapter: Contract;
  let accounts: any;
  let signers: Signer[];
  let signer: Signer;
  let signer1: Signer;
  let fixture: any;
  let NOOP_PROPOSAL: any;

  beforeEach(async () => {
    const { deployer } = await getNamedAccounts();
    const CompAdapter = await ethers.getContractFactory("CompAdapter");
    const Comp = await ethers.getContractFactory("Comp");
    token = await Comp.deploy(deployer);
    tokenAdapter = await CompAdapter.deploy(token.address);

    const safeDeployment = await deploySafe({});
    safe = safeDeployment.safe;
    const daoConfig: IDAOConfig = {
      safe: { address: safe.address },
      token: { address: tokenAdapter.address },
      decisionEngine: decisionEngineConfig,
    };

    const deployment = await deployDAO(daoConfig);
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
    await token.delegate(accounts.deployer);
    const tokenAsSigner1 = token.connect(signer1);
    await tokenAsSigner1.delegate(await signer1.getAddress());
  });

  it("DAO setup is sane", async () => {
    // the decisionEngins "safe" address is as expected
    expect(await decisionEngine.safe()).to.be.equal(safe.address);
    // the decisionEngins "token" address is the tokenAdapter
    expect(await decisionEngine.token()).to.be.equal(tokenAdapter.address);

    // the tokenAdapter adapts our token
    expect(await tokenAdapter.adapted()).to.equal(token.address);

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

  it("proposalThreshold works sane way", async () => {
    // the threshold for proposing is 10%
    expect(await decisionEngine.proposalThreshold()).to.equal(parseEther("1"));

    // deployer has all the tokens and can propose
    const { targets, values, signatures, calldatas } = NOOP_PROPOSAL;
    await decisionEngine.propose(targets, values, signatures, calldatas, "");

    // we now transfer a majority of tokens to signer1
    const tx = await token.transfer(
      signer1.getAddress(),
      parseEther("9990000")
    );
    const blockNumber = tx.blockNumber;
    await mineABlock();
    await mineABlock();
    await mineABlock();
    await mineABlock();
    expect(
      await tokenAdapter.balanceOfAt(await signer1.getAddress(), blockNumber)
    ).to.equal(parseEther("9990000"));
    expect(
      await tokenAdapter.balanceOfAt(accounts.deployer, blockNumber)
    ).to.equal(parseEther("10000"));

    // proposals by deployer will not be reverted as she does not have enough tokens
    const txPropose = decisionEngine.propose(
      targets,
      values,
      signatures,
      calldatas,
      ""
    );
    await expect(txPropose).to.be.revertedWith(
      "proposer votes below proposal threshold"
    );
  });
});
