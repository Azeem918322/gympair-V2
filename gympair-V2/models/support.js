const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const supportSchema = new Schema({
  first_name: { type: String, default: null },
  last_name: { type: String, default: null },
  email: { type: String},
  requestid: { type: String },
  subject : {type : String},
  message : {type : String},
  status : {type : String, enum : ['received','pending','resolved']}
},{
  timestamps : true
}
);

module.exports = mongoose.model("customer_support", supportSchema);