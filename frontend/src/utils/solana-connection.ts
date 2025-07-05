import { Connection } from "@solana/web3.js";
import Constants from "expo-constants";

const rpcEndpoint = Constants.expoConfig?.extra?.solanaRpcEndpoint;

if (!rpcEndpoint) {
  throw new Error("Solana RPC endpoint is not defined in app.json");
}

export const connection = new Connection(rpcEndpoint, "confirmed"); 