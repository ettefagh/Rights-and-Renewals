# Optional measurement preference panel

The reported McFIT page showed a full-width, unstyled preference section with
raw event terminology while production measurement was disabled. The shared
component now uses a bounded card, page gutters, responsive padding, spacing
above the floating Human/Machine control, readable copy, native 20px checkbox
inside a 44px label, keyboard focus styling, descriptive labels and a polite
status message. Initial saved preference state is reflected by the client.

The preference is offered only on public pages when the deployment explicitly
enables collection, has its native dataset and rate limiter, and allows the
current exact origin. Editor/preview contexts stay excluded. Disabled production
therefore renders no opt-in panel rather than offering a nonfunctional control.
Astro can hoist bundled scripts even when conditional markup is absent; the
browser consent guard also requires the panel to exist. A saved old opt-in alone
cannot produce requests from an unavailable deployment. Production collection
is not enabled by this UI change.

Verification: 179 integrated tests passed, including infrastructure availability
and old-consent/no-panel cases. Browser visual/click verification remains limited
by disabled local browser access. Production readback should confirm the panel
is absent on McFIT and other shared routes and the events endpoint stays off.
