const express = require("express");
const router = express.Router();
const multer = require("multer");
const { isWholesaler } = require("../../middlewares/isWholesaler");
const { verifyToken } = require("../../middlewares/verifyToken");

// Controllers
const {
  createProduct,
  getAllProducts,
  getPendingProducts,
  getVerifiedProducts,
  getRejectedProducts,
  updateProduct,
  deleteProduct,
  getOutofStockProducts,
  getHighPriceProducts,
  expiringPriceProducts,
  expiredPriceProducts,
  combinedSearchAndFilter
} = require("../../controllers/product/product");


// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});


// Create a new product (wholesaler only)
router.post(
  "/create",
  verifyToken,
  isWholesaler,
  upload.single("productImage"),
  createProduct
);


// Get all products for authenticated wholesaler (wholesaler only)
router.get("/", verifyToken, isWholesaler, getAllProducts);

// Get all pending products for authenticated wholesaler (wholesaler only)
router.get("/pending", verifyToken, isWholesaler, getPendingProducts);

// Get all verified products for authenticated wholesaler (wholesaler only)
router.get("/verified", verifyToken, isWholesaler, getVerifiedProducts);

// Get all rejected products for authenticated wholesaler (wholesaler only)
router.get("/rejected", verifyToken, isWholesaler, getRejectedProducts);

// Update a product (wholesaler only, must be owner)
router.put(
  "/:productId",
  verifyToken,
  isWholesaler,
  upload.single("productImage"),
  updateProduct
);

// Delete a product (wholesaler only, must be owner)
router.delete("/:productId", verifyToken, isWholesaler, deleteProduct);

//Get all out of stock product
router.get("/out-of-stock", verifyToken, isWholesaler, getOutofStockProducts);

//Get all high price products
router.get("/high-price", verifyToken, isWholesaler, getHighPriceProducts);

//Get all expiring price products
router.get("/expiring-prices", verifyToken, isWholesaler, expiringPriceProducts);

//Get all expired price products
router.get("/expired-prices", verifyToken, isWholesaler, expiredPriceProducts);


// Combined search and filter products and categories
router.get("/combined-search", verifyToken, isWholesaler, combinedSearchAndFilter);

module.exports = router;