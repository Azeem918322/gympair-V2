const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const imageSocketSchema=new Schema({
	user:{type:Schema.Types.ObjectId,ref:"gym_member"},
	image:{type:String},
	video:{type:String}
},{
    timestamps: true
  });

const ImgSocket = mongoose.model("image_socket",imageSocketSchema);


module.exports = ImgSocket;