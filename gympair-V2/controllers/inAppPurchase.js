var express = require("express");
var router = express.Router();
const config = require("../config");
var fs = require("fs");
var path = require("path");
const db = require("../models");
const { verifyToken } = require("../middlewares/verifyToken");
const async = require("async");
const iap = require("in-app-purchase");

var User = db.user;
var Friend = db.friends;
var Chat = db.Chat;
var Message = db.Message;
var GymPair = db.gymPair;

router.post("/verifyPurchase", [verifyToken], async function (req, res) {
  iap.config({
    appleExcludeOldTransactions: true, // if you want to exclude old transaction, set this to true. Default is false
    applePassword: 'bd712b7255084bf18579a332f0b40f3b', 
    googleServiceAccount: {
      clientEmail: config.googleServiceAccountClientEmail,
      privateKey: config.googleServiceAccountPrivateKey.split(String.raw`\n`).join('\n'),
    },
  });

  if(req.body.type == "google"){
    const receipt = {
        "packageName": req.body.packageName,
        "productId": req.body.productId,
        "purchaseToken": req.body.purchaseToken,
        "subscription": true
    };
      
    let result = await iap.setup().then(() => {
        return iap.validate(receipt).then(onVerifySuccess).catch(onVerifyError);
    }).catch(onVerifyError);

    console.log("result", result[0]);


    await User.updateOne({ _id: req.userId }, { subscription: 1, subscriptionExpiry:  result[0].expirationDate});

    res.status(200).json({ status: true, message: "Verify Purchase Status", data: result }).end();  
  }else if(req.body.type == "apple"){
    const receipt = req.body.purchaseToken;
        
    let result = await iap.setup().then(() => {
        return iap.validate(receipt).then(onVerifySuccess).catch(onVerifyError);
    }).catch(onVerifyError);

    console.log("result", result[0]);

    await User.updateOne({ _id: req.userId }, { subscription: 1, subscriptionExpiry:  result[0].expirationDate });

    res.status(200).json({ status: true, message: "Verify Purchase Status", data: result }).end();  
  }

});

function onVerifySuccess(validatedData) {
  const options = {
    ignoreCanceled: true,
    ignoreExpired: false,
  };

  const purchaseData = iap.getPurchaseData(validatedData, options);

  return purchaseData;
}

function onVerifyError(error) {
  console.log("error", error);
  return error;
}

router.get("/restorePurchase", [verifyToken], function (req, res) {});

router.get("/checkProUser", [verifyToken], function (req, res) {
  User.find({ subscription: 1 }, '-longitude -latitude -gym_updated_at -referal_code -password -otp -otp_created_at -email-otp -email_otp_created_at -password_otp -password_otp_created_at')
  .populate('gym')
  .populate('posts', '_id user image video type caption privacy likes comments allowComments allowLikes', null, { sort: { 'updatedAt': -1 } })
  .populate('followers', 'username email firstName lastName profile_picture')
  .populate('followings', 'username email firstName lastName profile_picture')
  .exec(function(err, user) {
      if (err) {
          res.status(500).json({ status: false, message: err });
      } else {
          res.status(200).json({ data: user });
      }
  });
});

module.exports = router;
