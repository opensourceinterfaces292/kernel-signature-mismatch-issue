# Signature mismatch prevents user operation from being properly sent

I adapted the example from the `zerodev-examples/session-keys/v2/agent-created.ts` available [here](https://github.com/zerodevapp/zerodev-examples/tree/main/session-keys/v2).

When running `npm start`, we get the following error:

```sh
SessionKeyValidator: No matching permission found for the userOp
```

Yet, the session key created should permit this operation.

Using the debugger, I noticed that we miss our permission in the `filterBySignature` function in `node_modules/@zerodev/session-key/_cjs/utils.js`.

Our permission signature `0x00000000` does not match the expected signature `0x`.

Is there a padding error / bug in the zerodev library?

Thanks for the help!
