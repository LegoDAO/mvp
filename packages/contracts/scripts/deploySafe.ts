import { ISafeConfig } from "./types";
import { Contract } from "ethers";
import hre, { ethers } from "hardhat";

export async function deploySafe(
  safeConfig: ISafeConfig
): Promise<{ safe: Contract }> {
  const { deployer } = await hre.getNamedAccounts();
  const ZEROADDRESS = "0x0000000000000000000000000000000000000000";
  const gnosisSafeSettings: {
    owners: string[];
    threshold: number;
  } = {
    owners: [deployer],
    threshold: 1,
  };
  const GnosisSafeProxyFactory = await ethers.getContractFactory(
    "GnosisSafeProxyFactory"
  );
  const GnosisSafe = await ethers.getContractFactory("GnosisSafe");
  const gnosisSafeProxyFactory = await GnosisSafeProxyFactory.deploy();
  const gnosisSafe = await GnosisSafe.deploy();
  const tx = await gnosisSafeProxyFactory.createProxy(gnosisSafe.address, 0);
  const receipt = await tx.wait();
  const proxyAddress = receipt.events[0].args["proxy"];
  const safe = await ethers.getContractAt("GnosisSafe", proxyAddress);
  const { owners, threshold } = gnosisSafeSettings;

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
  return { safe };
}
