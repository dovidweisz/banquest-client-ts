# banquest-client-ts

A lightweight, *Unoficial* fully typed TypeScript client for the [Banquest Gateway API v2](https://api.sandbox.banquestgateway.com/api/v2). Uses the native `fetch` API with no runtime dependencies.

## Installation

```bash
npm install banquest-client-ts
```

## Quick Start

```typescript
import { BanquestClient } from "banquest-client-ts";

const client = new BanquestClient({ sourceKey: "your-source-key" });

const response = await client.charge({
  amount: 25.0,
  card: "4111111111111111",
  expiry_month: 12,
  expiry_year: 2026,
  cvv2: "123",
});

console.log(response.status); // "Approved"
console.log(response.auth_code); // e.g. "038842"
```

## Configuration

Create a client by passing a `BanquestClientConfig` object:

| Property    | Type     | Required | Default                                              | Description                                           |
| ----------- | -------- | -------- | ---------------------------------------------------- | ----------------------------------------------------- |
| `sourceKey` | `string` | Yes      | —                                                    | Source key for HTTP Basic auth (create one in the gateway under Control Panel > Source Management). |
| `pin`       | `string` | No       | `""`                                                 | Pin for the source key (required for some endpoints). |
| `baseUrl`   | `string` | No       | `https://api.sandbox.banquestgateway.com/api/v2`     | Base URL for the gateway API.                         |

### Sandbox vs Production

By default the client points to the **sandbox** environment. To use production, pass the production base URL:

```typescript
const client = new BanquestClient({
  sourceKey: "your-source-key",
  pin: "your-pin",
  baseUrl: "https://api.banquestgateway.com/api/v2",
});
```

## API

### `client.charge(request: CreditCardChargeRequest): Promise<ChargeResponse>`

Submits a credit card charge (`POST /transactions/charge`).

**Required fields:**

| Field          | Type     | Description                          |
| -------------- | -------- | ------------------------------------ |
| `amount`       | `number` | Transaction amount in USD (0.01–20 000 000). |
| `card`         | `string` | Credit card number (14–16 digits).   |
| `expiry_month` | `number` | Card expiration month (1–12).        |
| `expiry_year`  | `number` | Card expiration year (e.g. 2026).    |

**Optional fields:** `cvv2`, `avs_address`, `avs_zip`, `capture`, `save_card`, `name`, `amount_details`, `transaction_details`, `billing_info`, `shipping_info`, `custom_fields`, `ignore_duplicates`, `customer`.

See [src/types.ts](src/types.ts) for the full type definitions.

## Error Handling

When the gateway returns an HTTP error status, the client throws a `BanquestApiError`:

```typescript
import type { BanquestApiError } from "banquest-client-ts";

try {
  await client.charge({ amount: 25.0, card: "4111111111111111", expiry_month: 12, expiry_year: 2026 });
} catch (error) {
  const apiError = error as BanquestApiError;
  console.error(apiError.error_message);
  console.error(apiError.error_code);
}
```

## Development

```bash
# Build
npm run build

# Run tests
npm test
```

## License

ISC
