const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const couponSchema = new Schema({
  title: {
    type: String,
  },
  coupon: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  contact_info: {
    type: String,
  },
  terms_and_conditions: {
    type: String,
  },
  category: {
    type: String,
    enum:["Health","Lifestyle","Fitness","Food","Electronic","Accessories"],
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
  points: {
    type: Number,
    required: true,
  },
  coupon_expiry:{
    type: String,
    required: true,
  },
},{
  timestamps: true
});

const Coupon = mongoose.model("coupon", couponSchema);

module.exports = Coupon;
