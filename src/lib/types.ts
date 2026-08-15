/**
 * Domain model for Vaada — a public accountability register.
 *
 * One row = one *commitment*: something a named person in authority said they
 * would do, by when, in a specific place, in front of witnesses. Everything the
 * UI does is derived from these fields; nothing is stored pre-computed, because
 * a countdown that was written to the database is a countdown that can go stale.
 */

/** Where a commitment sits in its life. Order matters — it is the sort order. */
export type CommitmentStatus =
  /** Demand raised in public. Nobody in authority has answered it yet. */
  | 'unanswered'
  /** Officially accepted. No work visible on the ground yet. */
  | 'promised'
  /** Work has verifiably started. */
  | 'in_progress'
  /** Done, and backed by at least one accepted proof. */
  | 'fulfilled'
  /** Deadline passed with the work incomplete. */
  | 'broken'
  /** Officials claim done, citizens' evidence says otherwise. */
  | 'disputed';

/**
 * The colour band a cell is painted in. Derived, never stored.
 * `fresh -> soon -> urgent -> critical` is the green->red ramp: it tracks how
 * much of the promised window has been *consumed*, not how much work is left.
 */
export type UrgencyBand =
  | 'kept'
  | 'fresh'
  | 'soon'
  | 'urgent'
  | 'critical'
  | 'broken'
  | 'disputed'
  | 'undated'
  | 'unanswered';

export type Category =
  | 'education'
  | 'infrastructure'
  | 'water'
  | 'health'
  | 'safety'
  | 'jobs'
  | 'governance';

/** A person or office that can be held to the promise. Vagueness is the enemy. */
export interface Official {
  name: string;
  role: string;
  /** Public handle, if they have one worth tagging when a deadline burns. */
  handle?: string;
  /** Department or body they answer for. */
  body?: string;
  /**
   * Official contact for breach notices. Left undefined until somebody has
   * verified it against a government source — a wrong address on an
   * accountability notice is worse than no address, so this is never guessed.
   */
  email?: string;
  /** Public office address, for a physical notice or an RTI. */
  office?: string;
  /** Where the contact details came from. Required if `email` is set. */
  contactSource?: string;
}

export type ReceiptKind =
  /** Screenshot or archive of a post on X, Facebook, Instagram, YouTube. */
  | 'social_post'
  /** A signed government order, letter or undertaking on letterhead. */
  | 'written_order'
  /** Minutes of a meeting or a signed memorandum of demands. */
  | 'minutes'
  /** Video of the official saying it, on camera. */
  | 'video'
  /** A news report quoting the commitment. */
  | 'press_report';

/**
 * Proof that the promise *was made* — as opposed to `Proof`, which is about
 * whether it was *kept*.
 *
 * This is the half of the record that officials contest first. "I never said
 * three months" is the standard move, so a screenshot of the signed order or an
 * archived copy of the post is what makes a row defensible. A link on its own
 * is fragile: posts get deleted, and then the register is asserting something
 * it can no longer show.
 */
export interface Receipt {
  id: string;
  /** Kept alongside the commitment rather than inside it, like `Proof`. */
  commitmentId: string;
  kind: ReceiptKind;
  /** What this document is, in a reader's words. */
  title: string;
  description?: string;
  /** Archived copies — screenshots, scans, PDFs. The durable part. */
  mediaUrls: string[];
  /** The original, if it is still up. */
  url?: string;
  /** ISO date the document is dated, or the post was made. */
  documentDate: string;
  /** Does it carry a signature, seal or letterhead? Changes its weight a lot. */
  signed: boolean;
  /** The exact wording of the commitment inside it. */
  quote?: string;
  addedBy: string;
  verified: boolean;
}

export type SourceKind = 'tweet' | 'news' | 'video' | 'document' | 'field_report';

export interface Source {
  kind: SourceKind;
  /** Publication or account name, as a reader would recognise it. */
  publisher: string;
  url: string;
  /** ISO date the source was published. */
  date: string;
  /** Verbatim excerpt containing the commitment. Quote, never paraphrase. */
  quote?: string;
}

export type ProofKind = 'photo' | 'video' | 'document' | 'measurement' | 'testimony';
export type ProofVerdict = 'pending' | 'verified' | 'rejected' | 'contested';

/** Evidence submitted by the public about whether the work actually happened. */
export interface Proof {
  id: string;
  commitmentId: string;
  kind: ProofKind;
  /** What the submitter claims this shows. */
  claim: string;
  /** Does this evidence argue the promise was kept, or that it was not? */
  direction: 'supports' | 'refutes';
  submittedBy: string;
  /** How the submitter is identifiable — the whole system rests on this. */
  submitterKind: 'resident' | 'volunteer' | 'journalist' | 'official' | 'anonymous';
  submittedAt: string;
  mediaUrls: string[];
  verdict: ProofVerdict;
  /** Who checked it, once someone has. */
  reviewedBy?: string;
  reviewNote?: string;
  /** Net helpful votes from other citizens. */
  corroborations: number;
}

export type ComplaintStatus = 'open' | 'acknowledged' | 'resolved' | 'rejected';

export interface Complaint {
  id: string;
  /** Complaints can be filed against a commitment, or free-standing. */
  commitmentId: string | null;
  stateSlug: string;
  districtSlug: string | null;
  title: string;
  body: string;
  category: Category;
  filedBy: string;
  filedAt: string;
  status: ComplaintStatus;
  /** Number of people who said "this is happening to me too". */
  seconded: number;
  mediaUrls: string[];
  officialResponse?: string;
  respondedAt?: string;
}

/** A single logged change in a commitment's life — the audit trail. */
export interface TimelineEvent {
  at: string;
  label: string;
  detail?: string;
  kind: 'demand' | 'promise' | 'progress' | 'proof' | 'breach' | 'response';
}

export interface Commitment {
  id: string;
  slug: string;
  /** Imperative and checkable. "Repair all classrooms", not "improve schools". */
  title: string;
  /** The full wording of what was accepted, in plain language. */
  detail: string;

  state: string;
  stateSlug: string;
  /** Districts are the drill-down unit. `null` = a state-wide commitment. */
  district: string | null;
  districtSlug: string | null;
  /** Village / block / institution. The place a volunteer would actually go. */
  locality: string;

  category: Category;
  status: CommitmentStatus;

  /** ISO date the promise was made. The clock starts here. */
  promisedOn: string;
  /** ISO date it must be done by. `null` when no deadline was ever given. */
  deadline: string | null;
  /** The deadline as it was actually said out loud: "within 48 hours". */
  deadlineLabel: string | null;

  /** 0-100. Only moves on verified proof, never on an official's say-so. */
  progress: number;

  /**
   * Relative size of the cell in the mosaic — how many people this affects and
   * how badly. 1 = one classroom, 5 = an entire state's school stock.
   */
  weight: number;
  /** People affected, when a credible number exists. */
  beneficiaries: number | null;

  accountable: Official[];
  /** Who forced the commitment into existence. Credit is part of the record. */
  demandedBy: string;
  sources: Source[];
  timeline: TimelineEvent[];

  /** Sub-district / tehsil / block, when known. Narrows `district`. */
  subdistrict?: string;
  village?: string;
  /** The institution the promise is about, if it is about one. */
  school?: string;
  /** National school code — makes this row joinable to official school data. */
  udise?: string;
  pincode?: string;

  /**
   * Who put this on the register. They get the breach notice, because the
   * person who bothered to log it is the person most likely to chase it.
   */
  loggedBy?: Watcher;

  updatedAt: string;
}

/** Somebody who wants to hear when this promise breaks. */
export interface Watcher {
  name: string;
  email: string;
  /** 'logger' gets breach notices by default; 'follower' opted in. */
  role: 'logger' | 'follower' | 'journalist' | 'official';
}

export type AlertKind =
  /** The deadline has passed with no verified proof of completion. */
  | 'breach'
  /** 24 hours out, so there is still time to act. */
  | 'due_soon'
  /** New evidence was accepted and the status changed. */
  | 'status_change';

export type AlertAudience = 'authority' | 'watchers';
export type AlertState = 'queued' | 'sent' | 'failed' | 'suppressed' | 'dry_run';

/**
 * One alert dispatch. Rows exist even in dry-run so the operator can read
 * exactly what would have gone out, to whom, before switching sending on.
 */
export interface AlertRecord {
  id: string;
  commitmentId: string;
  kind: AlertKind;
  audience: AlertAudience;
  recipients: string[];
  subject: string;
  body: string;
  state: AlertState;
  /** Why it was suppressed or how it failed. */
  note?: string;
  createdAt: string;
  sentAt?: string;
}

/** A commitment plus everything derived from the current clock. */
export interface LiveCommitment extends Commitment {
  band: UrgencyBand;
  /** Milliseconds until the deadline. Negative once breached. `null` if undated. */
  msRemaining: number | null;
  /** 0-1 share of the promised window already consumed. `null` if undated. */
  elapsed: number | null;
  proofCount: number;
  complaintCount: number;
  receiptCount: number;
  /** Receipts that carry a signature or seal — the strongest kind. */
  signedReceiptCount: number;
}

export interface DistrictRollup {
  name: string;
  slug: string;
  stateSlug: string;
  commitments: LiveCommitment[];
  weight: number;
  /** Worst band present — this is what colours the parent cell. */
  band: UrgencyBand;
  kept: number;
  broken: number;
  live: number;
}

export interface StateRollup {
  name: string;
  slug: string;
  districts: DistrictRollup[];
  commitments: LiveCommitment[];
  weight: number;
  band: UrgencyBand;
  kept: number;
  broken: number;
  live: number;
}
