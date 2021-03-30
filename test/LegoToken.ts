import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { Contract } from "ethers";

// eslint-disable-next-line func-names
describe("Token contract", function () {
  let token: Contract;
  let owner: any;
  let address1: any;
  this.beforeAll(async () => {
    [owner, address1] = await ethers.getSigners();
  });

  this.beforeEach(async () => {
    const fixture = await deployments.fixture(["LegoToken"]);
    token = await ethers.getContractAt("LegoToken", fixture.LegoToken.address);
  });

  it("Deployment should assign 2M tokens to the owner", async () => {
    const ownerBalance = await token.balanceOf(owner.address);
    expect(await token.totalSupply()).to.equal(ownerBalance);
    expect(ownerBalance).to.equal(ethers.utils.parseEther("2000000"));
  });

  it("Owner can mint up to 10M tokens", async () => {
    // 2M are minted on deployment
    await token.mint(owner.address, ethers.utils.parseEther("1"));
    expect(await token.totalSupply()).to.equal(
      ethers.utils.parseEther("2000001")
    );
    await token.mint(owner.address, ethers.utils.parseEther("7999999"));
    expect(await token.totalSupply()).to.equal(
      ethers.utils.parseEther("10000000")
    );
    await expect(
      token.mint(owner.address, ethers.utils.parseEther("1"))
    ).to.be.revertedWith("cap exceeded");
  });

  it("Only Owner can mint", async () => {
    // 2M are minted on deployment
    await expect(
      token.connect(address1).mint(owner.address, ethers.utils.parseEther("1"))
    ).to.be.revertedWith("caller is not the owner");
  });

  it("Contract is snapshottable", async () => {
    // take snapshot 1
    await expect(token.snapshot()).to.emit(token, "Snapshot").withArgs("1");
    // send some tokens to address 1 and take snapshot 2
    const delta = "314";
    await token.transfer(address1.address, delta);
    await expect(token.snapshot()).to.emit(token, "Snapshot").withArgs("2");
    expect(await token.balanceOfAt(address1.address, "1")).to.be.equal(0);
    expect(await token.balanceOfAt(address1.address, "2")).to.be.equal(delta);
  });
});
