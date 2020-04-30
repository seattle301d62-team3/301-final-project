DROP TABLE IF EXISTS pictures;
DROP TABLE IF EXISTS client;
DROP TABLE IF EXISTS project;

CREATE TABLE pictures (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100),
    _name VARCHAR(100),
    description VARCHAR(250),
    full_description VARCHAR(500),
    image VARCHAR(900),
    small_image VARCHAR(900),
    thumbnail VARCHAR(900),
    author VARCHAR(100),
    download VARCHAR(900),
    client_id VARCHAR (250),
    project_id VARCHAR (250)
);

CREATE TABLE client (
    id SERIAL PRIMARY KEY,
    _name VARCHAR(255)
);

CREATE TABLE project (
    id SERIAL PRIMARY KEY,
    _name VARCHAR(255),
    client_id VARCHAR(255)
);
