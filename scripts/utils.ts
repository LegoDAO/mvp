import { Address } from "hardhat-deploy/types";
import { Contract, Transaction } from "ethers";
import { ethers } from "hardhat";

export const ZEROADDRESS = "0x0000000000000000000000000000000000000000";

export const safeSwapOwner = async (
  safe: Contract,
  prevOwner: Address,
  newOwner: Address
) => {
  const sentinel = "0x0000000000000000000000000000000000000001";
  const data = await safe.interface.encodeFunctionData("swapOwner", [
    sentinel,
    prevOwner,
    newOwner,
  ]);
  const sigs =
    `0x000000000000000000000000${prevOwner.replace(
      "0x",
      ""
    )}0000000000000000000000000000000000000000000000000000000000000000` + `01`;
  const tx = await safe.execTransaction(
    safe.address,
    0,
    data,
    0,
    0,
    0,
    0,
    ZEROADDRESS,
    ZEROADDRESS,
    sigs,
    { from: prevOwner }
  );
  const receipt = await tx.wait();
  if (receipt.events[0].event === "ExecutionFailure") {
    throw Error("ExecutionFailure when trying to execute safeSwapOwner(...)");
  }
};

export const safeAddOwner = async (
  safe: Contract,
  prevOwner: Address,
  newOwner: Address,
  threshold: number = 1
) => {
  //     function addOwnerWithThreshold(address owner, uint256 _threshold)

  const data = await safe.interface.encodeFunctionData(
    "addOwnerWithThreshold",
    [newOwner, threshold]
  );
  return safeExecuteByOwner(safe, prevOwner, safe.address, data);
};

export const safeExecuteByOwner = async (
  safe: Contract,
  owner: Address,
  to: Address,
  data: string
) => {
  const sigs =
    `0x000000000000000000000000${owner.replace(
      "0x",
      ""
    )}0000000000000000000000000000000000000000000000000000000000000000` + `01`;

  const tx = await safe.execTransaction(
    to,
    0,
    data,
    0,
    0,
    0,
    0,
    ZEROADDRESS,
    ZEROADDRESS,
    sigs,
    { from: owner }
  );
  const receipt = await tx.wait();
  if (receipt.events[0].event === "ExecutionFailure") {
    throw Error("ExecutionFailure when trying to execute ... ");
  }
};

export function encodeParameters(types: string[], values: string[]) {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
}
