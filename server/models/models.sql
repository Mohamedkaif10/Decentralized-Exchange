CREATE DATABASE simple_dex;

\c simple_dex;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE balances (
  user_id INT REFERENCES users(id),
  token VARCHAR(10) NOT NULL,
  amount DECIMAL(15, 2) DEFAULT 0.00,
  PRIMARY KEY (user_id, token)
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  type VARCHAR(4) CHECK (type IN ('buy', 'sell')),
  token_pair VARCHAR(20) NOT NULL, 
  amount DECIMAL(15, 2) NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  status VARCHAR(10) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  buy_order_id INT REFERENCES orders(id),
  sell_order_id INT REFERENCES orders(id),
  amount DECIMAL(15, 2) NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);