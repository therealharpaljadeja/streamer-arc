import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const client = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export async function resolveEnsName(
  address: string
): Promise<string | null> {
  try {
    const name = await client.getEnsName({
      address: address as `0x${string}`,
    });
    return name;
  } catch {
    return null;
  }
}
