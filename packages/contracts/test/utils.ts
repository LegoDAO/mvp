import { Contract, Transaction } from "ethers";
import { encodeParameters } from "../scripts/utils";
import hre, { ethers, deployments } from "hardhat";
import { IDAOConfig, IDecisionEngineConfig } from "../scripts/types";
import { deployDAO } from "../scripts/deployDAO";
import { deploySafe } from "../scripts/deploySafe";

export async function exampleProposalData() {
  const fixture = await hre.deployments.fixture(["MockContract"]);
  const mock = await ethers.getContractAt(
    "MockContract",
    fixture.MockContract.address
  );
  const complexInterface = await deployments.getArtifact("ComplexInterface");
  const complex = await ethers.getContractAt("ComplexInterface", mock.address);

  await mock.givenAnyReturn(encodeParameters(["bool"], ["true"]));

  const proposalData = {
    targets: [mock.address],
    values: ["0"],
    signatures: ["acceptAdressUintReturnBool(address,uint256)"],
    calldatas: [
      encodeParameters(
        ["address", "uint"],
        ["0x0000000000000000000000000000000000000000", "10"]
      ),
    ],
  };
  return proposalData;
}
export async function createAProposal(
  decisionEngine: Contract,
  token: Contract,
  to: string
): Promise<{ tx: Transaction; proposalId: string }> {
  let tx;
  let receipt;

  const proposalData = await exampleProposalData();

  const { targets, values, signatures, calldatas } = proposalData;

  tx = await decisionEngine.propose(
    targets,
    values,
    signatures,
    calldatas,
    "hello world"
  );
  receipt = await tx.wait();
  const event = receipt.events[0];
  const proposalId = event.args.id;
  return { tx, proposalId };
}

export const NAY = 0;
export const YAY = 1;

export async function mineABlock() {
  return ethers.provider.send("evm_mine", []);
}

export const STATE_PENDING = 0;
export const STATE_ACTIVE = 1;

export const decisionEngineConfig: IDecisionEngineConfig = {
  type: "DecisionEngine01",
  proposalThreshold: 1, // in percentage
  quorumVotes: 4, // in percentage
  votingPeriod: 10, // in blocks
  votingDelay: 1,
  proposalMaxOperations: 10,
};

export async function createExampleDAO() {
  const fixture = await deployments.fixture(["MiniMeToken"]);
  const token = await ethers.getContractAt(
    "MiniMeToken",
    fixture.MiniMeToken.address
  );
  const safeDeployment = await deploySafe({});
  const safe = safeDeployment.safe;

  const daoConfig: IDAOConfig = {
    safe: { address: safe.address },
    token: { address: token.address },
    decisionEngine: decisionEngineConfig,
  };

  const deployment = await deployDAO(daoConfig);
  return deployment;
}
