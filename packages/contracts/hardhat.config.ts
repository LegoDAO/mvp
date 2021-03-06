import { config as dotEnvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-typechain";
import "hardhat-deploy";
import "hardhat-watcher";
import "solidity-coverage";
import "./tasks";

dotEnvConfig();

const INFURA_API_KEY = process.env.INFURA_API_KEY || "";
const ROPSTEN_PRIVATE_KEY =
  process.env.ROPSTEN_PRIVATE_KEY ||
  "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"; // well known private key
const { ETHERSCAN_API_KEY } = process.env;

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.7.3",
      },
      {
        version: "0.5.7",
      },
      {
        version: "0.5.16",
      },
      {
        version: "0.4.18",
      },
    ],
  },
  networks: {
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [ROPSTEN_PRIVATE_KEY],
    },
    coverage: {
      url: "http://127.0.0.1:8555",
    },
    ganache: {
      url: "http://127.0.0.1:8545",
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    address1: {
      default: 1,
    },
  },
  watcher: {
    test: {
      tasks: ["test"],
      files: ["./contracts", "./deploy", "./scripts", "./test", "./tasks"],
      verbose: true,
    },
  },
};

export default config;
