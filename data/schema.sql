DROP TABLE IF EXISTS pictures;

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
    download VARCHAR(900)
);