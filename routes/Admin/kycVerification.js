const express = require('express');
const router = express.Router();
const { verifyKyc } = require('../../controllers/admin/kycVerification');

// PATCH /admin/wholesaler/:wholesalerId/kyc-verify
router.patch('/:wholesalerId/kyc-verify', verifyKyc);

module.exports = router; 