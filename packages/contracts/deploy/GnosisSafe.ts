import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// setup paramaters from https://docs.gnosis.io/safe/docs/contracts_deployment/
// owners - List of Safe owners.
// threshold - Number of required confirmations for a Safe transaction.
// to - Contract address for optional delegate call.
//  data - Data payload for optional delegate call.

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const ZEROADDRESS = "0x0000000000000000000000000000000000000000";
  const gnosisSafeSettings: {
    owners: string[];
    threshold: number;
  } = {
    owners: [deployer],
    threshold: 1,
  };
  const deployment = await deploy("GnosisSafe", {
    from: deployer,
    log: true,
    proxy: true,
  });
  const safe = await ethers.getContractAt("GnosisSafe", deployment.address);
  const { owners, threshold } = gnosisSafeSettings;

  /// @dev Setup function sets initial storage of contract.
  await safe.setup(
    /// @param _owners List of Safe owners.
    owners,
    /// @param _threshold Number of required confirmations for a Safe transaction.
    threshold,
    /// @param to Contract address for optional delegate call.
    ZEROADDRESS,
    /// @param data Data payload for optional delegate call.
    "0x",
    /// @param fallbackHandler Handler for fallback calls to this contract
    // ZEROADDRESS,
    deployer,
    /// @param paymentToken Token that should be used for the payment (0 is ETH)
    ZEROADDRESS,
    /// @param payment Value that should be paid
    0,
    /// @param paymentReceiver Adddress that should receive the payment (or 0 if tx.origin)
    ZEROADDRESS
  );
};

export default func;
func.tags = ["GnosisSafe"];
