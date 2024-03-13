const jwt = require('jsonwebtoken');
const pool  = require('../database/database')
require('dotenv').config();



const verifyAuth = async (req, res, next) => {
  const token = req.cookies.jwt;

  console.log('Received Token', token);

  if (!token) {
    throw new Error("jwt must be provided");
  }

  try {
    const decoded = jwt.verify(token,'MXIUuw6u5Ty0Ecih3XCjZ1+0575N2OTu0x9gsOl6pBc=');

    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    let user;
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const { rows } = await pool.query(userQuery, [decoded.userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    user = rows[0];
    req.user = user;

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Unauthorized token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role === 'Admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Forbidden: Only admin can perform this action' });
  }
};

const isSeller = (req, res, next) => {
  if (req.user.role === "Seller") {
    next();
  } else {
    return res.status(403).json({ message: "Forbidden: Only Seller can perform this action" });
  }
};

module.exports = { verifyAuth, isAdmin, isSeller };
