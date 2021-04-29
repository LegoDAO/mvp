import { Contract } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ISafeConfig } from "./types";
export async function deploySafe(
  hre: HardhatRuntimeEnvironment,
  safeConfig: ISafeConfig
): Promise<{ safe: Contract }> {
  await hre.deployments.run(["GnosisSafe"]);
  const deployments = await hre.deployments.all();
  const safe = await hre.ethers.getContractAt(
    "GnosisSafe",
    deployments.GnosisSafe.address
  );
  return { safe };
}
