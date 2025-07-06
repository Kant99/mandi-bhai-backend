const express = require('express');
const router = express.Router();
const { verifyProduct } = require('../../controllers/admin/productVerification');

// PATCH /admin/products/:productId/verify
router.patch('/:productId/verify', verifyProduct);

module.exports = router; 