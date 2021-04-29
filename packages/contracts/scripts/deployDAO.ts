import { HardhatRuntimeEnvironment } from "hardhat/types";

import { IDAOConfig, ILegoDeployment } from "./types";
import { safeAddOwner } from "./utils";

export async function deployDAO(
  hre: HardhatRuntimeEnvironment,
  daoConfig: IDAOConfig
): Promise<ILegoDeployment> {
  let tokenAdapter;
  const DecisionEngine = await hre.ethers.getContractFactory(
    "DecisionEngine01"
  );
  const decisionEngine = await DecisionEngine.deploy();
  const safe = await hre.ethers.getContractAt(
    "GnosisSafe",
    daoConfig.safe.address
  );
  let tokenType: number;

  if (daoConfig.token.tokenType === "Compound") {
    const compoundAdapter = await (
      await hre.ethers.getContractFactory("CompAdapter")
    ).deploy(daoConfig.token.address);
    daoConfig.token.address = compoundAdapter.address;
    tokenType = 0;
  } else if (daoConfig.token.tokenType === "Minime") {
    tokenType = 0;
  } else if (daoConfig.token.tokenType === "ERC20Snapshot") {
    tokenType = 1;
  } else {
    tokenType = 0;
  }
  const token = await hre.ethers.getContractAt(
    "MiniMeToken",
    daoConfig.token.address
  );

  const deployer = await DecisionEngine.signer.getAddress();

  await decisionEngine.initialize(
    deployer, // the owner
    daoConfig.safe.address, // Gnosis Safe address
    daoConfig.token.address,
    tokenType,
    daoConfig.decisionEngine.votingPeriod,
    daoConfig.decisionEngine.votingDelay,
    hre.ethers.utils.parseEther(
      daoConfig.decisionEngine.proposalThreshold.toString()
    ),
    hre.ethers.utils.parseEther(daoConfig.decisionEngine.quorumVotes.toString())
  );

  // add the decision engine as a signer to the contract
  await safeAddOwner(
    safe, // safe
    deployer, // the owner
    decisionEngine.address, // the Decision Engine's address
    1 // the threshold for the multisig
  );

  return { decisionEngine, token, safe, tokenAdapter };
}
