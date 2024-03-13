const asyncHandler = require('express-async-handler');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('../database/database')
const jwt = require('jsonwebtoken');
const saltRounds = 10;

const {  generateTokenAndSetCookie} = require('../utils/generateTokenandSetCookie');
require('dotenv').config();

const generateRandomId = () => Math.floor(Math.random() * 1000000);


// controller to signupUser (Create Account)
const signUpUser = asyncHandler(async (req, res) => {
  try {
    const { name, email, password, role, longitude, latitude } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(401).json({ message: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    let profile_image = req.file ? req.file.path : null;

    const userExistingQuery = 'SELECT * FROM users WHERE email  = $1';
    const existingUser = await pool.query(userExistingQuery, [email]);

    if (existingUser.rows.length > 0) {
      return res.status(401).json({ message: 'User already exists' });
    }

    const insertUserQuery = `INSERT INTO users (name,email,password,role,profile_image,location)
    VALUES($1,$2,$3,$4,$5,ST_SetSRID(ST_MakePoint($6,$7),4326))
    `;

    await pool.query(insertUserQuery, [
      name,
      email,
      hashedPassword,
      role,
      profile_image,
      longitude,
      latitude,
    ]);
    res.status(200).json({ message: 'Signup Sucessfull' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// controller to signin user(login);
const signInUser = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const loginQuery = 'SELECT * FROM users WHERE email = $1';
    const { rows } = await pool.query(loginQuery, [email]);

    if (rows.length == 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Password did not match' });
    }

    generateTokenAndSetCookie(user.id, user.name, user.location, res);

    // res.status(200).json(user);
    // res.render('products');
    res.redirect('/');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const logout = asyncHandler(async(req,res)=> {
  try {
    res.cookie('jwt',"",{maxAge:0});
    res.redirect('/');
  } catch (error) {
    
  }
})



module.exports = { signUpUser, signInUser,logout};
