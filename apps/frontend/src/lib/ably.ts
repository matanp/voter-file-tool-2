import * as Ably from "ably";

let ablyClient: Ably.Realtime | null = null;

export function getAblyClient() {
  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      authUrl: "/api/generateRealtimeToken",
      authMethod: "POST",
    });
  }
  return ablyClient;
}
