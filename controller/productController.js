const asyncHandler = require('express-async-handler');
const moment = require('moment');
const pool = require('../database/database');
const schedule = require('node-schedule');


// calculate the remaining time
const calculateTimeRemaining = (endTime) => {
  const now = moment(); // Get the current time
  const end = moment(endTime); // Get the bidding end time

  // Calculate the difference between now and the end time
  const duration = moment.duration(end.diff(now));

  // Get the remaining days, hours, minutes, and seconds
  const days = duration.days();
  const hours = duration.hours();
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  // Format the remaining time
  let remainingTime = '';
  if (days > 0) {
    remainingTime += `${days} days `;
  }
  if (hours > 0) {
    remainingTime += `${hours} hours `;
  }
  if (minutes > 0) {
    remainingTime += `${minutes} minutes `;
  }
  if (seconds > 0) {
    remainingTime += `${seconds} seconds`;
  }

  return remainingTime.trim();
};



//  update the product status
// Function to update bidding status
// const updateBiddingStatus = async () => {
//   try {
//     // Find all products where isBidding is true and biddingEndTime has passed
//     const productsToUpdateQuery = `
//       SELECT * 
//       FROM products 
//       WHERE is_bidding = true 
//       AND bidding_end_time < NOW()
//     `;
//     const { rows: productsToUpdate } = await pool.query(productsToUpdateQuery);

//     // Update isBidding field to false for these products
//     for (const product of productsToUpdate) {
//       const updateProductQuery = `
//         UPDATE products 
//         SET is_bidding = false 
//         WHERE id = $1
//       `;
//       await pool.query(updateProductQuery, [product.id]);

//       // If there are bids for this product
//       if (product.bids.length > 0) {
//         // Get the highest bid
//         let highestBid = product.bids.reduce((maxBid, bid) => {
//           return bid.amount > maxBid.amount ? bid : maxBid;
//         }, { amount: product.price });

//         // Create a new order with the highest bidder and the product
//         const newOrderQuery = `
//           INSERT INTO orders (user_id, products, total_price, timestamp)
//           VALUES ($1, $2, $3, NOW())
//         `;
//         await pool.query(newOrderQuery, [highestBid.bidder, JSON.stringify(product), highestBid.amount]);
//       }
//     }

//     console.log('Bidding status updated successfully.');
//   } catch (error) {
//     console.error('Error updating bidding status:', error);
//   }
// };

const updateBiddingStatus = async () => {
  try {
    // Find all products where isBidding is true and biddingEndTime has passed
    const productsToUpdateQuery = `
      SELECT * 
      FROM products 
      WHERE is_bidding = true 
      AND bidding_end_time < NOW()
    `;
    const { rows: productsToUpdate } = await pool.query(productsToUpdateQuery);

    // Update isBidding field to false for these products
    for (const product of productsToUpdate) {
      const updateProductQuery = `
        UPDATE products 
        SET is_bidding = false 
        WHERE id = $1
      `;
      await pool.query(updateProductQuery, [product.id]);

      // If there are bids for this product
      if (product.bids.length > 0) {
        // Get the highest bid
        let highestBid = product.bids.reduce((maxBid, bid) => {
          return bid.amount > maxBid.amount ? bid : maxBid;
        }, { amount: product.price });

        // Construct a consistent product object for the order
        const orderProduct = {
          product: product.id,
          price: product.price,
          quantity: 1 // Assuming quantity is always 1 for bidding products in an order
        };

        // Insert the order with the highest bidder and the product
        const orderQuery = `
          INSERT INTO orders (user_id, products, total_price, timestamp)
          VALUES ($1, $2, $3, NOW())
        `;
        await pool.query(orderQuery, [highestBid.bidder, JSON.stringify(orderProduct), highestBid.amount]);
      }
    }

    console.log('Bidding status updated successfully.');
  } catch (error) {
    console.error('Error updating bidding status:', error);
  }
};





// Schedule the updateBiddingStatus function to run every minute (adjust as needed)
schedule.scheduleJob('* * * * *', updateBiddingStatus);





const getProducts = asyncHandler(async (req, res) => {
    const { search, sort, filter } = req.query;
  
    try {
   
        const userId = req.user.id;
        const userRole = req.user.role;
        const userLocation = req.user.location;
  
        // Construct the base query to fetch products
        let productsQuery = 'SELECT * FROM products';
  
        // Apply search filter if provided
        if (search) {
          productsQuery += ` WHERE LOWER(title) LIKE LOWER('%${search}%') OR LOWER(description) LIKE LOWER('%${search}%')`;
        }
  
        // Apply sorting if specified
        if (sort === 'price-low') {
          productsQuery += ' ORDER BY price ASC'; // Sort in ascending order for 'price-low'
        } else if (sort === 'price-high') {
          productsQuery += ' ORDER BY price DESC'; // Sort in descending order for 'price-high'
        }
  
        // Apply filtering if provided
        if (filter) {
          productsQuery += search ? ' AND' : ' WHERE';
          productsQuery += ` LOWER(category) = LOWER('${filter}')`;
        }
  
        // Execute the constructed query
        const { rows: products } = await pool.query(productsQuery);
  
        if (products.length === 0) {
          return res.status(404).json({ message: 'Products not found' });
        }
        // res.status(200).json({products});
        res.render('products', { products, userId, userRole, userLocation });
     
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  //  get the specific product
  const getSpecificProduct = asyncHandler(async(req,res) => {
    try {
      const userId = req.user.id; // Assuming the user ID is stored in req.user.id
      const userRole = req.user.role;
      const productId = req.params.productId;

      // Query to retrieve product details including store information
      const productQuery = await pool.query(
          `SELECT p.*, s.name AS store_name, s.location AS store_location ,s.logo AS store_logo
           FROM products p 
           INNER JOIN stores s ON p.store_id = s.id 
           WHERE p.id = $1`,
          [productId]
      );

      const product = productQuery.rows[0];

      if (!product) {
          return res.status(404).json({ error: 'Product Not Found' });
      }

      res.render('productdetail', { userId, product, userRole });
      // res.status(200).json({product});
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
  })


//  get the bidding products
const getBiddingProducts = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Retrieve bidding products with associated store name and bids
    const biddingProductsQuery = await pool.query(
      `SELECT 
         p.id,
         p.title,
         p.description,
         p.price,
         p.rating,
         p.type,
         p.is_bidding,
         p.bidding_start_time,
         p.bidding_end_time,
         p.quantity,
         p.images,
         p.category,
         p.store_id,
         p.bids,
         s.name AS store_name
       FROM 
         products p
       INNER JOIN
         stores s ON p.store_id = s.id
       WHERE 
         p.is_bidding = true`
    );
   

    const biddingProducts = biddingProductsQuery.rows.map(product => {
      const remainingTime = calculateTimeRemaining(product.bidding_end_time);
      return {
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        rating: product.rating,
        type: product.type,
        is_bidding: product.is_bidding,
        bidding_start_time: product.bidding_start_time,
        bidding_end_time: product.bidding_end_time,
        quantity: product.quantity,
        images: product.images,
        category: product.category,
        store_id: product.store_id,
        store_name: product.store_name,
        bids: product.bids,
        remainingTime:remainingTime,
      };
    });

    // res.status(200).json({ products: biddingProducts, userId, userRole });
    res.render('bidding',({products:biddingProducts,userRole,userId}));
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});
//  get the specific bidding products


const getSpecificBiddingProduct = asyncHandler(async (req, res) => {
  const productId = req.params.productId; // Assuming you're passing the product ID as a route parameter

  try {
    // Retrieve the specific product with populated bids, bidder's username, and store details
    const productQuery = await pool.query(
      `SELECT 
         p.id,
         p.title,
         p.description,
         p.price,
         p.rating,
         p.type,
         p.is_bidding,
         p.bidding_start_time,
         p.bidding_end_time,
         p.quantity,
         p.images,
         p.category,
         p.store_id,
         s.name AS store_name,
         s.location AS store_location,
         COALESCE(MAX((b.bid ->> 'amount')::numeric), p.price) AS highest_bid,
         (SELECT u.name FROM jsonb_array_elements(p.bids) b(bid) 
          JOIN users u ON (b.bid ->> 'bidder')::int = u.id 
          ORDER BY (b.bid ->> 'amount')::numeric DESC NULLS LAST LIMIT 1) AS highest_bidder_name
       FROM 
         products p
       LEFT JOIN
         stores s ON p.store_id = s.id
       LEFT JOIN 
         LATERAL jsonb_array_elements(p.bids) b(bid) ON true
       WHERE 
         p.id = $1
       GROUP BY
         p.id, s.name, s.location`,
      [productId]
    );

    const product = productQuery.rows[0];

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get remaining time for bidding
    const remainingTime = calculateTimeRemaining(product.bidding_end_time);

    // Construct the response object with highest bid information and store details
    const productWithHighestBid = {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      rating: product.rating,
      type: product.type,
      is_bidding: product.is_bidding,
      bidding_start_time: product.bidding_start_time,
      bidding_end_time: product.bidding_end_time,
      quantity: product.quantity,
      images: product.images,
      category: product.category,
      store_id: product.store_id,
      store_name: product.store_name,
      store_location: product.store_location,
      highestBid: parseFloat(product.highest_bid),
      highestBidder: product.highest_bidder_name || 'be the first one to bid',
      remainingTime: remainingTime
    };

    // res.status(200).json(productWithHighestBid);
    res.render('biddetail', { product: productWithHighestBid });
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});


// add bid
const addBidding = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id; // Assuming the user ID is stored in req.user.id
    const { amount } = req.body;
    const productId = req.params.productId;

    // Retrieve the product from the database
    const productQuery = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
    const product = productQuery.rows[0];

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if the bid amount is higher than the current highest bid or the initial price
    const highestBidAmount = product.bids ? Math.max(...product.bids.map(bid => bid.amount), product.price) : product.price;
    if (amount <= highestBidAmount) {
      return res.status(400).json({ message: 'Bid amount must be higher than the current highest bid or initial price' });
    }

    // Construct the new bid object
    const newBid = { bidder: userId, amount };

    // Update the bids array in the product
    if (!product.bids) {
      product.bids = [newBid];
    } else {
      product.bids.push(newBid);
    }

    // Update the product in the database
    await pool.query('UPDATE products SET bids = $1 WHERE id = $2', [JSON.stringify(product.bids), productId]);

    // Redirect or respond with a success message
    res.redirect(`/bidding/${productId}`);
    // res.status(200).json({ message: 'Bid placed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




  module.exports = {getProducts,getSpecificProduct,getBiddingProducts,getSpecificBiddingProduct,addBidding};