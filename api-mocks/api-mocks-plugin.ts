import { defineNitroPlugin } from "nitropack/runtime";
import { apiMocksServer } from "./api-mocks-node";

export default defineNitroPlugin((nitroApp) => {
    apiMocksServer.listen({ onUnhandledFrame: "error" });
    nitroApp.hooks.hook("close", () => apiMocksServer.close());

    console.info("Outbound API requests are answered by the API mocks in api-mocks/.");
});
