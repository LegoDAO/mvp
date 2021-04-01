import { ISafeConfig } from "./types";
import { Contract } from "ethers";

export async function deploySafe(
  safeConfig: ISafeConfig
): Promise<{ safe: Contract }> {
  throw Error("TBD");
}
