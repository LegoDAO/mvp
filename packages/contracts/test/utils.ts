import { Contract, Transaction } from "ethers";
import hre, { ethers, deployments } from "hardhat";

import { deployDAO } from "../scripts/deployDAO";
import { deploySafe } from "../scripts/deploySafe";
import { IDAOConfig, IDecisionEngineConfig } from "../scripts/types";
import { encodeParameters } from "../scripts/utils";

export async function exampleProposalData(): Promise<any> {
  const fixture = await hre.deployments.fixture(["MockContract"]);
  const mock = await ethers.getContractAt(
    "MockContract",
    fixture.MockContract.address
  );

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

export async function createExampleDAO(): Promise<any> {
  const fixture = await deployments.fixture(["MiniMeToken"]);
  const token = await ethers.getContractAt(
    "MiniMeToken",
    fixture.MiniMeToken.address
  );
  const safeDeployment = await deploySafe(hre, {});
  const safe = safeDeployment.safe;

  const daoConfig: IDAOConfig = {
    safe: { address: safe.address },
    token: { address: token.address },
    decisionEngine: decisionEngineConfig,
  };

  const deployment = await deployDAO(hre, daoConfig);
  return deployment;
}
