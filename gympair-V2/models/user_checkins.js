const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const userCheckInSchema=new Schema({
  userID:{type:Schema.Types.ObjectId,ref:"gym_member"},
},{
    timestamps: true
  });

const UserCheckIn = mongoose.model("userCheckIn",userCheckInSchema);


module.exports = UserCheckIn;