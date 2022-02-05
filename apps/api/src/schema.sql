CREATE TABLE blocks (
  number BIGINT NOT NULL,
  hash VARCHAR(65),
  PRIMARY KEY (number),
  INDEX hash (hash)
);
