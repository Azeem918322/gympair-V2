const express = require("express");
const path = require("path");
const http=require("http");
const https=require("https")

const socketio = require("socket.io");
const formatMessage = require("./utils/chatMessage");
const config = require("./config");

const port = config.apiPort;
const dbUrl =config.dbURI;

const app = express();
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;
db.mongoose
  .connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successfully connect to MongoDB.");
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });
  var fs=require('fs');
const privateKey = fs.readFileSync('/home/gympair/conf/web/gympair.com/ssl/gympair.com.key', 'utf8');
const certificate = fs.readFileSync('/home/gympair/conf/web/gympair.com/ssl/gympair.com.crt', 'utf8');
const ca =  [

          fs.readFileSync('/home/gympair/conf/web/gympair.com/ssl/intermediate.pem', 'utf8'),

          fs.readFileSync('/home/gympair/conf/web/gympair.com/ssl/gympair.com.ca')

       ]
const credentials = {
  key: privateKey,
  cert: certificate,
  ca:ca
};
const server = https.createServer(credentials, app);
//const server = http.createServer(app);
const io = socketio(server);
var models = require("./models");
var chatCollection = models.Chat; //collection to store all chats
var User = models.user;
var userCollection = models.online; //collection to maintain list of currently online users
var msgCollection = models.Message; //collection to maintain list of currently online users
var Friends = models.friends;
var axios = require("axios");

io.on("connection", (socket) => {
  console.log("New User Logged In with ID " + socket.id);
  socket.on("userDetails", (data, callback) => {
    //checks if a new user has logged in add him to online users' list
    console.log("data " + data);

    userCollection.findOne({ userID: data.user }).exec(function (er, usr) {
      if (er) {
        console.log(er);
      } else {
        if (!usr) {
          var onlineUser = {
            //forms JSON object for the user details
            socketID: socket.id,
            userID: data.user,
          };
          console.log("onlineUser " + onlineUser);

          userCollection.create(onlineUser, (err, res) => {
            //inserts the logged in user to the collection of online users
            if (err) throw err;
            getOnlineUsers(data.user, callback);
          });
        } else {
          userCollection
            .updateOne({ userID: data.user }, { socketID: socket.id, lastSeen: new Date() },{ upsert: true })
            .exec(function (err, updated) {
              if (err) {
                console.log(err);
              } else {
                getOnlineUsers(data.user, callback);
              }
            });
        }
      }
    });
  });

  function getOnlineUsers(loggedInUser, callback) {
    User.findById(loggedInUser, 'subscription', (err, user) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log("user " + user);
  
      const subscriptionLevel = user.subscription;
  
      Friends.find({ $or: [{ user1: loggedInUser }, { user2: loggedInUser }] })
        .exec(function (err, frs) {
          if (err) {
            console.log(err);
          } else {
            if (frs && frs.length > 0) {
              let result = frs.map((item) =>
                item.user1.equals(loggedInUser) ? item["user2"] : item["user1"]
              );
              if (subscriptionLevel === 1) {
                // Include lastSeen information for premium users
                userCollection
                  .find({ userID: { $in: result } })
                  .exec(function (e, o) {
                    if (e) {
                      console.log(e);
                    } else {
                      console.log("Listitng " + o);

                      callback({ data: o });
                    }
                  });
              } else {
                // Don't include lastSeen information for non-premium users
                userCollection
                  .find({ userID: { $in: result } })
                  .select("-lastSeen")
                  .exec(function (e, o) {
                    if (e) {
                      console.log(e);
                    } else {
                      callback({ data: o });
                    }
                  });
              }
            } else {
              callback({ data: [] });
            }
          }
        });
    });
  }
  
  socket.on("onlineUsers", (data, callback) => {
    getOnlineUsers(data.user, callback);
  });

  //read message
  socket.on('readMessage',(data,callback)=>{
    msgCollection.updateMany({chat:data.chat},{is_seen:true},function(err,rep){
      if(err){
        console.log(err);
      }else{
        //console.log(rep);
        io.emit('readMessage',{status:true});
        msgCollection.findOne({chat:data.chat})
            .where({is_seen:false})
            .exec(function(er,unread){
              if(er){
                console.log(er);
              }else{
                if(unread&&unread.length>0){
                  io.emit('unread',{receiver:unread.reciever,unread:unread.length});
                }else{
                  io.emit('unread',{receiver:'',unread:0});
                }
                
              }
            });
      }
    })
  })

  //Collect message and insert into database
  socket.on("message", (data) => {
    //recieves message from client-end along with sender's and reciever's details
    var obj = formatMessage(data);
    // console.log(obj);
    User.findById(data.sender, 'subscription', (err, senderUser) => {
      if (err) {
        console.error(err);
        return;
      }
      // console.log(senderUser);
      const senderSubscriptionLevel = senderUser?.subscription;

      chatCollection
        .findOne({
          $or: [
            { $and: [{ user1: obj.to }, { user2: obj.from }] },
            { $and: [{ user2: obj.to }, { user1: obj.from }] },
          ],
        })
        .exec(function (err, chat) {
          if (err) {
            console.log(err);
          } else {
            if (chat) {
              //already chat is there.chat bubble is opened
              if (chat.initiated) {
                msgCollection.create(
                  {
                    chat: chat._id,
                    sender: obj.from,
                    reciever: obj.to,
                    text: obj.message,
                    islike: false,
                    is_seen: false,
                    is_seen_visible: senderSubscriptionLevel === 1,
                  },
                  function (er, msg) {
                    if (er) {
                      console.log(er);
                    } else {
                      userCollection.findOne(
                        { userID: data.receiver },
                        (err, res) => {
                          //checks if the recipient of the message is online
                          if (err) throw err;
                          if (res != null)
                            //if the recipient is found online, the message is emmitted to him/her
                            chat.updatedAt = new Date();
                          chat.save();
                          obj.chatId = chat._id;
                          sendPushNotification(data.receiver, "New Message");
                          msgCollection.find({chat:obj.chatId})
                          .where({is_seen:false})
                          .exec(function(er,unread){
                            if(er){
                              console.log(er);
                            }else{
                              io.emit('unread',{receiver:data.receiver,unread:unread.length});
                            }
                          });
                          io.emit("reload", true);
                          io.emit("message", obj);

                        }
                      );
                    }
                  }
                );
              } else {
                chat.initiated = true;
                chat.save();
                msgCollection.create(
                  {
                    chat: ch._id,
                    sender: obj.from,
                    reciever: obj.to,
                    text: obj.message,
                    islike: false,
                    is_seen: false,
                    is_seen_visible: senderSubscriptionLevel === 1
                  },
                  function (er, msg) {
                    if (er) {
                      console.log(er);
                    } else {
                      userCollection.findOne(
                        { userID: data.receiver },
                        (err, res) => {
                          //checks if the recipient of the message is online
                          if (err) throw err;
                          if (res != null) {
                            //if the recipient is found online, the message is emmitted to him/her
                            obj.chatId = ch._id;
                            sendPushNotification(data.receiver, "New Message");
                            msgCollection.find({chat:obj.chatId})
                          .where({is_seen:false})
                          .exec(function(er,unread){
                            if(er){
                              console.log(er);
                            }else{
                              io.emit('unread',{receiver:data.receiver,unread:unread.length});
                            }
                          });
                            io.emit("reload", true);
                            io.emit("message", obj);
                          }
                        }
                      );
                    }
                  }
                );
              }
            } else {
              var ch = new chatCollection({
                user1: obj.from,
                user2: obj.to,
                initiated: true,
              });
              ch.save();
              msgCollection.create(
                {
                  chat: ch._id,
                  sender: obj.from,
                  reciever: obj.to,
                  text: obj.message,
                  islike: false,
                  is_seen: false,
                  is_seen_visible: senderSubscriptionLevel === 1
                },
                function (er, msg) {
                  if (er) {
                    console.log(er);
                  } else {
                    userCollection.findOne(
                      { userID: data.receiver },
                      (err, res) => {
                        //checks if the recipient of the message is online
                        if (err) throw err;
                        if (res != null) {
                          //if the recipient is found online, the message is emmitted to him/her
                          obj.chatId = ch._id;
                          sendPushNotification(data.receiver, "New Message");
                          msgCollection.find({chat:obj.chatId})
                          .where({is_seen:false})
                          .exec(function(er,unread){
                            if(er){
                              console.log(er);
                            }else{
                              io.emit('unread',{receiver:data.receiver,unread:unread.length});
                            }
                          });
                          io.emit("reload", true);
                          io.emit("message", obj);
                        }
                      }
                    );
                  }
                }
              );
            }
          }
        });
        /*chatCollection.create(dataElement, (err, res) => { //inserts message to into the database
              if (err) throw err;
              socket.emit('message', dataElement); //emits message back to the user for display
          });*/

      });
  });

  //Collect message and insert into database
  socket.on("like_message", (data) => {
    //recieves message from client-end along with sender's and reciever's details
    msgCollection.findOne({ _id: data.id }).exec(function (err, chat) {
      if (err) {
        console.log(err);
      } else {
        if (chat && chat.islike !== data.islike) {
          chat.islike = data.islike;
          chat.save();
          io.emit("like_message", data);
        }
      }
    });
  });

  var socketID = socket.id;
  
  socket.on("disconnect", () => {
    userCollection.findOneAndUpdate(
      { socketID: socket.id },
      { lastSeen: new Date() },
      (err, user) => {
        if (err) {
          console.error(err);
        } else if (user) {
          console.log(`User ${user.userID} went offline at ${user.lastSeen}`);
          userCollection.deleteOne({ socketID: socket.id }, (err, res) => {
            if (err) {
              console.error(err);
            }
          });
        }
      }
    );
  });
});

app.use(express.static(path.join(__dirname, "front")));

server.listen(port, () => {
  console.log(`Chat Server listening to port ${port}...`);
});

function sendPushNotification(id, title) {
  User.findOne({ _id: id })
    .select("notificationToken")
    .exec(function (err, dev) {
      if (err) {
        res.status(500).json({ message: err });
      } else {
        //console.log(dev);
        if (dev && dev["notificationToken"]) {
          const filteredArray = dev.notificationToken.filter((str) => str !== '');
          const options = {
            method: "POST",
            url: config.OSUrl + "/notifications",
            headers: {
              accept: "application/json",
              "Content-Type": "application/json",
            },
            data: {
              app_id: config.appID,
              include_player_ids: filteredArray,
              contents: { en: "You have recieved new message." },
              headings: { en: title },
            },
          };
          // console.log(options);

          axios
            .request(options)
            .then(function (response) {
              console.log(response.data);
            })
            .catch(function (error) {
              console.log(error);
            });
        }
      }
    });
}
