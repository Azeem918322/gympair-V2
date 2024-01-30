const mongoose = require("mongoose");

const couponRedeemSchema = new mongoose.Schema({
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "coupon",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "gym_member",
    required: true,
  },
  points: {
    type: Number,
    // required: true,
  },
  // Add other fields as needed
});

const CouponRedeem = mongoose.model("couponRedeem", couponRedeemSchema);

module.exports = CouponRedeem;
