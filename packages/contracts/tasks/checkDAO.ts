import { task, types } from "hardhat/config";

task(
  "checkDAO",
  "Fetch some information about the DAO and do some basis sanity checks"
)
  .addParam("safe", "address of the DAO's safe", undefined, types.string)
  .addParam(
    "decisionEngine",
    "address of the DAO's decisionEngine",
    undefined,
    types.string
  )
  .addParam("token", "address of the DAO's token", undefined, types.string)
  .setAction(async (taskArgs, hre) => {
    const safe = await hre.ethers.getContractAt("GnosisSafe", taskArgs.safe);
    const token = await hre.ethers.getContractAt("MiniMeToken", taskArgs.token);
    const decisionEngine = await hre.ethers.getContractAt(
      "DecisionEngine01",
      taskArgs.decisionEngine
    );
    console.log(`------------- LEGO DAO INFO -----------------------------`);
    const owners = await safe.getOwners();
    console.log(`network: ${hre.network.name}`);
    console.log("--- GNOSIS SAFE INFO ----");
    console.log(`Owners: ${owners}`);
    console.log(`--- Decision Engine @ ${decisionEngine.address} ---`);
    console.log(
      ` - proposalThreshold: ${hre.ethers.utils.formatEther(
        await decisionEngine.proposalThreshold()
      )}%`
    );
    console.log(
      ` - quorumVotes: ${hre.ethers.utils.formatEther(
        await decisionEngine.quorumVotes()
      )}%`
    );
    console.log(` - votingDelay: ${await decisionEngine.votingDelay()} blocks`);
    console.log(
      ` - votingPeriod: ${await decisionEngine.votingPeriod()} blocks`
    );

    console.log(`--- Token @${token.address} ---`);
    console.log("--- Problems ---");
    if (owners.indexOf(taskArgs.decisionEngine) < 0) {
      console.log(
        `WARNING: decision engine at ${decisionEngine.address} is not an owner of the safe`
      );
    }
  });

module.exports = {};
