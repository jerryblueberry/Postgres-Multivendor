const express= require('express');
const router = express.Router();


const {addCart,getCart,cartIncreament, cartDecreament,removeProduct} = require("../controller/cartController");
const { verifyAuth } = require('../middleware/authentication');


router.post('/add-cart',verifyAuth,addCart);
router.get('/',verifyAuth,getCart);
router.put('/increament',verifyAuth,cartIncreament);
router.put('/decreament',verifyAuth,cartDecreament);
router.delete('/remove',verifyAuth,removeProduct)



module.exports = router;
