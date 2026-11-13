# Receipt picker in installed PWAs

The reported **Photo or file** control used a single image input with
`capture="environment"`. Mobile browsers can interpret that as a direct camera
request instead of a photo/file selection menu.

Quick Capture now has two keyboard-accessible native buttons and independent
file inputs: **Take photo** uses the camera hint; **Choose photo or file** has no
capture attribute and requests the ordinary image picker. Both still accept
receipt images and use the existing local compression/encryption pipeline; this
does not add PDF or arbitrary-document support. The operating system determines
the exact picker UI. No browser security or camera permission policy changed.

Replacement processing clears old compressed bytes/hash, permits retrying the
same file, disables competing pickers while busy, and can be cancelled through
**Remove receipt**. Workers and object URLs are released on removal/unmount.
Stale asynchronous work cannot replace a newer choice, and a failed chosen
receipt cannot silently save previous bytes or disappear on save.

Validation: app type check passed with zero errors and two existing EmailGate
warnings. Official Svelte autofixer reported no issues (DOM-ref suggestions are
intentional synchronous native file-input activation). No automated phone/PWA
picker verification is claimed; the installed-device picker must be confirmed
by the user after refreshing the updated app. No stored vault data is migrated
or cleared.

Production release `ba7ef6ea7d5d4a97e11f0b6d277a68a95b6ba6d3` includes picker fix
`e8f2cf8` and subsequent consumer-navigation cleanup. Build passed and deployment
`https://aff48974.rightsandrenewals-app.pages.dev` succeeded. Production homepage
returned 200; served `WalletApp.BWmy3uHN.js` bytes matched the local build by
SHA-256 and contained both source-choice labels. No native mobile picker test
was run; this verifies publication rather than installed-device behavior.
