const express  = require('express');

const {signUpUser,signInUser,logout} = require('../controller/userController');
const {verifyAuth} = require('../middleware/authentication');
const {singleUpload} = require('../middleware/uploadMiddleware')

//  verify auth

const router = express.Router();

router.post('/signup',singleUpload,signUpUser);
router.post('/',signInUser);
router.post('/logout',logout);


module.exports= router;