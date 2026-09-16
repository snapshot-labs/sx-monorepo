-- ===========================================================================
--  READ THIS BEFORE ADDING OR CHANGING A COLUMN
--
--  Editing this file does NOT migrate an existing database.
--
--  It is loaded by docker/mysql-init/00-init.sh, which is a
--  docker-entrypoint-initdb.d script: it runs only when the MySQL data
--  directory is empty. Since mysql-data/ is a persistent bind mount, any stack
--  that has booted even once will never see a change made here.
--
--  Applies automatically:  test databases -- test/setupDb.ts drops and recreates
--                          from this file on every run
--                          a genuinely fresh stack with an empty mysql-data/
--  Does NOT apply:         every already-running stack, and every deployed
--                          environment
--
--  So a change here needs one of:
--    * a hand-applied ALTER, which is this repo's current practice -- see the
--      "Unknown column 'turbo'" entry in evidence/manual-metamask.md
--    * a full reset:  docker compose down && rm -rf mysql-data && docker compose up
--
--  The failure mode is deferred, not immediate: a stack looks perfectly healthy
--  until the first request touches the missing column, then returns a 500 that
--  says nothing about schema drift. If you add a column, say so in the PR body.
--
--  There is no migration mechanism for hub or the sequencer today. One is
--  planned but deliberately deferred; apps/mana already uses knex migrations if
--  you want the pattern. The plan, the intended migration files, and the MySQL 8
--  specifics that bite -- ADD COLUMN IF NOT EXISTS does not exist, and
--  ALGORITHM=INSTANT should be stated explicitly.
--
--  NOTE: apps/sequencer/test/schema.sql keeps its own copy of the proposals
--  table for the sequencer's tests. The two have drifted before. Change both.
-- ===========================================================================

CREATE TABLE spaces (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  settings JSON,
  verified INT NOT NULL DEFAULT '0',
  deleted INT NOT NULL DEFAULT '0',
  flagged INT NOT NULL DEFAULT '0',
  hibernated INT NOT NULL DEFAULT '0',
  turbo INT NOT NULL DEFAULT '0',
  turbo_expiration BIGINT NOT NULL DEFAULT '0',
  proposal_count INT NOT NULL DEFAULT '0',
  vote_count INT NOT NULL DEFAULT '0',
  follower_count INT NOT NULL DEFAULT '0',
  domain VARCHAR(64) DEFAULT NULL,
  created BIGINT NOT NULL,
  updated BIGINT NOT NULL,
  PRIMARY KEY (id),
  INDEX name (name),
  UNIQUE KEY domain (domain),
  INDEX verified (verified),
  INDEX flagged (flagged),
  INDEX hibernated (hibernated),
  INDEX turbo (turbo),
  INDEX proposal_count (proposal_count),
  INDEX vote_count (vote_count),
  INDEX follower_count (follower_count),
  INDEX deleted (deleted),
  INDEX created (created),
  INDEX updated (updated)
);

-- Note: The `proposals` table schema might have some discrepancies
-- compared to the production database. This is due to legacy reasons
-- and the challenges associated with updating the schema because of its size.
-- `id` and `ipfs` columns should not have any default values.
CREATE TABLE proposals (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  author VARCHAR(100) NOT NULL,
  created INT(11) NOT NULL,
  updated INT(11) DEFAULT NULL,
  space VARCHAR(64) NOT NULL,
  network VARCHAR(24) NOT NULL,
  symbol VARCHAR(16) NOT NULL DEFAULT '',
  type VARCHAR(24) NOT NULL DEFAULT '',
  strategies JSON NOT NULL,
  validation JSON NOT NULL,
  plugins JSON NOT NULL,
  title TEXT NOT NULL,
  body MEDIUMTEXT NOT NULL,
  discussion TEXT NOT NULL,
  choices JSON NOT NULL,
  labels JSON DEFAULT NULL,
  start INT(11) NOT NULL,
  end INT(11) NOT NULL,
  quorum DECIMAL(64,30) NOT NULL,
  quorum_type VARCHAR(24) DEFAULT '',
  privacy VARCHAR(24) NOT NULL,
  snapshot INT(24) NOT NULL,
  app VARCHAR(24) NOT NULL,
  scores JSON NOT NULL,
  scores_by_strategy JSON NOT NULL,
  scores_state VARCHAR(24) NOT NULL DEFAULT '',
  scores_total DECIMAL(64,30) NOT NULL,
  scores_updated INT(11) NOT NULL,
  scores_total_value DECIMAL(13,3) NOT NULL DEFAULT '0.000',
  vp_value_by_strategy json NOT NULL,
  votes INT(12) NOT NULL,
  flagged INT NOT NULL DEFAULT 0,
  cb INT NOT NULL DEFAULT 0,
  -- Threshold-ElGamal private voting (privacy='shutter-elgamal').
  -- All te_* columns are NULL when privacy is not 'shutter-elgamal'.
  -- te_mpk is also NULL between proposal creation and DKG completion.
  te_config JSON DEFAULT NULL,
  te_mpk VARBINARY(96) DEFAULT NULL,
  te_committee_pks JSON DEFAULT NULL,
  te_threshold_t INT DEFAULT NULL,
  te_threshold_n INT DEFAULT NULL,
  te_keyper_urls JSON DEFAULT NULL,
  te_keyper_addresses JSON DEFAULT NULL,
  te_aggregate JSON DEFAULT NULL,
  -- NULL = pending/ok; 'dkg_failed' = all attempts exhausted, needs operator intervention.
  te_dkg_status VARCHAR(24) DEFAULT NULL,
  -- Immutable committee + role snapshot, written once by the sequencer at
  -- proposal creation from its own env (writer/proposal.ts). Proposal creation
  -- is the registration event for the threshold protocol, so this is the single
  -- config write: everything downstream reads it and never mutates it.
  --
  -- Deliberately sx-shaped, NOT the protocol's wire format. The hub is the only
  -- process that knows the protocol's JSON (it already links the crypto SDK), so
  -- it maps this snapshot onto the wire config and derives the mutable fields --
  -- numCandidates/budget/mode/variant -- live from `choices` and `type` on every
  -- read. Those four cannot be frozen here: update-proposal lets an author edit
  -- `choices` and `type` right up until `start`, which would leave a frozen copy
  -- stale. Deriving them is safe precisely because that same endpoint refuses
  -- edits once voting has opened, so they are constant for the whole voting
  -- window.
  te_geg_config JSON DEFAULT NULL,
  -- Set by the coordinator when it gives up on a tally, cleared only by the
  -- admin identity. The split is the point: the party that marks a stall cannot
  -- clear it, so a coordinator restart can never quietly resurrect an election
  -- that a human has not looked at.
  te_tally_stalled TINYINT(1) NOT NULL DEFAULT 0,
  -- The coordinator's own account of *why* it stalled, for an operator to read.
  --
  -- Deliberately NOT part of the signed `tally_stall` digest, unlike the flag
  -- above. It is a hint, not an artifact: it cannot make an unverifiable tally
  -- look verifiable, and the split that actually decides what an operator does --
  -- keyper problem or coordinator problem -- is derived client-side from share
  -- counts nobody can forge (`diagnoseTally`). Surfaced as a claim ("the
  -- coordinator reports...") rather than as fact.
  --
  -- If this value ever gates an automated action -- auto-retry, auto-resume,
  -- auto-scaling the coordinator -- it must be moved inside the signed digest
  -- first. Unauthenticated input driving automation is a different risk class
  -- from unauthenticated input driving a human's attention.
  te_tally_stall_reason VARCHAR(200) DEFAULT NULL,
  PRIMARY KEY (id),
  INDEX ipfs (ipfs),
  INDEX author (author),
  INDEX updated (updated),
  INDEX network (network),
  INDEX start (start),
  INDEX end (end),
  INDEX app (app),
  INDEX scores_state (scores_state),
  INDEX scores_updated (scores_updated),
  INDEX votes (votes),
  INDEX flagged (flagged),
  INDEX cb (cb),
  INDEX idx_proposals_on_created_desc_id_asc_space (created DESC, id, space),
  INDEX idx_proposals_on_space_created_desc_id_asc (space, created DESC, id),
  INDEX idx_proposals_on_created (created),
  INDEX idx_proposals_on_end_desc_id (end DESC, id),
  INDEX idx_proposals_on_scores_total_value (scores_total_value)
);

CREATE TABLE votes (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  voter VARCHAR(100) NOT NULL,
  created INT(11) NOT NULL,
  space VARCHAR(100) NOT NULL,
  proposal VARCHAR(66) NOT NULL,
  choice JSON NOT NULL,
  metadata JSON NOT NULL,
  reason TEXT NOT NULL,
  app VARCHAR(24) NOT NULL,
  vp DECIMAL(64,30) NOT NULL,
  vp_by_strategy JSON NOT NULL,
  vp_state VARCHAR(24) NOT NULL,
  vp_value DECIMAL(13,3) NOT NULL DEFAULT '0.000',
  cb INT(11) NOT NULL,
  PRIMARY KEY (voter, space, proposal),
  INDEX id (id),
  INDEX ipfs (ipfs),
  INDEX app (app),
  INDEX vp (vp),
  INDEX vp_state (vp_state),
  INDEX cb (cb),
  INDEX space_created_id (space, created, id),
  INDEX idx_votes_on_space_proposal_created_id (space, proposal, created, id),
  INDEX idx_votes_on_created_id (created, id),
  INDEX idx_votes_on_proposal_vp_id (proposal, vp, id),
  INDEX idx_votes_on_vp_value (vp_value),
  INDEX idx_votes_on_space_created_desc_id (space, created DESC, id),
  INDEX idx_votes_on_cb_proposal (cb, proposal)
);

-- Threshold-ElGamal partial decryption shares posted by keypers after the
-- voting window closes. The tally worker reads these, runs verifyDecryptionShare
-- on each, Lagrange-combines `t+1` valid shares per candidate, and recovers
-- the per-candidate plaintext total via baby-step giant-step.
-- Append-only: PRIMARY KEY enforces one share per (proposal, keyper, candidate).
CREATE TABLE te_decryption_shares (
  proposal_id VARCHAR(66) NOT NULL,
  keyper_index INT NOT NULL,
  candidate INT NOT NULL,
  sigma VARBINARY(96) NOT NULL,
  proof_e VARBINARY(32) NOT NULL,
  proof_z VARBINARY(32) NOT NULL,
  posted_at BIGINT NOT NULL,
  PRIMARY KEY (proposal_id, keyper_index, candidate),
  INDEX idx_te_shares_proposal (proposal_id),
  INDEX idx_te_shares_posted (posted_at)
);

-- Pre-finalisation DKG submissions: one row per (proposal, keyper). The hub
-- finalises te_mpk + te_committee_pks on the proposal row once at least
-- t+1 keypers post identical (mpk, committee_pks_hex) tuples here. Keyper
-- changes its mind = 409 conflict (handled in apps/hub/src/te.ts).
CREATE TABLE te_dkg_submissions (
  proposal_id VARCHAR(66) NOT NULL,
  keyper_index INT NOT NULL,
  keyper_address VARCHAR(42) NOT NULL,
  mpk_hex VARCHAR(200) NOT NULL,
  committee_pks_hex MEDIUMTEXT NOT NULL,
  signature VARCHAR(200) NOT NULL,
  posted_at BIGINT NOT NULL,
  PRIMARY KEY (proposal_id, keyper_index),
  INDEX idx_te_dkg_match (proposal_id, mpk_hex(64))
);

-- The published tally. Written once, by the result publisher named in the
-- election's frozen config, and mirrored into proposals.scores by the sequencer.
--
-- totals_json holds the per-candidate integers as JSON *strings* rather than
-- numbers: they are sums over weighted ballots and can exceed 2^53, where a
-- JSON number stops being exact. They are also what the publisher's signature
-- covers, so a rounded value here would not just display wrong, it would fail
-- to verify.
CREATE TABLE te_results (
  proposal_id VARCHAR(66) NOT NULL PRIMARY KEY,
  totals_json TEXT NOT NULL,
  keyper_indices TEXT NOT NULL,
  bsgs_bound VARCHAR(80) NOT NULL,
  signature VARCHAR(200) NOT NULL,
  posted_at BIGINT NOT NULL
);

-- Per-keyper aggregate submissions. The aggregate is committee-owned: each
-- member derives it independently from the same ballots and the same config,
-- and the one that a quorum submits *byte-identically* becomes canonical
-- (promoted into proposals.te_aggregate). A single writer could otherwise
-- isolate a ballot and nobody would be able to tell.
--
-- Unlike te_dkg_submissions this is deliberately NOT append-only: a keyper may
-- overwrite its own row until the quorum finalises. The aggregate is a
-- deterministic re-derivation, so a member that submitted a stale one must be
-- able to re-converge with the rest — the coordinator explicitly asks the
-- committee to re-derive when it sees submissions that do not agree. After the
-- quorum, the row set is frozen and a change is a 409.
--
-- digest is stored alongside the JSON because it is what the quorum counts on
-- (cheap and indexed), while the JSON is what an auditor reads to see exactly
-- what each keyper claimed when a quorum *fails* to form.
CREATE TABLE te_aggregate_submissions (
  proposal_id VARCHAR(66) NOT NULL,
  keyper_index INT NOT NULL,
  keyper_address VARCHAR(42) NOT NULL,
  aggregate_json MEDIUMTEXT NOT NULL,
  digest VARCHAR(66) NOT NULL,
  signature VARCHAR(200) NOT NULL,
  posted_at BIGINT NOT NULL,
  PRIMARY KEY (proposal_id, keyper_index),
  INDEX idx_te_agg_match (proposal_id, digest)
);

-- The eligibility public key currently in use, published by the sequencer.
--
-- The sequencer holds the private half and mints one credential per private
-- ballot; the hub needs the public half for one job: refusing to serve a
-- proposal whose frozen key no longer matches the key in use, which is what
-- stops a rotated key producing a legitimate-looking all-zeros tally.
--
-- Written on every sequencer boot. Rotating the key means changing an
-- environment variable, which means a restart, so this row cannot lag reality.
-- One row, enforced by a fixed primary key.
CREATE TABLE te_eligibility_key (
  id TINYINT NOT NULL PRIMARY KEY,
  public_key VARCHAR(100) NOT NULL,
  updated BIGINT NOT NULL
);

CREATE TABLE te_request_nonces (
  proposal_id VARCHAR(66) NOT NULL,
  op VARCHAR(32) NOT NULL,
  issued_at BIGINT NOT NULL,
  accepted_at BIGINT NOT NULL,
  PRIMARY KEY (proposal_id, op, issued_at),
  INDEX idx_te_nonce_accepted (accepted_at)
);



CREATE TABLE follows (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  follower VARCHAR(100) NOT NULL,
  space VARCHAR(100) NOT NULL,
  network VARCHAR(24) NOT NULL DEFAULT 's',
  created INT(11) NOT NULL,
  PRIMARY KEY (follower, space, network),
  INDEX ipfs (ipfs),
  INDEX space (space),
  INDEX network (network),
  INDEX created (created)
);

CREATE TABLE aliases (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  address VARCHAR(100) NOT NULL,
  alias VARCHAR(100) NOT NULL,
  created INT(11) NOT NULL,
  PRIMARY KEY (address, alias),
  UNIQUE KEY alias (alias),
  INDEX ipfs (ipfs),
  INDEX idx_aliases_on_id (id)
);

CREATE TABLE subscriptions (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  address VARCHAR(100) NOT NULL,
  space VARCHAR(64) NOT NULL,
  created INT(11) NOT NULL,
  PRIMARY KEY (address, space),
  INDEX ipfs (ipfs),
  INDEX created (created)
);

CREATE TABLE users (
  id VARCHAR(100) NOT NULL,
  ipfs VARCHAR(64) NOT NULL,
  profile JSON,
  created INT(11) NOT NULL,
  PRIMARY KEY (id),
  INDEX ipfs (ipfs),
  INDEX created (created)
);

CREATE TABLE statements (
  id VARCHAR(66) NOT NULL,
  ipfs VARCHAR(64) DEFAULT NULL,
  delegate VARCHAR(100) NOT NULL,
  space VARCHAR(100) NOT NULL,
  about TEXT,
  statement TEXT,
  network VARCHAR(24) NOT NULL DEFAULT 's',
  discourse VARCHAR(64),
  source VARCHAR(24) DEFAULT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'INACTIVE',
  created INT(11) NOT NULL,
  updated INT(11) NOT NULL,
  PRIMARY KEY (delegate, space, network),
  INDEX ipfs (ipfs),
  INDEX space (space),
  INDEX network (network),
  INDEX created (created),
  INDEX updated (updated),
  INDEX source (source),
  INDEX status (status)
);

CREATE TABLE leaderboard (
  user VARCHAR(100) NOT NULL,
  space VARCHAR(64) NOT NULL,
  vote_count SMALLINT UNSIGNED NOT NULL DEFAULT '0',
  proposal_count SMALLINT UNSIGNED NOT NULL DEFAULT '0',
  last_vote BIGINT,
  vp_value DECIMAL(13,3) NOT NULL DEFAULT '0.000',
  PRIMARY KEY user_space (user,space),
  INDEX vote_count (vote_count),
  INDEX proposal_count (proposal_count),
  INDEX last_vote (last_vote),
  INDEX idx_leaderboard_on_space_mixed (space, vote_count, proposal_count, last_vote, user),
  INDEX vp_value (vp_value)
);

CREATE TABLE options (
  name VARCHAR(100) NOT NULL,
  value VARCHAR(100) NOT NULL,
  PRIMARY KEY (name)
);

CREATE TABLE skins (
  id VARCHAR(100) NOT NULL,
  bg_color VARCHAR(7) DEFAULT NULL,
  link_color VARCHAR(7) DEFAULT NULL,
  text_color VARCHAR(7) DEFAULT NULL,
  content_color VARCHAR(7) DEFAULT NULL,
  border_color VARCHAR(7) DEFAULT NULL,
  heading_color VARCHAR(7) DEFAULT NULL,
  primary_color VARCHAR(7) DEFAULT NULL,
  header_color VARCHAR(7) DEFAULT NULL,
  theme VARCHAR(5) NOT NULL DEFAULT 'light',
  logo VARCHAR(256) DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE networks (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(32) NOT NULL,
  testnet TINYINT UNSIGNED NOT NULL DEFAULT '0',
  premium TINYINT UNSIGNED NOT NULL DEFAULT '0',
  PRIMARY KEY (id),
  INDEX premium (premium)
);

-- The re-vote counter the eligibility credential carries.
--
-- The committee ranks a voter's duplicate ballots by (nonce, sequenceNumber), so
-- this is what decides which of their ballots is counted. It has to be strictly
-- increasing per (proposal, pseudonym) and it has to survive a restart: a
-- regression would let a stale ballot outrank a genuine re-vote.
--
-- A counter rather than the issuance timestamp, because credentials are now
-- minted before the vote is cast and two requests in the same second — a
-- double-click — would otherwise share a nonce and leave the ordering undefined.
CREATE TABLE te_revote_nonces (
  proposal_id VARCHAR(66) NOT NULL,
  pseudonym VARCHAR(66) NOT NULL,
  last BIGINT NOT NULL,
  updated BIGINT NOT NULL,
  PRIMARY KEY (proposal_id, pseudonym)
);

