const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const storySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "gym_member" },
  caption: { type: String },
  image: { type: String },
  video: { type: String },
  viewedBy: [{ type: Schema.Types.ObjectId, ref: "gym_member" }],
},{
  timestamps: true
});

const Story = mongoose.model("story", storySchema);

module.exports = Story;
