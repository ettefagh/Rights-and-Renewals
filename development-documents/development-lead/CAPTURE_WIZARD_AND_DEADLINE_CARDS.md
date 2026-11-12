# Capture wizard and deadline cards

User feedback on 12 November 2026 requested six related changes:

1. Hide receipt explanatory copy visually, retain it for assistive technology.
2. Simplify receipt attachment to a compact title and two source buttons.
3. Start capture with Warranty/Subscription choices and progressively disclose
   the remaining fields instead of one long form.
4. Describe the tax marker as an optional record to consider for tax purposes.
5. Remove the unrelated upcoming-deadline card from capture.
6. Render selected deadline details as a compact card with horizontal actions.

## Implementation boundaries

The wizard worker owns QuickCaptureModal and pure validation helpers/tests.
The orchestrator owns WalletApp, deadline-card styling, capture layout and
integration. An independent reviewer checks state/validation/accessibility.

Flow: Type → Details → Receipt and tax → Review and save. Back preserves entered
data and the in-memory receipt. Only final Save writes to the existing vault.
Each of the two initial type buttons advances directly to Details, without a
third Continue action on that initial screen. Per-step validation only blocks
on fields visible in that step; final validation returns to the owning step.
Search-supplied title prefill is consumed once; existing drafts are not replaced.
Camera/file selection remains separate, with no forced capture on the ordinary
picker. The optional receipt description remains associated with the controls
for screen readers. Category-specific fields remain available in the relevant
step. Validation must explain errors and focus the relevant field without
erasing input. This does not migrate or clear existing records.
Tax helper copy: “Mark this if you want to consider it for tax purposes.”

The deadline detail card retains the original cancellation/receipt/item handlers
and their order, with compact horizontal controls and at least 44px targets.
It is no longer rendered as unrelated support content within capture.

Browser access remains disabled in this client. Source, type, tests, build and
deployment checks must not be described as a completed rendered/browser pass.

## Additional quick-action dock feedback

The quick-action button and navigation bar now share dock height and FAB-size
variables. The 56px button is vertically centred against the 70px desktop or
66px mobile navigation card, with the same safe-area baseline and a 12px gap.
Hover and press do not translate/scale the button; fine-pointer hover uses a
defined colour/shadow, keyboard focus uses an outline, and touch avoids sticky
hover styling. Reduced motion disables decorative transitions. The expanded
actions have an accessible group label, explicit stacking fallbacks and Escape
returns focus to the trigger. No action handlers or vault data were changed by
this dock fix.

## Verification

All 184 tests across 40 showcase test files passed, including five focused
capture validation cases. App svelte-check completed with zero errors and two
existing EmailGate warnings. Official Svelte analysis reported no issues for
the changed components. Independent final source review found no material
regressions in wizard validation, receipt accessibility or FAB behavior.
Rendered mobile and native PWA checks remain unverified because browser access
is disabled in this client.
