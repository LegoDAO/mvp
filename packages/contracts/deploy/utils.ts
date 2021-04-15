import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { safeAddOwner } from "../scripts/utils";
import { IDAOConfig } from "../scripts/types";

export async function deployDAO(
  hre: HardhatRuntimeEnvironment,
  daoConfig: IDAOConfig
) {
  const deploy = hre.deployments.deploy;
  const { deployer } = await hre.getNamedAccounts();
  const deployment = await deploy("DecisionEngine01", {
    from: deployer,
    log: true,
    proxy: true,
    args: [deployer],
  });

  const safe = await ethers.getContractAt("GnosisSafe", daoConfig.safe.address);
  let tokenType: number;
  if (daoConfig.token.tokenType === "Minime") {
    tokenType = 0;
  } else {
    tokenType = 1;
  }
  const token = await ethers.getContractAt(
    "MiniMeToken",
    daoConfig.token.address
  );

  const decisionEngine = await ethers.getContractAt(
    "DecisionEngine01",
    deployment.address
  );
  await decisionEngine.initialize(
    deployer, // the owneryy
    daoConfig.safe.address, // Gnosis Safe address
    daoConfig.token.address,
    tokenType,
    daoConfig.decisionEngine.votingPeriod,
    daoConfig.decisionEngine.votingDelay,
    ethers.utils.parseEther(
      daoConfig.decisionEngine.proposalThreshold.toString()
    ),
    ethers.utils.parseEther(daoConfig.decisionEngine.quorumVotes.toString())
  );

  // add the decision engine as a signer to the contract
  await safeAddOwner(
    safe, // safe
    deployer, // prevOwner
    deployment.address.toLowerCase(), // the Decision Engine's address
    1 // the threshold for the multisig
  );

  // make the safe the solo owner of the token
  if (daoConfig.token.tokenType === "Minime") {
    const token = await ethers.getContractAt(
      "MiniMeToken",
      daoConfig.token.address
    );
    await token.changeController(safe.address);
  } else {
    const token = await ethers.getContractAt(
      "ERC20SnapshotExample",
      daoConfig.token.address
    );
    await token.transferOwnership(safe.address);
  }

  return;
}
