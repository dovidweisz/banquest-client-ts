/**
 * Configuration for the BanquestClient.
 */
export interface BanquestClientConfig {
  /** API key (used as the username in HTTP Basic authentication). */
  apiKey: string;
  /**
   * Base URL for the Banquest Gateway API.
   * Defaults to the sandbox URL when omitted.
   * @default "https://api.sandbox.banquestgateway.com/api/v2/transactions/"
   */
  baseUrl?: string;
}

// ---------------------------------------------------------------------------
// Simple Transaction – Request
// ---------------------------------------------------------------------------

/** Billing / shipping address fields shared across transaction types. */
export interface BillingAddress {
  /** Cardholder first name. */
  billing_first_name?: string;
  /** Cardholder last name. */
  billing_last_name?: string;
  /** Street address line 1. */
  billing_address?: string;
  /** City. */
  billing_city?: string;
  /** State / province (2-letter code for US addresses). */
  billing_state?: string;
  /** Postal / ZIP code. */
  billing_zip?: string;
  /**
   * Country code (ISO 3166-1 alpha-2, e.g. "US").
   * @default "US"
   */
  billing_country?: string;
  /** Contact phone number. */
  billing_phone?: string;
  /** Contact e-mail address. */
  billing_email?: string;
}

/**
 * Request body for a simple (card-present or card-not-present) charge.
 * Maps directly to the Banquest Gateway API v2 `simple_transaction` payload.
 */
export interface SimpleTransactionRequest extends BillingAddress {
  /** Transaction amount (e.g. `25.00`). */
  amount: number;
  /** 16-digit credit / debit card number (PAN). */
  card: string;
  /** Card expiry month (1–12). */
  expiry_month: number;
  /** 4-digit card expiry year (e.g. `2026`). */
  expiry_year: number;
  /** Card Verification Value 2 (3–4 digits). */
  cvv2: string;
  /**
   * When `true` the transaction is authorised **and** captured immediately.
   * Set to `false` to authorise only.
   * @default true
   */
  capture?: boolean;
  /**
   * When `true` the gateway tokenises the card and returns a `card_id` that
   * can be used for future charges.
   * @default false
   */
  save_card?: boolean;
  /** Optional merchant-supplied order reference. */
  order_id?: string;
  /** Optional merchant-supplied customer reference. */
  customer_id?: string;
  /** Free-text description shown on statements. */
  description?: string;
}

// ---------------------------------------------------------------------------
// Simple Transaction – Response
// ---------------------------------------------------------------------------

/**
 * High-level result of a transaction attempt.
 */
export type TransactionStatus = "approved" | "declined" | "error" | "pending";

/**
 * Response body returned by the Banquest Gateway API v2 after a
 * `simple_transaction` request.
 */
export interface SimpleTransactionResponse {
  /** Unique identifier assigned to the transaction by the gateway. */
  transaction_id: string;
  /** Echo of the transaction type – always `"simple_transaction"`. */
  transaction_type: string;
  /** Approved / declined / error status. */
  status: TransactionStatus;
  /** Processor response code. */
  response_code: string;
  /** Human-readable processor response message. */
  response_text: string;
  /** Authorization code issued by the issuing bank (present when approved). */
  auth_code?: string;
  /** Approved transaction amount. */
  amount: number;
  /** Gateway-issued token for the saved card (`save_card: true` only). */
  card_id?: string;
  /** Last four digits of the card number. */
  card_last_four?: string;
  /** Card brand (e.g. `"Visa"`, `"Mastercard"`). */
  card_type?: string;
  /** Processor / acquirer reference number. */
  reference_number?: string;
  /** ISO 8601 UTC timestamp of when the transaction was processed. */
  created_at?: string;
  /**
   * AVS (Address Verification System) result code.
   * Present when billing address fields are supplied.
   */
  avs_result?: string;
  /**
   * CVV match result code.
   * `"M"` = match, `"N"` = no match, `"P"` = not processed.
   */
  cvv_result?: string;
  /** Raw gateway response object for advanced use-cases. */
  raw?: Record<string, unknown>;
}

/**
 * Error shape returned by the Banquest Gateway API when the request itself is
 * invalid (HTTP 4xx) or the gateway encounters an internal fault (HTTP 5xx).
 */
export interface BanquestApiError {
  /** Machine-readable error code. */
  code: string;
  /** Human-readable error description. */
  message: string;
  /** Per-field validation errors (present on HTTP 422). */
  errors?: Record<string, string[]>;
}
