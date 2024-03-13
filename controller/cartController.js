const asyncHandler = require('express-async-handler');
const pool = require('../database/database');


// Function to calculate the total price for the cart
const calculateTotalPrice = (cartProducts) => {
    let totalPrice = 0;
    cartProducts.forEach(item => {
        totalPrice += item.quantity * item.price;
    });
    return totalPrice;
};

const addCart = asyncHandler(async (req, res) => {
    try {
        const { product, price } = req.body;
        const quantity = 1;
        const user_id = req.user.id;

        // Check if the user already has a cart
        const userCart = await pool.query('SELECT * FROM carts WHERE user_id = $1', [user_id]);

        if (userCart.rows.length === 0) {
            // If user does not have a cart, create a new one
            const newCart = {
                user_id,
                products: [{ product, quantity, price }],
            };

            // Calculate the total price for the initial insertion
            const total_price = calculateTotalPrice(newCart.products);

            // Insert the new cart into the database
            const { rows: [insertedCart] } = await pool.query(
                'INSERT INTO carts (user_id, products, total_price) VALUES ($1, $2, $3) RETURNING *',
                [user_id, JSON.stringify(newCart.products), total_price]
            );

            res.status(200).json({ userCart: insertedCart });
        } else {
            // If user already has a cart, update the existing one
            const cartId = userCart.rows[0].id;
            const cartProducts = userCart.rows[0].products;

            const existingProductIndex = cartProducts.findIndex(item => item.product === product);

            if (existingProductIndex !== -1) {
                // If the product already exists, update the quantity
                cartProducts[existingProductIndex].quantity += parseInt(quantity);
            } else {
                // If the product doesn't exist, add it to the cart with the specified quantity
                cartProducts.push({ product, quantity, price });
            }

            // Update the cart with the new products
            const { rows: [updatedCart] } = await pool.query(
                'UPDATE carts SET products = $1 WHERE id = $2 RETURNING *',
                [JSON.stringify(cartProducts), cartId]
            );

            // Calculate the total price after updating the cart
            const total_price = calculateTotalPrice(cartProducts);

            // Update the total price in the database
            await pool.query(
                'UPDATE carts SET total_price = $1 WHERE id = $2',
                [total_price, cartId]
            );

            // res.render('cart');
            res.status(200).json({ userCart: updatedCart });
            // res.render('cart',{userCart:updatedCart})
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});




//  get the cart
// const getCart = asyncHandler(async (req, res) => {
//     try {
//       const userRole = req.user.role;
//       const userId = req.user.id;
  
//       // Check if the user already has a cart
//       const userCartQuery = await pool.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
//       const userCart = userCartQuery.rows[0];
  
//       if (!userCart) {
//         return res.status(404).json({ message: 'Cart not found' });
//       }
  
//       // Parse the products from JSON format
//       const products = userCart.products;
  
//       // Construct the populated cart object
//       const populatedCart = {
//         id: userCart.id,
//         user_id: userCart.user_id,
//         products: products,
//         total_price: userCart.total_price
//       };
  
//       res.status(200).json({ userCart: populatedCart });
//     // res.render('cart',{userCart:populatedCart})
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   });
const getCart = asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;
  
      // Check if the user already has a cart
      const cartQuery = `
        SELECT * 
        FROM carts 
        WHERE user_id = $1`;
      const cartValues = [userId];
      const { rows: cartRows } = await pool.query(cartQuery, cartValues);
  
      if (cartRows.length === 0) {
        return res.status(404).json({ message: 'Cart not found' });
      }
  
      const userCart = cartRows[0];
      const products = userCart.products;
  
      // Fetch product details for each product in the cart
      const populatedProducts = [];
      for (const product of products) {
        const productQuery = `
          SELECT id, title, description, price, images 
          FROM products 
          WHERE id = $1`;
        const productValues = [product.product];
        const { rows: productRows } = await pool.query(productQuery, productValues);
  
        if (productRows.length > 0) {
          const populatedProduct = {
            ...product,
            product: productRows[0],
          };
          populatedProducts.push(populatedProduct);
        }
      }
  
      // Construct the populated cart object
      const populatedCart = {
        id: userCart.id,
        user_id: userCart.user_id,
        products: populatedProducts,
        total_price: userCart.total_price
      };
  
    //   res.status(200).json({ userCart: populatedCart });
    res.render('cart',{userCart:populatedCart});
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  

  const cartIncreament = asyncHandler(async (req, res) => {
    try {
        const { product } = req.body; // Assuming the product ID is provided in the request body
        const userId = req.user.id;

        // Check the user's cart
        const userCartQuery = await pool.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
        const userCart = userCartQuery.rows[0];

        if (!userCart) {
            return res.status(401).json({ message: 'Cart not found for the user' });
        }

        // Find the product in the cart
        const existingProduct = userCart.products.find(item => item.product === product);

        if (existingProduct) {
            // Increment the quantity of the existing product
            existingProduct.quantity += 1;

            // Update the cart in the database
            await pool.query(
                'UPDATE carts SET products = $1 WHERE user_id = $2',
                [JSON.stringify(userCart.products), userId]
            );

            // Calculate the total price after updating the quantity
            const total_price = calculateTotalPrice(userCart.products);

            // Update the total price of the cart in the database
            await pool.query(
                'UPDATE carts SET total_price = $1 WHERE user_id = $2',
                [total_price, userId]
            );

            res.status(200).json(userCart);
        } else {
            res.status(404).json({ message: 'Product not found in cart' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// endpoint to decrease the cart products
const cartDecreament = asyncHandler(async (req, res) => {
    const { product } = req.body;

    try {
        const userId = req.user.id;

        // Check the user's cart
        const userCartQuery = await pool.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
        const userCart = userCartQuery.rows[0];

        if (!userCart) {
            return res.status(404).json({ message: 'Cart not found for the user' });
        }

        // Find the product in the cart
        const existingProduct = userCart.products.find(item => item.product === product);

        if (existingProduct) {
            if (existingProduct.quantity <= 1) {
                return res.status(400).json({ message: 'Quantity cannot be less than 1. Try removing the product instead.' });
            }

            // Decrement the quantity of the existing product
            existingProduct.quantity -= 1;

            // Update the cart in the database
            await pool.query(
                'UPDATE carts SET products = $1 WHERE user_id = $2',
                [JSON.stringify(userCart.products), userId]
            );

            // Calculate the total price after updating the quantity
            const total_price = calculateTotalPrice(userCart.products);

            // Update the total price of the cart in the database
            await pool.query(
                'UPDATE carts SET total_price = $1 WHERE user_id = $2',
                [total_price, userId]
            );

            res.status(200).json(userCart);
        } else {
            res.status(404).json({ message: 'Product not found in cart' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


const removeProduct = asyncHandler(async (req, res) => {
    const { product } = req.body;

    try {
        const userId = req.user.id;

        // Check the user's cart
        const userCartQuery = await pool.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
        const userCart = userCartQuery.rows[0];

        if (!userCart) {
            return res.status(404).json({ message: 'Cart not found for the user' });
        }

        // Find the product in the cart
        const productIndex = userCart.products.findIndex(item => item.product === product);

        if (productIndex !== -1) {
            // Remove the product from the cart
            userCart.products.splice(productIndex, 1);

            // Calculate the total price after removing the product
            const total_price = calculateTotalPrice(userCart.products);

            // Update the cart in the database with the updated products and total price
            await pool.query(
                'UPDATE carts SET products = $1, total_price = $2 WHERE user_id = $3',
                [JSON.stringify(userCart.products), total_price, userId]
            );

            res.status(200).json(userCart);
        } else {
            res.status(404).json({ message: 'Product not found in cart' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


  const updateCartTotal = async (cartId) => {
    try {
        // Fetch the cart from the database
        const { rows: [userCart] } = await pool.query('SELECT * FROM carts WHERE id = $1', [cartId]);

        if (!userCart) {
            throw new Error('Cart not found');
        }

        // Parse the products from JSON format
        const products = userCart.products;

        // Calculate the total price
        let totalPrice = 0;
        products.forEach(item => {
            totalPrice += item.quantity * item.price;
        });

        // Update the total price of the cart in the database
        await pool.query('UPDATE carts SET total_price = $1 WHERE id = $2', [totalPrice, cartId]);
    } catch (error) {
        console.error('Error updating cart total:', error);
        throw error;
    }
};



  

module.exports = {addCart,getCart,cartIncreament,cartDecreament,removeProduct}