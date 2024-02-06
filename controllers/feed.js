var express = require("express");
var router = express.Router();
const config = require("../config");
var fs = require("fs");
var path = require("path");
var async = require("async");
var cron = require("node-cron");
const db = require("../models");
const { verifyToken } = require("../middlewares/verifyToken");
var multer = require("multer");
const mime = require("mime");
var Feed = require("../models/post"); //db.feed;
var User = db.user;
var Friend = db.friends;
var Comment = db.comments;
var Notification = db.notification;
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
    var post = {
      user: req.userId,
      status: req.body.status ? req.body.status : "post",
      caption: req.body.caption ? req.body.caption : "",
      created_at: new Date(),
      privacy: req.body.privacy ? req.body.privacy : "Private",
      allowComments: req.body.allowComments ? req.body.allowComments : true,
      allowLikes: req.body.allowLikes ? req.body.allowLikes : true,
      under_review: true,
    };
    if (req.files) {
      if (req.files["image"]) {
        var img = [];
        req.files["image"].forEach((f) => {
          img.push(
            config.apiUrl + "/uploads/images/" + req.userId + "/" + f.filename
          );
        });
        post["image"] = img;
      }
      if (req.files["video"]) {
        var img = [];
        req.files["video"].forEach((f) => {
          img.push(
            config.apiUrl + "/uploads/videos/" + req.userId + "/" + f.filename
          );
        });
        post["video"] = img;
      }
      //console.log(post);
      Feed.create(post, function (err, feed) {
        if (err) {
          res.status(500).json({ status: false, message: err, code: 500 });
        } else {
          //console.log(feed);
          cron.schedule("0 */1 * * *", () => {
            // Find the record by its unique identifier and update its properties
            Feed.updateOne({ _id: feed._id }, { under_review: false })
              .then(() => {
                console.log("Record updated");
              })
              .catch((error) => {
                console.error("Error updating record:", error);
              });
          });
          User.updateOne(
            { _id: req.userId },
            {
              $push: {
                posts: feed._id,
              },
            },
            function (e, u) {
              if (e) {
                console.log(e);
              }
            }
          );

          res.status(200).json({
            status: true,
            message:
              "Your post is under review by moderator team.It will available soon.",
            data: feed,
          });
        }
      });
    } else {
      Feed.create(post, function (err, feed) {
        if (err) {
          res.status(500).json({ status: false, message: err, code: 500 });
        } else {
          //console.log(feed);
          cron.schedule("0 */1 * * *", () => {
            // Find the record by its unique identifier and update its properties
            Feed.updateOne({ _id: feed._id }, { under_review: false })
              .then(() => {
                console.log("Record updated");
              })
              .catch((error) => {
                console.error("Error updating record:", error);
              });
          });
          User.updateOne(
            { _id: req.userId },
            {
              $push: {
                posts: feed._id,
              },
            },
            function (e, u) {
              if (e) {
                console.log(e);
              }
            }
          );

          res.status(200).json({
            status: true,
            message:
              "Your post is under review by moderator team.It will available soon.",
            data: feed,
          });
        }
      });
    }
  });
});

router.get("/list", [verifyToken], function (req, res) {
  if (req.query.feed == "public") {
    Feed.find()
      .where({ privacy: "Public" })
      .where({ under_review: false })
      .populate("user", "_id firstName lastName username profile_picture")
      .populate("likes", "_id firstName lastName username profile_picture")
      .populate({
        path: "comments",
        populate: [
          {
            path: "user",
            select: "_id firstName lastName username profile_picture",
          },
        ],
      })
      .sort({ createdAt: "desc" })
      .exec(function (err, posts) {
        console.log(err);
        if (err) {
          console.log(err);
          res.status(500).json({ status: false, message: err });
        } else {
          // Exclude blocked users
          const userIdsToExclude = posts.map((post) => post.user._id);
          User.find({ _id: { $in: userIdsToExclude } })
            .where({ blockList: { $ne: req.userId } }) // Exclude users in block list
            .exec(function (err, users) {
              if (err) {
                console.log(err);
                res.status(500).json({ status: false, message: err });
              } else {
                const allowedPosts = posts.filter(
                  (post) =>
                    !users.some((user) => user._id.equals(post.user._id))
                );
                res.status(200).json({ status: true, data: allowedPosts });
              }
            });
        }
      });
  } else if (req.query.feed == "private") {
    async.waterfall(
      [getFriends, getFollowers, excludeBlocklist, private],
      function (err, result) {
        if (err) {
          res.status(500).json({ status: false, message: err });
        } else {
          res.status(200).json({ status: true, data: result });
        }
      }
    );
  } else {
    res.status(200).json({ status: false, message: "Query feed is required." });
  }

  function getFriends(cb) {
    Friend.find(
      {
        $or: [{ user1: req.userId }, { user2: req.userId }],
      },
      "user1 user2 status"
    )
      .where({
        $or: [{ status: "accepted" }],
      })
      .exec(function (err, fr) {
        if (err) {
          cb(err, null);
        } else {
          var friends = [];
          if (fr && fr.length > 0) {
            for (var j = 0; j < fr.length; j++) {
              friends.push(fr[j].user1);
              friends.push(fr[j].user2);
              if (j == fr.length - 1) {
                const newArray = friends.filter(
                  (element) => !element.equals(req.userId)
                );
                cb(null, newArray);
              }
            }
          } else {
            cb(null, []);
          }
        }
      });
  }

  function getFollowers(friends, cb) {
    User.findOne({ _id: req.userId }, "followings").exec(function (e, user) {
      if (e) {
        cb(e, null);
      } else {
        if (
          friends.length > 0 &&
          user.followings &&
          user.followings.length > 0
        ) {
          const array3 = [...new Set([...friends, ...user.followings])];
          cb(null, array3);
        } else if (friends.length <= 0 && user.followings.length > 0) {
          cb(null, user.followings);
        } else if (friends.length > 0 && user.followings.length <= 0) {
          cb(null, friends);
        } else if (friends.length <= 0 && user.followings.length <= 0) {
          cb(null, []);
        }
      }
    });
  }

  function excludeBlocklist(friends, cb) {
    User.findOne({ _id: req.userId }, "blocklist").exec(function (e, list) {
      if (e) {
        console.log(e);
      } else {
        if (list.blocklist && list.blocklist.length > 0) {
          var filtered = friends.filter(
            (obj) => !list.blocklist.includes(obj._id)
          );
          cb(null, filtered, list.blocklist);
        } else {
          cb(null, friends, []);
        }
      }
    });
  }

  function private(friends, blocklist, cb) {
    console.log("friends", friends.length);
    console.log("blocklist", blocklist.length);
    Feed.find({
      $and: [{ user: { $in: friends } }, { user: { $nin: blocklist } }],
    })
      .where({ privacy: "Private" })
      .where({ under_review: false })
      .populate("user", "_id firstName lastName username profile_picture")
      .populate("likes", "_id firstName lastName username profile_picture")
      .populate({
        path: "comments",
        populate: [
          {
            path: "user",
            select: "_id firstName lastName username profile_picture",
          },
        ],
      })
      .sort({ createdAt: "desc" })
      .exec(function (err, feed) {
        if (err) {
          cb(err, null);
        } else {
          //console.log("feed", feed);
          cb(null, feed);
        }
      });
  }

  // New function filter out posts from users in the blocklist
  function excludeBlockedPosts(posts, blocklist) {
    return posts.filter((post) => !blocklist.includes(post.user._id));
  }
});

router.get("/", [verifyToken], function (req, res) {
  async.waterfall(
    [getFriends, getFollowers, excludeBlocklist, public, private],
    function (err, result) {
      if (err) {
        res.status(500).json({ status: false, message: err });
      } else {
        res.status(200).json({ status: true, data: result });
      }
    }
  );

  function getFriends(cb) {
    Friend.find(
      {
        $or: [{ user1: req.userId }, { user2: req.userId }],
      },
      "user1 user2 status"
    )
      .where({
        $or: [{ status: "accepted" }],
      })
      .exec(function (err, fr) {
        if (err) {
          cb(err, null);
        } else {
          var friends = [];
          if (fr && fr.length > 0) {
            for (var j = 0; j < fr.length; j++) {
              friends.push(fr[j].user1);
              friends.push(fr[j].user2);
              if (j == fr.length - 1) {
                const newArray = friends.filter(
                  (element) => !element.equals(req.userId)
                );
                cb(null, newArray);
              }
            }
          } else {
            cb(null, []);
          }
        }
      });
  }

  function getFollowers(friends, cb) {
    User.findOne({ _id: req.userId }, "followings").exec(function (e, user) {
      if (e) {
        cb(e, null);
      } else {
        if (
          friends.length > 0 &&
          user.followings &&
          user.followings.length > 0
        ) {
          const array3 = [...new Set([...friends, ...user.followings])];
          cb(null, array3);
        } else if (friends.length <= 0 && user.followings.length > 0) {
          cb(null, user.followings);
        } else if (friends.length > 0 && user.followings.length <= 0) {
          cb(null, friends);
        } else if (friends.length <= 0 && user.followings.length <= 0) {
          cb(null, []);
        }
      }
    });
  }
  function excludeBlocklist(friends, cb) {
    User.findOne({ _id: req.userId }, "blocklist").exec(function (e, list) {
      if (e) {
        console.log(e);
      } else {
        if (list.blocklist && list.blocklist.length > 0) {
          var filtered = friends.filter(
            (obj) => !list.blocklist.includes(obj._id)
          );
          cb(null, filtered, list.blocklist);
        } else {
          cb(null, friends, []);
        }
      }
    });
  }

  function public(friends, blocklist, cb) {
    Feed.find()
      .where({ privacy: "Public" })
      .where({
        $or: [{ under_review: false }, { $exists: { under_review: false } }],
      })
      .populate("user", "_id firstName lastName username profile_picture")
      .populate("likes", "_id firstName lastName username profile_picture")
      .populate({
        path: "comments",
        populate: [
          {
            path: "user",
            select: "_id firstName lastName username profile_picture",
          },
        ],
      })
      .sort({ createdAt: "desc" })
      .exec(function (err, posts) {
        if (err) {
          cb(err, null, [], []);
        } else {
          var filtered = posts.filter(
            (obj) => !obj.user || !blocklist.includes(obj.user._id)
          );
          //posts.filter(a=> {return blocklist.includes(a.user._id)});
          cb(null, friends, filtered, blocklist);
        }
      });
  }

  function private(friends, posts, blocklist, cb) {
    Feed.find({
      $and: [{ user: { $in: friends } }, { user: { $nin: blocklist } }],
    })
      .where({ privacy: "Private" })
      .where({
        $or: [{ under_review: false }, { $exists: { under_review: false } }],
      })
      .populate("user", "_id firstName lastName username profile_picture")
      .populate("likes", "_id firstName lastName username profile_picture")
      .populate({
        path: "comments",
        populate: [
          {
            path: "user",
            select: "_id firstName lastName username profile_picture",
          },
        ],
      })
      .sort({ createdAt: "desc" })
      .exec(function (err, feed) {
        if (err) {
          cb(err, null);
        } else {
          var feeds = posts.concat(feed);
          cb(null, feeds);
        }
      });
  }
});

router.get("/user/:id", [verifyToken], function (req, res) {
  //get one user's posts
  Friend.findOne({
    $or: [
      { user1: req.userId, user2: req.params.id },
      { user1: req.params.id, user2: req.userId },
    ],
  })
    .where({ status: "accepted" })
    .exec(function (err, fr) {
      if (err) {
        res.status(500).json({ status: false, message: err });
      } else {
        if (fr) {
          Feed.find({ user: req.params.id })
            //.where({under_review:false})
            .populate(
              "likes",
              "_id firstName lastName username profile_picture"
            )
            .populate({
              path: "comments",
              populate: [
                {
                  path: "user",
                  select: "_id firstName lastName username profile_picture",
                },
              ],
            })
            .exec(function (er, feed) {
              if (er) {
                res.status(500).json({ status: false, message: er });
              } else {
                res.status(200).json({ status: true, data: feed });
              }
            });
        } else {
          User.findOne({ _id: req.userId })
            .where({ followings: { $in: [req.params.id] } })
            .populate("post")
            .exec(function (er, follow) {
              if (er) {
                res.status(500).json({ status: false, message: er });
              } else {
                if (follow) {
                  Feed.find({ user: req.params.id })
                    //.where({under_review:false})
                    .populate(
                      "likes",
                      "_id firstName lastName username profile_picture"
                    )
                    .populate({
                      path: "comments",
                      populate: [
                        {
                          path: "user",
                          select:
                            "_id firstName lastName username profile_picture",
                        },
                        {
                          path: "likes",
                          select:
                            "_id firstName lastName username profile_picture",
                        },
                      ],
                    })
                    .exec(function (er, feed) {
                      if (er) {
                        res.status(500).json({ status: false, message: er });
                      } else {
                        res.status(200).json({ status: true, data: feed });
                      }
                    });
                } else {
                  Feed.find({ user: req.params.id })
                    .where({ privacy: "Public" })
                    //.where({under_review:false})
                    .populate(
                      "likes",
                      "_id firstName lastName username profile_picture"
                    )
                    .populate({
                      path: "comments",
                      populate: [
                        {
                          path: "user",
                          select:
                            "_id firstName lastName username profile_picture",
                        },
                        {
                          path: "likes",
                          select:
                            "_id firstName lastName username profile_picture",
                        },
                      ],
                    })
                    .exec(function (er, feed) {
                      if (er) {
                        res.status(500).json({ status: false, message: er });
                      } else {
                        res.status(200).json({ status: true, data: feed });
                      }
                    });
                }
              }
            });
        }
      }
    });
});

router.get("/:id", [verifyToken], function (req, res) {
  Feed.findOne({ _id: req.params.id })
    //.where({user:req.userId})
    //.where({under_review:false})
    .populate("user", "_id firstName lastName username profile_picture")
    .populate("likes", "_id firstName lastName username profile_picture")

    .populate({
      path: "comments",
      model: "comments",
      populate: [
        {
          path: "user",
          select: "_id firstName lastName username profile_picture",
        },
        { path: "replies" },
        {
          path: "likes",
          select: "_id firstName lastName username profile_picture",
        },
      ],
    })
    .exec(function (err, post) {
      if (err) {
        res.status(500).json({ status: false, message: err, code: 500 });
      } else {
        res.status(200).json({
          status: true,
          data: post,
        });
      }
    });
});

router.put("/:id", [verifyToken], function (req, res) {
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
    if (req.files) {
      var img = [];
      //console.log(req.files);

      Feed.findOne({ _id: req.params.id }).exec(function (er, fd) {
        if (er) {
          res.status(500).json({ status: false, message: er, code: 500 });
        } else {
          if (fd.image && fd.image.length >= 1) {
            req.body["image"] = fd.image;
            req.files.forEach((f) => {
              req.body["image"].push(
                config.apiUrl + "/uploads/" + req.userId + "/" + f.filename
              );
            });
            Feed.findOneAndUpdate(
              { _id: req.params.id },
              { $set: req.body },
              { new: true },
              function (err, post) {
                if (err) {
                  res
                    .status(500)
                    .json({ status: false, message: err, code: 500 });
                } else {
                  res.status(200).json({
                    status: true,
                    message: "Post edited successfully",
                  });
                }
              }
            );
          } else {
            req.files.forEach((f) => {
              img.push(
                config.apiUrl + "/uploads/" + req.userId + "/" + f.filename
              );
            });
            req.body["image"] = img;
            Feed.findOneAndUpdate(
              { _id: req.params.id },
              { $set: req.body },
              { new: true },
              function (err, post) {
                if (err) {
                  res
                    .status(500)
                    .json({ status: false, message: err, code: 500 });
                } else {
                  res.status(200).json({
                    status: true,
                    message: "Post edited successfully",
                  });
                }
              }
            );
          }
        }
      });
    } else {
      Feed.findOneAndUpdate(
        { _id: req.params.id },
        { $set: req.body },
        { new: true },
        function (err, post) {
          if (err) {
            res.status(500).json({ status: false, message: err, code: 500 });
          } else {
            res.status(200).json({
              status: true,
              message: "Post edited successfully",
            });
          }
        }
      );
    }
  });
});
router.delete("/:id", [verifyToken], function (req, res) {
  //console.log(req.params);
  Feed.deleteOne({ _id: req.params.id })
    .where({ user: req.userId })
    .exec(function (err, fd) {
      if (err) {
        res.status(500).json({ status: false, message: err, code: 500 });
      } else {
        if (fd.deletedCount !== 0) {
          res.status(200).json({
            status: true,
            message: "Post Data Deleted successfully",
          });
        } else {
          res.status(400).json({
            status: false,
            message: "You are not authorized delete this post",
          });
        }
      }
    });
});

router.get("/like/:id", [verifyToken], function (req, res) {
  //like post
  Feed.findOne({ _id: req.params.id })
    //.where({under_review:false})
    .where({ allowLikes: true })
    .exec(function (err, post) {
      if (err) {
        res.status(500).json({ status: false, message: err, code: 500 });
      } else {
        if (post && post._id) {
          if (
            post.likes &&
            post.likes.length > 0 &&
            post.likes.find((x) => x.equals(req.userId))
          ) {
            console.log("unlike post");
            post.toObject();
            // if (post.likes.find(x => x.equals(req.userId))) {
            post.likes = post.likes.filter((el) => el != req.userId);
            post.save();
            res.status(200).json({ message: "Post Unliked!!!" });
            return;
            // };
          } else {
            console.log("like post");
            post.likes.push(req.userId);
            post.save();
            sendNotification(0, post, req.userId);
            sendPushNotification(post["user"], req.userId, "Like Update");
            res.status(200).json({ message: "Post liked!!!" });
            return;
          }
          // }
        } else {
          res.status(400).json({
            status: false,
            message: "Not allowed to like/unlike this post.",
          });
        }
      }
    });
});

router.post("/comment/:id", [verifyToken], function (req, res) {
  if (req.body.comment == "") {
    res.status(400).json({
      status: false,
      message: "Missing key: comment cannot be empty.",
    });
  } else {
    //console.log(req.body);
    Feed.findOne({ _id: req.params.id })
      .where({ allowComments: true })
      .exec(function (e, p) {
        if (e) {
          res.status(500).json({ status: false, message: e });
        } else {
          console.log(p);
          if (p && p._id) {
            Comment.create(
              {
                user: req.userId,
                post: p._id,
                replyOf: req.body.replyOf ? req.body.replyOf : null,
                text: req.body.comment,

                likes: [],
              },
              function (er, c) {
                if (er) {
                  res.status(500).json({ status: false, message: er });
                } else {
                  //console.log("comment done");
                  //console.log(c);
                  if (req.body.replyOf) {
                    Comment.updateOne(
                      { _id: req.body.replyOf },
                      { $push: { replies: c._id } },
                      function (er, co) {
                        if (er) {
                          res.status(500).json({ status: false, message: er });
                        } else {
                          sendNotification(1, p, req.userId);
                          res.status(200).json({
                            status: true,
                            message: "Replied on a comment successfully",
                          });
                        }
                      }
                    );
                  } else {
                    Feed.updateOne(
                      { _id: req.params.id },
                      { $push: { comments: c._id } },
                      function (err, post) {
                        if (err) {
                          res.status(500).json({ status: false, message: err });
                        } else {
                          sendNotification(1, p, req.userId);
                          res.status(200).json({
                            status: true,
                            message: "Commented successfully",
                          });
                        }
                      }
                    );
                  }
                }
              }
            );
          } else {
            res.status(500).json({
              status: false,
              message: "Commenting not allowed for for this post.",
            });
          }
        }
      });
  }
});

router.get("/report/:id", [verifyToken], function (req, res) {
  //this user reported a post
  Feed.updateOne(
    { _id: req.params.id },
    { $push: { reported_by: req.userId } }
  ).exec(function (err, post) {
    if (err) {
      console.log(err);
    } else {
      res.json({ status: true, message: "Report submitted." });
    }
  });
});

module.exports = router;
var sendNotification = function (type, post, sender) {
  User.findOne({ _id: sender }, "username").exec(function (err, send) {
    if (err) {
      console.log(err);
    } else {
      if (type == 0) {
        var not = new Notification({
          type: 0,
          user: send,
          receiver: post["user"],
          content: "Likes your post.",
          post: post,
          is_viewed: false,
        });
        not.save();
      } else if (type == 1) {
        var not = new Notification({
          type: 1,
          user: send,
          receiver: post["user"],
          content: "commented on your post.",
          post: post,
          is_viewed: false,
        });
        not.save();
      }
    }
  });
};

function sendPushNotification(recvr, sender, title) {
  //console.log(recvr);
  User.findOne({ _id: recvr })
    .select("notificationToken")
    .exec(function (err, dev) {
      if (err) {
        res.status(500).json({ message: err });
      } else {
        User.findOne({ _id: sender }, "_id username").exec(function (e, s) {
          if (e) {
            console.log(e);
          } else {
            const filteredArray = dev.notificationToken.filter(
              (str) => str !== ""
            );
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
                contents: { en: s.username + " Likes your post" },
                headings: { en: title },
              },
            };
            //console.log(options);

            axios
              .request(options)
              .then(function (response) {
                console.log(response.data);
              })
              .catch(function (error) {
                console.log("error here");
                //console.log(error);
              });
          }
        });
      }
    });
}
