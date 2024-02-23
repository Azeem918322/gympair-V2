const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const workoutSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "gym_member" },
    partner: { type: Schema.Types.ObjectId, ref: "gym_member" },
    challenge: { type: Schema.Types.ObjectId, ref: "workout_challenge" },
    workout_name: {
      type: String,
      // enum: [
      //   "30 push up",
      //   "30 sit-up",
      //   "30 crunches",
      //   "30 pull ups",
      //   "60 push up",
      //   "60 sit-up",
      //   "60 crunches ",
      //   "60 pull ups",
      //   "120 push up",
      //   "120 sit-up",
      //   "120 crunches",
      //   "120 pull ups",
      // ],
    },
    date_time: { type: String },
    deadline: { type: String },
    status: { type: Number, enum: [0, 1, 2, 3, 4, 5] }, //0:no challenge selected,1:waiting for partners' response,2:accepted by partner,3:rejected by partner,4: canceled by sender, 5: expired
    code: { type: String },
    fitness_level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
    complete: { type: Boolean, default: false },
    under_review: { type: Boolean, default: false },
    points_earned: { type: Number },
    reward_given: { type: Boolean, default: false },
    reward_accepted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
const workout = mongoose.model("workout", workoutSchema);

module.exports = workout;
