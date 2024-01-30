var express = require("express");
var router = express.Router();
const config = require("../config");
const db = require("../models");
const { verifyToken } = require("../middlewares/verifyToken");
const { gymDateRequestValidator } = require("../middlewares/validations");
const axios = require("axios");
const cheerio = require("cheerio");

const Gym = db.gym;
const Coupon = db.coupon;
const CouponRedeem = db.couponRedeem;

router.post("/", function (req, res) {
  Coupon.create(req.body, function (err, coupon) {
    if (err) {
      res.status(500).json({ status: false, message: err, code: 500 });
    } else {
      res.status(200).json({
        status: true,
        message: "Coupon created successfully",
        data: coupon,
      });
    }
  });
});

router.get("/", function (req, res) {
  const { category, sortBy } = req.query;

  const query = {};
  if (category && category !== "All") {
    query.category = category;
  }

  let sortOptions = {};
  if (sortBy === 'Descending') {
    sortOptions = { createdAt: -1 };
  } else if (sortBy === 'Ascending') {
    sortOptions = { createdAt: 1 };
  }

  Coupon.find(query)
  .sort(sortOptions)
	.exec(function(err,coupons){
		if(err){
			res.status(500).json({status:false , message:err , code:500});
		}else{
			res.status(200).json({
        status: true,
        message: "Coupon listing retrieved successfully",
        data: coupons,
      });
		};
	});
});

router.get("/:couponId", function (req, res) {
  const couponId = req.params.couponId;

  Coupon.findById(couponId, function (err, coupon) {
    if (err) {
      res.status(500).json({ status: false, message: err, code: 500 });
    } else if (!coupon) {
      res
        .status(404)
        .json({ status: false, message: "Coupon not found", code: 404 });
    } else {
      res.status(200).json({
        status: true,
        message: "Coupon details retrieved successfully",
        data: coupon,
      });
    }
  });
});

// Add a new route for updating a coupon
router.put("/:couponId", function (req, res) {
  const couponId = req.params.couponId;
  const updatedCouponData = req.body;

  // Update the coupon
  Coupon.findByIdAndUpdate(couponId, updatedCouponData, { new: true })
    .exec()
    .then((updatedCoupon) => {
      if (!updatedCoupon) {
        res
          .status(404)
          .json({ status: false, message: "Coupon not found", code: 404 });
      } else {
        res.status(200).json({
          status: true,
          message: "Coupon updated successfully",
          data: updatedCoupon,
        });
      }
    })
    .catch((error) => {
      res
        .status(500)
        .json({ status: false, message: error.message, code: 500 });
    });
});

// Existing routes...

router.delete("/:couponId", function (req, res) {
  const couponId = req.params.couponId;

  // Delete the coupon and its related data
  Promise.all([
    Coupon.findByIdAndDelete(couponId).exec(),
    CouponRedeem.deleteMany({ couponId }).exec(),
  ])
    .then(([deletedCoupon, deletedRedeems]) => {
      if (!deletedCoupon) {
        res
          .status(404)
          .json({ status: false, message: "Coupon not found", code: 404 });
      } else {
        res.status(200).json({
          status: true,
          message: "Coupon deleted successfully",
          deletedCoupon,
          deletedRedeems,
        });
      }
    })
    .catch((error) => {
      res
        .status(500)
        .json({ status: false, message: error.message, code: 500 });
    });
});

module.exports = router;
