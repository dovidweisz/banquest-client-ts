import { BanquestClient } from "./client";
import type {
  CreditCardChargeRequest,
  ChargeResponse,
  BanquestApiError,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_SOURCE_KEY = "test-source-key";
const EXPECTED_AUTH = `Basic ${Buffer.from(`${MOCK_SOURCE_KEY}:`).toString("base64")}`;

function makeSuccessResponse(
  overrides: Partial<ChargeResponse> = {},
): ChargeResponse {
  return {
    status: "Approved",
    status_code: "A",
    auth_amount: 25.0,
    auth_code: "AUTH001",
    reference_number: 123456,
    last_4: "1111",
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

const minimalRequest: CreditCardChargeRequest = {
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
      const client = new BanquestClient({ sourceKey: MOCK_SOURCE_KEY });

      await client.charge(minimalRequest);

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://api.sandbox.banquestgateway.com/api/v2/transactions/charge",
      );
    });

    it("accepts a custom baseUrl", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const client = new BanquestClient({
        sourceKey: MOCK_SOURCE_KEY,
        baseUrl: "https://api.banquestgateway.com/api/v2",
      });

      await client.charge(minimalRequest);

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://api.banquestgateway.com/api/v2/transactions/charge",
      );
    });

    it("appends a trailing slash to baseUrl if missing", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const client = new BanquestClient({
        sourceKey: MOCK_SOURCE_KEY,
        baseUrl: "https://api.banquestgateway.com/api/v2",
      });

      await client.charge(minimalRequest);

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://api.banquestgateway.com/api/v2/transactions/charge",
      );
    });

    it("encodes the sourceKey as HTTP Basic auth with empty password", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const client = new BanquestClient({ sourceKey: MOCK_SOURCE_KEY });

      await client.charge(minimalRequest);

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Authorization"]).toBe(
        EXPECTED_AUTH,
      );
    });

    it("encodes the sourceKey and pin as HTTP Basic auth", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const expectedAuth = `Basic ${Buffer.from(`${MOCK_SOURCE_KEY}:my-pin`).toString("base64")}`;
      const client = new BanquestClient({
        sourceKey: MOCK_SOURCE_KEY,
        pin: "my-pin",
      });

      await client.charge(minimalRequest);

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Authorization"]).toBe(
        expectedAuth,
      );
    });
  });

  // -------------------------------------------------------------------------
  // charge – happy path
  // -------------------------------------------------------------------------

  describe("charge", () => {
    it("sends a POST request with JSON content-type", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const client = new BanquestClient({ sourceKey: MOCK_SOURCE_KEY });

      await client.charge(minimalRequest);

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("POST");
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
        "application/json",
      );
    });

    it("serialises the request body as JSON", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const client = new BanquestClient({ sourceKey: MOCK_SOURCE_KEY });

      await client.charge(minimalRequest);

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual(minimalRequest);
    });

    it("returns the parsed response on success", async () => {
      const expected = makeSuccessResponse();
      mockFetch(expected);
      const client = new BanquestClient({ sourceKey: MOCK_SOURCE_KEY });

      const result = await client.charge(minimalRequest);

      expect(result).toEqual(expected);
    });

    it("includes all optional fields in the request body", async () => {
      const fetchMock = mockFetch(makeSuccessResponse());
      const client = new BanquestClient({ sourceKey: MOCK_SOURCE_KEY });

      const fullRequest: CreditCardChargeRequest = {
        ...minimalRequest,
        capture: true,
        save_card: false,
        avs_address: "123 Main St",
        avs_zip: "90210",
        name: "Jane Doe",
        billing_info: {
          first_name: "Jane",
          last_name: "Doe",
          street: "123 Main St",
          city: "Anytown",
          state: "CA",
          zip: "90210",
          country: "US",
          phone: "555-0100",
        },
        customer: {
          send_receipt: true,
          email: "jane@example.com",
          identifier: "cust-001",
        },
        transaction_details: {
          description: "Test donation",
          order_number: "order-001",
        },
        ignore_duplicates: false,
      };

      await client.charge(fullRequest);

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual(fullRequest);
    });

    // -----------------------------------------------------------------------
    // Error handling
    // -----------------------------------------------------------------------

    it("throws the parsed API error when the response is not ok (4xx)", async () => {
      const apiError: BanquestApiError = {
        error_message: "The card number is invalid.",
        error_code: "invalid_card",
      };
      mockFetch(apiError, 422);

      const client = new BanquestClient({ sourceKey: MOCK_SOURCE_KEY });

      await expect(client.charge(minimalRequest)).rejects.toEqual(
        apiError,
      );
    });

    it("throws the parsed API error when the response is not ok (5xx)", async () => {
      const apiError: BanquestApiError = {
        error_message: "An internal error occurred.",
        error_code: "gateway_error",
      };
      mockFetch(apiError, 500);

      const client = new BanquestClient({ sourceKey: MOCK_SOURCE_KEY });

      await expect(client.charge(minimalRequest)).rejects.toEqual(
        apiError,
      );
    });

    it("propagates network errors", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));
      const client = new BanquestClient({ sourceKey: MOCK_SOURCE_KEY });

      await expect(client.charge(minimalRequest)).rejects.toThrow(
        "Network failure",
      );
    });
  });
});
