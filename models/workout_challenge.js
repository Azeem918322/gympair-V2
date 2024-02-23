const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const challengeSchema = new Schema(
  {
    challenge_description: { type: String },
    challenge_video: { type: String },
    fitness_level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
  },
  {
    timestamps: true,
  }
);

const challenge = mongoose.model("workout_challenge", challengeSchema);

module.exports = challenge;
