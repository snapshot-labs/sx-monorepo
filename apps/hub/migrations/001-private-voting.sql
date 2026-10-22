-- Private voting (privacy='shutter-elgamal') schema for an existing database. New
-- databases get the same schema from src/helpers/schema.sql.
--
-- Run it once: MySQL 8 has no ADD COLUMN IF NOT EXISTS, so a second run fails at
-- the first column and changes nothing.
--
-- The ALTER only adds nullable or defaulted columns, so it runs as
-- ALGORITHM=INSTANT (metadata only, no rebuild of the large `proposals` table).
-- The clause is explicit so MySQL errors instead of rebuilding the table; if it
-- errors, find the column at fault rather than removing the clause.

ALTER TABLE proposals
  ADD COLUMN te_config JSON DEFAULT NULL,
  ADD COLUMN te_mpk VARBINARY(96) DEFAULT NULL,
  ADD COLUMN te_committee_pks JSON DEFAULT NULL,
  ADD COLUMN te_threshold_t INT DEFAULT NULL,
  ADD COLUMN te_threshold_n INT DEFAULT NULL,
  ADD COLUMN te_keyper_addresses JSON DEFAULT NULL,
  ADD COLUMN te_sgp_config JSON DEFAULT NULL,
  ADD COLUMN te_tally_stalled TINYINT(1) NOT NULL DEFAULT 0,
  -- The coordinator's reason for a stall, if it sends one. Unsigned: shown to an
  -- admin, never used to trigger an automated action.
  ADD COLUMN te_tally_stall_reason VARCHAR(200) DEFAULT NULL,
  ALGORITHM=INSTANT;

-- The tables below are described in src/helpers/schema.sql.
CREATE TABLE te_decryption_shares (
  proposal_id VARCHAR(66) NOT NULL,
  keyper_index INT NOT NULL,
  candidate INT NOT NULL,
  sigma VARBINARY(96) NOT NULL,
  proof_e VARBINARY(32) NOT NULL,
  proof_z VARBINARY(32) NOT NULL,
  posted_at BIGINT NOT NULL,
  PRIMARY KEY (proposal_id, keyper_index, candidate)
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

CREATE TABLE te_request_nonces (
  proposal_id VARCHAR(66) NOT NULL,
  op VARCHAR(32) NOT NULL,
  issued_at BIGINT NOT NULL,
  accepted_at BIGINT NOT NULL,
  PRIMARY KEY (proposal_id, op, issued_at)
);

CREATE TABLE te_revote_nonces (
  proposal_id VARCHAR(66) NOT NULL,
  pseudonym VARCHAR(66) NOT NULL,
  last BIGINT NOT NULL,
  updated BIGINT NOT NULL,
  PRIMARY KEY (proposal_id, pseudonym)
);
