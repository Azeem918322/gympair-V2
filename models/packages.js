const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const packageSchema=new Schema({
  title:{type: String},
  duration:{type: String},
  price:{type: String},
  discount:{type: Number},
  created_by:{type: String,enum:['user','admin']}
});

const Package = mongoose.model("package",packageSchema);


module.exports = Package;