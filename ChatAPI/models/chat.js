const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const chatSchema=new Schema({
	user1:{type:Schema.Types.ObjectId,ref:"gym_member"},
	user2:{type:Schema.Types.ObjectId,ref:"gym_member"},
	initiated:{type: Boolean},
	last_message: {type:String},
	is_seen:{type:Boolean},
	deletedByuser1:{type:Boolean},
	deletedByuser2:{type:Boolean},
	user1DeletionDate: { type: Date, default: null },
	user2DeletionDate: { type: Date, default: null }
},{
    timestamps: true
  });

const Chat = mongoose.model("chat",chatSchema);


module.exports = Chat;