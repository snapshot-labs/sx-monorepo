# AppFutarchy Widget

## Overview

The `AppFutarchy.vue` component integrates Futarchy.fi prediction market data into proposal pages. It displays real-time price predictions for how a proposal might impact token prices based on conditional markets.

## Features

- **Conditional Pricing**: Shows "If approved" and "If rejected" price predictions
- **Spot Price**: Displays current token spot price
- **Dynamic Token Display**: Uses actual token symbols from API (e.g., GNO, sDAI)
- **Dynamic Precision**: Price decimal places controlled by API's `display.price` field
- **Safe Rendering**: Widget only displays when ALL required data is valid
- **Direct Market Links**: Links to specific market on app.futarchy.fi

## API Integration

### Endpoint
```
GET {FUTARCHY_API_URL}/api/v1/market-events/proposals/{proposalId}/prices
```

### Default API URL
```
https://stag.api.tickspread.com
```

Can be overridden via environment variable:
```bash
VITE_FUTARCHY_API_URL=https://your-api.com
```

## API Response Structure

```json
{
  "status": "ok",
  "proposal_id": "0x40dbf611da3cb0dc1a5fd48140330e03f90214a9410ab2a25b782c1f3160eb0b",
  "event_id": "0x7D96A3f714782710917f6045441B39483c5Dc60a",
  "conditional_yes": {
    "status": "ok",
    "pool_id": "0x4029e65086493c4D689f9Ec457536e73F2bB5A7f",
    "interval": "60000",
    "price": 115.34,
    "timestamp": 1760563800
  },
  "conditional_no": {
    "status": "ok",
    "pool_id": "0x30BB1A8972798446efd565d3cfec9683BE2EEB7F",
    "interval": "60000",
    "price": 115.34,
    "timestamp": 1760563800
  },
  "spot": {
    "status": "ok",
    "pool_id": "0xd1d7fa8871d84d0e77020fc28b7cd5718c446522",
    "interval": "60000",
    "price": 109.26,
    "timestamp": 1760563800
  },
  "company_tokens": {
    "base": {
      "tokenName": "GNO",
      "tokenSymbol": "GNO",
      "wrappedCollateralTokenAddress": "0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb"
    }
  },
  "currency_tokens": {
    "base": {
      "tokenName": "sDAI",
      "tokenSymbol": "sDAI",
      "wrappedCollateralTokenAddress": "0xaf204776c7245bF4147c2612BF6e5972Ee483701"
    }
  },
  "display": {
    "price": 2
  }
}
```

## Validation Requirements

The widget performs comprehensive validation before displaying. **ALL** of the following must be true:

### Top-level Fields
- ✅ `status === "ok"`
- ✅ `proposal_id` exists
- ✅ `event_id` exists

### Conditional Yes
- ✅ `conditional_yes.status === "ok"`
- ✅ `conditional_yes.pool_id` exists
- ✅ `conditional_yes.price` is defined

### Conditional No
- ✅ `conditional_no.status === "ok"`
- ✅ `conditional_no.pool_id` exists
- ✅ `conditional_no.price` is defined

### Spot Price
- ✅ `spot.status === "ok"`
- ✅ `spot.pool_id` exists
- ✅ `spot.price` is defined

### Token Information
- ✅ `company_tokens.base.tokenSymbol` exists
- ✅ `currency_tokens.base.tokenSymbol` exists

### Display Configuration
- ✅ `display.price` is defined
- ✅ `display.price` is a number

**If ANY field is missing or has wrong value, the widget will not display.**

## Component Behavior

### Loading States
- **Loading**: Shows nothing (no skeleton/spinner)
- **Error**: Shows nothing (fails silently)
- **Success with valid data**: Shows widget
- **Success with invalid/incomplete data**: Shows nothing

### User Interactions

**"Learn more" link**
- URL: `https://app.futarchy.fi/markets/{proposal_id}`
- Opens in new tab (`target="_blank"`)
- Secure (`rel="noopener noreferrer"`)

**"Trade on Futarchy.fi" button**
- URL: `https://app.futarchy.fi/markets/{proposal_id}`
- Opens in new tab
- Full-width button with arrow icon

## Display Format

### Price Display
All prices use the precision from `display.price`:
```vue
{{ price.toFixed(priceData.display.price) }}
```

Example:
- If `display.price = 2`: Shows `115.34`
- If `display.price = 4`: Shows `115.3403`

### Widget Layout

```
┌─────────────────────────────────────────┐
│ 🖼️ Futarchy.fi                          │
│                                         │
│ Predict how this proposal will impact  │
│ GNO's price through conditional markets│
│ on Futarchy.fi. Learn more.            │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ GNO price         109.26 sDAI      │ │
│ │ 🟢 If approved    115.34 sDAI      │ │
│ │ 🔴 If rejected    115.34 sDAI      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [   Trade on Futarchy.fi   →  ]        │
└─────────────────────────────────────────┘
```

## Integration

### Usage in Proposal View

The widget is integrated in `apps/ui/src/views/Proposal.vue`:

```vue
<AppFutarchy :proposal="proposal" />
```

Placed in the proposal sidebar between voting section and results section.

## Error Handling

The component handles errors gracefully:

1. **Network Errors**: Caught and logged to console, widget doesn't show
2. **Invalid Response**: If API returns non-200 status, widget doesn't show
3. **Missing Fields**: If validation fails, widget doesn't show
4. **Type Mismatch**: If `display.price` is not a number, widget doesn't show

All errors are silent to the user - the widget simply doesn't appear.

## Key Implementation Details

### TypeScript Interfaces

```typescript
interface FutarchyPriceData {
  status: string;
  pool_id: string;
  interval: string;
  price: number;
  timestamp: number;
}

interface DisplayConfig {
  price: number; // Decimal places for price display
  // ... other display settings
}

interface FutarchyResponse {
  status: string;
  proposal_id: string;
  event_id: string;
  conditional_yes: FutarchyPriceData;
  conditional_no: FutarchyPriceData;
  spot: FutarchyPriceData;
  company_tokens: TokenGroup;
  currency_tokens: TokenGroup;
  display: DisplayConfig;
}
```

### Reactivity

```typescript
const priceData = ref<FutarchyResponse | null>(null);
const isLoading = ref(true);
const hasError = ref(false);

// Fetches on mount
onMounted(() => {
  fetchPrices();
});

// Re-fetches when proposal changes
watch(() => props.proposal.id, fetchPrices);
```

## Configuration Files

### Environment Variables
See `apps/ui/.env.example`:
```bash
VITE_FUTARCHY_API_URL=https://stag.api.tickspread.com
```

### Constants
See `apps/ui/src/helpers/constants.ts`:
```typescript
export const FUTARCHY_API_URL =
  import.meta.env.VITE_FUTARCHY_API_URL ?? 'https://stag.api.tickspread.com';
```

## Testing

To test the widget:

1. Ensure API is accessible at configured URL
2. Navigate to a proposal with valid futarchy data
3. Check browser console for any API errors
4. Widget should appear in proposal sidebar if data is valid

### Test with Missing Data

If any required field is missing, widget won't show. Check console for:
```
Error fetching futarchy prices: [error details]
```

## Security Considerations

- ✅ All external links use `rel="noopener noreferrer"`
- ✅ API responses are fully validated before use
- ✅ No sensitive data is logged (only errors to console)
- ✅ Safe fallback behavior (widget simply doesn't display)
- ✅ No XSS risk - all data is properly escaped by Vue

## Future Enhancements

Potential improvements:
- Loading skeleton while fetching
- Refresh button to manually update prices
- Price change indicators (up/down arrows)
- Historical price chart
- Time since last update display
- Localized number formatting
