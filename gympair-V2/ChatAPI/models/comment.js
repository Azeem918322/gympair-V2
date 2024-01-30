const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const commentSchema=new Schema({
	user:{type:Schema.Types.ObjectId,ref:"gym_member"},
	post:{type:Schema.Types.ObjectId,ref:"post"},
	replyOf:{type:Schema.Types.ObjectId,ref:"post"},
	text:{type:String},
	likes:[{type:Schema.Types.ObjectId,ref:'gym_member'}],
	replies:[{type:Schema.Types.ObjectId,ref:"comments"}]
},{
    timestamps: true
  });

const Comment = mongoose.model("comments",commentSchema);


module.exports = Comment;