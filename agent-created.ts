// Simplified example from zerodev: https://github.com/zerodevapp/zerodev-examples/blob/main/session-keys/v2/agent-created.ts
require("dotenv").config();
require("dotenv").config({ path: `.env.local`, override: true });
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  addressToEmptyAccount,
  createKernelAccount,
  createKernelAccountClient,
} from "@zerodev/sdk";
import {
  deserializeSessionKeyAccount,
  serializeSessionKeyAccount,
  signerToSessionKeyValidator,
} from "@zerodev/session-key";
import { ENTRYPOINT_ADDRESS_V06 } from "permissionless";
import { Address, Hex, createPublicClient, http, pad } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

if (
  !process.env.BUNDLER_RPC ||
  !process.env.PRIVATE_KEY ||
  !process.env.RECIPIENT_ADDRESS
) {
  throw new Error("BUNDLER_RPC or PRIVATE_KEY or RECIPIENT_ADDRESS is not set");
}

const publicClient = createPublicClient({
  transport: http(process.env.BUNDLER_RPC),
});

const signer = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
const entryPoint = ENTRYPOINT_ADDRESS_V06;

const createSessionKey = async (sessionKeyAddress: Address) => {
  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    entryPoint,
    signer,
  });

  const masterAccount = await createKernelAccount(publicClient, {
    entryPoint,
    plugins: {
      sudo: ecdsaValidator,
    },
  });
  console.log("Account address:", masterAccount.address);

  // Create an "empty account" as the signer -- you only need the public
  // key (address) to do this.
  const emptySessionKeySigner = addressToEmptyAccount(sessionKeyAddress);

  const sessionKeyValidator = await signerToSessionKeyValidator(publicClient, {
    entryPoint,
    signer: emptySessionKeySigner,
    validatorData: {
      permissions: [
        {
          target: process.env.RECIPIENT_ADDRESS as Hex,
          valueLimit: BigInt(100),
        },
      ],
    },
  });

  const sessionKeyAccount = await createKernelAccount(publicClient, {
    entryPoint,
    plugins: {
      sudo: ecdsaValidator,
      regular: sessionKeyValidator,
    },
  });

  return await serializeSessionKeyAccount(sessionKeyAccount);
};

const useSessionKey = async (
  serializedSessionKey: string,
  sessionKeySigner: any
) => {
  const sessionKeyAccount = await deserializeSessionKeyAccount(
    publicClient,
    entryPoint,
    serializedSessionKey,
    sessionKeySigner
  );

  const kernelClient = createKernelAccountClient({
    entryPoint,
    account: sessionKeyAccount,
    chain: sepolia,
    bundlerTransport: http(process.env.BUNDLER_RPC),
  });

  const userOpHash = await kernelClient.sendTransaction({
    to: process.env.RECIPIENT_ADDRESS as Hex,
    data: pad("0x", { size: 4 }),
    value: BigInt(1),
  });

  console.log("userOp hash:", userOpHash);
};

const main = async () => {
  // The agent creates a public-private key pair and sends
  // the public key (address) to the owner.
  const sessionPrivateKey = generatePrivateKey();
  const sessionKeySigner = privateKeyToAccount(sessionPrivateKey);

  // The owner authorizes the public key by signing it and sending
  // back the signature
  const serializedSessionKey = await createSessionKey(sessionKeySigner.address);

  // The agent constructs a full session key
  await useSessionKey(serializedSessionKey, sessionKeySigner);
};

main();
