const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const calSchema=new Schema({
	user:{type:Schema.Types.ObjectId,ref:"gym_member"},
	type:{type:String,enum:["Calorie","BMI","Macro","ORM"]},
	height:{type:Number},
	heightUnit:{type:String},//default:"cm"
	weight:{type:Number},
	weightUnit:{type:String},//default:"kg"
	age:{type:Number},
	workout:{type:Number},
	time:{type:String},
	BMR:{type:Number},
	BMI:{type:Number},
	cal:{type:Number},
	goal:{type:Number},
	activity:{type:Number},
	unit:{type:Number},
	reps:{type:Number},
	lifts:{type:Number},
	gender:{type:Number,enum:[0,1]},
	result:{type:Number},
	protein:{type:Number},
	carbs:{type:Number},
	fats:{type:Number},
	comments:{type:String}

},{
    timestamps: true
  });

const Calculator = mongoose.model("calculators",calSchema);


module.exports = Calculator;