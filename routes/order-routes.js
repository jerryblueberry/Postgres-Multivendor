const express = require('express');
const router = express.Router();
const {orderProduct,getOrders} = require('../controller/orderController');
const { verifyAuth } = require('../middleware/authentication');


router.post('/',verifyAuth,orderProduct);

router.get('/',verifyAuth,getOrders);
module.exports = router;