import type {
  BanquestClientConfig,
  BanquestApiError,
  CreditCardChargeRequest,
  ChargeResponse,
} from "./types.js";

export type {
  BanquestClientConfig,
  BanquestApiError,
  CreditCardChargeRequest,
  ChargeResponse,
  Address,
  AmountDetails,
  TransactionDetails,
  TransactionCustomer,
  CustomFields,
  Result,
  ResultCode,
} from "./types.js";

const DEFAULT_BASE_URL =
  "https://api.sandbox.banquestgateway.com/api/v2";

/**
 * Lightweight, fetch-based client for the Banquest Gateway API v2.
 *
 * @example
 * ```typescript
 * const client = new BanquestClient({ sourceKey: "my-source-key" });
 *
 * const result = await client.charge({
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
    // HTTP Basic auth: source key is the username, pin (if set) is the password.
    const password = config.pin ?? "";
    this.authHeader = `Basic ${Buffer.from(`${config.sourceKey}:${password}`).toString("base64")}`;
  }

  /**
   * Submits a credit card charge to the Banquest Gateway.
   * POST /transactions/charge
   *
   * @param request - Charge details including card data and amount.
   * @returns Resolved with the gateway response on success.
   * @throws {@link BanquestApiError} when the gateway returns an error status.
   */
  async charge(
    request: CreditCardChargeRequest,
  ): Promise<ChargeResponse> {
    const response = await fetch(`${this.baseUrl}transactions/charge`, {
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

    return json as ChargeResponse;
  }
}
