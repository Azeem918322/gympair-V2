var express = require("express");
var router = express.Router();
const config = require("../config");
const db = require("../models");
var bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var multer = require("multer");
var fs = require("fs");
const path = require("path");

const { verifyToken, isAdmin } = require("../middlewares/verifyToken");

const User = db.user;
const Story = db.story;
const Chat = db.Chat;
const Message = db.Message;
const Notification = db.notification;

const axios = require("axios").default;

var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    if (file.fieldname === "image") {
      var dirUploads = "./uploads/images";
      if (!fs.existsSync(dirUploads)) {
        fs.mkdirSync(dirUploads);
      }

      var dir = "./uploads/images/" + req.userId;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      callback(null, dir);
    } else if (file.fieldname === "video") {
      var dirUploads = "./uploads/videos";
      if (!fs.existsSync(dirUploads)) {
        fs.mkdirSync(dirUploads);
      }

      var dir = "./uploads/videos/" + req.userId;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      callback(null, dir);
    }
  },
  filename: function (req, file, callback) {
    var datetimestamp = Date.now();

    callback(
      null,
      file.originalname.split(".")[0] +
        "-" +
        req.userId +
        "." +
        file.originalname.split(".")[file.originalname.split(".").length - 1]
    );
  },
});

var upload = multer({ storage: storage }).fields([
  {
    name: "image",
  },
  {
    name: "video",
  },
]);

router.get("/listing", [verifyToken], async function (req, res) {
  const user = await User.findById(req.userId);

  let following = user.followings || [];
  console.log("following", following);
  following.push(req.userId);
  // const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  let stories = await Story.find({
    user: { $in: following },
    createdAt: { $gte: twentyFourHoursAgo },
  })
    .sort({ createdAt: "desc" })
    .populate("user", "_id firstName lastName username profile_picture createdAt");

  stories = JSON.parse(JSON.stringify(stories));

  let filteredStories = [];
  let userStoryMap = new Map();

  for (let story of stories) {
    story.isViewed = story.viewedBy.includes(req.userId);

    if (userStoryMap.has(story.user._id.toString())) {
      userStoryMap.get(story.user._id.toString()).stories.push(story);
    } else {
      userStoryMap.set(story.user._id.toString(), {
        user: story.user,
        stories: [story],
      });
    }
  }

  for (const userStory of userStoryMap.values()) {
    filteredStories.push(userStory);
  }

  res
    .status(200)
    .json({
      status: true,
      message: "Stories fetched successfully",
      data: filteredStories,
    })
    .end();
});

router.post("/", [verifyToken], function (req, res) {
  upload(req, res, function (err, f) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      res
        .status(500)
        .send({ error: { message: `Multer uploading error: ${err.message}` } })
        .end();
      return;
    } else if (err) {
      // An unknown error occurred when uploading.
      if (err.name == "ExtensionError") {
        res
          .status(413)
          .send({ error: { message: err.message } })
          .end();
      } else {
        res
          .status(500)
          .send({
            error: { message: `unknown uploading error: ${err.message}` },
          })
          .end();
      }
      return;
    }

    let images = [];
    let videos = [];

    if (req.files) {
      if (req.files["image"]) {
        req.files["image"].forEach((f) => {
          images.push(
            config.apiUrl + "/uploads/images/" + req.userId + "/" + f.filename
          );
        });
      }

      if (req.files["video"]) {
        req.files["video"].forEach((f) => {
          videos.push(
            config.apiUrl + "/uploads/videos/" + req.userId + "/" + f.filename
          );
        });
      }
    }

    if (typeof req.body.imageCaptions === "string") {
      req.body.imageCaptions = JSON.parse(req.body.imageCaptions);
    }

    if (typeof req.body.videoCaptions === "string") {
      req.body.videoCaptions = JSON.parse(req.body.videoCaptions);
    }

    if (images.length == 0 && videos.length == 0) {
      res
        .status(400)
        .json({
          status: false,
          message: "Atleast one video or image is needed for a story",
        })
        .end();
      return;
    }

    if (req.body.imageCaptions && req.body.imageCaptions.length != images.length) {
      res
        .status(400)
        .json({
          status: false,
          message:
            "The no of image captions does not match the no of images. There should be equal no of captions for equal no of images even if the caption is empty string",
        })
        .end();
      return;
    }

    if (req.body.videoCaptions && req.body.videoCaptions.length != videos.length) {
      res
        .status(400)
        .json({
          status: false,
          message:
            "The no of video captions does not match the no of videos. There should be equal no of captions for equal no of videos even if the caption is empty string",
        })
        .end();
      return;
    }

    let createdStories = [];

    for (let i = 0; i < images.length; i++) {
      let caption = req.body.imageCaptions && req.body.imageCaptions[i];

      Story.create(
        {
          user: req.userId,
          image: images[i],
          caption: caption || "",
          viewedBy: [],
        },
        function (err, story) {
          if (err) {
            res.status(400).json({ status: false, message: err }).end();
          } else {
            createdStories.push(story);
          }
        }
      );
    }

    for (let i = 0; i < videos.length; i++) {
      let caption = req.body.videoCaptions && req.body.videoCaptions[i];

      Story.create(
        {
          user: req.userId,
          image: videos[i],
          caption: caption || "",
          viewedBy: [],
        },
        function (err, story) {
          if (err) {
            res.status(400).json({ status: false, message: err }).end();
          } else {
            createdStories.push(story);
          }
        }
      );
    }

    res.status(200).json({
      status: true,
      message: "Stories uploaded",
      data: createdStories,
    });
  });
});

router.get("/viewed/:id", [verifyToken], function (req, res) {
  Story.findOne({ _id: req.params.id }).exec(function (err, story) {
    if (err) {
      res.status(400).json({ status: false, message: err }).end();
    } else {
      if (story.viewedBy.includes(req.userId)) {
        res
          .status(400)
          .json({
            status: false,
            message: "Story already has been viewed by you",
          })
          .end();
      } else {
        story.viewedBy.push(req.userId);

        story.save();

        res.status(200).json({ status: true, message: "Story viewed" }).end();
      }
    }
  });
});

router.post("/message/:id", [verifyToken], async function (req, res) {
  if (!req.body.message) {
    res
      .status(400)
      .json({ status: false, message: "Message is a missing field" })
      .end();
  }

  let myUser = await User.findOne({ _id: req.userId });

  Story.findOne({ _id: req.params.id }).exec(function (err, story) {
    if (err) {
      res.status(400).json({ status: false, message: err });
    } else {
      if(!story){
        return res.status(400).json({
          status: false,
          message:
            "No Story was found against this id",
        });
      }
      if (story.user == req.userId) {
        res.status(400).json({
          status: false,
          message:
            "A user can view his own story but can not call this api to message himself on a story",
        });
      } else {
        Chat.findOne({
          $or: [
            {
              $and: [{ user1: req.userId }, { user2: story.user }],
            },
            {
              $and: [{ user2: req.userId }, { user1: story.user }],
            },
          ],
        }).exec(function (err, chat) {
          if (err) {
            res.status(500).json({ status: false, message: err });
          } else {
            if (chat) {
              if (!chat.initiated) {
                chat.initiated = true;
                chat.save();
              }

              Message.create(
                {
                  chat: chat._id,
                  sender: req.userId,
                  reciever: story.user,
                  isLike: false,
                  messageType: 3,
                  storyMessage: req.params.id,
                  text: req.body.message,
                },
                (err, msg) => {
                  if (err) {
                    res.status(500).json({ status: false, message: err });
                  } else {
                    sendPushNotification(
                      story.user,
                      myUser.username + " Replied on your story",
                      req.body.message
                    );

                    saveNotification(
                      4,
                      req.userId,
                      story.user,
                      myUser.username + " Replied on your story",
                      msg._id
                    );

                    res.status(200).json({
                      status: true,
                      message: "Successfully messaged on a story",
                      data: msg,
                    });
                  }
                }
              );
            } else {
              Chat.create(
                {
                  user1: req.userId,
                  user2: story.user,
                  initiated: true,
                },
                (err, newChat) => {
                  if (err) {
                    res.status(500).json({ status: false, message: err });
                  } else {
                    Message.create(
                      {
                        chat: newChat._id,
                        sender: req.userId,
                        reciever: story.user,
                        isLike: false,
                        messageType: 3,
                        storyMessage: req.params.id,
                        text: req.body.message,
                      },
                      (err, msg) => {
                        if (err) {
                          res.status(500).json({ status: false, message: err });
                        } else {
                          sendPushNotification(
                            story.user,
                            myUser.username + " Replied on your story",
                            req.body.message
                          );

                          saveNotification(
                            4,
                            req.userId,
                            story.user,
                            myUser.username + " Replied on your story",
                            msg._id
                          );

                          res.status(200).json({
                            status: true,
                            message: "Successfully messaged on a story",
                            data: msg,
                          });
                        }
                      }
                    );
                  }
                }
              );
            }
          }
        });
      }
    }
  });
});

module.exports = router;

function fmt(date, format = "YYYY-MM-DDThh:mm:ss") {
  const pad2 = (n) => n.toString().padStart(2, "0");

  const map = {
    YYYY: date.getFullYear(),
    MM: pad2(date.getMonth() + 1),
    DD: pad2(date.getDate()),
    hh: pad2(date.getHours()),
    mm: pad2(date.getMinutes()),
    ss: pad2(date.getSeconds()),
  };

  return Object.entries(map).reduce(
    (prev, entry) => prev.replace(...entry),
    format
  );
}

function sendPushNotification(id, title, message) {
  User.findOne({ _id: id })
    .select("notificationToken")
    .exec(function (err, dev) {
      if (err) {
        res.status(500).json({ message: err });
      } else {
        if (dev && dev.notificationToken) {
          const options = {
            method: "POST",
            url: config.OSUrl + "/notifications",
            headers: {
              accept: "application/json",
              "Content-Type": "application/json",
            },
            data: {
              app_id: config.appID,
              include_player_ids: dev.notificationToken,
              contents: { en: message },
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

var saveNotification = function (type, sender, receiver, content, messageId) {
  User.findOne({ _id: sender }, "username firstName lastName").exec(function (
    e,
    u
  ) {
    if (e) {
      console.log(e);
    } else {
      var not = new Notification({
        type: 4,
        user: sender,
        receiver: receiver,
        content: content,
        is_accepted: false,
        messageId: messageId,
      });

      not.save();
    }
  });
};
