CREATE TABLE checkpoint (
  number BIGINT NOT NULL,
  PRIMARY KEY (number)
);

CREATE TABLE proposals (
  id VARCHAR(65) NOT NULL,
  author VARCHAR(42) NOT NULL,
  created INT(11) NOT NULL,
  PRIMARY KEY (id),
  INDEX author (author),
  INDEX created (created)
);

CREATE TABLE votes (
  id VARCHAR(65) NOT NULL,
  voter VARCHAR(42) NOT NULL,
  proposal VARCHAR(66) NOT NULL,
  choice INT NOT NULL,
  created INT(11) NOT NULL,
  PRIMARY KEY (id),
  INDEX voter (voter),
  INDEX proposal (proposal),
  INDEX choice (choice),
  INDEX created (created)
);
