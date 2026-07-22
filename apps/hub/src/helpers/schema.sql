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
