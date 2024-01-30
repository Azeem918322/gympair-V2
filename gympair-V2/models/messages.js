const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const messageSchema=new Schema({
    chat: { type: Schema.Types.ObjectId, ref: "chat" },
    sender: { type: Schema.Types.ObjectId, ref: "gym_member" },
    reciever: { type: Schema.Types.ObjectId, ref: "gym_member" },
    image: { type: String },
    text: { type: String },
    islike: { type: Boolean },
    messageType: { type: Number, enum: [0, 1, 2, 3], default: 0 }, // 0 (simple message), 1 (date request message), 2 (workout), 3 (story message)
    requestMessage: { type: Schema.Types.ObjectId, ref: "gymPair" },
    workoutMessage: { type: Schema.Types.ObjectId, ref: "workout" },
    storyMessage: { type: Schema.Types.ObjectId, ref: "story" },
    is_seen:{type:Boolean}	
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("message",messageSchema);
module.exports = Message;