import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const tokenDeployment = await deploy("ERC20SnapshotExample", {
    from: deployer,
  });

  const token = await ethers.getContractAt(
    "ERC20SnapshotExample",
    tokenDeployment.address
  );
};

export default func;
func.tags = ["ERC20SnapshotExample"];
func.dependencies = [];
