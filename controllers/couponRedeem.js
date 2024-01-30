var express = require("express");
var router = express.Router();
const config = require("../config");
const db = require("../models");
const { verifyToken } = require("../middlewares/verifyToken");
const { gymDateRequestValidator } = require("../middlewares/validations");
const axios = require("axios");
const cheerio = require("cheerio");

const CouponRedeem = db.couponRedeem;
const Coupon = db.coupon;
var User = db.user;
var Wallet = db.wallet;

router.post("/", [verifyToken], function (req, res) {
  const { couponId } = req.body;
  const userId = req.userId;

  // Check if the user has already redeemed the coupon
  CouponRedeem.findOne({ couponId, userId })
    .exec()
    .then((existingRedemption) => {
      if (existingRedemption) {
        // User has already redeemed this coupon
        res.status(400).json({
          status: false,
          message: "Coupon already redeemed by the user",
          code: 400,
        });
      } else {
        // Validate that the coupon and user exist before redeeming
        Promise.all([
          Coupon.findById(couponId).exec(),
          User.findById(userId).exec(),
          Wallet.findOne({ user: userId }).exec(),
        ])
          .then(([coupon, user, userWallet]) => {
            if (!coupon || !user) {
              res.status(404).json({
                status: false,
                message: "Coupon or user not found",
                code: 404,
              });
            } else {
              if (
                userWallet &&
                coupon.points &&
                userWallet.points >= coupon.points
              ) {
                // Create a coupon redeem entry
                const points = coupon.points;

                CouponRedeem.create(
                  { couponId, userId, points },
                  function (err, couponRedeem) {
                    if (err) {
                      res
                        .status(500)
                        .json({ status: false, message: err, code: 500 });
                    } else {
                      res.status(200).json({
                        status: true,
                        message: "Coupon redeemed successfully",
                        data: couponRedeem,
                      });
                    }
                  }
                );
              } else {
                res.status(400).json({
                  status: false,
                  message: "You have not enough points to redeem coupon",
                  code: 400,
                });
              }
            }
          })
          .catch((error) => {
            res
              .status(500)
              .json({ status: false, message: error.message, code: 500 });
          });
      }
    })
    .catch((error) => {
      res
        .status(500)
        .json({ status: false, message: error.message, code: 500 });
    });
});

// Add a new route for listing user's past coupon redemptions with coupon data
router.get("/listing",[verifyToken], function (req, res) {
  const userId = req.userId;

  // Find past coupon redemptions for the user, populate coupon details
  CouponRedeem.find({ userId })
    .populate({
      path: "couponId",
      model: "coupon",
    })
    .exec()
    .then((couponRedemptions) => {
      res.status(200).json({
        status: true,
        message: "User's past coupon redemptions retrieved successfully",
        data: couponRedemptions,
      });
    })
    .catch((error) => {
      res
        .status(500)
        .json({ status: false, message: error.message, code: 500 });
    });
});

// Existing routes...

module.exports = router;
