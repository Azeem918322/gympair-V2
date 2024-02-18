var express = require("express");
var router = express.Router();
const config = require("../config");
var fs = require("fs");
var path = require("path");
const db = require("../models");
const { verifyToken } = require("../middlewares/verifyToken");
const async = require("async");
var Feed = db.feed;
var User = db.user;
var Friend = db.friends;
var Notification = db.notification;
var Chat = db.Chat;

const moment = require("moment");

const axios = require("axios").default;
router.get("/", [verifyToken], async function (req, res) {
  //console.log(Object.keys(req.query).length);
  const loggedInUser = await User.findById(req.userId);
  if (req.query && Object.keys(req.query).length > 0) {
    var query,
      locationQuery = {};
    if (req.query.gender !== "all" && req.query.vaccinated !== "both") {
      var vaccinated;
      if (req.query.vaccinated == "vaccinated") {
        vaccinated = true;
      }
      if (req.query.vaccinated == "non-vaccinated") {
        vaccinated = false;
      }
      query = {
        $and: [{ gender: req.query.gender }, { vaccinated: vaccinated }],
      };
    } else if (req.query.gender == "all" && req.query.vaccinated !== "both") {
      var vaccinated;
      if (req.query.vaccinated == "vaccinated") {
        vaccinated = true;
      }
      if (req.query.vaccinated == "non-vaccinated") {
        vaccinated = false;
      }
      query = { vaccinated: req.vaccinated };
    } else if (req.query.gender !== "all" && req.query.vaccinated == "both") {
      query = { gender: req.query.gender };
    }

    if (req.query.location && req.query.latitude && req.query.longitude) {
      locationQuery = {
        $and: [
          {
            $or: [
              { title: new RegExp(req.query.location, "i") },
              {
                $and: [
                  { latitude: parseFloat(req.query.latitude) },
                  { longitude: parseFloat(req.query.longitude) },
                ],
              },
            ],
          },
        ],
      };
    } else if (req.query.location) {
      locationQuery = { title: new RegExp(req.query.location, "i") };
    } else if (req.query.latitude && req.query.longitude) {
      locationQuery = {
        $and: [
          { latitude: parseFloat(req.query.latitude) },
          { longitude: parseFloat(req.query.longitude) },
        ],
      };
    }

    User.find(query)
      .where({ _id: { $ne: req.userId } })
      .select(
        "_id firstName lastName username gender profile_picture date_of_birth gym vaccinated  weight typeWeight height typeHeight"
      )
      .populate({
        path: "gym",
        match: locationQuery,
      })
      .exec(function (err, usersData) {
        if (err) {
          console.log(err);
          res
            .status(500)
            .json({ status: false, message: "Something went wrong." });
        } else {
          const users = usersData.filter((user) => user.gym.length > 0);

          if (users && users.length > 0) {
            let matched = [];
            let i = 0;
            let ageLength = users.length;
            let iLast = users.length - 1;
            for (; i < ageLength; i++) {
              (function (i) {
                var age = getAge(users[i].date_of_birth);
                if (
                  age >= req.query["age_start"] &&
                  age <= req.query["age_end"]
                ) {
                  matched.push(users[i]);
                  if (i == iLast) {
                    excludeBlocklist(matched, async function (e, arr) {
                      if (e) {
                        console.log(e);
                      } else {
                        let uniqueArray = [];
                        let gymUsers = [];
                        let idMap = {};

                        arr.forEach((obj) => {
                          if (!idMap[obj._id]) {
                            idMap[obj._id] = true;
                            uniqueArray.push(obj);
                          }
                        });
                        console.log("1");

                        if (loggedInUser.gym.length > 0) {
                          gymUsers = await getUsersByGymTypeAndLocation(
                            req.userId
                          );

                          if (gymUsers && gymUsers.length > 0) {
                            const commonData = uniqueArray.filter((obj1) =>
                              gymUsers.some(
                                (obj2) =>
                                  obj2._id.toString() === obj1._id.toString()
                              )
                            );
                            return res.json({ status: true, data: commonData });
                          }
                        }

                        res.json({ status: true, data: uniqueArray });
                      }
                    });
                  }
                } else if (i == iLast) {
                  excludeBlocklist(matched, async function (e, arr) {
                    if (e) {
                      console.log(e);
                    } else {
                      let uniqueArray = [];
                      let idMap = {};

                      arr.forEach((obj) => {
                        if (!idMap[obj._id]) {
                          idMap[obj._id] = true;
                          uniqueArray.push(obj);
                        }
                      });
                      console.log("2");

                      if (loggedInUser.gym.length > 0) {
                        gymUsers = await getUsersByGymTypeAndLocation(
                          req.userId
                        );

                        if (gymUsers.length > 0) {
                          const commonData = gymUsers.filter((obj1) =>
                            uniqueArray.some(
                              (obj2) =>
                                obj2._id.toString() === obj1._id.toString()
                            )
                          );
                          return res.json({ status: true, data: commonData });
                        }
                      }

                      res.json({ status: true, data: uniqueArray });
                    }
                  });
                }
              })(i);
            }
          } else {
            res.json({ status: true, data: [] });
          }
        }
      });
  } else {
    if (loggedInUser.gym.length > 0) {
      let usersData = await getUsersByGymTypeAndLocation(req.userId);
      res.json({ status: true, data: usersData });
    } else {
      async.waterfall(
        [userPrefs, gymMatch, ageMatch, mergeMatch, excludeBlocklist],
        finalCallback
      );
    }
  }

  // Function to fetch users based on gym type and location
  async function getUsersByGymTypeAndLocation(loggedInUserId) {
    try {
      // Fetch the logged-in user's gym information
      const loggedInUser = await User.findById(loggedInUserId)
        .populate("gym")
        .select(
          "_id firstName lastName username gender profile_picture date_of_birth gym vaccinated  weight typeWeight height typeHeight"
        );
      if (!loggedInUser || !loggedInUser.gym) {
        throw new Error("User does not belong to a gym.");
      }
      //console.log('loggedInUser', loggedInUser);

      const { _id, type, latitude, longitude } = loggedInUser.gym[0];

      //console.log('data', _id, type, latitude, longitude);
      if (type === 0) {
        // If gym type is 0, return all users of that gym
        const users = await User.find({
          gym: { $in: [_id] },
          _id: { $ne: loggedInUser._id },
        })
          .populate("gym")
          .select(
            "_id firstName lastName username gender profile_picture date_of_birth gym vaccinated  weight typeWeight height typeHeight"
          );

        return users;
      } else if (type === 1) {
        const radius = 700000; // 8km

        const users = await User.find({})
          .populate("gym")
          .select(
            "_id firstName lastName username gender profile_picture date_of_birth gym vaccinated  weight typeWeight height typeHeight"
          );
        const finalUsers = [];
        for (let user of users) {
          //console.log("user.gym.length", user.gym.length);

          if (user.gym.length > 0) {
            let userGym = user.gym[0];
            let checkDistance = isWithinRadius(
              userGym.latitude,
              userGym.longitude,
              latitude,
              longitude,
              radius
            );
            //console.log("checkDistance", checkDistance);
            if (checkDistance) {
              finalUsers.push(user);
            }
          }
        }

        return finalUsers;
      }
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch users by gym type and location.");
    }
  }

  function isWithinRadius(
    userLatitude,
    userLongitude,
    gymLatitude,
    gymLongitude,
    radius
  ) {
    const earthRadius = 2 * 6371; // Radius of the Earth in kilometers

    // Convert degrees to radians
    const userLatRadians = toRadians(userLatitude);
    const userLngRadians = toRadians(userLongitude);
    const gymLatRadians = toRadians(gymLatitude);
    const gymLngRadians = toRadians(gymLongitude);

    // Calculate the differences in latitude and longitude
    const latDiff = gymLatRadians - userLatRadians;
    const lngDiff = gymLngRadians - userLngRadians;

    // Calculate the central angle between the two coordinates
    const centralAngle =
      2 *
      Math.asin(
        Math.sqrt(
          Math.sin(latDiff / 2) ** 2 +
            Math.cos(userLatRadians) *
              Math.cos(gymLatRadians) *
              Math.sin(lngDiff / 2) ** 2
        )
      );

    // Calculate the distance using the central angle and Earth's radius
    const distance = earthRadius * centralAngle;

    // Check if the distance is within the specified radius
    return distance <= radius;
  }

  // Helper function to convert degrees to radians
  function toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  function userPrefs(cb) {
    User.findOne({ _id: req.userId }, "gym age_start age_end")
      .populate("gym")
      .exec(function (err, user) {
        if (err) {
          cb(err, null);
        } else {
          if (
            (!user.gym || (user.gym && user.gym.length == 0)) &&
            !user.age_start &&
            !user.age_end
          ) {
            finalCallback(null, {
              message: "Please set your preferences before finding a match.",
            });
          } else {
            cb(null, user);
          }
        }
      });
  }

  function gymMatch(prefs, cb) {
    let matchedGym = [];
    if (prefs.gym && prefs.gym.length > 0) {
      var i = 0;
      const iMax = prefs.gym.length;
      const iLast = prefs.gym.length - 1;
      for (; i < iMax; i++) {
        (function (i) {
          User.find({ $and: [{ gym: prefs.gym[i]._id }, { type: 0 }] })
            .select(
              "_id firstName lastName username gender profile_picture date_of_birth gym vaccinated  weight typeWeight height typeHeight"
            )
            .where({ _id: { $ne: req.userId } })
            .populate("gym")
            .exec(function (err, gyms) {
              if (err) {
                cb(err, null);
              } else {
                if (gyms && gyms.length > 0) {
                  matchedGym.push(...gyms);
                  if (i == iLast) {
                    cb(null, prefs, matchedGym);
                  }
                } else {
                  if (i == iLast) {
                    cb(null, prefs, []);
                  }
                }
              }
            });
        })(i);
      }
    } else {
      cb(null, prefs, []);
    }
  }

  function ageMatch(prefs, gyms, cb) {
    if (prefs["age_start"] && prefs["age_end"]) {
      User.find({ date_of_birth: { $ne: null } })
        .where({ _id: { $ne: req.userId } })
        .select(
          "_id firstName lastName username gender profile_picture date_of_birth gym vaccinated  weight typeWeight height typeHeight"
        )
        .populate("gym")
        .exec(function (err, users) {
          if (err) {
            //console.log(err);
            cb(err, null);
          } else {
            let matched = [];
            if (users) {
              let i = 0;
              let ageLength = users.length;
              let iLast = users.length - 1;
              for (; i < ageLength; i++) {
                (function (i) {
                  var age = getAge(users[i].date_of_birth);
                  //console.log(age);
                  if (age >= prefs["age_start"] && age <= prefs["age_end"]) {
                    //let tVal = users[i].toObject();
                    matched.push(users[i]);
                    if (i == iLast) {
                      console.log("endloop1");
                      cb(null, gyms, matched);
                    }
                  } else if (i == iLast) {
                    console.log("endloop0");
                    cb(null, gyms, matched);
                  }
                })(i);
              }
            } else {
              cb(null, gyms, []);
            }
          }
        });
    } else {
      cb(null, gyms, []);
    }
  }

  function mergeMatch(gyms, age, cb) {
    var arr1 = gyms;
    var arr2 = age;
    var union = arr1.concat(arr2);
    //res.json(arr2)
    for (var i = 0; i < union.length; i++) {
      for (var j = i + 1; j < union.length; j++) {
        if (areEqual(union[i], union[j])) {
          union.splice(j, 1);
          j--;
        }
      }
    }

    function areEqual(g1, g2) {
      return g1._id == g2._id;
    }

    cb(null, union);
  }

  function excludeFriends(matched, cb) {
    Friend.find(
      {
        $or: [{ user1: req.userId }, { user2: req.userId }],
      },
      "user1 user2 status"
    )
      .where({
        $or: [{ status: "accepted" }, { status: "pending" }],
      })
      .exec(function (err, fr) {
        if (err) {
          cb(err, null);
        } else {
          if (fr && fr.length > 0) {
            var filtered = matched.filter(function (e) {
              return !fr.find(function (el) {
                return el.user1.equals(e._id) || el.user2.equals(e._id);
              });
            });
            //console.log(filtered);
            cb(null, filtered);
          } else {
            cb(null, matched);
          }
        }
      });
  }

  function excludeBlocklist(matched, cb) {
    User.findOne({ _id: req.userId }, "blocklist").exec(function (e, list) {
      if (e) {
        console.log(e);
      } else {
        if (list.blocklist && list.blocklist.length > 0) {
          var filtered = matched.filter(
            (obj) => !list.blocklist.includes(obj._id)
          );
          cb(null, filtered);
        } else {
          cb(null, matched);
        }
        /*User.find({_id:{ $nin: list.blocklist }})
                .exec(function(err, fr) {
                if (err) {
                    cb(err, null)
                } else {
                    console.log(fr)
                    if (fr && fr.length > 0) {
                        var filtered = matched.filter(function(e) {
                            return fr.find(function(el) {
                                return !el._id.equals(e._id)
                            })
                        })
                        //console.log(filtered);
                        cb(null, filtered);
                    } else {
                        cb(null, matched);
                    }
                }
            });*/
      }
    });
  }

  function finalCallback(err, result) {
    if (err) {
      res.status(500).json({ status: false, message: err });
    } else {
      if (result.message) {
        res.status(200).json({ status: true, message: result.message });
      } else {
        /*for (let i = 0; i < result.length; i++) {
                    Feed.find({ user: result._id }, 'image')
                        .where({
                            $and: [
                                { "image": { $nin: ["", null] } },
                                { "privacy": 'Public' }
                            ]
                        })
                        .exec(function(e, p) {
                            if (e) {
                                error = error.push(e);
                            } else {
                                if(p&&p.length>0&&!result[i].imageList){
                                    result[i]=result[i].toObject();
                                    result[i]['imageList']=p;

                                }
                                if(i==result.length-1){
                                        res.status(200).json({ status: true, data: result });
                                    }
                            }
                        })
                }*/

        res.status(200).json({ status: true, data: result });
      }
    }
  }
});

router.get("/friend/search", [verifyToken], function (req, res) {
  const searchName = req.query.searchName;

  User.find({
    _id: { $ne: req.userId },
    $and: [
      {
        $or: [
          { username: { $regex: searchName } },
          { firstName: { $regex: searchName } },
          { lastName: { $regex: searchName } },
        ],
      },
      {
        $or: [
          { followers: { $in: [req.userId] } },
          { followings: { $in: [req.userId] } },
        ],
      },
    ],
  })
    .select("_id firstName lastName username profile_picture")
    .exec(function (err, users) {
      if (err) {
        res.status(200).json({ status: false, message: err });
      } else {
        res.status(200).send({
          status: true,
          message: "Search done successfully",
          data: users,
        });
        //   let usersIds = [];
        //   users.forEach((user) => {
        //     if (user._id !== req.userId) {
        //       usersIds.push(user._id);
        //     }
        //   });

        //   User.find({
        //     $or: [
        //       { $and: [{ user1: { $in: usersIds } }, { user2: req.userId }] },
        //       { $and: [{ user2: { $in: usersIds } }, { user1: req.userId }] },
        //     ],
        //     // status: "accepted",
        //   })
        //     .populate("user1", "_id firstName lastName username profile_picture")
        //     .populate("user2", "_id firstName lastName username profile_picture")
        //     .exec(function (err, friends) {
        //       if (err) {
        //         res.status(200).send({ status: false, message: err });
        //       } else {
        //         res.status(200).send({
        //           status: true,
        //           message: "Search done successfully",
        //           data: friends,
        //         });
        //       }
        //     });
      }
    });
});

router.get("/friend/:id", [verifyToken], function (req, res) {
  //send friend request
  Friend.findOne({
    $or: [
      { user1: req.userId, user2: req.params.id },
      { user1: req.params.id, user2: req.userId },
    ],
  }).exec(function (err, fr) {
    if (err) {
      res.status(500).json({ status: false, message: err });
    } else {
      if (fr && fr.status == "accepted") {
        res
          .status(200)
          .json({ status: false, message: "Already in Friend list" });
      } else if (fr && fr.status == "pending") {
        res
          .status(200)
          .json({ status: false, message: "Request sent already" });
      } else {
        User.findOne(
          { _id: req.userId },
          "subscription subscriptionExpiry"
        ).exec(function (e, user) {
          if (e) {
            console.log(e);
          } else {
            //console.log("user", user);
            const currentDate = new Date();
            if (
              user &&
              user.subscription === 1 &&
              user.subscriptionExpiry > currentDate.getTime()
            ) {
              var request = {
                user1: req.userId,
                user2: req.params.id,
                status: "pending",
                request_by: req.userId,
              };
              Friend.create(request, function (er, re) {
                if (er) {
                  res.status(500).json({ status: false, message: er });
                } else {
                  sendPushNotification(
                    req.params.id,
                    "Pair Request",
                    " New pair request"
                  );
                  saveNotification(9, req.userId, req.params.id, re["_id"]);
                  res.status(200).json({
                    status: true,
                    message:
                      "Request sent successfully.Please wait for response.",
                  });
                }
              });
            } else {
              // User does not have subscription level 1
              // Check friend request limit
              const todayStart = moment().startOf("day");
              const todayEnd = moment().endOf("day");

              // Count the number of friend requests sent today
              Friend.countDocuments({
                $or: [{ user1: req.userId }],
                createdAt: { $gte: todayStart, $lt: todayEnd }, // Check for requests today
              }).exec(function (err, requestsSentToday) {
                if (err) {
                  res.status(500).json({ status: false, message: err });
                } else if (requestsSentToday >= 5) {
                  // User has reached the friend request limit for the day
                  res.status(200).json({
                    status: false,
                    message: "Friend request limit reached for today.",
                  });
                } else {
                  // User has not reached the limit, allow sending friend request
                  var request = {
                    user1: req.userId,
                    user2: req.params.id,
                    status: "pending",
                    request_by: req.userId,
                  };
                  Friend.create(request, function (er, re) {
                    if (er) {
                      res.status(500).json({ status: false, message: er });
                    } else {
                      sendPushNotification(
                        req.params.id,
                        "Pair Request",
                        " New pair request"
                      );
                      saveNotification(9, req.userId, req.params.id, re["_id"]);
                      res.status(200).json({
                        status: true,
                        message:
                          "Request sent successfully.Please wait for response.",
                      });
                    }
                  });
                }
              });
            }
          }
        });
      }
    }
  });
});
router.get("/respond_request/:id", [verifyToken], function (req, res) {
  Friend.findOne({ _id: req.params.id }).exec(function (err, fr) {
    if (err) {
      res.status(500).json({ status: false, message: err });
    } else {
      if (fr && fr.status !== "pending") {
        //if already responded
        res
          .status(200)
          .json({ status: false, message: "Request already responded" });
      } else if (fr && fr.status == "pending") {
        var st = req.query.status == 1 ? "accepted" : "declined";
        Friend.updateOne({ _id: fr._id }, { status: st }, function (er, req) {
          if (er) {
            res.status(500).json({ status: false, message: er });
          } else {
            var user = req.userId == fr["user1"] ? fr["user2"] : fr["user1"];
            sendPushNotification(
              user,
              "Pair Request Update",
              " Pair Request Responded.",
              st
            );
            res.status(200).json({
              status: true,
              message: "Pair Request responded successfully.",
            });
          }
        });
      } else if (!fr) {
        res
          .status(404)
          .json({ status: false, message: "Request record not found" });
      }
    }
  });
});

router.get(
  "/respond_request/status/:user_id",
  [verifyToken],
  function (req, res) {
    Friend.findOne({
      $or: [
        { user1: req.userId, user2: req.params.user_id },
        { user1: req.params.user_id, user2: req.userId },
      ],
    }).exec(function (err, fr) {
      if (err) {
        res.status(500).json({ status: false, message: err });
      } else {
        if (fr && fr.status === "accepted") {
          Chat.findOne({
            $or: [
              { user1: req.userId, user2: req.params.user_id },
              { user1: req.params.user_id, user2: req.userId },
            ],
          })
            .populate(
              "user1",
              "_id firstName lastName username profile_picture"
            )
            .populate(
              "user2",
              "_id firstName lastName username profile_picture"
            )
            .exec(function (err, chat) {
              if (err) {
                res.status(500).json({ status: false, message: err });
              } else {
                if (chat) {
                  let chatObj = {
                    _id: chat._id,
                    user1: chat.user1,
                    user2: chat.user2,
                    initiated: chat.initiated || false,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                    last_message: chat.last_message || "",
                    unreadCount: 0,
                  };
                  res.status(200).json({
                    status: true,
                    message: "Chat found",
                    data: chatObj,
                  });
                } else {
                  // If no chat found, create a new chat
                  const newChat = new Chat({
                    user1: req.userId,
                    user2: req.params.user_id,
                    initiated: true,
                    last_message: "",
                  });

                  newChat.save(function (err, savedChat) {
                    if (err) {
                      res.status(500).json({ status: false, message: err });
                    } else {
                      // Populate user data for both users in the new chat
                      Chat.populate(
                        savedChat,
                        [
                          {
                            path: "user1",
                            select:
                              "_id firstName lastName username profile_picture",
                          },
                          {
                            path: "user2",
                            select:
                              "_id firstName lastName username profile_picture",
                          },
                        ],
                        function (populateErr, populatedChat) {
                          if (populateErr) {
                            res
                              .status(500)
                              .json({ status: false, message: populateErr });
                          } else {
                            let chatObj = {
                              _id: populatedChat._id,
                              user1: populatedChat.user1,
                              user2: populatedChat.user2,
                              initiated: populatedChat.initiated,
                              createdAt: populatedChat.createdAt,
                              updatedAt: populatedChat.updatedAt,
                              last_message: populatedChat.last_message,
                              unreadCount: 0,
                            };

                            res.status(200).json({
                              status: true,
                              message: "New chat created",
                              data: chatObj,
                            });
                          }
                        }
                      );
                    }
                  });
                }
              }
            });
        } else {
          res
            .status(404)
            .json({ status: false, message: "Request record not found" });
        }
      }
    });
  }
);

router.delete("/request/:id", [verifyToken], function (req, res) {
  Friend.deleteOne({ _id: req.params.id }).exec(function (err, fr) {
    if (err) {
      res.status(500).json({ status: false, message: err });
    } else {
      //console.log(fr);
      res
        .status(200)
        .json({ status: true, message: "Request removed successfully" });
    }
  });
});
router.get("/requests", [verifyToken], function (req, res) {
  async.parallel(
    {
      sent: function (cb) {
        setTimeout(function () {
          Friend.find({
            $or: [{ user1: req.userId }, { user2: req.userId }],
          })
            .where({ status: "pending" })
            .where({ request_by: req.userId })
            .populate("user1")
            .populate("user2")
            .exec(function (err, fr) {
              if (err) {
                cb(err, null);
              } else {
                cb(null, fr);
              }
            });
        }, 200);
      },
      pending: function (cb) {
        setTimeout(function () {
          Friend.find({
            $or: [{ user1: req.userId }, { user2: req.userId }],
          })
            .where({ status: "pending" })
            .where({ request_by: { $ne: req.userId } })
            .populate("user1")
            .populate("user2")
            .exec(function (err, fr) {
              if (err) {
                cb(err, null);
              } else {
                cb(null, fr);
              }
            });
        }, 100);
      },
    },
    function (err, results) {
      if (err) {
        res.status(500).json({ status: false, message: err });
      } else {
        res.status(200).json(results);
      }
    }
  );
});
router.get("/follow/:id", [verifyToken], function (req, res) {
  User.findOne({ _id: req.userId }, "_id followings followers username").exec(
    function (e, user) {
      if (e) {
        res.status(500).json({ status: false, message: e });
      } else {
        //console.log(user);

        if (!user.followings || user.followings.length <= 0) {
          user["followings"] = [req.params.id];
          user.save();
          addFollower(req.params.id, req.userId);
        } else {
          if (user.followings.includes(req.params.id)) {
            //user already follows other user
            console.log("already following");
            user.followings = user.followings.filter(
              (x) => !x.equals(req.params.id)
            );
            user.save();
            //sendPushNotification(req.params.id, "Follow Update", user['username'] + " Unfollows you");
            removeFollowing(req.params.id, req.userId);
          } else {
            user.followings.push(req.params.id);
            user.save();
            //sendPushNotification(req.params.id, "Follow Update", user['username'] + " Follows you");
            addFollower(req.params.id, req.userId);
          }
        }
      }
    }
  );

  function addFollower(id, userId) {
    console.log("add following: ");
    User.findOne({ _id: req.params.id }, "followings followers username").exec(
      function (e, user) {
        if (e) {
          res.status(500).json({ status: false, message: e });
        } else {
          if (!user.followers || user.followers.length <= 0) {
            console.log("1");
            user["followers"] = [userId];
            user.save();
            saveNotification(3, req.userId, req.params.id, "");
            sendPushNotification(
              req.params.id,
              "Follow Update",
              user["username"] + " Follows you"
            );
            res.status(200).json({ status: true });
          } else {
            if (user.followers.includes(userId)) {
              res.status(200).json({ status: true });
            } else {
              console.log("2");
              user.followers.push(userId);
              user.save();
              saveNotification(3, req.userId, req.params.id, "");
              sendPushNotification(
                req.params.id,
                "Follow Update",
                user["username"] + " Follows you"
              );
              res.status(200).json({ status: true });
            }
          }
        }
      }
    );
  }

  function removeFollowing(id, userId) {
    console.log("remove following: ");
    User.findOne({ _id: id }, "followings followers").exec(function (e, user) {
      if (e) {
        res.status(500).json({ status: false, message: e });
      } else {
        if (user.followers || user.followers.includes(userId)) {
          user["followers"] = user.followers.filter((x) => !x.equals(userId));
          user.save();
          res.status(200).json({ status: true });
        }
      }
    });
  }
});
router.get("/like/:id", [verifyToken], function (req, res) {
  User.findOne({ _id: req.userId }, "liked_to disliked_to username").exec(
    function (e, user) {
      if (e) {
        res.status(500).json({ status: false, message: e });
      } else {
        if (!user.liked_to.includes(req.params.id)) {
          //already not liked
          console.log("liked");
          if (user.liked_to && user.liked_to.length > 0) {
            //liked list already
            user.liked_to.push(req.params.id);
            user.rewind = { action: "like", user: req.params.id };
            user.save();
            sendPushNotification(
              req.params.id,
              "Like Update",
              user["username"] + " Likes you"
            );
          } else if (user.liked_to.length <= 0) {
            //no liked list already
            console.log("no already liked");
            user.liked_to = [req.params.id];
            user.rewind = { action: "like", user: req.params.id };
            user.save();
            sendPushNotification(
              req.params.id,
              "Like Update",
              user["username"] + " Likes you"
            );
          }
          if (user.disliked_to.includes(req.params.id)) {
            //if user is in disliked list
            user.disliked_to = user.disliked_to.filter(
              (x) => !x.equals(req.params.id)
            );
            user.save();
          }
          User.findOne(
            { _id: req.params.id },
            "liked_by disliked_by username"
          ).exec(function (err, usr) {
            if (err) {
              res.status(500).json({ status: false, message: e });
            } else {
              if (usr.liked_by && usr.liked_by.length > 0) {
                //liked list already
                console.log("2-liked list already");
                if (!usr.liked_by.includes(req.userId)) {
                  usr.liked_by.push(req.userId);
                  usr.save();
                }
              } else {
                console.log("2-no liked list already");
                usr.liked_by = [req.userId];
                usr.save();
              }
            }
            if (usr.disliked_by.includes(req.userId)) {
              //if user is in disliked list
              usr.disliked_by = usr.disliked_by.filter(
                (x) => !x.equals(req.userId)
              );
              usr.save();
            }
            sendPushNotification(
              req.params.id,
              "Like Update",
              user["username"] + " Likes you"
            );
            return res.status(200).json({ status: true });
          });
        } else {
          //already liked do unlike
          console.log("no action");
          return res.status(200).json({ status: true });
        }
      }
    }
  );
});
router.get("/unlike/:id", [verifyToken], function (req, res) {
  User.findOne({ _id: req.userId }, "liked_to disliked_to username").exec(
    function (e, user) {
      if (e) {
        res.status(500).json({ status: false, message: e });
      } else {
        if (!user.liked_to.includes(req.params.id)) {
          //already not liked
          return res.status(200).json({ status: true });
        } else {
          //already liked do unlike
          console.log("un-liked");
          user.liked_to = user.liked_to.filter((x) => !x.equals(req.params.id));
          user.rewind = { action: "unlike", user: req.params.id };
          user.save();
          User.findOne({ _id: req.params.id }, "liked_by disliked_by").exec(
            function (err, usr) {
              if (err) {
                res.status(500).json({ status: false, message: e });
              } else {
                //unliked
                usr.liked_by = usr.liked_by.filter(
                  (x) => !x.equals(req.userId)
                );
                usr.save();
              }
              return res.status(200).json({ status: true });
            }
          );
        }
      }
    }
  );
});
router.get("/dislike/:id", [verifyToken], function (req, res) {
  User.findOne({ _id: req.userId }, "liked_to disliked_to").exec(function (
    e,
    user
  ) {
    if (e) {
      res.status(500).json({ status: false, message: e });
    } else {
      if (!user.disliked_to.includes(req.params.id)) {
        //already not disliked
        console.log("disliked");
        if (user.disliked_to && user.disliked_to.length > 0) {
          //disliked list already
          user.disliked_to.push(req.params.id);
          user.rewind = { action: "dislike", user: req.params.id };
          user.save();
        } else if (user.disliked_to.length <= 0) {
          //no disliked list already
          user.disliked_to = [req.params.id];
          user.rewind = { action: "dislike", user: req.params.id };
          user.save();
        }
        if (user.liked_to.includes(req.params.id)) {
          //if user is in liked list
          user.liked_to = user.liked_to.filter((x) => !x.equals(req.params.id));
          user.save();
        }
        User.findOne({ _id: req.params.id }, "liked_by disliked_by").exec(
          function (err, usr) {
            if (err) {
              res.status(500).json({ status: false, message: e });
            } else {
              if (usr.disliked_by && usr.disliked_by.length > 0) {
                //disliked list already
                if (!usr.disliked_by.includes(req.userId)) {
                  usr.disliked_by.push(req.userId);
                  usr.save();
                }
              } else {
                usr.disliked_by = [req.userId];
                usr.save();
              }
            }
            if (usr.liked_by.includes(req.userId)) {
              //if user is in liked list
              usr.liked_by = usr.liked_by.filter((x) => !x.equals(req.userId));
              usr.save();
            }
            return res.status(200).json({ status: true });
          }
        );
      } else {
        //un dislike user
        return res.status(200).json({ status: true });
      }
    }
  });
});
router.get("/undislike/:id", [verifyToken], function (req, res) {
  User.findOne({ _id: req.userId }, "liked_to disliked_to").exec(function (
    e,
    user
  ) {
    if (e) {
      res.status(500).json({ status: false, message: e });
    } else {
      if (!user.disliked_to.includes(req.params.id)) {
        //already not disliked

        return res.status(200).json({ status: true });
      } else {
        //un dislike user
        user.disliked_to = user.disliked_to.filter(
          (x) => !x.equals(req.params.id)
        );
        user.rewind = { action: "undislike", user: req.params.id };
        user.save();
        User.findOne({ _id: req.params.id }, "liked_by disliked_by").exec(
          function (err, usr) {
            if (err) {
              res.status(500).json({ status: false, message: e });
            } else {
              //undisliked
              usr.disliked_by = usr.disliked_by.filter(
                (x) => !x.equals(req.userId)
              );
              usr.save();
            }
            return res.status(200).json({ status: true });
          }
        );
      }
    }
  });
});
router.get("/rewind", [verifyToken], function (req, res) {
  var dt = new Date();
  var ndt = addMonths(dt, 1);
  ndt.setHours(ndt.getHours());
  User.findOne({ _id: req.userId }).exec(function (e, user) {
    if (e) {
      res.status(500).json({ status: false, message: e });
    } else {
      /*if (user.rewind_at && user.rewind_at > dt.getHours()) {
                    return res.status(400).json({ status: false, message: "Sorry you have used up your rewinds for the month." });
                } else {*/
      //rewind function
      if (!user.rewind || !user.rewind.action) {
        return res
          .status(400)
          .json({ status: false, message: "Nothing to rewind." });
      } else {
        var user2 = user.rewind.user;
        if (user.rewind.action == "unlike") {
          console.log("liked");
          if (user.liked_to && user.liked_to.length > 0) {
            //liked list already
            user.liked_to.push(user2);
            user.rewind = {};
            user.rewind_at = ndt;
            user.save();
          } else if (user.liked_to.length <= 0) {
            //no liked list already
            user.liked_to = [user2];
            user.rewind = {};
            user.rewind_at = ndt;
            user.save();
          }
          if (user.disliked_to.includes(user2)) {
            //if user is in disliked list
            user.disliked_to = user.disliked_to.filter((x) => !x.equals(user2));
            user.save();
          }
          User.findOne({ _id: user2 }, "liked_by disliked_by").exec(function (
            err,
            usr
          ) {
            if (err) {
              res.status(500).json({ status: false, message: e });
            } else {
              if (usr.liked_by && usr.liked_by.length > 0) {
                //liked list already
                if (!usr.liked_by.includes(req.userId)) {
                  usr.liked_by.push(req.userId);
                  usr.save();
                }
              } else {
                usr.liked_by = [req.userId];
                usr.save();
              }
            }
            if (usr.disliked_by.includes(req.userId)) {
              //if user is in disliked list
              usr.disliked_by = usr.disliked_by.filter(
                (x) => !x.equals(req.userId)
              );
              usr.save();
            }
            return res.status(200).json({ status: true });
          });
        } else if (user.rewind.action == "like") {
          user.liked_to = user.liked_to.filter((x) => !x.equals(user2));
          user.rewind = {};
          user.rewind_at = ndt;
          user.save();
          User.findOne({ _id: user2 }, "liked_by disliked_by").exec(function (
            err,
            usr
          ) {
            if (err) {
              res.status(500).json({ status: false, message: e });
            } else {
              //unliked
              usr.liked_by = usr.liked_by.filter((x) => !x.equals(req.userId));
              usr.save();
            }
            return res.status(200).json({ status: true });
          });
        } else if (user.rewind.action == "undislike") {
          if (user.disliked_to && user.disliked_to.length > 0) {
            //disliked list already
            user.disliked_to.push(user2);
            user.rewind = {};
            user.rewind_at = ndt;
            user.save();
          } else if (user.disliked_to.length <= 0) {
            //no disliked list already
            user.disliked_to = [user2];
            user.rewind = {};
            user.rewind_at = ndt;
            user.save();
          }
          if (user.liked_to.includes(user2)) {
            //if user is in liked list
            user.liked_to = user.liked_to.filter((x) => !x.equals(user2));
            user.save();
          }
          User.findOne({ _id: user2 }, "liked_by disliked_by").exec(function (
            err,
            usr
          ) {
            if (err) {
              res.status(500).json({ status: false, message: e });
            } else {
              if (usr.disliked_by && usr.disliked_by.length > 0) {
                //disliked list already
                if (!usr.disliked_by.includes(req.userId)) {
                  usr.disliked_by.push(req.userId);
                  usr.save();
                }
              } else {
                usr.disliked_by = [req.userId];
                usr.save();
              }
            }
            if (usr.liked_by.includes(req.userId)) {
              //if user is in liked list
              usr.liked_by = usr.liked_by.filter((x) => !x.equals(req.userId));
              usr.save();
            }
            return res.status(200).json({ status: true });
          });
        } else if (user.rewind.action == "dislike") {
          user.disliked_to = user.disliked_to.filter((x) => !x.equals(user2));
          user.rewind = {};
          user.rewind_at = ndt;
          user.save();
          User.findOne({ _id: user2 }, "liked_by disliked_by").exec(function (
            err,
            usr
          ) {
            if (err) {
              res.status(500).json({ status: false, message: e });
            } else {
              //undisliked
              usr.disliked_by = usr.disliked_by.filter(
                (x) => !x.equals(req.userId)
              );
              usr.save();
            }
            return res.status(200).json({ status: true });
          });
        }
        // }
      }
    }
  });
});
router.get("/block/:id", [verifyToken], function (req, res) {
  User.findOne({ _id: req.userId }).exec(function (err, user) {
    if (err) {
      console.log(err);
    } else {
      //remove from following,liked_to
      //add to blocklist
      if (user.blocklist && user.blocklist.length > 0) {
        user.blocklist.includes(req.params.id)
          ? user.blocklist
          : user.blocklist.push(req.params.id);
        user.followings =
          user.followings && user.followings.length > 0
            ? user.followings.filter((n) => !n.equals(req.params.id))
            : user.followings;
        //console.log(user.followers.filter(n => !n.equals(req.params.id)));
        user.followers =
          user.followers && user.followers.length > 0
            ? user.followers.filter((n) => !n.equals(req.params.id))
            : user.followers;
        user.save();
        res
          .status(200)
          .json({ status: true, message: "User is added in blocklist." });
      } else {
        user.blocklist = [req.params.id];
        user.followings =
          user.followings && user.followings.length > 0
            ? user.followings.filter((n) => !n.equals(req.params.id))
            : user.followings;
        user.followers =
          user.followers && user.followers.length > 0
            ? user.followers.filter((n) => !n.equals(req.params.id))
            : user.followers;
        user.save();
        res
          .status(200)
          .json({ status: true, message: "User is added in blocklist." });
      }
    }
  });
});

router.get("/blocklist", [verifyToken], function (req, res) {
  User.findOne({ _id: req.userId }).exec(function (err, user) {
    if (err) {
      console.log(err);
      res.status(500).json({ status: false, message: "Internal Server Error" });
    } else {
      const blocklist = user.blocklist || [];

      User.find(
        { _id: { $in: blocklist } },
        "_id username firstName lastName email profile_picture"
      ).exec(function (err, blockedUsers) {
        if (err) {
          console.log(err);
          res
            .status(500)
            .json({ status: false, message: "Internal Server Error" });
        } else {
          res.status(200).json({ status: true, blockedUsers });
        }
      });
    }
  });
});

router.get("/block-report/:id", [verifyToken], function (req, res) {
  User.findOne({ _id: req.userId }).exec(function (err, user) {
    if (err) {
      console.log(err);
      res.status(500).json({ status: false, message: "Internal Server Error" });
    } else {
      // Block user
      if (user.blocklist && user.blocklist.length > 0) {
        user.blocklist.includes(req.params.id)
          ? user.blocklist
          : user.blocklist.push(req.params.id);
      } else {
        user.blocklist = [req.params.id];
      }

      // Remove from following and followers
      user.followings =
        user.followings && user.followings.length > 0
          ? user.followings.filter((n) => !n.equals(req.params.id))
          : user.followings;
      user.followers =
        user.followers && user.followers.length > 0
          ? user.followers.filter((n) => !n.equals(req.params.id))
          : user.followers;

      // Report user
      if (!user.reportedUsers.includes(req.params.id)) {
        user.reportedUsers.push(req.params.id);
      }
      user.save(function (saveErr) {
        if (saveErr) {
          console.log(saveErr);
          res
            .status(500)
            .json({ status: false, message: "Error saving user changes" });
        } else {
          // Respond with success message
          res
            .status(200)
            .json({ status: true, message: "User blocked and reported." });
        }
      });
    }
  });
});

router.get("/unblock/:id", [verifyToken], function (req, res) {
  User.findOne({ _id: req.userId }).exec(function (err, user) {
    if (err) {
      console.log(err);
    } else {
      //remove blocklist
      if (user.blocklist && user.blocklist.length > 0) {
        if (user.blocklist.includes(req.params.id)) {
          user.blocklist.filter((id) => id !== req.params.id);
          user.save();
        }
        res.status(200).json({ status: true, message: "User is unblocked." });
      } else {
        res.status(200).json({ status: true, message: "User is unblocked." });
      }
    }
  });
});

module.exports = router;

function getAge(dateString) {
  var today = new Date();
  var birthDate = new Date(dateString);
  var age = today.getFullYear() - birthDate.getFullYear();
  var m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(year, month) {
  return [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month];
}

function addMonths(date, value) {
  var d = new Date(date),
    n = date.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + value);
  d.setDate(Math.min(n, getDaysInMonth(d.getFullYear(), d.getMonth())));
  return d;
}

function sendPushNotification(id, title, message, responseStatus) {
  User.findOne({ _id: id })
    .select("notificationToken")
    .exec(function (err, dev) {
      if (err) {
        res.status(500).json({ message: err });
      } else {
        const filteredArray = dev.notificationToken.filter((str) => str !== "");

        // const options = {
        //   method: "POST",
        //   url: config.OSUrl + "/notifications",
        //   headers: {
        //     accept: "application/json",
        //     "Content-Type": "application/json",
        //   },
        //   data: {
        //     app_id: config.appID,
        //     include_player_ids: filteredArray,
        //     contents: { en: message },
        //     headings: { en: title },
        //   },
        // };

        const notificationData = {
          app_id: config.appID,
          include_player_ids: filteredArray,
          contents: { en: message },
          headings: { en: title },
        };

        // Include the responseStatus key only if provided
        if (responseStatus) {
          notificationData.data = { status: responseStatus };
        }

        const options = {
          method: "POST",
          url: config.OSUrl + "/notifications",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          data: notificationData,
        };
        axios
          .request(options)
          .then(function (response) {
            console.log("no response");
          })
          .catch(function (error) {
            console.log("error here");
          });
      }
    });
}

function flatten(input) {
  const stack = [...input];
  const res = [];
  while (stack.length) {
    const next = stack.pop();
    if (Array.isArray(next)) {
      stack.push(...next);
    } else {
      res.push(next);
    }
  }
  return res.reverse();
}

var saveNotification = function (type, sender, receiver, requestId) {
  User.findOne({ _id: sender }, "username firstName lastName").exec(function (
    e,
    u
  ) {
    if (e) {
      console.log(e);
    } else {
      if (type == 9) {
        var not = new Notification({
          type: 9,
          user: sender,
          receiver: receiver,
          requestId: requestId,
          content: "sent you a pair request.",
          is_accepted: false,
        });
        not.save();
      } else if (type == 3) {
        var not = new Notification({
          type: 3,
          user: sender,
          receiver: receiver,
          content: " follows you.",
          is_accepted: false,
        });
        not.save();
      }
    }
  });
};
