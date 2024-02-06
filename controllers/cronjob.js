var express = require("express");
var router = express.Router();
const config = require("../config");
const db = require("../models");
const { verifyToken } = require("../middlewares/verifyToken");
const { redeemValidator } = require("../middlewares/validations");
var User = db.user;
var Rewards = db.rewards;
var UserCheckIn = db.userCheckIn;
var Wallet = db.wallet;
var Workout = db.workout;
const Notification = db.notification;

const TransactionDB = db.transaction;
const moment = require("moment");

const axios = require("axios").default;

async function sendCheckInReminders() {
  // Get the current date
  const currentDate = new Date();
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(currentDate.getHours() - 24);

  const eligibleUsers = await UserCheckIn.find({
    $or: [
      {
        $and: [
          { createdAt: { $lt: twentyFourHoursAgo } },
          { lastPushSentAt: { $exists: false } },
        ],
      }, // User has not checked in within the last 24 hours and has never received a push notification
      { lastPushSentAt: { $lt: twentyFourHoursAgo } }, // Last push notification sent more than 24 hours ago
    ],
  });

  for (const user of eligibleUsers) {
    sendCheckInNotification(
      user.userID,
      "Check In Reminder",
      "You can now check in to get a reward."
    );

    await UserCheckIn.updateOne(
      { _id: user._id },
      { $set: { lastPushSentAt: currentDate } } // Update last push sent time to the current date
    );
  }
}

async function sendRewardsReminders() {
  // Get the current date
  const currentDate = new Date();
  const twentyTweHoursAgo = new Date();
  twentyTweHoursAgo.setHours(currentDate.getHours() - 12);

  const eligibleUsers = await Wallet.find({
    $or: [
      {
        $and: [
          { updatedAt: { $lt: twentyTweHoursAgo } },
          { lastPushSentAt: { $exists: false } },
        ],
      }, // User has not checked in within the last 24 hours and has never received a push notification
      { lastPushSentAt: { $lt: twentyTweHoursAgo } }, // Last push notification sent more than 24 hours ago
    ],
  });

  for (const user of eligibleUsers) {
    sendCheckInNotification(
      user.user,
      "Watched Rewarded Ad",
      "You have to watching Ad for Receiving the points."
    );

    await Wallet.updateOne(
      { _id: user._id },
      { $set: { lastPushSentAt: currentDate } } // Update last push sent time to the current date
    );
  }
}

function sendCheckInNotification(id, title, message) {
  User.findOne({ _id: id })
    .select("notificationToken")
    .exec(function (err, dev) {
      if (err) {
        console.error("Error finding user:", err);
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

          axios
            .request(options)
            .then(function (response) {
              console.log("Notification sent:", response.data);
            })
            .catch(function (error) {
              console.error("Error sending notification:", error);
            });
        }
      }
    });
}
module.exports = {
  sendCheckInReminders,
  sendRewardsReminders,
};
