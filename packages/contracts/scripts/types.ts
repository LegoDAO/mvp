import { Contract, BigNumber } from "ethers";

export type IDAOConfig = {
  token: IDeployedToken;
  safe: IDeployedSafe;
  decisionEngine: IDecisionEngineConfig;
};

export type IDecisionEngineConfig = {
  type: string;
  proposalThreshold: number;
  quorumVotes: number; // in percentage
  votingPeriod: number; // in blocks
  votingDelay: number;
  proposalMaxOperations: number;
};

type ITokenType = "Minime" | "ERC20Snapshot" | "Compound";

type IDeployedToken = {
  address: string;
  tokenType?: ITokenType;
};

type IDeployedSafe = {
  address: string;
};

export type ITokenConfig = {
  name: string;
  tokenType: ITokenType;
};

export type ILegoDeployment = {
  token: Contract;
  tokenAdapter?: Contract;
  safe: Contract;
  decisionEngine: Contract;
};

export type ISafeConfig = {};
