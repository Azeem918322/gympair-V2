const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const transactionSchema=new Schema({
  user:{type:Schema.Types.ObjectId,ref:'gym_member'},
  workout: { type: Schema.Types.ObjectId, ref: "workout" },
  type: { type: Number, enum: [0, 1, 2] }, //0:workoutchallenge,1:ads, 2:referrals
  description: {type: String},
  points: {type: Number}
},{
    timestamps: true
  });

const Transaction = mongoose.model("transaction", transactionSchema);


module.exports = Transaction;