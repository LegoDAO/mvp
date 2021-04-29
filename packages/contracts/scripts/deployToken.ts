import { Contract } from "ethers";

import { ITokenConfig } from "./types";

export async function deployToken(
  tokenConfig: ITokenConfig
): Promise<{ token: Contract }> {
  throw Error("TBD");
}
