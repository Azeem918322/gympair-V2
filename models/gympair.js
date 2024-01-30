const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const gymPairSchema = new Schema({
  gym:{type: Schema.Types.ObjectId,ref:'gym'},
  user:{type: Schema.Types.ObjectId,ref:'gym_member'},
  partner:{type: Schema.Types.ObjectId,ref:'gym_member'},
  status:{type: String,enum:["accepted","declined","pending"]},
  request_by:{type: Schema.Types.ObjectId,ref:'gym_member'},
  time:{type: String},
  date:{type: String},
  description:{type: String},
},{
  timestamps:true
});

const GymPair = mongoose.model("gymPair",gymPairSchema);


module.exports = GymPair;