const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require("./models/gym_member");
db.gym = require("./models/gym");
db.coupon = require("./models/coupon");
db.couponRedeem = require("./models/couponRedeem");
db.feed = require("./models/post");
db.friends = require("./models/friends");
db.Chat = require("./models/chat");
db.Message = require("./models/messages");
db.online = require("./models/onlineUsers");
db.comments = require("./models/comment");
db.rewards = require("./models/rewards");
db.imgSocket = require("./models/image_socket");
db.challenge = require("./models/workout_challenge");
db.workout = require("./models/workout");
db.support = require("./models/support");
db.calculator = require("./models/calculators");
db.wallet = require("./models/wallet");
db.notification = require("./models/notification");
db.package = require("./models/packages");
db.gymPair = require("./models/gympair");
db.story = require("./models/story");
db.transaction = require("./models/transactions");
db.userCheckIn = require("./models/user_checkins");
db.muscle=require("./models/muscle");
module.exports = db;
