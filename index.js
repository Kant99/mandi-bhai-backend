const express=require("express")
const dotenv=require("dotenv");
dotenv.config();
const cors=require("cors") 
const PORT=process.env.PORT
const app=express();
 
const {connectDB}=require("./config/database")
connectDB();

//Route
const phoneOtpRoutes=require("./routes/common/sendPhoneOtp")
const wholesalerAuthRoutes=require("./routes/wholesaler/auth")
const retailerAuthRoutes=require("./routes/retailer/auth")
const wholesalerVerifyRoutesAdmin=require("./routes/Admin/verifyWholesaler")
const loginRoutes=require("./routes/common/login")
const categoryRoutes=require("./routes/product/category")
const productRoutes=require("./routes/product/product")
const adminRoutes=require("./routes/Admin/admin")
const orderRoutes=require("./routes/order/order")
const wholesalerKycVerificationRoutes=require("./routes/Admin/kycVerification")
const productVerificationRoutes=require("./routes/Admin/productVerification")


//middlewares
app.use(express.json());
app.use(
    cors({
        origin:"http://localhost:5173", 
        credentials:true,
    }) 
)

//Routes Mount
//Phone Otp Routes mount
app.use("/api/otp",phoneOtpRoutes)

//Wholesaler Auth Routes mount 
app.use("/api/wholesaler/auth",wholesalerAuthRoutes)

//Retailer Auth Routes mount 
app.use("/api/retailer/auth",retailerAuthRoutes)

//Wholesaler verifyRoutes by Admin
app.use("/api/admin",wholesalerVerifyRoutesAdmin)

//Wholesaler KYC Verification Routes by Admin
app.use("/api/admin/wholesaler",wholesalerKycVerificationRoutes)

//Product Verification Routes by Admin
app.use("/api/admin/product",productVerificationRoutes)

//Admin Routes Mount
app.use("/api/admin",adminRoutes)

//login Routes Mount
app.use("/api/auth/login",loginRoutes)

//category Routes Mount
app.use("/api/admin/category",categoryRoutes)

//product Routes Mount
app.use("/api/wholesaler/product",productRoutes)

//order wholesaler Routes Mount
app.use("/api/wholesaler/order",orderRoutes)

//def Routes
app.get("/",(req,res)=>{
    return res.status(200).json({
        success:true,
        message:"Your server is up and running...."
    })
})

app.listen(PORT,()=>{
    console.log(`App is Running on ${PORT}`);
})