const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const gymSchema=new Schema({
  place_url:{type: String},
  title:{type: String},
  rating:{type: Number},
  reviewCount:{type: Number},
  address:{type: String},
  plusCode:{type: String},
  website:{type: String},
  phoneNo:{type: String},
  latitude:{type: Number},
  longitude:{type: Number},
  created_by:{type: String,enum:['user','admin']},
  type:{type:Number,enum:[0,1]}//0=gym,1=train station

});

const Gym = mongoose.model("gym",gymSchema);


module.exports = Gym;