var express = require("express");
var router = express.Router();
const config = require("../config");
var fs = require("fs");
var path = require("path");

const db = require("../models");
const { verifyToken } = require("../middlewares/verifyToken");
const async = require("async");

var User = db.user;
var Friend = db.friends;
var Chat = db.Chat;
var Message = db.Message;
var GymPair = db.gymPair;

router.get("/history", [verifyToken], function(req, res) {
    Message.find({ $or: [{ sender: req.userId }, { reciever: req.userId }] })
        .sort({ createdAt: "desc" })
        .exec(function(err, messages) {
            if (err) {
                res.status(200).json({ status: false, message: err });
            } else {
                Chat.find({ $or: [{ user1: req.userId }, { user2: req.userId }] })
                    .where({ initiated: true })
                    
                    .populate("user1", "_id firstName lastName username profile_picture")
                    .populate("user2", "_id firstName lastName username profile_picture")
                    .sort({ createdAt: "desc" })
                    .exec(function(e, history) {
                        if (e) {
                            res.status(200).json({ status: false, message: e });
                        } else {
                            if (history) {
                                let historyArray = [];
                                for (var i = 0; i < history.length; i++) {
                                    if(history[i].user1._id.toString() == req.userId.toString() && history[i].deletedByuser1 == true){
                                      console.log("Deleted history", history[i]);
                                    }else{
                                      const messageLast = messages.filter(
                                        (x) => x.chat.toString() === history[i]._id.toString()
                                      );

                                      let tempObj = {
                                          _id: history[i]._id,
                                          user1: history[i].user1,
                                          user2: history[i].user2,
                                          initiated: history[i].initiated,
                                          createdAt: history[i].createdAt,
                                          updatedAt: history[i].updatedAt,
                                          last_message: history[i].last_message,
                                          unreadCount: 0
                                      };


                                      tempObj.unreadCount = 0;

                                      if (messageLast.length > 0) {

                                          if (messageLast[0].messageType === 1) {
                                              tempObj.last_message = "Date Request";
                                          } else if (messageLast[0].messageType === 2) {
                                              tempObj.last_message = "Workout Request";
                                          } else if (messageLast[0].messageType === 3) {
                                              tempObj.last_message = "Replied on Story";
                                          } else {
                                              tempObj.last_message = messageLast[0].text;
                                          }

                                          tempObj.updatedAt = messageLast[0].updatedAt;

                                          for (var j = 0; j < messageLast.length; j++) {
                                              if (messageLast[i]&&messageLast[i].is_seen === false) {
                                                  tempObj.unreadCount += 1;
                                              }
                                          }

                                      } else {
                                          tempObj.last_message = "";
                                      }

                                      historyArray.push(tempObj);
                                    }
                                    
                                }

                                historyArray.sort(
                                    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
                                );

                                res.status(200).json({ status: true, data: historyArray });
                            } else {
                                res.status(200).json({ status: true, data: [] });
                            }
                        }
                    });
            }
        });
});

router.get("/:id", [verifyToken], function(req, res) {
    Chat.findOne({
            $or: [
                { $and: [{ user1: req.userId }, { user2: req.params.id }] },
                { $and: [{ user2: req.userId }, { user1: req.params.id }] },
            ],
        })
        .populate("user1", "_id firstName lastName username profile_picture")
        .populate("user2", "_id firstName lastName username profile_picture")
        .exec(function(err, chat) {
            if (err) {
                res.status(500).json({ status: false, message: err });
            } else {
                //console.log(chat);
                if (chat) {
                    if (chat.deletedByuser1 == true) {
                      chat.deletedByuser1==false;
                      chat.save();
                    }else if(chat.deletedByuser2==true){
                      chat.deletedByuser2=false;
                      chat.save();
                    }
                    res.status(200).json({
                      status: true,
                      message: "chat initiated",
                      data: {
                        user1: chat["user1"],
                        user2: chat["user2"],
                        _id: chat._id,
                      },
                    });
                } else {
                    var ch = { user1: req.userId, user2: req.params.id, initiated: true };
                    Chat.create(ch, function(e, userCh) {
                        if (e) {
                            res.status(200).json({ status: false, message: e });
                        } else {
                            //console.log(userCh);
                            Chat.findOne({ _id: userCh._id })
                                .populate(
                                    "user1",
                                    "_id firstName lastName username profile_picture"
                                )
                                .populate(
                                    "user2",
                                    "_id firstName lastName username profile_picture"
                                )
                                .exec(function(err, rep) {
                                    res.status(200).json({
                                        status: true,
                                        message: "chat initiated",
                                        data: {
                                            user1: rep["user1"],
                                            user2: rep["user2"],
                                            _id: rep._id,
                                        },
                                    });
                                });
                        }
                    });
                }
            }
        });
});

router.get("/history/:id", [verifyToken], function(req, res) {
  Chat.findOne({chat:req.params.id})
  .exec(function(e,c){
    if(e){
      res.status(500).json({ status: false, message: e });
    }else{
      if(c&&c.user1DeletionDate&&c.user1.equals(req.userId)){
        //return messages after user1DeletionDate
        Message.find({ chat: req.params.id })
        .where({createdAt:{$gt:c.user1DeletionDate}})
        .populate("sender", "_id firstName lastName username profile_picture")
        .populate("reciever", "_id firstName lastName username profile_picture")
        .populate({
            path: "requestMessage",
            populate: [
                { path: "gym" },
                {
                    path: "user",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "partner",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "request_by",
                    select: "_id firstName lastName username profile_picture",
                },
            ],
        })
        .populate({
            path: "storyMessage",
            populate: [{
                path: "user",
                select: "_id firstName lastName username profile_picture",
            }, ],
        })
        .populate({
            path: "workoutMessage",
            populate: [{
                    path: "user",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "partner",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "challenge",
                },
            ],
        })
        .sort({ createdAt: "desc" })
        .exec(function(e, Msgs) {
            if (e) {
                res.status(500).json({ status: false, message: e });
            } else {
                if (Msgs) {
                    res.status(200).json({ status: true, data: Msgs });
                } else {
                    res.status(200).json({ status: true, data: [] });
                }
            }
        });
      }else if(c&&c.user2DeletionDate&&c.user2.equals(req.userId)){
        //return messages after user2DeletionDate
        Message.find({ chat: req.params.id })
        .where({createdAt:{$gt:c.user2DeletionDate}})
        .populate("sender", "_id firstName lastName username profile_picture")
        .populate("reciever", "_id firstName lastName username profile_picture")
        .populate({
            path: "requestMessage",
            populate: [
                { path: "gym" },
                {
                    path: "user",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "partner",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "request_by",
                    select: "_id firstName lastName username profile_picture",
                },
            ],
        })
        .populate({
            path: "storyMessage",
            populate: [{
                path: "user",
                select: "_id firstName lastName username profile_picture",
            }, ],
        })
        .populate({
            path: "workoutMessage",
            populate: [{
                    path: "user",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "partner",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "challenge",
                },
            ],
        })
        .sort({ createdAt: "desc" })
        .exec(function(e, Msgs) {
            if (e) {
                res.status(500).json({ status: false, message: e });
            } else {
                if (Msgs) {
                    res.status(200).json({ status: true, data: Msgs });
                } else {
                    res.status(200).json({ status: true, data: [] });
                }
            }
        });
    
      }else{
        Message.find({ chat: req.params.id })
        .populate("sender", "_id firstName lastName username profile_picture")
        .populate("reciever", "_id firstName lastName username profile_picture")
        .populate({
            path: "requestMessage",
            populate: [
                { path: "gym" },
                {
                    path: "user",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "partner",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "request_by",
                    select: "_id firstName lastName username profile_picture",
                },
            ],
        })
        .populate({
            path: "storyMessage",
            populate: [{
                path: "user",
                select: "_id firstName lastName username profile_picture",
            }, ],
        })
        .populate({
            path: "workoutMessage",
            populate: [{
                    path: "user",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "partner",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "challenge",
                },
            ],
        })
        .sort({ createdAt: "desc" })
        .exec(function(e, Msgs) {
            if (e) {
                res.status(500).json({ status: false, message: e });
            } else {
                if (Msgs) {
                    res.status(200).json({ status: true, data: Msgs });
                } else {
                    res.status(200).json({ status: true, data: [] });
                }
            }
        });
    
      }
    }
  });
    /*Message.find({ chat: req.params.id })
        .populate("sender", "_id firstName lastName username profile_picture")
        .populate("reciever", "_id firstName lastName username profile_picture")
        .populate({
            path: "requestMessage",
            populate: [
                { path: "gym" },
                {
                    path: "user",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "partner",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "request_by",
                    select: "_id firstName lastName username profile_picture",
                },
            ],
        })
        .populate({
            path: "storyMessage",
            populate: [{
                path: "user",
                select: "_id firstName lastName username profile_picture",
            }, ],
        })
        .populate({
            path: "workoutMessage",
            populate: [{
                    path: "user",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "partner",
                    select: "_id firstName lastName username profile_picture",
                },
                {
                    path: "challenge",
                },
            ],
        })
        .sort({ createdAt: "desc" })
        .exec(function(e, Msgs) {
            if (e) {
                res.status(500).json({ status: false, message: e });
            } else {
                if (Msgs) {
                    res.status(200).json({ status: true, data: Msgs });
                } else {
                    res.status(200).json({ status: true, data: [] });
                }
            }
        });
    */
});
router.delete("/history/:id", [verifyToken], function(req, res) {
    Chat.findOne({ _id: req.params.id }).exec(function(e) {
        if (e) {
            res.status(200).json({ status: false, message: e });
        } else {
            if (chat.user1.equals(userId)) {
                if (chat.deleteByuser2 == true) {
                    Chat.deleteOne({_id:req.params.id});
                    Message.deleteMany({chat:req.params.id});
                } else {
                    chat.deleteByuser1 = true;
                    chat.user1DeletionDate = new Date(); // Set the date and time of deletion
                    chat.save();
                }
            } else {
                if (chat.deleteByuser1 == true) {
                    Chat.deleteOne({_id:req.params.id});
                    Message.deleteMany({chat:req.params.id});
                } else {
                    chat.deleteByuser2 = true;
                    chat.user2DeletionDate = new Date();
                    chat.save();
                }
            }

            return res.status(200).json({ status: true });
        }
    });
});

module.exports = router;