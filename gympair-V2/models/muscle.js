const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const musclesSchema=new Schema({
  gender:{type:String,enum:['male','female']},
  bodyPart:{type:String,enum:['trap','shoulder','bicep','forearm','chest','oblique','abdominal','quad','calve','glute','lat','trapMid','tricep','hamstring','lower','none']},
  video:{type:String},
  steps:[{type:String}],
  tips:[{type:String}],
  title:{type:String},//,enum:['Yoga','Stretches','Bodyweight','Barbell','Featured','Dumbbells','Cables','Kettlebells','Band','TRX','Plate']}
  difficulty:{type:String,enum:['Beginner','Intermediate','Advanced']}

});

const Muscles = mongoose.model("muscles",musclesSchema);


module.exports = Muscles;