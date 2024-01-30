const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const onlineSchema=new Schema({
	userID:{type:Schema.Types.ObjectId,ref:"gym_member"},
	socketID:{type:String},
	lastSeen: { type: Date }
});

const Online = mongoose.model("onlineUser",onlineSchema);


module.exports = Online;