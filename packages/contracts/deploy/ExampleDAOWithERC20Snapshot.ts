/**  
An example Lego DAO: 
 - Gnosis Safe 
 - Decision engine: a fork of Compound Governor
 - token: An OpenZeppelin ERC20 Snapshot tokens 

Permissions:
 - The Decision Engine is a signer of of 1/2 multisig - the other owner is the deployer
 - The Token is owned by the Safe
 - The contract deployer holds the complete supply of 1000 Minime tokens

*/

import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, Deployment } from "hardhat-deploy/types";
import { safeAddOwner } from "../scripts/utils";
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
  // we use the predefined
  const safeDeployment: Deployment = await deployments.get("GnosisSafe");
  const safe = await ethers.getContractAt("GnosisSafe", safeDeployment.address);
  const tokenDeployment = await deploy("ERC20SnapshotExample", {
    from: deployer,
  });

  const daoConfig: IDAOConfig = {
    safe: { address: safeDeployment.address },
    token: { address: tokenDeployment.address, tokenType: "ERC20Snapshot" },
    decisionEngine: decisionEngineConfig,
  };

  const token = await ethers.getContractAt(
    "ERC20SnapshotExample",
    tokenDeployment.address
  );

  // generate some tokens before transfering ownership of the token
  await token.mint(deployer, ethers.utils.parseEther("1"));

  await deployDAO(hre, daoConfig);
  // make the safe the solo owner of the token
  // await token.transferOwnership(safe.address);
};
export default func;
func.tags = ["ExampleDAOWithERC20Snapshot"];
func.dependencies = ["ERC20SnapshotExample", "GnosisSafe"];
