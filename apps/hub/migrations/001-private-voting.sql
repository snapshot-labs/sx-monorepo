-- Private voting (privacy='shutter-elgamal') schema, for a database created
-- before this feature. New databases get all of it from src/helpers/schema.sql;
-- this file is what an existing deployment applies.
--
-- Ordering matters only in that the ALTERs touch live tables and the CREATEs do
-- not. Run the ALTERs first, confirm they were instant, then create the tables.
--
-- ON THE ALTERs
--
-- `proposals` and `votes` are large in production, and `votes` is the largest
-- table Snapshot has. Every column added below is nullable, or NOT NULL with a
-- default, so all of them qualify for MySQL 8's INSTANT algorithm: metadata
-- only, no table rebuild, regardless of row count.
--
-- Each table is altered in ONE statement rather than one statement per column.
-- Eleven separate instant adds are eleven metadata operations and eleven chances
-- for one to fall back to a copy unnoticed.
--
-- ALGORITHM=INSTANT is named explicitly so the statement ERRORS if any column is
-- rejected for it, rather than silently rebuilding a table with tens of millions
-- of rows. If it does error, do not simply drop the clause — work out which
-- column is at fault first.

ALTER TABLE proposals
  ADD COLUMN te_config JSON DEFAULT NULL,
  ADD COLUMN te_mpk VARBINARY(96) DEFAULT NULL,
  ADD COLUMN te_committee_pks JSON DEFAULT NULL,
  ADD COLUMN te_threshold_t INT DEFAULT NULL,
  ADD COLUMN te_threshold_n INT DEFAULT NULL,
  ADD COLUMN te_keyper_urls JSON DEFAULT NULL,
  ADD COLUMN te_keyper_addresses JSON DEFAULT NULL,
  ADD COLUMN te_aggregate JSON DEFAULT NULL,
  ADD COLUMN te_dkg_status VARCHAR(24) DEFAULT NULL,
  ADD COLUMN te_geg_config JSON DEFAULT NULL,
  ADD COLUMN te_tally_stalled TINYINT(1) NOT NULL DEFAULT 0,
  -- The coordinator's own account of why it stalled, for an operator to read.
  -- Advisory and deliberately outside the signed `tally_stall` digest: it is a
  -- hint, not an artifact. It cannot make an unverifiable tally look verifiable,
  -- and the split an operator acts on -- keyper problem vs coordinator problem --
  -- is derived client-side from public share counts (`diagnoseTally`), not read
  -- from here. If it ever gates an automated action it must be signed first.
  ADD COLUMN te_tally_stall_reason VARCHAR(200) DEFAULT NULL,
  ALGORITHM=INSTANT;


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

CREATE TABLE te_results (
  proposal_id VARCHAR(66) NOT NULL PRIMARY KEY,
  totals_json TEXT NOT NULL,
  keyper_indices TEXT NOT NULL,
  bsgs_bound VARCHAR(80) NOT NULL,
  signature VARCHAR(200) NOT NULL,
  posted_at BIGINT NOT NULL
);

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

CREATE TABLE te_eligibility_key (
  id TINYINT NOT NULL PRIMARY KEY,
  public_key VARCHAR(100) NOT NULL,
  updated BIGINT NOT NULL
);

-- Stall/resume request nonces, for replay rejection. The signer
-- binds a timestamp, and this table makes each one usable exactly once.
--
-- Rows outside the acceptance window are pruned on write; the freshness check
-- already rejects them, so they are only kept to bound a replay inside it.
CREATE TABLE te_request_nonces (
  proposal_id VARCHAR(66) NOT NULL,
  op VARCHAR(32) NOT NULL,
  issued_at BIGINT NOT NULL,
  accepted_at BIGINT NOT NULL,
  PRIMARY KEY (proposal_id, op, issued_at),
  INDEX idx_te_nonce_accepted (accepted_at)
);


CREATE TABLE te_revote_nonces (
  proposal_id VARCHAR(66) NOT NULL,
  pseudonym VARCHAR(66) NOT NULL,
  last BIGINT NOT NULL,
  updated BIGINT NOT NULL,
  PRIMARY KEY (proposal_id, pseudonym)
);
