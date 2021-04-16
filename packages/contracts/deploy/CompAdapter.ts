import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, Deployment } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  // we use the predefined
  const compDeployment: Deployment = await deployments.get("Comp");
  const compAdapterDeployment = await deploy("CompAdapter", {
    from: deployer,
    args: [compDeployment.address],
  });
};
export default func;
func.tags = ["CompAdapter"];
func.dependencies = ["Comp"];
