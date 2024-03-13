const express  = require('express');
const {createStore,allStore,addProductToStore, getProductsByStore,getStoresByCategory,getStoresWithinRadius} = require('../controller/storeController');

const {verifyAuth}  = require('../middleware/authentication');
const {singleUploadStore,multipleUpload} = require('../middleware/uploadMiddleware');


const router = express.Router();


router.post('/add',singleUploadStore,verifyAuth,createStore);
router.get('/', verifyAuth, allStore);
router.post('/products/add',multipleUpload,verifyAuth,addProductToStore);

router.get('/nearby',verifyAuth,getStoresWithinRadius);
router.get('/category/:type',verifyAuth,getStoresByCategory);

router.get('/:storeId',verifyAuth,getProductsByStore);
module.exports = router;