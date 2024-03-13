const express = require("express");
const router = express.Router();

const { getProducts,getSpecificProduct,getBiddingProducts,getSpecificBiddingProduct,addBidding}  = require('../controller/productController');
const { verifyAuth,isAdmin } = require('../middleware/authentication');

const { multipleUpload} = require('../middleware/uploadMiddleware')






router.get('/',verifyAuth,getProducts);
router.get('/bidding',verifyAuth,getBiddingProducts);
router.get('/bidding/:productId',verifyAuth,getSpecificBiddingProduct);
router.get('/detail/:productId',verifyAuth,getSpecificProduct);
router.post('/bid/add/:productId',verifyAuth,addBidding);
//  endpoint to get the details of the product





module.exports=router;
