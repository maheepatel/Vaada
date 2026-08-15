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

  updatedAt: string;
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
