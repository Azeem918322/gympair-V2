var express = require("express");
var router = express.Router();
const config = require("../config");
const db = require("../models");
var bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var multer = require("multer");
var fs = require("fs");
const path = require("path");
var cron = require("node-cron");
const Wallet = db.wallet;
const TransactionDB = db.transaction;
const moment = require("moment");

const { verifyToken, isAdmin } = require("../middlewares/verifyToken");
const {
  Challenge,
  workout,
  workoutChallengeValidator,
} = require("../middlewares/validations");

var User = db.user;
var Workout_challenge = db.challenge;
var Workout = db.workout;
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

      var finalDir = "./uploads/videos/" + req.userId + "/workoutChallenge";
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir);
      }

      callback(null, finalDir);
    }
  },
  filename: function (req, file, callback) {
    var datetimestamp = Date.now();

    if (file.fieldname === "image") {
      callback(
        null,
        file.originalname.split(".")[0] +
          "-" +
          req.userId +
          "." +
          file.originalname.split(".")[file.originalname.split(".").length - 1]
      );
    } else if (file.fieldname === "video") {
      callback(
        null,
        "video." +
          file.originalname.split(".")[file.originalname.split(".").length - 1]
      );
    }
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

router.post("/challenge", [verifyToken, workout], async function (req, res) {
  //create a request for challenge between two partners
  let date_time = moment(req.body.date_time, "YYYY-MM-DD HH:mm");

  if (date_time.isBefore(moment())) {
    return res.status(400).json({
      status: false,
      message: "Selected date and time should be a future date",
    });
  }

  const challenge = await Workout_challenge.findById(req.body.workout_id);
  if (!challenge) {
    res.status(500).json({ error: "Challenge does not exists!" });
  }

  let deadline = moment(req.body.date_time, "YYYY-MM-DD HH:mm");
  deadline.add(15, "minutes");

  deadline = deadline.format("YYYY-MM-DDTHH:mm");
  date_time = date_time.format("YYYY-MM-DDTHH:mm");

  var w_out = new Workout({
    user: req.userId,
    partner: req.body.partner,
    workout_name: challenge.workout_name || "",
    date_time: date_time,
    deadline: deadline,
    challenge: req.body.workout_id,
    status: 1,
    fitness_level: req.body.fitness_level,
  });

  await w_out.save();

  const currentUser = await User.findById(req.userId).select("username");

  Workout_challenge.find()
    .where({ fitness_level: req.body.fitness_level })
    .exec(function (err, ch) {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        sendPushNotification(
          req.body.partner,
          "Workout Challenge",
          currentUser.username + " Send a Workout Challenge"
        );

        saveNotification(3, req.userId, req.body.partner, w_out._id);

        let randomIndex;
        let videoDeepCloned;

        if (ch.length > 0) {
          while (true) {
            randomIndex = Math.floor(Math.random() * ch.length);

            if (ch[randomIndex].challenge_video) {
              break;
            }
          }

          videoDeepCloned = [...ch[randomIndex].challenge_video];

          videoDeepCloned[20] = "2";

          videoDeepCloned = videoDeepCloned.join("");
        }

        res.status(200).json({
          status: true,
          message:
            ch.length > 0
              ? "Workout created and video for the fitness level returned"
              : "Workout created but no video for the fitness level found",
          data: {
            workout_id: w_out["_id"],
            // challenge: ch.length > 0 ? videoDeepCloned : [],
            challenge: challenge ? challenge?.challenge_video : [],
            challenge_info: challenge,
          },
        });
      }
    });
});

router.get("/pending/:type", [verifyToken], function (req, res) {
  try {
    const type = req.params.type;
    let query = {};

    if (type === "send") {
      // Get pending workouts sent by the user
      query = { user: req.userId, status: 1 };
    } else if (type === "receive") {
      // Get pending workouts received by the user
      query = { partner: req.userId, status: 1 };
    } else {
      return res
        .status(400)
        .json({ status: false, message: "Invalid type parameter" });
    }

    Workout.find(query)
      .populate("user", "_id firstName lastName username profile_picture")
      .populate("partner", "_id firstName lastName username profile_picture")
      .sort({ createdAt: "desc" })
      .exec(function (err, user) {
        if (err) {
          res.status(500).json({ status: false, message: err });
        } else {
          res.status(200).json({
            status: true,
            message: "Completed Challenges List",
            data: user,
          });
        }
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
});

router.get("/approved/:type", [verifyToken], function (req, res) {
  try {
    const type = req.params.type;
    let query = {};

    if (type === "send") {
      // Get pending workouts sent by the user
      query = { user: req.userId, status: 2 };
    } else if (type === "receive") {
      // Get pending workouts received by the user
      query = { partner: req.userId, status: 2 };
    } else {
      return res
        .status(400)
        .json({ status: false, message: "Invalid type parameter" });
    }

    Workout.find(query)
      .populate("user", "_id firstName lastName username profile_picture")
      .populate("partner", "_id firstName lastName username profile_picture")
      .sort({ createdAt: "desc" })
      .exec(function (err, user) {
        if (err) {
          res.status(500).json({ status: false, message: err });
        } else {
          res.status(200).json({
            status: true,
            message: "Completed Challenges List",
            data: user,
          });
        }
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
});

router.get("/workout_challenge", [verifyToken], function (req, res) {
  let fitness_level = req.query.fitness_level;

  Workout_challenge.find()
    .where({ fitness_level: fitness_level })
    .exec(function (err, ch) {
      if (err) {
        res.status(400).json({ status: false, message: err });
      } else {
        if (ch.length > 0) {
          let randomIndex;

          while (true) {
            randomIndex = Math.floor(Math.random() * ch.length);

            if (ch[randomIndex].challenge_video) {
              break;
            }
          }

          let videoDeepCloned = [...ch[randomIndex].challenge_video];

          videoDeepCloned[20] = "2";

          videoDeepCloned = videoDeepCloned.join("");

          res.status(200).json({
            status: true,
            message: "Video successfully fetched",
            data: videoDeepCloned,
          });
        } else {
          res.status(400).json({
            status: false,
            message: "No video found",
          });
        }
      }
    });
});

router.put("/challenge/cancel/:id", [verifyToken], function (req, res) {
  const workout_id = req.params.id;

  Workout.findOne({ _id: workout_id }).exec(function (err, ch) {
    if (err) {
      res.status(400).send({ status: false, message: err }).end();
    } else {
      if (ch.user != req.userId) {
        res
          .status(400)
          .json({
            status: false,
            message:
              "Only the creator of the workout request can cancel the request",
          })
          .end();
      } else {
        ch.status = 4;
        ch.save();

        res
          .status(200)
          .json({ status: true, message: "Challenge canceled", data: ch })
          .end();
      }
    }
  });
});

router.post("/challenge/response", [verifyToken], function (req, res) {
  if (!req.body.status) {
    res
      .status(400)
      .json({ status: false, message: "status is required" })
      .end();
  } else if (req.body.status != 2 && req.body.status != 3) {
    res
      .status(400)
      .json({
        status: false,
        message:
          "status value can only be 2 for accept request and 3 for rejecting the request",
      })
      .end();
  } else {
    //accepts or rejects challenge
    Workout.findOne({ _id: req.body.challenge }).exec(async function (err, ch) {
      if (err) {
        console.log(err);
        res.status(500).json({ error: err });
      } else {
        if (ch["user"] == req.userId) {
          res.status(400).json({
            message: "Only your partner can accept or reject the challenge.",
          });
        } else {
          //check if challenge is still valid-time n date
          //update status and send notification to user
          //reminder like cron job
          if (ch.status === 4) {
            res
              .status(400)
              .json({
                status: false,
                message: "Challenge already has been canceled",
              })
              .end();
          } else {
            if (moment(ch.deadline).isBefore(moment())) {
              ch["status"] = 5;

              ch.save();

              res
                .status(400)
                .json({ status: false, message: "Challenge is expired" });
            } else {
              ch["status"] = req.body.status;

              ch.save();

              if (req.body.status == 2) {
                const currentUser = await User.findById(ch.user).select(
                  "username"
                );

                sendPushNotification(
                  ch.user,
                  "Workout Challenge Accepted",
                  currentUser.username + " accept your Request"
                );

                saveAcceptChallengeNotification(3, req.userId, ch.user, ch._id);
              }

              res.status(200).json({
                status: true,
                message: "Status for workout request changed",
              });
            }
          }
        }
      }
    });
  }
});

router.get("/challenge/waiting", [verifyToken], function (req, res) {
  const currentTime = moment().format("YYYY-MM-DDTHH:mm");

  Workout.findOne({
    user: req.userId,
    status: 1,
    deadline: {
      $gte: currentTime,
    },
  })
    .select("_id deadline")
    .populate("partner", "_id firstName lastName username profile_picture")
    .sort({ createdAt: "desc" })
    .exec(function (err, workouts) {
      if (err) {
        res.status(400).json({ status: false, message: err });
      } else {
        res.status(200).json({
          status: true,
          message: "Waiting for workouts fetched",
          data: workouts || {},
        });
      }
    });
});

router.post("/challenge/:id/video", [verifyToken], function (req, res) {
  upload(req, res, async function (err, f) {
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
      let challenge_video = "";

      if (req.files["video"]) {
        var video = [];

        req.files["video"].forEach((f) => {
          video.push(
            config.apiUrl +
              "/uploads/videos/" +
              req.userId +
              "/workoutChallenge/" +
              f.filename
          );
        });

        challenge_video = video[0];
      }

      Workout.findOne({ _id: req.params.id }).exec(function (err, wout) {
        if (err) {
          res.json({ status: false, message: err });
        } else {
          if (wout.status != 2) {
            res
              .status(400)
              .json({
                status: false,
                message:
                  "Workout request should have been accepted to complete it",
              })
              .end();
          } else if (wout.complete) {
            res
              .status(400)
              .json({
                status: false,
                message: "Workout request has already been marked complete",
              })
              .end();
          } else if (wout.challenge) {
            res
              .status(400)
              .json({
                status: false,
                message:
                  "There is already a submitted challenge for this workout",
              })
              .end();
          } else {
            Workout_challenge.create(
              {
                challenge_video: challenge_video,
              },
              function (err, workout_challenge) {
                if (err) {
                  res.json({ status: false, message: err });
                } else {
                  wout["challenge"] = workout_challenge._id;

                  wout.save();

                  res
                    .status(200)
                    .json({
                      status: true,
                      message:
                        "Your workout video has been received and in under review by moderator team.",
                      data: { challenge_video },
                    })
                    .end();
                }
              }
            );
          }
        }
      });
    } else {
      res
        .status(400)
        .json({ status: false, message: "No video file uploaded" })
        .end();
    }
  });
});

router.put("/challenge/:id", [verifyToken], async function (req, res) {
  await workoutChallengeValidator(req, res);

  Workout.findOne({ _id: req.params.id }).exec(function (err, wout) {
    if (err) {
      res.json({ status: false, message: err });
    } else {
      if (!wout) {
        return res
          .status(400)
          .json({
            status: false,
            message: "No Workout was found.",
          })
          .end();
      }
      if (wout.status != 2) {
        res
          .status(400)
          .json({
            status: false,
            message: "Workout request should have been accepted to complete it",
          })
          .end();
      } else if (wout.complete) {
        res
          .status(400)
          .json({
            status: false,
            message: "Workout request has already been marked complete",
          })
          .end();
      } else {
        Workout_challenge.findOne({ _id: wout["challenge"] }).exec(function (
          err,
          workout_challenge
        ) {
          if (err) {
            res.json({ status: false, message: err });
          } else {
            if (!workout_challenge) {
              return res
                .status(400)
                .json({
                  status: false,
                  message: "No Workout Challenge was found.",
                })
                .end();
            }
            workout_challenge["challenge_description"] =
              req.body.challenge_description;
            workout_challenge["fitness_level"] = wout.fitness_level;

            workout_challenge.save();

            wout["complete"] = true;
            wout["under_review"] = true;

            wout.save();

            cron.schedule("*/2 * * * *", () => {
              // Find the record by its unique identifier and update its properties
              if (wout["reward_given"] == false) {
                Workout.findByIdAndUpdate(wout["_id"], { under_review: false })
                  .then(() => {
                    console.log("Record updated");
                    Wallet.findOne({ user: wout["user"] }).exec(async function (
                      err,
                      wallet
                    ) {
                      if (err) {
                        res.json({ status: false, message: err });
                      } else {
                        if (wallet) {
                          const currentUser = await User.findById(
                            wout["user"]
                          ).select("username subscription");

                          let reward = 0;
                          if (wout["fitness_level"] == "Beginner") {
                            reward = 1;
                            if (currentUser && currentUser.subscription == 1) {
                              reward = 2;
                            }
                          } else if (wout["fitness_level"] == "Intermediate") {
                            reward = 2;
                            if (currentUser && currentUser.subscription == 1) {
                              reward = 4;
                            }
                          } else if (wout["fitness_level"] == "Advanced") {
                            reward = 3;
                            if (currentUser && currentUser.subscription == 1) {
                              reward = 6;
                            }
                          }
                          wallet["points"] = wallet.points + reward;
                          wallet.save();

                          wout["reward_given"] = true;
                          wout["reward_accepted"] = true;
                          wout["points_earned"] = reward;
                          wout.save();

                          addTransaction(
                            wout["user"],
                            wout["workout_name"],
                            reward,
                            0,
                            "completed",
                            wout["_id"]
                          );

                          sendPushNotification(
                            wout["user"],
                            "Workout Challenge Completed",
                            "You Have Received the Workout Challenge Points"
                          );

                          savePointsReceivedNotification(
                            6,
                            wout["user"],
                            wout["_id"]
                          );

                          sendPushNotification(
                            wout["partner"],
                            "Workout Challenge Completed",
                            currentUser.username +
                              " Completed the Workout Challenge"
                          );

                          savePointNotification(
                            5,
                            wout["user"],
                            wout["partner"],
                            wout["_id"]
                          );
                        } else {
                          console.log("No Wallet found");
                        }
                      }
                    });
                  })
                  .catch((error) => {
                    console.error("Error updating record:", error);
                  });
              }
            });

            res.json({
              status: true,
              message: "Workout challenge completed successfully",
              data: workout_challenge,
            });
          }
        });
      }
    }
  });
});

router.post("/challenge/:id", [verifyToken], function (req, res) {
  //add challenge to challenge request
  Workout.findOne({ _id: req.params.id })
    .populate("user", "_id username")
    .exec(function (err, wout) {
      if (err) {
        res.json({ error: err });
      } else {
        wout["challenge"] = req.body.challenge;
        wout["status"] = 1;

        wout.save();

        //send notification to partner
        sendPushNotification(
          wout.partner,
          "Workout Challenge",
          wout.user.username + " Send a Workout Challenge"
        );

        res
          .status(200)
          .json({ status: true, message: "Workout challenge sent." });
      }
    });
});

router.get("/completedChallenges", [verifyToken], function (req, res) {
  Workout.find({
    $or: [
      { $and: [{ complete: true }, { user: req.userId }] },
      { $and: [{ complete: true }, { partner: req.userId }] },
    ],
  })
    .populate("user", "_id firstName lastName username profile_picture")
    .populate("partner", "_id firstName lastName username profile_picture")
    .populate("challenge")
    .sort({ createdAt: "desc" })
    .exec(function (err, user) {
      if (err) {
        res.status(500).json({ status: false, message: err });
      } else {
        let data = [];
        for (let userData of user) {
          let tempObj = {
            PartnerName:
              userData.partner.firstName + " " + userData.partner.lastName,
            Level: userData.fitness_level,
            ChallengeType: userData.workout_name,
            DateTime: userData.date_time,
            PointsEarned: userData.points_earned || 0,
          };
          data.push(tempObj);
        }
        res.status(200).json({
          status: true,
          message: "Completed Challenges List",
          data: data,
        });
      }
    });
});

router.post("/challenge/points/response", [verifyToken], function (req, res) {
  if (!req.body.status) {
    res
      .status(400)
      .json({ status: false, message: "status is required" })
      .end();
  } else if (req.body.status != 2 && req.body.status != 3) {
    res
      .status(400)
      .json({
        status: false,
        message:
          "status value can only be 2 for accept request and 3 for rejecting the request",
      })
      .end();
  } else {
    //accepts or rejects challenge
    Workout.findOne({ _id: req.body.challenge }).exec(async function (err, ch) {
      if (err) {
        console.log(err);
        res.status(500).json({ error: err });
      } else {
        if (ch["user"] == req.userId) {
          res.status(400).json({
            message: "Only your partner can accept or reject the challenge.",
          });
        } else {
          //check if challenge is still valid-time n date
          //update status and send notification to user
          //reminder like cron job
          if (ch.status === 4) {
            res
              .status(400)
              .json({
                status: false,
                message: "Challenge already has been canceled",
              })
              .end();
          } else {
            if (req.body.status == 2) {
              if (ch["reward_given"] == false) {
                cron.schedule("*/2 * * * *", () => {
                  // Find the record by its unique identifier and update its properties
                  Workout.findByIdAndUpdate(ch["_id"], { under_review: false })
                    .then(() => {
                      console.log("Record updated");
                      Wallet.findOne({ user: ch["partner"] }).exec(
                        async function (err, wallet) {
                          if (err) {
                            res.json({ status: false, message: err });
                          } else {
                            let reward = 0;
                            if (ch["fitness_level"] == "Beginner") {
                              reward = 2;
                            } else if (ch["fitness_level"] == "Intermediate") {
                              reward = 3;
                            } else if (ch["fitness_level"] == "Advanced") {
                              reward = 5;
                            }
                            wallet["points"] = wallet.points + reward;
                            wallet.save();

                            ch["reward_given"] = true;
                            ch["reward_accepted"] = true;
                            ch["points_earned"] = reward;
                            ch.save();

                            addTransaction(
                              ch["partner"],
                              ch["workout_name"],
                              reward,
                              0,
                              "completed",
                              wout["_id"]
                            );

                            saveAcceptChallengeNotification(
                              5,
                              req.userId,
                              ch.user,
                              ch._id
                            );

                            sendPushNotification(
                              ch["partner"],
                              "Workout Challenge Completed",
                              "You Have Received the Workout Challenge Points"
                            );
                            savePointsReceivedNotification(
                              6,
                              wout["user"],
                              wout["_id"]
                            );
                          }
                        }
                      );
                    })
                    .catch((error) => {
                      console.error("Error updating record:", error);
                    });
                });
              }
            }

            res.status(200).json({
              status: true,
              message: "Status for workout request changed",
            });
          }
        }
      }
    });
  }
});

router.get("/canCreateChallenge", [verifyToken], function (req, res) {
  Workout.find({
    user: req.userId,
    createdAt: {
      $gte: moment().subtract(6, "hours").toDate(), // Filter workouts created in the last 6 hours
    },
  }).exec(function (err, result) {
    if (err) {
      res.status(400).send({ status: false, message: err }).end();
    } else {
      User.findOne({ _id: req.userId }, "subscription subscriptionExpiry").exec(
        function (e, user) {
          if (e) {
            console.log(e);
          } else {
            console.log("user.subscription-->", user.subscription);
            const currentDate = new Date();

            if (
              user &&
              user.subscription === 1 &&
              user.subscriptionExpiry > currentDate.getTime()
            ) {
              if (result.length > 1) {
                res
                  .status(200)
                  .json({
                    status: false,
                    message: "User Can't Create Challenge",
                  })
                  .end();
              } else {
                res
                  .status(200)
                  .json({ status: true, message: "User Can Create Challenge" })
                  .end();
              }
            } else {
              if (result.length > 0) {
                res
                  .status(200)
                  .json({
                    status: false,
                    message: "User Can't Create Challenge",
                  })
                  .end();
              } else {
                res
                  .status(200)
                  .json({ status: true, message: "User Can Create Challenge" })
                  .end();
              }
            }
          }
        }
      );
    }
  });
});

router.get("/challenge/adsReward", [verifyToken], function (req, res) {
  Wallet.findOne({ user: req.userId }).exec(async function (err, wallet) {
    if (err) {
      res.json({ status: false, message: err });
    } else {
      wallet["points"] = wallet.points + 1;
      wallet.save();

      addTransaction(req.userId, "AdsReward", 1, 1, "completed");
      sendPushNotification(
        req.userId,
        "Watched Rewarded Ad",
        "You Have Received the Points for watching Ad"
      );
      saveAdsNotification(7, req.userId);

      res.status(200).json({
        status: true,
        message: "Reward for watching Ad is saved",
      });
    }
  });
});

router.get("/transactions", [verifyToken], function (req, res) {
  TransactionDB.find({ user: req.userId }).exec(function (err, transactions) {
    if (err) {
      res.status(500).json({ status: false, message: err });
    } else {
      console.log("transactions", transactions);
      let sum = 0;
      let data = {
        points: 0,
        transactions: {},
      };
      let transactionsArray = {};
      for (let transactionData of transactions) {
        sum += transactionData.points;
        let workoutName = "";
        if (transactionData.type == 0) {
          workoutName = transactionData?.workout?.workout_name;
        } else {
          workoutName = "AdsReward";
        }
        let tempObj = {
          Name: workoutName,
          Description: transactionData.description || "",
          Points: transactionData.points || 0,
        };
        var ts_hms = new Date(transactionData.createdAt)
          .toISOString()
          .slice(0, 10);

        let date = ts_hms;
        transactionsArray[date] =
          transactionsArray[date]?.length > 0 ? transactionsArray[date] : [];
        transactionsArray[date].push(tempObj);
      }

      data.points = sum;
      data.transactions = transactionsArray;
      res.status(200).json({ status: true, message: "", data: data });
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
              console.log("response", response.data);
            })
            .catch(function (error) {
              console.log("error", error);
            });
        }
      }
    });
}

var saveNotification = function (type, sender, receiver, workoutId) {
  User.findOne({ _id: sender }, "username firstName lastName").exec(function (
    e,
    u
  ) {
    if (e) {
      console.log(e);
    } else {
      var not = new Notification({
        type: 3,
        user: sender,
        receiver: receiver,
        content: "Send a Workout Challenge",
        is_accepted: false,
        workoutId: workoutId,
      });

      not.save();
    }
  });
};

var savePointNotification = function (type, sender, receiver, workoutId) {
  User.findOne({ _id: sender }, "username firstName lastName").exec(function (
    e,
    u
  ) {
    if (e) {
      console.log(e);
    } else {
      var not = new Notification({
        type: type,
        user: sender,
        receiver: receiver,
        content: "Completed the Workout Challenge",
        is_accepted: false,
        workoutId: workoutId,
      });

      not.save();
    }
  });
};

var savePointsReceivedNotification = function (type, receiver, workoutId) {
  User.findOne({ _id: receiver }, "username firstName lastName").exec(function (
    e,
    u
  ) {
    if (e) {
      console.log(e);
    } else {
      var not = new Notification({
        type: type,
        receiver: receiver,
        content: "Points Received",
        workoutId: workoutId,
      });

      not.save();
    }
  });
};

var saveAdsNotification = function (type, receiver) {
  User.findOne({ _id: receiver }, "username firstName lastName").exec(function (
    e,
    u
  ) {
    if (e) {
      console.log(e);
    } else {
      var not = new Notification({
        type: type,
        receiver: receiver,
        content: "Watched Rewarded Ad",
      });

      not.save();
    }
  });
};

var saveAcceptChallengeNotification = function (
  type,
  sender,
  receiver,
  workoutId
) {
  User.findOne({ _id: sender }, "username firstName lastName").exec(function (
    e,
    u
  ) {
    if (e) {
      console.log(e);
    } else {
      var not = new Notification({
        type: type,
        user: sender,
        receiver: receiver,
        content: "accept your Request",
        is_accepted: true,
        workoutId: workoutId,
      });

      not.save();
    }
  });
};

var addTransaction = function (
  user,
  name,
  points,
  type,
  description,
  workout = null
) {
  var trans = new TransactionDB({
    description: description,
    points: points,
    workout: workout,
    type: type,
    user: user,
  });
  trans.save();
  //implement notifictaion here
  return;
};
