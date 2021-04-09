import { expect } from "chai";
import { ethers, deployments, getNamedAccounts } from "hardhat";
import { Address } from "hardhat-deploy/types";
import { Contract } from "ethers";
import { it } from "@ungap/global-this";

// eslint-disable-next-line func-names
describe("Gnosis safe contract", function () {
  let safe: Contract;
  let accounts: {
    [name: string]: Address;
  };

  this.beforeEach(async () => {
    const fixture = await deployments.fixture(["GnosisSafe"]);
    safe = await ethers.getContractAt("GnosisSafe", fixture.GnosisSafe.address);
    accounts = await getNamedAccounts();
  });

  it("Safe should have sane settings", async () => {
    // we probably want to deploy different safes here..
    expect(await safe.getThreshold()).to.be.equal(1);
    expect((await safe.getOwners())[0]).to.be.equal(accounts.deployer);
  });
});
