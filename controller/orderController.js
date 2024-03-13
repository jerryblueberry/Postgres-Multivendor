const asyncHandler = require('express-async-handler');
const pool = require('../database/database');

const orderProduct = asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;
  
      if (!userId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
  
      // Retrieve the user's cart from the database
      const cartQuery = `
        SELECT * 
        FROM carts 
        WHERE user_id = $1`;
      const cartValues = [userId];
      const { rows: cartRows } = await pool.query(cartQuery, cartValues);
  
      if (cartRows.length === 0) {
        return res.status(404).json({ error: "User's cart not found" });
      }
  
      const userCart = cartRows[0];
  
      // Check the total price threshold
      if (userCart.total_price < 100) {
        return res.status(401).json({ message: 'Cart Total price must be above 100' });
      }
  
      // Convert products to JSON string before inserting into the database
      const productsJsonString = JSON.stringify(userCart.products);
  
      // Insert the order into the orders table
      const orderQuery = `
        INSERT INTO orders (user_id, products, total_price)
        VALUES ($1, $2, $3)
        RETURNING id, timestamp`;
      const orderValues = [userId, productsJsonString, userCart.total_price];
      const { rows: orderRows } = await pool.query(orderQuery, orderValues);
      const savedOrder = orderRows[0];
  
      // Clear the user's cart
      const clearCartQuery = `
        UPDATE carts
        SET products = '[]', total_price = 0
        WHERE user_id = $1`;
      await pool.query(clearCartQuery, [userId]);
  
      res.status(201).json(savedOrder);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

  // const getOrders = asyncHandler(async (req, res) => {
  //   try {
  //     const userId = req.user.id;
  
  //     // Query orders for the user from the database
  //     const ordersQuery = `
  //       SELECT id, user_id, products, total_price, timestamp
  //       FROM orders
  //       WHERE user_id = $1
  //     `;
  //     const { rows: orders } = await pool.query(ordersQuery, [userId]);
  
  //     // Map the orders to include product details
  //     const purchases = orders.map((order) => {
  //       return {
  //         id: order.id,
  //         userId: order.user_id,
  //         products: order.products,
  //         total_price: order.total_price,
  //         timestamp: order.timestamp
  //       };
  //     });
  //     // res.status(200).json({purchases})
  //     res.render('order', { purchases, userId });
  //   } catch (error) {
  //     res.status(500).json({ error: error.message });
  //   }
  // });
  
  
  // const getOrders = asyncHandler(async (req, res) => {
  //   try {
  //     const userId = req.user.id;
  
  //     // Query orders for the user from the database
  //     const ordersQuery = `
  //       SELECT id, user_id, products, total_price, timestamp
  //       FROM orders
  //       WHERE user_id = $1
  //     `;
  //     const { rows: orders } = await pool.query(ordersQuery, [userId]);
  
  //     // Map the orders to include product details
  //     const purchases = await Promise.all(orders.map(async (order) => {
  //       // If products is an object, convert it to an array
  //       const productsArray = Array.isArray(order.products) ? order.products : [order.products];
  
  //       // Map each product to include detailed information
  //       const productsWithDetails = await Promise.all(productsArray.map(async (product) => {
  //         // Retrieve detailed product information based on its ID
  //         // Assuming there's a products table where you can query the details
  //         // Adjust this query according to your database schema
  //         const productDetailsQuery = `
  //           SELECT id, title, description, price, rating, category, quantity, store_id, is_bidding, 
  //                  bidding_start_time, bidding_end_time, images
  //           FROM products
  //           WHERE id = $1
  //         `;
  //         // Assuming product ID is stored in the "id" field of the product object
  //         const { rows: productDetails } = await pool.query(productDetailsQuery, [product.id]);
  
  //         // Return the product details along with the quantity from the order
  //         return {
  //           ...productDetails[0], // Assuming the query returns only one row
  //           quantity: product.quantity
  //         };
  //       }));
  
  //       return {
  //         id: order.id,
  //         userId: order.user_id,
  //         products: productsWithDetails, // Replace the original products with the detailed ones
  //         total_price: order.total_price,
  //         timestamp: order.timestamp
  //       };
  //     }));
  //     res.status(200).json({purchases})
  //     // res.render('order', { purchases, userId });
  //   } catch (error) {
  //     res.status(500).json({ error: error.message });
  //   }
  // });

  const getOrders = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;

        // Query orders for the user from the database
        const ordersQuery = `
            SELECT id, user_id, products, total_price, timestamp
            FROM orders
            WHERE user_id = $1
        `;
        const { rows: orders } = await pool.query(ordersQuery, [userId]);

        // Map the orders to include product details
        const purchases = await Promise.all(orders.map(async (order) => {
            // If products is an object, convert it to an array
            const productsArray = Array.isArray(order.products) ? order.products : [order.products];

            // Map each product to include detailed information
            const productsWithDetails = await Promise.all(productsArray.map(async (product) => {
                // Retrieve detailed product information based on its ID
                // Assuming there's a products table where you can query the details
                // Adjust this query according to your database schema
                const productDetailsQuery = `
                    SELECT id, title, description, price, rating, category, quantity,type, store_id, is_bidding, 
                           bidding_start_time, bidding_end_time, images
                    FROM products
                    WHERE id = $1
                `;
                // Assuming product ID is stored in the "id" field of the product object
                const { rows: productDetails } = await pool.query(productDetailsQuery, [product.product]);

                // Return the product details along with the quantity from the order
                return {
                    ...productDetails[0], // Assuming the query returns only one row
                    quantity: product.quantity
                };
            }));

            return {
                id: order.id,
                userId: order.user_id,
                products: productsWithDetails, // Replace the original products with the detailed ones
                total_price: order.total_price,
                timestamp: order.timestamp
            };
        }));
        // res.status(200).json({ purchases });
        res.render('order', { purchases, userId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

  

module.exports = {orderProduct,getOrders}



