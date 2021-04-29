import { task, types } from "hardhat/config";

import { deployDAO, deploySafe } from "../scripts";
import { IDAOConfig, IDecisionEngineConfig } from "../scripts/types";

const decisionEngineConfig: IDecisionEngineConfig = {
  type: "GovernorBravo",
  proposalThreshold: 1, // in percentage
  quorumVotes: 4, // in percentage
  votingPeriod: 10, // in blocks
  votingDelay: 2,
  proposalMaxOperations: 10,
};

task("deployDAO", "Create a DAO")
  .addParam(
    "configFile",
    "File with configuration info",
    "./config/demo.json",
    types.string
  )
  .setAction(async (taskArgs, hre) => {
    console.log("deploying a DAO");
    await hre.deployments.run(["Comp", "CompAdapter", "GnosisSafe"]);
    const deployments = await hre.deployments.all();
    const token = deployments.Comp;
    const safe = deployments.GnosisSafe;
    const tokenAdapter = deployments.CompAdapter;

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

    console.log(
      await hre.run("checkDAO", {
        safe: result.safe.address,
        decisionEngine: result.decisionEngine.address,
        token: result.token.address,
      })
    );
  });

module.exports = {};
