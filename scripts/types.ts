import { Contract } from "ethers";

export type IDAOConfig = {
  token: IDeployedToken | ITokenConfig;
  decisionEngine: {};
};

type ITokenType = "Minime" | "ERC20Snapshot";

type IDeployedToken = {
  address: string;
  tokenType: ITokenType;
};

export type ITokenConfig = {
  name: string;
  tokenType: ITokenType;
};

export type ILegoDeployment = {
  token: Contract;
  safe: Contract;
  decisionEgine: Contract;
};

export type ISafeConfig = {};
