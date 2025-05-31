/**
 * Test script to verify WebSocket server connection
 */

import WebSocket from "ws";

const WS_URL = "ws://localhost:8080";

console.log(`Testing connection to ${WS_URL}...`);

const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log("✅ Connected to WebSocket server");

  // Test ping
  console.log("Sending ping...");
  ws.send(JSON.stringify({ type: "ping" }));

  // Test auth
  setTimeout(() => {
    console.log("Sending auth request...");
    ws.send(JSON.stringify({ type: "auth", payload: { address: "0x123" } }));
  }, 1000);

  // Test room join
  setTimeout(() => {
    console.log("Sending room join request...");
    ws.send(
      JSON.stringify({
        type: "joinRoom",
        payload: {
          roomId: "test-room",
          address: "0x123",
        },
      })
    );
  }, 2000);

  // Test bet placement
  setTimeout(() => {
    console.log("Sending bet placement...");
    ws.send(
      JSON.stringify({
        type: "placeBet",
        payload: {
          roomId: "test-room",
          predictedMove: "e2e4",
          amount: 10,
        },
      })
    );
  }, 3000);

  // Close connection after tests
  setTimeout(() => {
    console.log("Closing connection...");
    ws.close();
  }, 5000);
});

ws.on("message", (data) => {
  console.log("📨 Received:", data.toString());
});

ws.on("error", (error) => {
  console.error("❌ WebSocket error:", error.message);
});

ws.on("close", () => {
  console.log("Connection closed");
  process.exit(0);
});
