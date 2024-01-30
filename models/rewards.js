const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const maskSchema=new Schema({
	user:{type:Schema.Types.ObjectId,ref:"gym_member"},
	mask:{type: String,enum:['Grey','Green','Blue','Black','Pink']},
	selfCollect:{type:Boolean},
	address:{type: String},
	status:{type: Boolean},
	type:{type:String,enum:["reward",'referal']},
	maskCount:{type: Number}
	
},{
    timestamps: true
  });

const Mask = mongoose.model("mask",maskSchema);


module.exports = Mask;