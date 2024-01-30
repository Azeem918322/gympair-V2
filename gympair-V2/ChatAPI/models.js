const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require("./models/gym_member");
db.gym = require("./models/gym");
db.feed = require("./models/post");
db.friends=require("./models/friends");
db.Chat=require('./models/chat');
db.Message=require('./models/messages');
db.online = require('./models/onlineUsers');
db.comments = require('./models/comment');
db.rewards = require('./models/rewards');

//db.workout = require("./models/workout");
module.exports = db;
