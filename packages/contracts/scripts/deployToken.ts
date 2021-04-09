import { ITokenConfig } from "./types";
import { Contract } from "ethers";

export async function deployToken(
  tokenConfig: ITokenConfig
): Promise<{ token: Contract }> {
  throw Error("TBD");
}
