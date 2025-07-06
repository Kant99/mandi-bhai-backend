const Category = require("../../Models/Product/Category");
const { apiResponse } = require("../../utils/apiResponse");

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Category name is required"));
    }

    // Validate name (2-50 characters, alphanumeric and spaces)
    const nameRegex = /^[a-zA-Z0-9\s]{2,50}$/;
    if (!nameRegex.test(name)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid category name (2-50 characters, alphanumeric and spaces)"));
    }

    // Validate description (if provided, max 500 characters)
    if (description && description.length > 500) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Description cannot exceed 500 characters"));
    }

    // Create new category
    const category = new Category({
      name,
      description: description || "",
    });

    // Save category
    await category.save();

    return res
      .status(201)
      .json(apiResponse(201, true, "Category created successfully", { category }));
  } catch (error) {
    console.log("Error in createCategory:", error.message);
    if (error.code === 11000) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Category name already exists"));
    }
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to create category"));
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description } = req.body;

    // Find category
    const category = await Category.findById(categoryId);
    if (!category) {
      return res
        .status(404)
        .json(apiResponse(404, false, "Category not found"));
    }

    // Validate name if provided
    if (name) {
      const nameRegex = /^[a-zA-Z0-9\s]{2,50}$/;
      if (!nameRegex.test(name)) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Invalid category name (2-50 characters, alphanumeric and spaces)"));
      }
      category.name = name;
    }

    // Validate and update description if provided
    if (description !== undefined) {
      if (description && description.length > 500) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Description cannot exceed 500 characters"));
      }
      category.description = description || "";
    }

    // Save updated category
    await category.save();

    return res
      .status(200)
      .json(apiResponse(200, true, "Category updated successfully", { category }));
  } catch (error) {
    console.log("Error in updateCategory:", error.message);
    if (error.code === 11000) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Category name already exists"));
    }
    if (error.name === "CastError") {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid category ID"));
    }
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to update category"));
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Find category
    const category = await Category.findById(categoryId);
    if (!category) {
      return res
        .status(404)
        .json(apiResponse(404, false, "Category not found"));
    }

    // Delete category
    await category.deleteOne();

    return res
      .status(200)
      .json(apiResponse(200, true, "Category deleted successfully"));
  } catch (error) {
    console.log("Error in deleteCategory:", error.message);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid category ID"));
    }
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to delete category"));
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    // Fetch all categories
    const categories = await Category.find().sort({ name: 1 });

    // Check if categories exist
    if (categories.length === 0) {
      return res
        .status(404)
        .json(apiResponse(404, false, "No categories found"));
    }

    return res
      .status(200)
      .json(apiResponse(200, true, "Categories retrieved successfully", { categories }));
  } catch (error) {
    console.log("Error in getAllCategories:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to retrieve categories"));
  }
};