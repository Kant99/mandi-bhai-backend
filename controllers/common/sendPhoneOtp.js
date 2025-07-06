const PhoneOtp=require("../../Models/Common/Phoneotp");
const {apiResponse}=require("../../utils/apiResponse");
exports.sendPhoneOtp = async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      console.log(phoneNumber);
      if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Valid 10-digit phone number required"));
      }
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
  
      // TODO: Implement SMS sending logic
      // await sendSMS(phoneNumber, `Your OTP is ${otp}`);
  
      const phoneNumberExist = await PhoneOtp.findOne({ phoneNumber });
      if (!phoneNumberExist) {
        await PhoneOtp.create({ phoneNumber, otp });
      } else {
        phoneNumberExist.otp = otp;
        await phoneNumberExist.save();
      }
      console.log(otp)
      return res.status(200).json(apiResponse(200, true, "OTP sent", { otp }));
    } catch (error) {
      console.log("Error in sendOtp:", error.message);
      return res.status(500).json(apiResponse(500, false, "Failed to send OTP"));
    }
  };