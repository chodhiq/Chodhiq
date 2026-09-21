# Custom advertising workflow

Custom campaigns must not be displayed merely because an image or offer exists. Production activation requires the following audited lifecycle.

| State | Required action | Required evidence |
| --- | --- | --- |
| Draft | Capture advertiser identity, placement, creative, destination, dates and price | Draft owner and timestamps |
| Review | Check business verification, creative policy, destination safety and disclosure label | Reviewer distinct from requester |
| Approved | Record approval and immutable creative version | Approval timestamp and reviewer |
| Scheduled | Set UK start/end timestamps and placement limits | Schedule validation |
| Active | Serve only approved, in-window campaigns | Impression/click audit IDs |
| Expired/paused | Stop serving immediately | Automated expiry or operator reason |
| Reconciled | Compare contracted delivery, invoice and measured delivery | Invoice reference and report |

## Launch rule

`EXPO_PUBLIC_ENABLE_CUSTOM_ADS=true` enables the placement capability, but no campaign may be supplied to it until the backend enforces these states, expiry, ownership and reporting. UI-only controls are not sufficient. Campaign clicks must be clearly labelled as advertising and must never expose customer identity to an advertiser.
