/// <reference types="bun" />

import { createVlayerClient } from "@vlayer/sdk";
import proverSpec from "../out/SophosProver.sol/SophosProver";
import verifierSpec from "../out/SophosVerifier.sol/SophosVerifier";
import {
  getConfig,
  createContext,
  deployVlayerContracts,
  writeEnvVariables,
} from "@vlayer/sdk/config";

const URL_TO_PROVE = "https://lichess.extypen.me/game/export/AKeUQ7nX";

const config = getConfig();
const { chain, ethClient, account, proverUrl, confirmations, notaryUrl } =
  createContext(config);

if (!account) {
  throw new Error(
    "No account found make sure EXAMPLES_TEST_PRIVATE_KEY is set in your environment variables",
  );
}

const vlayer = createVlayerClient({
  url: proverUrl,
  token: config.token,
});

async function generateWebProof() {
  console.log("⏳ Generating web proof...");
  const result =
    await Bun.$`vlayer web-proof-fetch --notary ${notaryUrl} --url ${URL_TO_PROVE}`;
  return result.stdout.toString();
}

console.log("⏳ Deploying contracts...");

const { prover, verifier } = await deployVlayerContracts({
  proverSpec,
  verifierSpec,
  proverArgs: [],
  verifierArgs: [],
});

await writeEnvVariables(".env", {
  VITE_PROVER_ADDRESS: prover,
  VITE_VERIFIER_ADDRESS: verifier,
});

console.log("✅ Contracts deployed", { prover, verifier });

let webProof = await generateWebProof();

console.log("⏳ Proving...");
const hash = await vlayer.prove({
  address: prover,
  functionName: "main",
  proverAbi: proverSpec.abi,
  args: [
    {
      webProofJson: webProof.toString(),
    },
  ],
  chainId: chain.id,
  gasLimit: config.gasLimit,
});
const result = await vlayer.waitForProvingResult({ hash });
const [proof, moves] = result;
console.log("✅ Proof generated");

console.log(proof)

console.log("⏳ Verifying...");

// Workaround for viem estimating gas with `latest` block causing future block assumptions to fail on slower chains like mainnet/sepolia
const gas = await ethClient.estimateContractGas({
  address: verifier,
  abi: verifierSpec.abi,
  functionName: "verify",
  args: [proof, moves],
  account,
  blockTag: "pending",
});

const txHash = await ethClient.writeContract({
  address: verifier,
  abi: verifierSpec.abi,
  functionName: "verify",
  args: [proof, moves],
  chain,
  account,
  gas,
});

await ethClient.waitForTransactionReceipt({
  hash: txHash,
  confirmations,
  retryCount: 60,
  retryDelay: 1000,
});

console.log("✅ Verified!");
