import { task, types } from "hardhat/config";

import { deployDAO, deploySafe } from "../scripts";
import { IDAOConfig, IDecisionEngineConfig } from "../scripts/types";

const decisionEngineConfig: IDecisionEngineConfig = {
  type: "DecisionEngine01",
  proposalThreshold: 1, // in percentage
  quorumVotes: 4, // in percentage
  votingPeriod: 10, // in blocks
  votingDelay: 1,
  proposalMaxOperations: 10,
};

task("play", "play")
  // .addParam(
  //   "configFile",
  //   "File with configuration info",
  //   "./config/demo.json",
  //   types.string
  // )
  .setAction(async (taskArgs, hre) => {
    console.log("----");
    const { deployer, address1 } = await hre.getNamedAccounts();
    console.log("deploy with deployer as owner", deployer);
    const deployment = await hre.deployments.deploy("Comp", {
      from: deployer,
      log: true,
      args: [deployer],
      skipIfAlreadyDeployed: false,
    });
    console.log("Comp deployment address", deployment.address);
    console.log("now deploy with another ag", address1);
    const deployment1 = await hre.deployments.deploy("Comp", {
      from: deployer,
      log: true,
      args: [address1],
      skipIfAlreadyDeployed: false,
    });

    console.log("Comp deployment address", deployment1.address);
    hre.deployments.save("Comp1", deployment1);
    // console.log(hre.tasks);
    return;
    const CompAdapter = await hre.ethers.getContractFactory("CompAdapter");
    const Comp = await hre.ethers.getContractFactory("Comp");
    const token = await Comp.deploy(deployer);
    const tokenAdapter = await CompAdapter.deploy(token.address);

    const safeDeployment = await deploySafe(hre, {});
    const safe = safeDeployment.safe;

    const daoConfig: IDAOConfig = {
      safe: { address: safe.address },
      token: { address: tokenAdapter.address },
      decisionEngine: decisionEngineConfig,
    };

    const result = await deployDAO(hre, daoConfig);

    console.log(`Deployed DAO with the following settings`);
    console.log(`safe: ${result.safe.address}`);
    console.log(`decisionEngine: ${result.decisionEngine.address}`);
    console.log(`token: ${result.token.address}`);
  });

module.exports = {};
