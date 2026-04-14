import { BanquestClient } from "./client";
import type {
  SimpleTransactionRequest,
  SimpleTransactionResponse,
  BanquestApiError,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_API_KEY = "test-api-key";
const EXPECTED_AUTH = `Basic ${Buffer.from(`${MOCK_API_KEY}:`).toString("base64")}`;

function makeSuccessResponse(
  overrides: Partial<SimpleTransactionResponse> = {},
): SimpleTransactionResponse {
  return {
    transaction_id: "txn_abc123",
    transaction_type: "simple_transaction",
    status: "approved",
    response_code: "00",
    response_text: "Approved",
    auth_code: "AUTH001",
    amount: 25.0,
    card_last_four: "1111",
    card_type: "Visa",
    ...overrides,
  };
}

function mockFetch(
  body: unknown,
  status = 200,
): jest.MockedFunction<typeof fetch> {
  const mock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
  global.fetch = mock;
  return mock;
}

const minimalRequest: SimpleTransactionRequest = {
  amount: 25.0,
  card: "4111111111111111",
  expiry_month: 12,
  expiry_year: 2026,
  cvv2: "123",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BanquestClient", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Constructor / configuration
  // -------------------------------------------------------------------------

  describe("constructor", () => {
    it("uses the sandbox URL by default", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const client = new BanquestClient({ apiKey: MOCK_API_KEY });

      await client.simpleTransaction(minimalRequest);

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://api.sandbox.banquestgateway.com/api/v2/transactions/",
      );
    });

    it("accepts a custom baseUrl", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const client = new BanquestClient({
        apiKey: MOCK_API_KEY,
        baseUrl: "https://api.banquestgateway.com/api/v2/transactions/",
      });

      await client.simpleTransaction(minimalRequest);

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://api.banquestgateway.com/api/v2/transactions/",
      );
    });

    it("appends a trailing slash to baseUrl if missing", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const client = new BanquestClient({
        apiKey: MOCK_API_KEY,
        baseUrl: "https://api.banquestgateway.com/api/v2/transactions",
      });

      await client.simpleTransaction(minimalRequest);

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://api.banquestgateway.com/api/v2/transactions/",
      );
    });

    it("encodes the apiKey as HTTP Basic auth", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const client = new BanquestClient({ apiKey: MOCK_API_KEY });

      await client.simpleTransaction(minimalRequest);

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Authorization"]).toBe(
        EXPECTED_AUTH,
      );
    });
  });

  // -------------------------------------------------------------------------
  // simpleTransaction – happy path
  // -------------------------------------------------------------------------

  describe("simpleTransaction", () => {
    it("sends a POST request with JSON content-type", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const client = new BanquestClient({ apiKey: MOCK_API_KEY });

      await client.simpleTransaction(minimalRequest);

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("POST");
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
        "application/json",
      );
    });

    it("serialises the request body as JSON", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const client = new BanquestClient({ apiKey: MOCK_API_KEY });

      await client.simpleTransaction(minimalRequest);

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual(minimalRequest);
    });

    it("returns the parsed response on success", async () => {
      const expected = makeSuccessResponse();
      mockFetch(expected);
      const client = new BanquestClient({ apiKey: MOCK_API_KEY });

      const result = await client.simpleTransaction(minimalRequest);

      expect(result).toEqual(expected);
    });

    it("includes all optional billing fields in the request body", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const client = new BanquestClient({ apiKey: MOCK_API_KEY });

      const fullRequest: SimpleTransactionRequest = {
        ...minimalRequest,
        capture: true,
        save_card: false,
        billing_first_name: "Jane",
        billing_last_name: "Doe",
        billing_address: "123 Main St",
        billing_city: "Anytown",
        billing_state: "CA",
        billing_zip: "90210",
        billing_country: "US",
        billing_phone: "555-0100",
        billing_email: "jane@example.com",
        order_id: "order-001",
        customer_id: "cust-001",
        description: "Test donation",
      };

      await client.simpleTransaction(fullRequest);

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual(fullRequest);
    });

    // -----------------------------------------------------------------------
    // Error handling
    // -----------------------------------------------------------------------

    it("throws the parsed API error when the response is not ok (4xx)", async () => {
      const apiError: BanquestApiError = {
        code: "invalid_card",
        message: "The card number is invalid.",
      };
      mockFetch(apiError, 422);

      const client = new BanquestClient({ apiKey: MOCK_API_KEY });

      await expect(client.simpleTransaction(minimalRequest)).rejects.toEqual(
        apiError,
      );
    });

    it("throws the parsed API error when the response is not ok (5xx)", async () => {
      const apiError: BanquestApiError = {
        code: "gateway_error",
        message: "An internal error occurred.",
      };
      mockFetch(apiError, 500);

      const client = new BanquestClient({ apiKey: MOCK_API_KEY });

      await expect(client.simpleTransaction(minimalRequest)).rejects.toEqual(
        apiError,
      );
    });

    it("propagates network errors", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));
      const client = new BanquestClient({ apiKey: MOCK_API_KEY });

      await expect(client.simpleTransaction(minimalRequest)).rejects.toThrow(
        "Network failure",
      );
    });
  });
});
