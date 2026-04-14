import type {
  BanquestClientConfig,
  BanquestApiError,
  SimpleTransactionRequest,
  SimpleTransactionResponse,
} from "./types.js";

export type {
  BanquestClientConfig,
  BanquestApiError,
  SimpleTransactionRequest,
  SimpleTransactionResponse,
  BillingAddress,
  TransactionStatus,
} from "./types.js";

const DEFAULT_BASE_URL =
  "https://api.sandbox.banquestgateway.com/api/v2/transactions/";

/**
 * Lightweight, fetch-based client for the Banquest Gateway API v2.
 *
 * @example
 * ```typescript
 * const client = new BanquestClient({ apiKey: "my-api-key" });
 *
 * const result = await client.simpleTransaction({
 *   amount: 25.00,
 *   card: "4111111111111111",
 *   expiry_month: 12,
 *   expiry_year: 2026,
 *   cvv2: "123",
 * });
 * ```
 */
export class BanquestClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: BanquestClientConfig) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/?$/, "/");
    // HTTP Basic auth: apiKey is used as the username with an empty password.
    this.authHeader = `Basic ${Buffer.from(`${config.apiKey}:`).toString("base64")}`;
  }

  /**
   * Submits a simple card transaction to the Banquest Gateway.
   *
   * @param request - Transaction details including card data and amount.
   * @returns Resolved with the gateway response on success.
   * @throws {@link BanquestApiError} when the gateway returns an error status.
   */
  async simpleTransaction(
    request: SimpleTransactionRequest,
  ): Promise<SimpleTransactionResponse> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify(request),
    });

    const json: unknown = await response.json();

    if (!response.ok) {
      const apiError = json as BanquestApiError;
      throw apiError;
    }

    return json as SimpleTransactionResponse;
  }
}
