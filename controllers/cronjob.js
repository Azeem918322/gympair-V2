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
  currentDate.setHours(0, 0, 0, 0);

  const eligibleUsers = await UserCheckIn.find({
    checkedInAt: { $lt: currentDate },
    notificationSent: { $ne: true },
  });

  for (const user of eligibleUsers) {
    sendCheckInNotification(
      user.userID,
      "Check In Reminder",
      "You can now check in to get a reward."
    );
    await UserCheckIn.updateOne(
      { _id: user._id },
      { $set: { notificationSent: true } }
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
};
