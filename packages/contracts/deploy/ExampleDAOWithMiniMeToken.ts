/**  
An example Lego DAO: 
 - Gnosis Safe 
 - Decision engine: a fork of Compound Governor
 - token: Baylina's MiniMe token

Permissions:
 - The Decision Engine is a signer of of 1/2 multisig - the other owner is the deployer
 - The Token is owned ("controlled" in the minime terminology) by the Safe
 - The contract deployer holds the complete supply of 1000 Minime tokens

*/

import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { IDAOConfig, IDecisionEngineConfig } from "../scripts/types";
import { deployDAO } from "./utils";

const decisionEngineConfig: IDecisionEngineConfig = {
  type: "DecisionEngine01",
  proposalThreshold: 1, // in percentage
  quorumVotes: 4, // in percentage
  votingPeriod: 10, // in blocks
  votingDelay: 1,
  proposalMaxOperations: 10,
};

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const tokenDeployment = await deployments.get("MiniMeToken");
  const safeDeployment = await deployments.get("GnosisSafe");

  const daoConfig: IDAOConfig = {
    safe: { address: safeDeployment.address },
    token: { address: tokenDeployment.address, tokenType: "Minime" },
    decisionEngine: decisionEngineConfig,
  };
  const token = await ethers.getContractAt(
    "MiniMeToken",
    daoConfig.token.address
  );
  // generate some tokens before transfering ownership of the token
  await token.generateTokens(deployer, ethers.utils.parseEther("1"));

  await deployDAO(hre, daoConfig);
};

export default func;
func.tags = ["ExampleDAOWithMiniMeToken"];
func.dependencies = ["MiniMeToken", "GnosisSafe"];
