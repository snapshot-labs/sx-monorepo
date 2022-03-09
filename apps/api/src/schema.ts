export default `

DROP TABLE IF EXISTS checkpoint;
DROP TABLE IF EXISTS proposals;
DROP TABLE IF EXISTS votes;

CREATE TABLE checkpoint (
  number BIGINT NOT NULL,
  PRIMARY KEY (number)
);

CREATE TABLE proposals (
  id INT(24) NOT NULL,
  space VARCHAR(65) NOT NULL,
  author VARCHAR(65) NOT NULL,
  execution VARCHAR(65) NOT NULL,
  metadata VARCHAR(65) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  start INT(11) NOT NULL,
  end INT(11) NOT NULL,
  snapshot INT(24) NOT NULL,
  created INT(11) NOT NULL,
  tx VARCHAR(65) NOT NULL,
  PRIMARY KEY (id, space),
  INDEX author (author),
  INDEX start (start),
  INDEX end (end),
  INDEX created (created),
  INDEX tx (tx)
);

CREATE TABLE votes (
  space VARCHAR(65) NOT NULL,
  voter VARCHAR(65) NOT NULL,
  proposal INT(24) NOT NULL,
  choice INT NOT NULL,
  created INT(11) NOT NULL,
  PRIMARY KEY (space, voter, proposal),
  INDEX choice (choice),
  INDEX created (created)
);

INSERT checkpoint SET number = 0;
`;
