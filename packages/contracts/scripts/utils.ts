import { Contract, Transaction, ethers } from "ethers";
import { Address } from "hardhat-deploy/types";

export const ZEROADDRESS = "0x0000000000000000000000000000000000000000";

export async function safeSwapOwner(
  safe: Contract,
  prevOwner: Address,
  newOwner: Address
): Promise<void> {
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
}

export async function safeAddOwner(
  safe: Contract,
  executingOwner: Address,
  newOwner: Address,
  threshold = 1
): Promise<void> {
  //     function addOwnerWithThreshold(address owner, uint256 _threshold)

  const data = await safe.interface.encodeFunctionData(
    "addOwnerWithThreshold",
    [newOwner, threshold]
  );
  return safeExecuteByOwner(safe, executingOwner, safe.address, data);
}

export async function safeExecuteByOwner(
  safe: Contract,
  owner: Address,
  to: Address,
  data: string
): Promise<void> {
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
    throw Error("ExecutionFailure when trying to safeExecuteByOwner");
  }
}

export function encodeParameters(types: string[], values: string[]): string {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
}
