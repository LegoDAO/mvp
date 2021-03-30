// import { HardhatRuntimeEnvironment } from "hardhat/types";
// import { DeployFunction } from "hardhat-deploy/types";

// const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
//   const { deployments, getNamedAccounts } = hre;
//   const { deploy } = deployments;
//   const ZEROADDRESS = "0x0000000000000000000000000000000000000000";
//   const { deployer } = await getNamedAccounts();
//   const legoToken = await deployments.get("LegoToken");
//   await deploy("CompoundGovernor", {
//     from: deployer,
//     log: true,
//     // (address timelock_, address comp_, address guardian_)
//     args: [
//       ZEROADDRESS,
//       legoToken.address,
//       ZEROADDRESS,
//       10, // votingPeriod is 10 blocks
//       4, // quorumVotes is 40%
//     ],
//   });
// };
// export default func;
// func.tags = ["CompoundGovernor"];
// func.dependencies = ["LegoToken"];
