const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { ethers } = require("ethers");
const { dexContract, provider } = require("../config/blockchain");
const router = express.Router();


router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
      [username, hashedPassword]
    );
    await pool.query(
      'INSERT INTO balances (user_id, token, amount) VALUES ($1, $2, $3), ($1, $4, $3)',
      [result.rows[0].id, 'TokenA', 1000, 'TokenB'] 
    );
    res.status(201).json({ message: 'User registered' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (user.rows.length === 0 || !(await bcrypt.compare(password, user.rows[0].password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
  

  router.post('/order', authenticate, async (req, res) => {
    const { type, token_pair, amount, price } = req.body;
    const user_id = req.user.id;
    try {
      const result = await pool.query(
        'INSERT INTO orders (user_id, type, token_pair, amount, price) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [user_id, type, token_pair, amount, price]
      );
   
      await matchOrder(result.rows[0]);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  async function matchOrder(order) {
    const oppositeType = order.type === 'buy' ? 'sell' : 'buy';
    const query = `
      SELECT * FROM orders 
      WHERE type = $1 AND token_pair = $2 AND price <= $3 AND status = 'open' AND id != $4
      ORDER BY price ${oppositeType === 'sell' ? 'ASC' : 'DESC'}, created_at ASC
      LIMIT 1
    `;
    const match = await pool.query(query, [oppositeType, order.token_pair, order.price, order.id]);
    if (match.rows.length > 0) {
      const matchedOrder = match.rows[0];
      const tradeAmount = Math.min(order.amount, matchedOrder.amount);
    
      const [baseToken, quoteToken] = order.token_pair.split('/');
      if (order.type === 'buy') {
        await pool.query(
          'UPDATE balances SET amount = amount - $1 WHERE user_id = $2 AND token = $3',
          [tradeAmount * order.price, order.user_id, quoteToken]
        );
        await pool.query(
          'UPDATE balances SET amount = amount + $1 WHERE user_id = $2 AND token = $3',
          [tradeAmount, order.user_id, baseToken]
        );
        await pool.query(
          'UPDATE balances SET amount = amount + $1 WHERE user_id = $2 AND token = $3',
          [tradeAmount * order.price, matchedOrder.user_id, quoteToken]
        );
        await pool.query(
          'UPDATE balances SET amount = amount - $1 WHERE user_id = $2 AND token = $3',
          [tradeAmount, matchedOrder.user_id, baseToken]
        );
      } else {
        
      }
  
      await pool.query(
        'INSERT INTO trades (buy_order_id, sell_order_id, amount, price) VALUES ($1, $2, $3, $4)',
        [order.type === 'buy' ? order.id : matchedOrder.id, order.type === 'sell' ? order.id : matchedOrder.id, tradeAmount, order.price]
      );
  
      await pool.query('UPDATE orders SET status = $1 WHERE id = $2', ['filled', order.id]);
      await pool.query('UPDATE orders SET status = $1 WHERE id = $2', ['filled', matchedOrder.id]);
    }
  }


const authenticate = require("../middleware/auth");


router.post("/swap/a-to-b", authenticate, async (req, res) => {
  const { amountA } = req.body; 
  const userId = req.user.id;

  try {

    const user = await pool.query("SELECT wallet_address FROM users WHERE id = $1", [userId]);
    if (!user.rows[0].wallet_address) {
      return res.status(400).json({ error: "No wallet address linked" });
    }


    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider); 
    const dexWithSigner = dexContract.connect(signer);


    const tokenA = new ethers.Contract(process.env.TOKEN_A_ADDRESS, [
      "function approve(address spender, uint256 amount) external returns (bool)",
    ], signer);
    await tokenA.approve(dexContract.address, ethers.utils.parseEther(amountA.toString()));


    const tx = await dexWithSigner.swapAtoB(ethers.utils.parseEther(amountA.toString()));
    await tx.wait();

    
    await pool.query(
      "INSERT INTO trades (user_id, token_pair, amount, price, executed_at) VALUES ($1, $2, $3, $4, NOW())",
      [userId, "TokenA/TokenB", amountA, 2] 
    );

    res.json({ message: "Swap successful", txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post("/swap/b-to-a", authenticate, async (req, res) => {
  const { amountB } = req.body;
  const userId = req.user.id;

  try {
    const user = await pool.query("SELECT wallet_address FROM users WHERE id = $1", [userId]);
    if (!user.rows[0].wallet_address) {
      return res.status(400).json({ error: "No wallet address linked" });
    }

    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const dexWithSigner = dexContract.connect(signer);

    const tokenB = new ethers.Contract(process.env.TOKEN_B_ADDRESS, [
      "function approve(address spender, uint256 amount) external returns (bool)",
    ], signer);
    await tokenB.approve(dexContract.address, ethers.utils.parseEther(amountB.toString()));

    const tx = await dexWithSigner.swapBtoA(ethers.utils.parseEther(amountB.toString()));
    await tx.wait();

    await pool.query(
      "INSERT INTO trades (user_id, token_pair, amount, price, executed_at) VALUES ($1, $2, $3, $4, NOW())",
      [userId, "TokenB/TokenA", amountB, 0.5] 
    );

    res.json({ message: "Swap successful", txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
