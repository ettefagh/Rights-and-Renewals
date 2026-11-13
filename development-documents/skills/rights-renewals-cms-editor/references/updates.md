# Updating and reviewing content

CMS origin: https://rightsandrenewals-showcase.padarhava.workers.dev
Admin path: `/_emdash/admin/`. Use existing Cloudflare Access and native EmDash
authentication. Choose available purpose-built tools or authenticated APIs;
discover their actual capabilities instead of inventing route contracts.

Before writing: verify target site, collection, entry ID, slug, current revision,
published state and existing draft diff. Coordinate unrelated drafts; do not
publish someone's other changes to fix a logo. Prepare citations, affected
fields, unknowns and dependent-content impacts. A skill invocation alone does
not authorize production writes; honor the user's existing authorized scope.

Keep stable identities on ordinary display changes. Published Offer Versions,
Rule Versions and Evidence are immutable, including after unpublishing. Create
new version/evidence records with new identities for changed facts/corrections.
Do not fake revision_hash: readers derive fingerprints from canonical content.
Creation order: parent identities → source versions/evidence → assessment.
Publish dependencies before assessment review, only within authorized scope.

Assessment review is at
`/_emdash/admin/plugins/cmlab-policy-review-console/review`.
A different authorized Editor/Admin approves exact assessment fields, native
references and published source snapshots. Approval does not publish. Editing
the assessment/dependencies invalidates its binding. Approval expiry is the
earlier of 30 days after approval and review_expires_at. Missing/stale approval,
invalid expiry, unauthorized/self review or unavailable storage must fail closed.
Reload and resolve the cause. Do not fabricate reviewer identities or storage.
Assessment/source-version scheduling is blocked; use direct reviewed publication.

Brand verified_date and learning reviewed_on must be real, valid nonfuture ISO
date-times. Update only after substantive verification. Unknown publication
dates stay blank. Set assessment expiry for a future recheck, with rationale.

Before authorized publication, check sources/scope, complete fields, references,
privacy, unrelated edits, preview, and current approval. Afterward inspect public
output without preview; a successful save/publish response alone is insufficient.
On an incorrect finding, authorized withdrawal can precede a correction; preserve
history. Restoring a revision does not restore valid assessment approval.

Review dependent assessments, brand notes, webpage claims and learning/quizzes
after source changes. They do not synchronize automatically. Public readers may
omit invalid content, and cached/offline consumers may retain older data.

Use available revision preconditions to prevent overwriting concurrent edits.
If preconditions/tools are missing, provide a proposed diff and explain the
limitation rather than blindly retrying writes. Schema mismatch needs operator
reconciliation; do not create competing collections or write directly to storage.
If Cloudflare work is actually required, use cf CLI unless project Wrangler
configuration exists. Content editing does not itself require infrastructure work.

Report target/revision, changed fields, citations, checks, and exact lifecycle
state. Private proposal queues do not apply/publish suggestions automatically.
