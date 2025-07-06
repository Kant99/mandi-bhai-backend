const express = require("express");
const router = express.Router();

// Controllers
const {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
} = require("../../controllers/product/category");

// Create a new category
router.post("/create", createCategory);

// Update a category
router.put("/:categoryId", updateCategory);

// Delete a category
router.delete("/:categoryId", deleteCategory);

// Get all categories
router.get("/", getAllCategories);

module.exports = router;