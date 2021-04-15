import { Contract, Transaction } from "ethers";
import { encodeParameters } from "../scripts/utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import { IDAOConfig } from "../scripts/types";

export async function createAProposal(
  decisionEngine: Contract,
  token: Contract,
  to: string
): Promise<{ tx: Transaction; proposalId: string }> {
  let tx;
  let receipt;

  const proposalToMint10TokensToAddress1 = {
    targets: [token.address],
    values: ["0"],
    signatures: ["generateTokens(address,uint256)"],
    calldatas: [encodeParameters(["address", "uint"], [to, "10"])],
  };

  const {
    targets,
    values,
    signatures,
    calldatas,
  } = proposalToMint10TokensToAddress1;

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
