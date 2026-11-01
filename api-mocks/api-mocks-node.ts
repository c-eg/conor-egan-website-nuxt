import { setupServer } from "msw/node";
import { apiMocksHandlers } from "./api-mocks-handlers";

export const apiMocksServer = setupServer(...apiMocksHandlers);
