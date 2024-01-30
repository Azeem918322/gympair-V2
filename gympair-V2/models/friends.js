const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const friendSchema=new Schema({
  user1:{type: Schema.Types.ObjectId,ref:'gym_member'},
  user2:{type: Schema.Types.ObjectId,ref:'gym_member'},
  status:{type: String,enum:["accepted","declined","pending"]},
  request_by:{type: Schema.Types.ObjectId,ref:'gym_member'}

},{
  timestamps:true
});

const Friend = mongoose.model("friend",friendSchema);


module.exports = Friend;