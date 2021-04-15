import { expect } from "chai";
import { ethers, deployments, getNamedAccounts } from "hardhat";
import { Address } from "hardhat-deploy/types";
import { Contract, Signer, utils } from "ethers";
import { it } from "@ungap/global-this";

// eslint-disable-next-line func-names
describe("Gnosis safe contract", function () {
  let safe: Contract;
  let accounts: {
    [name: string]: Address;
  };
  let signers: Signer[];
  let deployer: Signer;

  this.beforeEach(async () => {
    const fixture = await deployments.fixture(["GnosisSafe"]);
    safe = await ethers.getContractAt("GnosisSafe", fixture.GnosisSafe.address);
    accounts = await getNamedAccounts();
    signers = await ethers.getSigners();
    deployer = signers[0];
  });

  it("Safe should have sane settings", async () => {
    // we probably want to deploy different safes here..
    expect(await safe.getThreshold()).to.be.equal(1);
    expect((await safe.getOwners())[0]).to.be.equal(accounts.deployer);

    // console.log(".----------------")
    // console.log(safe.address)
    // console.log(await safe.masterCopy())
    // console.log(".----------------")
    // expect(safe.masterCopy).to.be.not.equal(safe.address)
  });

  it("approveHash and execute using a multisend transaction", async () => {
    // const { safe, multiSend, storageSetter } = await setupTests()
    // await deployer.sendTransaction({to: safe.address, value: utils.parseEther("1")})
    // const userBalance = await hre.ethers.provider.getBalance(user2.address)
    // await expect(await hre.ethers.provider.getBalance(safe.address)).to.be.deep.eq(parseEther("1"))
    // const txs: MetaTransaction[] = [
    //     buildSafeTransaction({to: user2.address, value: parseEther("1"), nonce: 0}),
    //     buildContractCall(storageSetter, "setStorage", ["0xbaddad"], 0, true),
    //     buildContractCall(storageSetter, "setStorage", ["0xbaddad"], 0)
    // ]
    // const safeTx = buildMultiSendSafeTx(multiSend, txs, await safe.nonce())
    // await expect(
    //     executeTx(safe, safeTx, [ await safeApproveHash(user1, safe, safeTx, true) ])
    // ).to.emit(safe, "ExecutionSuccess")
    // await expect(await hre.ethers.provider.getBalance(safe.address)).to.be.deep.eq(parseEther("0"))
    // await expect(await hre.ethers.provider.getBalance(user2.address)).to.be.deep.eq(userBalance.add(parseEther("1")))
    // await expect(
    //     await hre.ethers.provider.getStorageAt(safe.address, "0x4242424242424242424242424242424242424242424242424242424242424242")
    // ).to.be.eq("0x" + "baddad".padEnd(64, "0"))
    // await expect(
    //     await hre.ethers.provider.getStorageAt(storageSetter.address, "0x4242424242424242424242424242424242424242424242424242424242424242")
    // ).to.be.eq("0x" + "baddad".padEnd(64, "0"))
  });
});
