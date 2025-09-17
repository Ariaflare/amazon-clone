const express = require('express');
const cors = require('cors');
const { authenticate, generateToken } = require('./auth');
const { authenticateToken, authorizeRole } = require('./middleware');
const { connectToDatabase } = require('./db');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Connect to database
let db;
connectToDatabase().then(database => {
  db = database;
  
  // Create products collection if it doesn't exist and add sample data
  initializeProductsCollection(db);
});

// Function to initialize products collection with sample data
async function initializeProductsCollection(database) {
  try {
    const productsCollection = database.collection('products');
    const count = await productsCollection.countDocuments();
    
    if (count === 0) {
      // Insert sample products if collection is empty
      const sampleProducts = [
        {
          name: "Smartphone",
          description: "Latest model smartphone with advanced features",
          category: "Electronics",
          image: "https://via.placeholder.com/300x200?text=Smartphone",
          price: 699.99
        },
        {
          name: "Laptop",
          description: "High-performance laptop for work and gaming",
          category: "Electronics",
          image: "https://via.placeholder.com/300x200?text=Laptop",
          price: 1299.99
        },
        {
          name: "T-Shirt",
          description: "Comfortable cotton t-shirt",
          category: "Clothing",
          image: "https://via.placeholder.com/300x200?text=T-Shirt",
          price: 19.99
        },
        {
          name: "Jeans",
          description: "Stylish denim jeans",
          category: "Clothing",
          image: "https://via.placeholder.com/300x200?text=Jeans",
          price: 49.99
        },
        {
          name: "Novel",
          description: "Bestselling fiction novel",
          category: "Books",
          image: "https://via.placeholder.com/300x200?text=Novel",
          price: 14.99
        },
        {
          name: "Cookbook",
          description: "Delicious recipes for home cooking",
          category: "Books",
          image: "https://via.placeholder.com/300x200?text=Cookbook",
          price: 24.99
        }
      ];
      
      await productsCollection.insertMany(sampleProducts);
      console.log("Sample products inserted");
    }
  } catch (error) {
    console.error("Error initializing products collection:", error);
  }
}

// Public route - Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const result = authenticate(username, password);
  if (result.success) {
    const token = generateToken(result.user);
    res.json({ 
      success: true, 
      user: result.user,
      token: token
    });
  } else {
    res.status(401).json({ success: false, message: result.message });
  }
});

// Public route - Get all products
app.get('/products', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ success: false, message: "Database not connected" });
    }
    
    const productsCollection = db.collection('products');
    const products = await productsCollection.find({}).toArray();
    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, message: "Error fetching products" });
  }
});

// Public route - Get products by category
app.get('/products/category/:category', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ success: false, message: "Database not connected" });
    }
    
    const productsCollection = db.collection('products');
    const category = req.params.category;
    
    let products;
    if (category === 'All') {
      products = await productsCollection.find({}).toArray();
    } else {
      products = await productsCollection.find({ category }).toArray();
    }
    
    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products by category:", error);
    res.status(500).json({ success: false, message: "Error fetching products" });
  }
});

// Public route - Search products
app.get('/products/search/:query', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ success: false, message: "Database not connected" });
    }
    
    const productsCollection = db.collection('products');
    const query = req.params.query;
    
    const products = await productsCollection.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
      ]
    }).toArray();
    
    res.json({ success: true, products });
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ success: false, message: "Error searching products" });
  }
});

// Protected route - Add multiple products (admin only)
app.post('/products/batch', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ success: false, message: "Database not connected" });
    }
    
    const productsCollection = db.collection('products');
    const products = req.body;
    
    // Validate that we received an array
    if (!Array.isArray(products)) {
      return res.status(400).json({ success: false, message: "Expected an array of products" });
    }
    
    // Validate each product
    for (const product of products) {
      if (!product.name || !product.description || !product.category || !product.image) {
        return res.status(400).json({ 
          success: false, 
          message: "Each product must have name, description, category, and image" 
        });
      }
    }
    
    // Insert all products
    const result = await productsCollection.insertMany(products);
    
    res.json({ 
      success: true, 
      message: `Successfully added ${result.insertedCount} products`,
      insertedCount: result.insertedCount
    });
  } catch (error) {
    console.error("Error adding products:", error);
    res.status(500).json({ success: false, message: "Error adding products" });
  }
});

// Protected route - User profile (accessible to all authenticated users)
app.get('/profile', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Protected route - Admin only
app.get('/admin', authenticateToken, authorizeRole('admin'), (req, res) => {
  res.json({ success: true, message: 'Welcome to the admin area!' });
});

// Protected route - Regular users only
app.get('/user', authenticateToken, authorizeRole('user'), (req, res) => {
  res.json({ success: true, message: 'Welcome to the user area!' });
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
