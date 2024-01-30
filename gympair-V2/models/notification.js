const mongoose = require("mongoose");
var Schema = mongoose.Schema;

const notSchema = new Schema(
  {
	user:{type:Schema.Types.ObjectId,ref:"gym_member"},
	content:{type:String},
	detail:{type:String},
type: { type: Number, enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }, //0:like,1:comment,2:gympairRequest,3:workoutChallengeRequest,4:RepliedOnStory,5:AcceptPointsRequest,6:ReceivedPoints,7:ReceivedAdsPoints, 8:Referral, 9:FriendRequest
is_accepted:{type: Boolean},
	is_accepted:{type: Boolean},
	is_viewed:{type:Boolean},
	post:{type:Schema.Types.ObjectId,ref:"post"},
  requestId:{type:Schema.Types.ObjectId,ref:"friend"},
    workoutId: { type: Schema.Types.ObjectId, ref: "workout" },
    receiver: { type: Schema.Types.ObjectId, ref: "gym_member" },
    messageId: { type: Schema.Types.ObjectId, ref: "message" },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model("notification",notSchema);


module.exports = Notification;