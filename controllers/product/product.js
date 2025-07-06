const Product = require("../../Models/Product/Product");
const Category=require("../../Models/Product/Category")
const { apiResponse } = require("../../utils/apiResponse");
const { uploadImageToS3 } = require("../../utils/s3Upload");
const ShopProfile = require("../../Models/Wholesaler/ShopProfile");

exports.createProduct = async (req, res) => {
  try {
    console.log("req.user",req.user)
    const wholesalerId=req.user.id;
    const {
      productName,
      priceUnit,
      categoryName,
      productDescription,
      stock,
      filters,
      minimumRequired,
      gstCategory,
      gstPercent,
      priceBeforeGst
    } = req.body;
    const productImageFile = req.file; // From multer

    // Validate required fields
    if (
      !productName ||
      !priceUnit ||
      !categoryName ||
      !stock ||
      !productImageFile ||
      minimumRequired === undefined ||
      !gstCategory || priceBeforeGst === undefined
    ) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Product name, price unit, category, stock, minimum required, GST category, price before GST, and image are required"));
    }

    // Validate minimumRequired (non-negative integer)
    if (!Number.isInteger(Number(minimumRequired)) || minimumRequired < 0) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Minimum required must be a non-negative integer"));
    }

    // Validate productName (2-100 characters, alphanumeric and spaces)
    const nameRegex = /^[a-zA-Z0-9\s]{2,100}$/;
    if (!nameRegex.test(productName)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid product name (2-100 characters, alphanumeric and spaces)"));
    }

    // Validate priceBeforeGst (positive number)
    if (isNaN(priceBeforeGst) || priceBeforeGst < 0) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Price before GST must be a positive number"));
    }

    // Validate priceUnit
    const validUnits = ["per kg", "per dozen", "per piece"];
    if (!validUnits.includes(priceUnit)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Price unit must be 'per kg', 'per dozen', or 'per piece'"));
    }

    // Validate categoryName format (2-50 characters)
    const categoryRegex = /^[a-zA-Z0-9\s]{2,50}$/;
    if (!categoryRegex.test(categoryName)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid category name (2-50 characters, alphanumeric and spaces)"));
    }

    // Validate categoryName existence in Category model
    const category = await Category.findOne({ name: categoryName });
    if (!category) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Category name does not exist"));
    }

    // Validate stock (non-negative integer)
    if (!Number.isInteger(Number(stock)) || stock < 0) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Stock must be a non-negative integer"));
    }

    // Validate filters (if provided)
    let parsedFilters = [];
    if (filters) {
      try {
        parsedFilters = typeof filters === "string" ? JSON.parse(filters) : filters;
        if (!Array.isArray(parsedFilters)) {
          return res
            .status(400)
            .json(apiResponse(400, false, "Filters must be an array of key-value pairs"));
        }
        for (const filter of parsedFilters) {
          if (!filter.key || !filter.value || typeof filter.key !== "string" || typeof filter.value !== "string") {
            return res
              .status(400)
              .json(apiResponse(400, false, "Each filter must have a key and value as strings"));
          }
        }
      } catch (error) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Invalid filters format"));
      }
    }

    // Validate GST category
    const validGstCategories = ["exempted", "applicable"];
    if (!validGstCategories.includes(gstCategory)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "GST category must be 'exempted' or 'applicable'"));
    }

    // Validate GST percent
    let gstPercentValue = 0;
    if (gstCategory === "applicable") {
      if (gstPercent === undefined || isNaN(gstPercent) || gstPercent < 0 || gstPercent > 100) {
        return res
          .status(400)
          .json(apiResponse(400, false, "GST percent must be between 0 and 100 for applicable GST"));
      }
      gstPercentValue = Number(gstPercent);
    }

    // Calculate priceAfterGst
    const priceBeforeGstValue = Number(priceBeforeGst);
    let priceAfterGst = priceBeforeGstValue;
    if (gstCategory === "exempted" || gstPercentValue === 0) {
      priceAfterGst = priceBeforeGstValue;
    } else if (gstCategory === "applicable" && gstPercentValue > 0) {
      priceAfterGst = priceBeforeGstValue + (priceBeforeGstValue * gstPercentValue / 100);
    }

    // Upload product image to S3
    let productImageUrl;
    try {
      productImageUrl = await uploadImageToS3(productImageFile, "product-images");
    } catch (uploadError) {
      return res
        .status(400)
        .json(apiResponse(400, false, `Failed to upload product image: ${uploadError.message}`));
    }

    // Check wholesaler KYC status
    const shopProfile = await ShopProfile.findOne({ wholesalerId });
    if (!shopProfile || shopProfile.kycStatus !== 'Completed') {
      return res.status(403).json(apiResponse(403, false, "KYC must be completed to create a product"));
    }

    // Create new product
    const product = new Product({
      wholesalerId,
      productName,
      categoryName,
      productDescription: productDescription || "",
      productImage: productImageUrl,
      priceBeforeGst: priceBeforeGstValue,
      gstCategory,
      gstPercent: gstPercentValue,
      priceAfterGst,
      priceUnit,
      lastPriceUpdate: new Date(),
      stock: Number(stock),
      minimumRequired: Number(minimumRequired),
      filters: parsedFilters,
      approvalStatus: 'Pending',
    });

    // Save product
    await product.save();

    return res
      .status(201)
      .json(apiResponse(201, true, "Product created successfully", { product }));
  } catch (error) {
    console.log("Error in createProduct:", error.message);
    if (error.code === 11000) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Product already exists"));
    }
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to create product"));
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    // Use wholesalerId from req.user
    const wholesalerId = req.user.id;

    // Fetch all products for the wholesaler
    const products = await Product.find({ wholesalerId:wholesalerId })
      .populate("wholesalerId", "name")
      .sort({ createdAt: -1 });

    // Check if products exist
    if (products.length === 0) {
      return res
        .status(404)
        .json(apiResponse(404, false, "No products found for this wholesaler"));
    }

    return res
      .status(200)
      .json(apiResponse(200, true, "Products retrieved successfully", { products }));
  } catch (error) {
    console.log("Error in getAllProducts:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to retrieve products"));
  }
};

exports.getPendingProducts = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const products = await Product.find({ wholesalerId: wholesalerId, approvalStatus: 'Pending' });
    return res.status(200).json(apiResponse(200, true, "Pending products retrieved successfully", { products }));
  } catch (error) {
    console.log("Error in getPendingProducts:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to retrieve pending products"));
    }
};

exports.getVerifiedProducts = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const products = await Product.find({ wholesalerId: wholesalerId, approvalStatus: 'Verified' });
    return res.status(200).json(apiResponse(200, true, "Verified products retrieved successfully", { products }));
  } catch (error) {
    console.log("Error in getVerifiedProducts:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to retrieve verified products"));
  }
};

exports.getRejectedProducts = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const products = await Product.find({ wholesalerId: wholesalerId, approvalStatus: 'Rejected' });
    return res.status(200).json(apiResponse(200, true, "Rejected products retrieved successfully", { products }));
  } catch (error) {
    console.log("Error in getRejectedProducts:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to retrieve rejected products"));
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const wholesalerId=req.user.id;
    console.log(productId);
    console.log(req.body)
    const {
      productName,
      priceUnit,
      categoryName,
      productDescription,
      stock,
      filters,
      minimumRequired,
      gstCategory,
      gstPercent,
      priceBeforeGst
    } = req.body;
    const productImageFile = req.file;

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json(apiResponse(404, false, "Product not found"));
    }

    // Check ownership
    if (product.wholesalerId.toString() !== wholesalerId.toString()) {
      return res
        .status(403)
        .json(apiResponse(403, false, "Unauthorized: You can only update your own products"));
    }

    // Validate fields if provided
    if (productName) {
      const nameRegex = /^[a-zA-Z0-9\s]{2,100}$/;
      if (!nameRegex.test(productName)) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Invalid product name (2-100 characters, alphanumeric and spaces)"));
      }
      product.productName = productName;
    }

    if (priceUnit) {
      const validUnits = ["per kg", "per dozen", "per piece"];
      if (!validUnits.includes(priceUnit)) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Price unit must be 'per kg', 'per dozen', or 'per piece'"));
      }
      product.priceBeforeGst = product.priceBeforeGst;
      product.priceAfterGst = product.priceAfterGst;
    }

    if (categoryName) {
      const categoryRegex = /^[a-zA-Z0-9\s]{2,50}$/;
      if (!categoryRegex.test(categoryName)) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Invalid category name (2-50 characters, alphanumeric and spaces)"));
      }
      product.categoryName = categoryName;
    }

    if (productDescription !== undefined) {
      product.productDescription = productDescription || "";
    }

    if (stock !== undefined) {
      if (!Number.isInteger(Number(stock)) || stock < 0) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Stock must be a non-negative integer"));
      }
      product.stock = Number(stock);
    }

    if (filters) {
      let parsedFilters = [];
      try {
        parsedFilters = typeof filters === "string" ? JSON.parse(filters) : filters;
        if (!Array.isArray(parsedFilters)) {
          return res
            .status(400)
            .json(apiResponse(400, false, "Filters must be an array of key-value pairs"));
        }
        for (const filter of parsedFilters) {
          if (!filter.key || !filter.value || typeof filter.key !== "string" || typeof filter.value !== "string") {
            return res
              .status(400)
              .json(apiResponse(400, false, "Each filter must have a key and value as strings"));
          }
        }
        product.filters = parsedFilters;
      } catch (error) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Invalid filters format"));
      }
    }

    // Validate and update minimumRequired if provided
    if (minimumRequired !== undefined) {
      if (!Number.isInteger(Number(minimumRequired)) || minimumRequired < 0) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Minimum required must be a non-negative integer"));
      }
      product.minimumRequired = Number(minimumRequired);
    }

    // Validate and update GST category and percent if provided
    if (gstCategory) {
      const validGstCategories = ["exempted", "applicable"];
      if (!validGstCategories.includes(gstCategory)) {
        return res
          .status(400)
          .json(apiResponse(400, false, "GST category must be 'exempted' or 'applicable'"));
      }
      product.gstCategory = gstCategory;
    }
    if (gstCategory === "applicable") {
      if (gstPercent === undefined || isNaN(gstPercent) || gstPercent < 0 || gstPercent > 100) {
        return res
          .status(400)
          .json(apiResponse(400, false, "GST percent must be between 0 and 100 for applicable GST"));
      }
      product.gstPercent = Number(gstPercent);
    } else if (gstCategory === "exempted") {
      product.gstPercent = 0;
    }

    // Update priceBeforeGst and priceAfterGst if provided
    if (priceBeforeGst !== undefined) {
      product.priceBeforeGst = Number(priceBeforeGst);
    }
    // Recalculate priceAfterGst based on GST logic
    if (
      product.gstCategory === "exempted" ||
      product.gstPercent === 0
    ) {
      product.priceAfterGst = product.priceBeforeGst;
    } else if (
      product.gstCategory === "applicable" &&
      product.gstPercent > 0
    ) {
      product.priceAfterGst = product.priceBeforeGst + (product.priceBeforeGst * product.gstPercent / 100);
    }

    // Update product image if provided
    if (productImageFile) {
      try {
        const productImageUrl = await uploadImageToS3(productImageFile, "product-images");
        product.productImage = productImageUrl;
      } catch (uploadError) {
        return res
          .status(400)
          .json(apiResponse(400, false, `Failed to upload product image: ${uploadError.message}`));
      }
    }

    // Save updated product
    await product.save();

    return res
      .status(200)
      .json(apiResponse(200, true, "Product updated successfully", { product }));
  } catch (error) {
    console.log(error)
    console.log("Error in updateProduct:", error.message);
    if (error.code === 11000) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Product already exists"));
    }
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to update product"));
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
     const wholesalerId=req.user.id;
    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json(apiResponse(404, false, "Product not found"));
    }

    // Check ownership
    if (product.wholesalerId.toString() !== wholesalerId.toString()) {
      return res
        .status(403)
        .json(apiResponse(403, false, "Unauthorized: You can only delete your own products"));
    }

    // Delete product
    await product.deleteOne();

    return res
      .status(200)
      .json(apiResponse(200, true, "Product deleted successfully"));
  } catch (error) {
    console.log("Error in deleteProduct:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to delete product"));
  }
};

exports.getOutofStockProducts = async (req, res) => {
  try {
    // Get wholesalerId from authenticated user
    const wholesalerId = req.user.id;

    // Find all products where stock <= minimumRequired for this wholesaler
    const outOfStockProducts = await Product.find({ 
      wholesalerId: wholesalerId,
      $expr: { $lte: ["$stock", "$minimumRequired"] }
    }).populate("wholesalerId", "name");

    // Check if any out of stock products exist
    if (outOfStockProducts.length === 0) {
      return res
        .status(404)
        .json(apiResponse(404, false, "No out of stock products found"));
    }

    return res
      .status(200)
      .json(apiResponse(200, true, "Out of stock products retrieved successfully", { outOfStockProducts }));
  } catch (error) {
    console.log("Error in getOutofStockProducts:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to retrieve out of stock products"));
  }
};

exports.getHighPriceProducts = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { searchQuery, limit = 100 } = req.query;
    // Build productQuery using only the search feature
    const productQuery = { wholesalerId };

    if (searchQuery && searchQuery.length >= 2) {
      const searchPattern = new RegExp(searchQuery, 'i');
      productQuery.$or = [
        { productName: searchPattern },
        { productDescription: searchPattern }
      ];
    }

    // Get all products for the current wholesaler using the built query
    const wholesalerProducts = await Product.find(productQuery).limit(Number(limit));

    if (wholesalerProducts.length === 0) {
      return res
        .status(404)
        .json(apiResponse(404, false, "No products found for this wholesaler"));
    }

    const highPriceProducts = [];

    // For each product of the current wholesaler
    for (const product of wholesalerProducts) {
      // Find all products with the same name from other wholesalers
      const otherWholesalerProducts = await Product.find({
        productName: product.productName,
        wholesalerId: { $ne: wholesalerId }
      });

      if (otherWholesalerProducts.length > 0) {
        // Find the minimum price among other wholesalers
        const minPrice = Math.min(...otherWholesalerProducts.map(p => p.priceBeforeGst));

        // If current wholesaler's price is higher than the minimum price
        if (product.priceBeforeGst > minPrice) {
          highPriceProducts.push({
            product,
            minPrice,
            priceDifference: product.priceBeforeGst - minPrice,
            percentageDifference: ((product.priceBeforeGst - minPrice) / minPrice) * 100
          });
        }
      }
    }

    if (highPriceProducts.length === 0) {
      return res
        .status(404)
        .json(apiResponse(404, false, "No high price products found"));
    }

    return res
      .status(200)
      .json(apiResponse(200, true, "High price products retrieved successfully", { 
        highPriceProducts,
        totalProducts: highPriceProducts.length
      }));

  } catch (error) {
    console.log("Error in getHighPriceProducts:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to retrieve high price products"));
  }
};

exports.expiringPriceProducts = async (req, res) => {
  try {
    const wholesalerId = req.user.id;

    // Calculate date ranges
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0); // Set to start of day
    
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    threeDaysAgo.setHours(23, 59, 59, 999); // Set to end of day

    // Find products where price was last updated between 3-7 days ago
    const expiringProducts = await Product.find({
      wholesalerId,
      'priceBeforeGst': {
        $gte: sevenDaysAgo,
        $lte: threeDaysAgo
      }
    }).populate("wholesalerId", "name");

    if (expiringProducts.length === 0) {
      return res
        .status(404)
        .json(apiResponse(404, false, "No products with expiring prices found"));
    }

    // Calculate days remaining for each product
    const productsWithExpiryInfo = expiringProducts.map(product => {
      const lastUpdate = new Date(product.priceBeforeGst);
      const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
      const daysRemaining = 7 - daysSinceUpdate;

      return {
        product,
        daysRemaining,
        lastPriceUpdate: lastUpdate,
        expiryDate: new Date(lastUpdate.setDate(lastUpdate.getDate() + 7))
      };
    });

    return res
      .status(200)
      .json(apiResponse(200, true, "Expiring price products retrieved successfully", {
        expiringProducts: productsWithExpiryInfo,
        totalProducts: productsWithExpiryInfo.length
      }));

  } catch (error) {
    console.log("Error in expiringPriceProducts:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to retrieve expiring price products"));
  }
};

exports.expiredPriceProducts = async (req, res) => {
  try {
    const wholesalerId = req.user.id;

    // Calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0); // Set to start of day

    // Find products where price was last updated 7 or more days ago
    const expiredProducts = await Product.find({
      wholesalerId,
      'priceBeforeGst': {
        $lt: sevenDaysAgo
      }
    }).populate("wholesalerId", "name");

    if (expiredProducts.length === 0) {
      return res
        .status(404)
        .json(apiResponse(404, false, "No expired price products found"));
    }

    // Calculate days since last update for each product
    const productsWithExpiryInfo = expiredProducts.map(product => {
      const lastUpdate = new Date(product.priceBeforeGst);
      const daysSinceUpdate = Math.floor((new Date() - lastUpdate) / (1000 * 60 * 60 * 24));

      return {
        product,
        daysSinceUpdate,
        lastPriceUpdate: lastUpdate,
        expiryDate: new Date(lastUpdate.setDate(lastUpdate.getDate() + 7))
      };
    });

    return res
      .status(200)
      .json(apiResponse(200, true, "Expired price products retrieved successfully", {
        expiredProducts: productsWithExpiryInfo,
        totalProducts: productsWithExpiryInfo.length
      }));

  } catch (error) {
    console.log("Error in expiredPriceProducts:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to retrieve expired price products"));
  }
};

// Combined Search + Filter for Wholesaler
exports.combinedSearchAndFilter = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const {
      searchQuery,
      category,
      minPrice,
      maxPrice,
      inStock,
      customFilters,
      limit = 10
    } = req.query;

    const productQuery = { wholesalerId };

    // Search logic on product fields only
    if (searchQuery && searchQuery.length >= 2) {
      const searchPattern = new RegExp(searchQuery, 'i');
      productQuery.$or = [
        { productName: searchPattern },
        { productDescription: searchPattern },
        { categoryName: searchPattern }
      ];
    }

    if (category) {
      productQuery.categoryName = category;
    }

    if (minPrice || maxPrice) {
      productQuery['priceBeforeGst'] = {};
      if (minPrice) productQuery['priceBeforeGst'].$gte = Number(minPrice);
      if (maxPrice) productQuery['priceBeforeGst'].$lte = Number(maxPrice);
    }

    if (inStock === 'true') {
      productQuery.stock = { $gt: 0 };
    } else if (inStock === 'false') {
      productQuery.stock = 0;
    }

    if (customFilters) {
      try {
        const parsedFilters = typeof customFilters === 'string'
          ? JSON.parse(customFilters)
          : customFilters;

        if (Array.isArray(parsedFilters)) {
          parsedFilters.forEach(filter => {
            if (filter.key && filter.value) {
              productQuery[`filters.${filter.key}`] = filter.value;
            }
          });
        }
      } catch (error) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Invalid custom filters format"));
      }
    }

    // Fetch only products
    const products = await Product.find(productQuery)
      .select('productName productImage stock categoryName')
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const totalProductCount = await Product.countDocuments(productQuery);

    // Format results
    const combinedResults = products.map(product => ({
      ...product.toObject(),
      type: 'product'
    }));

    return res.status(200).json(apiResponse(200, true, "Results retrieved", {
      results: combinedResults,
      totalResults: totalProductCount,
      hasMore: totalProductCount > products.length
    }));

  } catch (error) {
    console.log("Error in combinedSearchAndFilter:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to perform search and filter"));
  }
};
