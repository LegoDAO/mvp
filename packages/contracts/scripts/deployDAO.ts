import { IDAOConfig, ILegoDeployment } from "./types";
import hre, { ethers } from "hardhat";
import { safeAddOwner } from "../scripts/utils";

export async function deployDAO(
  daoConfig: IDAOConfig
): Promise<ILegoDeployment> {
  const deploy = hre.deployments.deploy;
  let tokenAdapter;
  const { deployer } = await hre.getNamedAccounts();
  const DecisionEngine = await ethers.getContractFactory("DecisionEngine01");
  const decisionEngine = await DecisionEngine.deploy();

  const safe = await ethers.getContractAt("GnosisSafe", daoConfig.safe.address);
  let tokenType: number;

  if (daoConfig.token.tokenType === "Compound") {
    const compoundAdaptorDeployment = await deploy("CompAdapter", {
      from: deployer,
      args: [daoConfig.token.address],
    });
    daoConfig.token.address = compoundAdaptorDeployment.address;
    tokenType = 0;
  } else if (daoConfig.token.tokenType === "Minime") {
    tokenType = 0;
  } else if (daoConfig.token.tokenType === "ERC20Snapshot") {
    tokenType = 1;
  } else {
    tokenType = 0;
  }
  const token = await ethers.getContractAt(
    "MiniMeToken",
    daoConfig.token.address
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
    decisionEngine.address, // the Decision Engine's address
    1 // the threshold for the multisig
  );

  // make the safe the solo owner of the token
  // if (daoConfig.token.tokenType === "Compound") {
  //   // Comp.sol is using an adaptor, and so will not be controlled by the DAO
  //   // console.log("Compound-style token - not setting the owner");
  // } else if (daoConfig.token.tokenType === "Minime") {
  //   const token = await ethers.getContractAt(
  //     "MiniMeToken",
  //     daoConfig.token.address
  //   );
  //   await token.changeController(safe.address);
  // } else {
  //   const token = await ethers.getContractAt(
  //     "ERC20SnapshotExample",
  //     daoConfig.token.address
  //   );
  //   await token.transferOwnership(safe.address);
  // }

  return { decisionEngine, token, safe, tokenAdapter };
}
