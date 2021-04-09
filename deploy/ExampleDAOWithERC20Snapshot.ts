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
import { IDAOConfig } from "../scripts/types";

const DaoConfig: IDAOConfig = {
  token: {
    name: "ERC20SnapshotExample",
    tokenType: "ERC20Snapshot",
  },
  decisionEngine: {
    type: "DecisionEngine01",
    proposalThreshold: 10, // in percentage
    quorumVotes: 4, // in percentage
    votingPeriod: 10, // in blocks
    votingDelay: 1,
    proposalMaxOperations: 10,
  },
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

  const token = await ethers.getContractAt(
    "ERC20SnapshotExample",
    tokenDeployment.address
  );

  let tokenType;
  if (DaoConfig.token.tokenType === "Minime") {
    tokenType = 0;
  } else if (DaoConfig.token.tokenType === "ERC20Snapshot") {
    tokenType = 1;
  } else {
    throw Error(`Unknown token type: "${DaoConfig.token.tokenType}"`);
  }
  const deployment = await deploy("DecisionEngine01", {
    from: deployer,
    log: true,
    proxy: true
  });

  const decisionEngine = await ethers.getContractAt("DecisionEngine01", deployment.address)
  await decisionEngine.initialize(
    deployer,
    safe.address, // Gnosis Safe address
    token.address,
    tokenType,
    DaoConfig.decisionEngine.votingPeriod,
    DaoConfig.decisionEngine.votingDelay,
    DaoConfig.decisionEngine.proposalThreshold,
    DaoConfig.decisionEngine.quorumVotes,
  )

  // add the decision engine as a signer to the contract

  await safeAddOwner(
    safe, // safe
    deployer, // prevOwner
    deployment.address.toLowerCase(), // the Decision Engine's address
    1 // the threshold for the multisig
  );

  // generate some tokens before transfering ownership of the token
  await token.mint(deployer, ethers.utils.parseEther("1000"));

  // make the safe the solo owner of the token
  await token.transferOwnership(safe.address);
};
export default func;
func.tags = ["ExampleDAOWithERC20Snapshot"];
func.dependencies = ["ERC20SnapshotExample", "GnosisSafe"];
