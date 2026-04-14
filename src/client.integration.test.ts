import "dotenv/config";
import { BanquestClient } from "./client";
import type { CreditCardChargeRequest, ChargeResponse } from "./types";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const SOURCE_KEY = process.env.BANQUEST_SOURCE_KEY;
const PIN = process.env.BANQUEST_PIN || undefined;
const BASE_URL = process.env.BANQUEST_BASE_URL || undefined;

const describeIntegration =
  SOURCE_KEY ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Test cards (standard industry test numbers for sandbox environments)
// ---------------------------------------------------------------------------

const TEST_CARDS = {
  visa: {
    card: "4000100011112224",
    expiry_month: 12,
    expiry_year: 2028,
    cvv2: "999",
  },
  mastercard: {
    card: "5439750001500347",
    expiry_month: 12,
    expiry_year: 2028,
    cvv2: "999",
  },
  amex: {
    card: "374255312721002",
    expiry_month: 12,
    expiry_year: 2028,
    cvv2: "9999",
  },
  discover: {
    card: "6011000991001201",
    expiry_month: 12,
    expiry_year: 2028,
    cvv2: "999",
  },
} as const;

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describeIntegration("BanquestClient integration", () => {
  let client: BanquestClient;

  beforeAll(() => {
    client = new BanquestClient({
      sourceKey: SOURCE_KEY!,
      pin: PIN,
      baseUrl: BASE_URL,
    });
  });

  // -----------------------------------------------------------------------
  // Basic charge per card brand
  // -----------------------------------------------------------------------

  describe.each(Object.entries(TEST_CARDS))(
    "charge with %s test card",
    (_brand, cardData) => {
      it("approves a minimal charge", async () => {
        const request: CreditCardChargeRequest = {
          amount: 1.00,
          ...cardData,
          ignore_duplicates: true,
        };

        const response: ChargeResponse = await client.charge(request);

        expect(response.status).toBe("Approved");
        expect(response.status_code).toBe("A");
        expect(response.auth_code).toBeDefined();
        expect(response.reference_number).toBeDefined();
      });
    },
  );

  // -----------------------------------------------------------------------
  // Auth-only (capture = false)
  // -----------------------------------------------------------------------

  it("processes an auth-only transaction", async () => {
    const request: CreditCardChargeRequest = {
      amount: 5.00,
      ...TEST_CARDS.visa,
      capture: false,
      ignore_duplicates: true,
    };

    const response = await client.charge(request);

    expect(response.status).toBe("Approved");
    expect(response.status_code).toBe("A");
    expect(response.auth_amount).toBe(5.00);
  });

  // -----------------------------------------------------------------------
  // Save card (tokenization)
  // -----------------------------------------------------------------------

  it("returns a card_ref when save_card is true", async () => {
    const request: CreditCardChargeRequest = {
      amount: 1.50,
      ...TEST_CARDS.visa,
      save_card: true,
      ignore_duplicates: true,
    };

    const response = await client.charge(request);

    expect(response.status).toBe("Approved");
    expect(response.card_ref).toBeDefined();
    expect(typeof response.card_ref).toBe("string");
  });

  // -----------------------------------------------------------------------
  // AVS fields
  // -----------------------------------------------------------------------

  it("includes AVS result when address info is provided", async () => {
    const request: CreditCardChargeRequest = {
      amount: 2.00,
      ...TEST_CARDS.visa,
      avs_address: "123 Main St",
      avs_zip: "90210",
      ignore_duplicates: true,
    };

    const response = await client.charge(request);

    expect(response.status).toBe("Approved");
    expect(response.avs_result).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Full request with billing/shipping/customer info
  // -----------------------------------------------------------------------

  it("approves a charge with full billing and customer details", async () => {
    const request: CreditCardChargeRequest = {
      amount: 10.00,
      ...TEST_CARDS.mastercard,
      name: "Test Cardholder",
      avs_address: "456 Oak Ave",
      avs_zip: "10001",
      billing_info: {
        first_name: "Test",
        last_name: "Cardholder",
        street: "456 Oak Ave",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "US",
        phone: "5551234567",
      },
      shipping_info: {
        first_name: "Test",
        last_name: "Cardholder",
        street: "789 Pine Rd",
        city: "New York",
        state: "NY",
        zip: "10002",
        country: "US",
      },
      customer: {
        send_receipt: false,
        identifier: "integration-test",
      },
      transaction_details: {
        description: "Integration test charge",
        order_number: `test-${Date.now()}`,
      },
      amount_details: {
        tax: 0.80,
      },
      ignore_duplicates: true,
    };

    const response = await client.charge(request);

    expect(response.status).toBe("Approved");
    expect(response.status_code).toBe("A");
    expect(response.auth_amount).toBe(10.00);
    expect(response.last_4).toBe(
      request.card.slice(-4),
    );
  });

  // -----------------------------------------------------------------------
  // CVV verification
  // -----------------------------------------------------------------------

  it("returns CVV result when cvv2 is provided", async () => {
    const request: CreditCardChargeRequest = {
      amount: 1.00,
      ...TEST_CARDS.visa,
      ignore_duplicates: true,
    };

    const response = await client.charge(request);

    expect(response.status).toBe("Approved");
    expect(response.cvv2_result).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Error scenarios
  // -----------------------------------------------------------------------

  it("declines or errors on an invalid card number", async () => {
    const request: CreditCardChargeRequest = {
      amount: 1.00,
      card: "4111111111111112",
      expiry_month: 12,
      expiry_year: 2028,
      cvv2: "123",
      ignore_duplicates: true,
    };

    try {
      const response = await client.charge(request);
      // Some gateways return a Declined status instead of throwing
      expect(["Declined", "Error"]).toContain(response.status);
    } catch (error: unknown) {
      const err = error as { error_message?: string };
      expect(err.error_message).toBeDefined();
    }
  });

  it("rejects an expired card", async () => {
    const request: CreditCardChargeRequest = {
      amount: 1.00,
      card: TEST_CARDS.visa.card,
      expiry_month: 1,
      expiry_year: 2020,
      cvv2: "999",
      ignore_duplicates: true,
    };

    try {
      const response = await client.charge(request);
      expect(["Declined", "Error"]).toContain(response.status);
    } catch (error: unknown) {
      const err = error as { error_message?: string };
      expect(err.error_message).toBeDefined();
    }
  });

  it("declines a $105.00 charge on test card 4761530001111118", async () => {
    const request: CreditCardChargeRequest = {
      amount: 105.00,
      card: "4761530001111118",
      expiry_month: 12,
      expiry_year: 2028,
      cvv2: "999",
      ignore_duplicates: true,
    };

    try {
      const response = await client.charge(request);
      expect(response.status).toBe("Declined");
      expect(response.status_code).toBe("D");
    } catch (error: unknown) {
      const err = error as { error_message?: string };
      expect(err.error_message).toBeDefined();
    }
  });
});
