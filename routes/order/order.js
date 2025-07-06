const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/order/order');
const { verifyToken} = require('../../middlewares/verifyToken');
const { isWholesaler} = require('../../middlewares/isWholesaler');


// Create a new order (for testing/admin)
router.post('/',verifyToken,isWholesaler, orderController.createOrderForWholesaler);

// Get all orders for wholesaler
router.get('/',verifyToken,isWholesaler, orderController.getAllOrdersForWholesaler);

// Get a single order by ID
router.get('/:orderId',verifyToken,isWholesaler, orderController.getOrderByIdForWholesaler);

// Update order status
router.patch('/:orderId/status',verifyToken,isWholesaler, orderController.updateOrderStatusForWholesaler);



// Search/filter orders
router.get('/search/filter',verifyToken,isWholesaler, orderController.searchOrdersForWholesaler);

module.exports = router; 