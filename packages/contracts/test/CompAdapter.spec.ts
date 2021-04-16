import { ethers, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { Contract, Transaction, Signer } from "ethers";
import { mineABlock } from "./utils";

const parseEther = ethers.utils.parseEther;

describe("Comp Adapter", () => {
  let token: Contract;
  let tokenAdapter: Contract;
  let deployer: any;
  let address1: string;
  let accounts: any;
  let signers: Signer[];
  let signer: Signer;
  let signer1: Signer;

  beforeEach(async () => {
    accounts = await getNamedAccounts();
    deployer = accounts.deployer;
    address1 = accounts.address1;
    const CompAdapter = await ethers.getContractFactory("CompAdapter");
    const Comp = await ethers.getContractFactory("Comp");
    token = await Comp.deploy(deployer);
    tokenAdapter = await CompAdapter.deploy(token.address);
    signers = await ethers.getSigners();
    signer = signers[0];
    signer1 = signers[1];
  });

  it("tokenAdapter works in a sane way", async () => {
    const address1 = signer1.getAddress();
    // we must first delegate before we can read the token balances
    const tokenAsSigner1 = await token.connect(signer1);
    await tokenAsSigner1.delegate(accounts.address1);
    await token.transfer(address1, 1);
    expect(await token.balanceOf(address1)).to.equal(1);
    const tx = await token.transfer(address1, 5);
    let blockNumber = tx.blockNumber;
    await mineABlock();
    expect(await token.getPriorVotes(address1, blockNumber - 1)).to.equal(1);
    expect(await tokenAdapter.balanceOfAt(address1, blockNumber - 1)).to.equal(
      1
    );
    expect(await token.getPriorVotes(address1, blockNumber)).to.equal(6);
    expect(await tokenAdapter.balanceOfAt(address1, blockNumber)).to.equal(6);
    expect(await tokenAdapter.totalSupplyAt(blockNumber)).to.equal(
      await token.totalSupply()
    );
  });
});
