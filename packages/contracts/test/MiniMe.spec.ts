import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { Contract } from "ethers";

// eslint-disable-next-line func-names
describe("MinimeToken contract", function () {
  let token: Contract;
  let owner: any;
  let address1: any;

  this.beforeAll(async () => {
    [owner, address1] = await ethers.getSigners();
  });

  this.beforeEach(async () => {
    const fixture = await deployments.fixture(["MiniMeToken"]);
    token = await ethers.getContractAt(
      "MiniMeToken",
      fixture.MiniMeToken.address
    );
    await token.generateTokens(owner.address, 1000);
  });

  it("setup is sane", async () => {
    expect(await token.balanceOf(owner.address)).to.be.equal(1000);
  });

  it("Contract is snapshottable", async () => {
    const delta = 314;
    const tx = await (await token.transfer(address1.address, delta)).wait();
    const blockNumberAfter = tx.blockNumber;
    const blockNumberBefore = blockNumberAfter - 1;
    expect(await token.balanceOfAt(owner.address, blockNumberBefore)).to.equal(
      1000
    );
    expect(
      await token.balanceOfAt(address1.address, blockNumberBefore)
    ).to.equal(0);
    expect(await token.totalSupplyAt(blockNumberBefore)).to.equal(1000);

    expect(
      await token.balanceOfAt(address1.address, blockNumberAfter)
    ).to.be.equal(delta);
    expect(
      await token.balanceOfAt(owner.address, blockNumberAfter)
    ).to.be.equal(1000 - delta);
    expect(await token.totalSupplyAt(blockNumberBefore)).to.equal(1000);
  });
});
