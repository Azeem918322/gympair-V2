const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const postSchema=new Schema({
	user:{type:Schema.Types.ObjectId,ref:"gym_member"},
	image:[{type:String}],
	video:[{type:String}],
	type:{type: String,enum:['status','post','image','story']},
	caption:{type: String},
	privacy:{type: String ,enum:['Public','Private']},
	likes:[{type: Schema.Types.ObjectId,ref:"gym_member"}],
	comments:[{type: Schema.Types.ObjectId,ref:"comments"}],
	allowComments:{type:Boolean},
	allowLikes:{type:Boolean},
	isViewed:{type:Boolean},
	reported_by:[{type:Schema.Types.ObjectId,ref:"gym_member"}],
	under_review:{type:Boolean}
},{
    timestamps: true
  });

const Post = mongoose.model("post",postSchema);


module.exports = Post;