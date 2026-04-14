/**
 * Configuration for the BanquestClient.
 */
export interface BanquestClientConfig {
  /**
   * Source key (used as the username in HTTP Basic authentication).
   * Create a source key in the gateway at Control Panel > Source Management > Create Key.
   */
  sourceKey: string;
  /**
   * Pin for the source key (used as the password in HTTP Basic authentication).
   * Required for some endpoints (e.g. reversal, adjust).
   */
  pin?: string;
  /**
   * Base URL for the Banquest Gateway API.
   * Defaults to the sandbox URL when omitted.
   * @default "https://api.sandbox.banquestgateway.com/api/v2"
   */
  baseUrl?: string;
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Address fields used for billing and shipping info. */
export interface Address {
  first_name?: string;
  last_name?: string;
  street?: string;
  street2?: string;
  state?: string;
  city?: string;
  zip?: string;
  /** For the Country Blocker fraud module, use ISO 3166-1 alpha-2 codes. */
  country?: string;
  phone?: string;
}

/** Breakdown of the transaction amount for reporting and Level 3 data. */
export interface AmountDetails {
  tax?: number;
  tax_percent?: number;
  surcharge?: number;
  shipping?: number;
  tip?: number;
  discount?: number;
}

/** Additional optional transaction details. */
export interface TransactionDetails {
  description?: string;
  clerk?: string;
  terminal?: string;
  client_ip?: string;
  /** Base64-encoded JPEG signature. */
  signature?: string;
  invoice_number?: string;
  po_number?: string;
  order_number?: string;
}

/** Customer information to attach to a transaction. */
export interface TransactionCustomer {
  send_receipt?: boolean;
  /** Multiple emails can be sent as a comma-delimited string. */
  email?: string;
  fax?: string;
  /** Something that identifies the customer, e.g. the customer's name or company. */
  identifier?: string;
  /** Send a customer ID to link the transaction to an existing customer. */
  customer_id?: number;
}

/** Custom fields (custom1 through custom20). */
export interface CustomFields {
  [key: string]: string | undefined;
}

// ---------------------------------------------------------------------------
// Charge – Request
// ---------------------------------------------------------------------------

/**
 * Request body for a credit card charge.
 * Maps to the Banquest Gateway API v2 POST /transactions/charge endpoint
 * (CreditCardChargeRequest schema).
 */
export interface CreditCardChargeRequest {
  /** Transaction amount in USD (min 0.01, max 20000000). */
  amount: number;
  /** Credit card number (14–16 digits). */
  card: string;
  /** Card expiration month (1–12). */
  expiry_month: number;
  /** Card expiration year (e.g. 2026). */
  expiry_year: number;
  /** CVV2/CVC/CID security code (3–4 digits). */
  cvv2?: string;
  /** Billing address for AVS verification. */
  avs_address?: string;
  /** Billing zip code for AVS verification. */
  avs_zip?: string;
  /**
   * Whether to capture the authorization into the current batch.
   * @default true
   */
  capture?: boolean;
  /**
   * If true and the transaction is approved, a token (card_ref) will be issued for future use.
   * @default false
   */
  save_card?: boolean;
  /** Name on the card. */
  name?: string;
  /** Breakdown of the amount for reporting and Level 3 data. */
  amount_details?: AmountDetails;
  /** Additional transaction details. */
  transaction_details?: TransactionDetails;
  /** Billing address information. */
  billing_info?: Address;
  /** Shipping address information. */
  shipping_info?: Address;
  /** Custom fields (custom1–custom20). */
  custom_fields?: CustomFields;
  /**
   * Whether to override duplicate transaction detection.
   * @default false
   */
  ignore_duplicates?: boolean;
  /** Customer information to attach to the transaction. */
  customer?: TransactionCustomer;
}

// ---------------------------------------------------------------------------
// Charge – Response
// ---------------------------------------------------------------------------

/** Status of the transaction. */
export type Result =
  | "Approved"
  | "Partially Approved"
  | "Submitted"
  | "Declined"
  | "Error";

/** Single-character result code. */
export type ResultCode = "A" | "P" | "D" | "E";

/**
 * Response body returned by POST /transactions/charge for a credit card charge.
 */
export interface ChargeResponse {
  /** API version. */
  version?: string;
  /** Transaction result status. */
  status: Result;
  /** Single-character result code. */
  status_code: ResultCode;
  /** Error or processor response message. */
  error_message?: string;
  /** Error or processor response code. */
  error_code?: string;
  /** Additional error details; may be a string or field-level validation errors. */
  error_details?: string | Record<string, string[]>;
  /** Final amount authorized by the processor. */
  auth_amount?: number;
  /** Authorization code from the processor (present when approved). */
  auth_code?: string;
  /** Reference number for the transaction. */
  reference_number?: number;
  /** AVS result description. */
  avs_result?: string;
  /** AVS result code. */
  avs_result_code?: string;
  /** CVV2 result description. */
  cvv2_result?: string;
  /** CVV2 result code. */
  cvv2_result_code?: string;
  /** Card brand (e.g. "Visa", "MasterCard"). */
  card_type?: string;
  /** Last 4 digits of the card number. */
  last_4?: string;
  /** Token for the saved card (returned when save_card is true). */
  card_ref?: string;
  /** Full transaction object. */
  transaction?: Record<string, unknown>;
}

/**
 * Error shape returned by the Banquest Gateway API when the request is
 * invalid (HTTP 4xx) or the gateway encounters an internal fault (HTTP 5xx).
 */
export interface BanquestApiError {
  /** Error or processor response message. */
  error_message: string;
  /** Error or processor response code. */
  error_code?: string;
  /** Additional error details; may be a string or field-level validation errors. */
  error_details?: string | Record<string, string[]>;
}
