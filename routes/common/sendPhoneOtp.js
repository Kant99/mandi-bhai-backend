const express=require("express");
const router=express.Router();
const {sendPhoneOtp}=require("../../controllers/common/sendPhoneOtp")

//send phoneOtp Routes
router.post("/",sendPhoneOtp);

module.exports=router;