const asyncHandler = require('express-async-handler');
const pool = require('../database/database');



//  controller to create store

const createStore = asyncHandler(async(req,res) => {
    try {
        const user_id = req.user.id;
        const {name,type,latitude,longitude} = req.body;
        let logo = req.file? req.file.path :null;

        if(!name || !type || !latitude || !longitude){
            return res.status(401).json({error:"All fields are required"});
           
            
        }

        const existingStoreQuery = 'SELECT * FROM stores WHERE user_id = $1';
        const existingStore = await pool.query(existingStoreQuery,[user_id]);

        if(existingStore.rows.length > 0){
            return res.status(400).json({message:"Store already exists for the user"});
        }
        const insertStoreQuery = `INSERT INTO stores (name,type,user_id,logo,location) VALUES($1,$2,$3,$4,ST_SetSRID(ST_MakePoint($5,$6),4326))`;

        await pool.query(insertStoreQuery,[
            name,
            type,
            user_id,
            logo,
            longitude,
            latitude
        ]);
        res.status(201).json({message:"Store created Successfully"});
    } catch (error) {
        res.status(500).json({error:error.message});
        
    }
})


// endpoint for all the stores
const allStore = asyncHandler(async (req, res) => {
    const { search, filter } = req.query;
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const userLocation = req.user.location;
  
      let storesQuery = 'SELECT * FROM stores';
  
      // Apply search filter if provided
      if (search) {
        storesQuery += ` WHERE LOWER(name) LIKE LOWER('%${search}%')`;
      }
  
      // Apply filter if provided
      if (filter) {
        storesQuery += search ? ' AND' : ' WHERE';
        storesQuery += ` LOWER(type) = LOWER('${filter}')`;
      }
  
      const { rows: stores } = await pool.query(storesQuery);
  
      if (stores.length === 0) {
        return res.status(404).json({ message: 'Store not available' });
      }
  
      res.status(200).json(stores);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

//    add product in the store
const addProductToStore = asyncHandler(async (req, res) => {
    const userId = req.user.id; // Assuming user id is used for authorization
     
  
    try {
      const {
        title,
        store_id,
     
        description,
        rating,
        price,
        category,
        type,
        quantity,
        biddingStartTime,
        biddingEndTime,
      } = req.body;
  
      let image = req.files ? req.files.map((file) => file.path) : null;
  
      const isBidding = type === 'General' ? false : true;
  
      const insertProductQuery = `
        INSERT INTO products (title, description, rating, price, category, type, is_bidding, bidding_start_time, bidding_end_time, quantity, images, store_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `;
  
      const values = [
        title,
        description,
        rating,
        price,
        category,
        type,
        isBidding,
        isBidding ? biddingStartTime : null,
        isBidding ? biddingEndTime : null,
        quantity,
        image,
        store_id,
      ];
  
      const { rows: [savedProduct] } = await pool.query(insertProductQuery, values);
  
      res.status(201).json(savedProduct);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


  //  endpoint for getting product of specific store
  const getProductsByStore = asyncHandler(async (req, res) => {
    const storeId = req.params.storeId;
    const userId = req.user._id;
    const userRole = req.user.role;
  
    try {
      // Find the store by ID
      const storeQuery = 'SELECT * FROM stores WHERE id = $1';
      const { rows: [store] } = await pool.query(storeQuery, [storeId]);
  
      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }
  
      // Find all products associated with the store
      const productsQuery = 'SELECT * FROM products WHERE store_id = $1';
      const { rows: products } = await pool.query(productsQuery, [storeId]);
  
      // Render the response
      // res.status(200).json({store,products})
      res.render('storeDetail', { store, products, userId, userRole });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // endpoint to get stores by the category
  const getStoresByCategory = asyncHandler(async (req, res) => {
    try {
      const type = req.params.type;
      const userRole = req.user.role;
      const userId = req.user._id;
  
      // Query stores by category
      const storesQuery = 'SELECT * FROM stores WHERE type = $1';
      const { rows: stores } = await pool.query(storesQuery, [type]);
  
      // Render the response
      // res.status(200).json({ stores, type, userId, userRole });
      res.render('storeType', { stores, type, userId, userRole });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


  // endpoint to get store with in the radius

  // const getStoresWithinRadius = asyncHandler(async (req, res) => {
  //   const userId = req.user.id;
  //   const userRole = req.user.role;
  //   const { search } = req.query;
  
  //   try {
  //     // Query the user's location
  //     const userLocationQuery = 'SELECT location FROM users WHERE id = $1';
  //     const { rows } = await pool.query(userLocationQuery, [userId]);
  
  //     console.log('User location query result:', rows); // Log the result of the query
  
  //     // Ensure userLocation is provided
  //     if (!rows || !rows.length || !rows[0].location) {
  //       return res.status(400).json({ error: 'User location is missing or undefined' });
  //     }
  
  //     const location = rows[0].location; // Extract the location from the query result
  
  //     // Define the maximum distance (1KM) in meters
  //     const maxDistance = 1000;
  
  //     // Query stores within the specified radius using PostGIS functions
  //     const storesQuery = `
  //       SELECT *,
  //              ST_Distance($1, store.location) AS distance
  //         FROM stores AS store
  //        WHERE ST_DWithin($1, store.location, $2)
  //     `;
  
  //     // Execute the query
  //     const { rows: stores } = await pool.query(storesQuery, [location, maxDistance]);
  
  //     // Filter stores based on search query
  //     const filteredStores = search
  //       ? stores.filter(store => store.name.toLowerCase().includes(search.toLowerCase()))
  //       : stores;
  
  //     // Round the distance to 2 decimal places
  //     filteredStores.forEach(store => {
  //       store.distance = parseFloat(store.distance).toFixed(2);
  //     });
  
  //     // Render the response
  //     res.render('nearByStore', { stores: filteredStores, userId, userRole });
  //     // res.status(200).json(stores);
  //   } catch (error) {
  //     res.status(500).json({ error: error.message });
  //   }
  // });
  
  

  const getStoresWithinRadius = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { search } = req.query;

    try {
        // Query the user's location
        const userLocationQuery = 'SELECT location FROM users WHERE id = $1';
        const { rows: userRows } = await pool.query(userLocationQuery, [userId]);

        if (!userRows || !userRows.length || !userRows[0].location) {
            return res.status(400).json({ error: 'User location is missing or undefined' });
        }

        const userLocation = userRows[0].location;

        // Query nearby stores using PostGIS functions
        const nearbyStoresQuery = `
            SELECT *,
                   ST_Distance($1::geography, store.location::geography) AS distance
              FROM stores AS store
             WHERE ST_DWithin($1::geography, store.location::geography, 1000) -- Within 1km radius
        `;

        const { rows: stores } = await pool.query(nearbyStoresQuery, [userLocation]);

        // Filter stores based on search query
        const filteredStores = search
            ? stores.filter(store => store.name.toLowerCase().includes(search.toLowerCase()))
            : stores;

        // Format the distance to meters
        filteredStores.forEach(store => {
            store.distance = parseFloat(store.distance).toFixed(2) + ' meters';
        });
        res.render('nearByStore', { stores: filteredStores, userId, userRole });
        // res.status(200).json(filteredStores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = {createStore,allStore,addProductToStore,getProductsByStore,getStoresByCategory,getStoresWithinRadius}