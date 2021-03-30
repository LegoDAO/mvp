import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ZEROADDRESS } from "../scripts/utils";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const factoryDeployment = await deploy("MiniMeTokenFactory", {
    from: deployer,
  });
  await deploy("MiniMeToken", {
    from: deployer,
    log: true,
    args: [
      /// @param _tokenFactory The address of the MiniMeTokenFactory contract that
      ///  will create the Clone token contracts, the token factory needs to be
      ///  deployed first
      factoryDeployment.address,
      /// @param _parentToken Address of the parent token, set to 0x0 if it is a
      ///  new token
      ZEROADDRESS,
      /// @param _parentSnapShotBlock Block of the parent token that will
      ///  determine the initial distribution of the clone token, set to 0 if it
      ///  is a new token
      0,
      /// @param _tokenName Name of the new token
      "MiniMe Test Token",
      /// @param _decimalUnits Number of decimals of the new token
      18,
      /// @param _tokenSymbol Token Symbol for the new token
      "MMT",
      /// @param _transfersEnabled If true, tokens will be able to be transferre
      true,
    ],
  });
};
export default func;
func.tags = ["MiniMeToken"];
