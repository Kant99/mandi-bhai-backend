const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/verifyToken');
const { isAdmin } = require('../../middlewares/isAdmin');
const { viewAllWholesalers } = require('../../controllers/admin/admin');

// Route to view all wholesalers
router.get('/wholesalers', viewAllWholesalers);

module.exports = router;
