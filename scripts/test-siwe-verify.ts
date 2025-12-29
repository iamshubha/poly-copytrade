import { SiweMessage, generateNonce } from "siwe";

async function testSIWEVerify() {
  console.log("Testing SIWE verify method...\n");

  try {
    // Use SIWE's own generateNonce
    const nonce = generateNonce();
    console.log("Generated nonce:", nonce);

    const message = new SiweMessage({
      domain: "localhost",
      address: "0x1234567890123456789012345678901234567890",
      statement: "Sign in to test",
      uri: "http://localhost:3000",
      version: "1",
      chainId: 1,
      nonce: nonce,
    });

    console.log("\nMessage created:", message.prepareMessage());

    // Check what methods are available
    console.log(
      "\nAvailable methods:",
      Object.getOwnPropertyNames(Object.getPrototypeOf(message))
    );

    // Try to call verify to see its signature
    try {
      const result = await message.verify({ signature: "0xfake" });
      console.log("Verify result:", result);
    } catch (e: any) {
      console.log("\nExpected error (fake signature):", e.message);
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

testSIWEVerify();
