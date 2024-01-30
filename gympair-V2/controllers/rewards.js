var express = require('express')
var router = express.Router()
const config = require("../config");
const db = require("../models");
const {verifyToken}=require('../middlewares/verifyToken');
const {redeemValidator}=require('../middlewares/validations');
var User = db.user;
var Rewards = db.rewards;
var UserCheckIn = db.userCheckIn;
var Wallet = db.wallet;
var Workout = db.workout;
const Notification = db.notification;

const TransactionDB = db.transaction;
const moment = require("moment");

const axios = require("axios").default;

// const { nanoid ,customAlphabet}=require('nanoid');

// router.post('/reward', function(req, res) {
//     User.findOne({ $or: [{ username: req.body.username }, { email: req.body.username }] })
//         .exec(function(err, usr) {
//             if (err) {
//                 res.json({ status: false, message: err });
//             } else {
//                 if (!usr || !usr._id) {
//                     res.status(400).json({ status: false, message: "Username isn't registered with us.Please register yourself first." });
//                 } else {
//                     if (usr.count && usr.count <= 3000) {
//                         Rewards.findOne({ user: usr._id })
//                             .exec(function(e, r) {
//                                 if (e) {
//                                     res.status(500).json({ status: false, message: e });
//                                 } else {
//                                     if (r && r._id) {
//                                         res.status(404).json({ status: false, message: "You already have applied for reward." })
//                                     } else {
//                                         if (req.body.selfCollect) {
//                                             var rew = new Rewards({ 
//                                                 user: usr._id, 
//                                                 mask: req.body.mask, 
//                                                 selfCollect: true,
//                                                 status:false,
//                                                 type:'reward',
//                                                 maskCount:1 });
//                                             rew.save();
//                                             res.json({ status: true, message: "Your reward is under review." });
//                                         } else {
//                                             var rew = new Rewards({ user: usr._id, 
//                                                 address: req.body.address, selfCollect: false,status:false,type:'reward',maskCount:1 });
//                                             rew.save();
//                                             res.json({ status: true, message: "Your reward is under review." });
//                                         }
//                                     }
//                                 }
//                             });

//                     } else {
//                         res.status(404).json({ status: false, message: "You are not eligible for this reward." })
//                     }
//                 }
//             }
//         });
// });

// router.get('/code',[verifyToken],function(req,res){
//     User.findOne({_id:req.userId})
//     .exec(function(err,user){
//         if(err){
//             res.json({ status: false, message: err });
//         }else{
//             if(user.generated_code){
//                 res.status(400).json({status:falsa,message:"You have already generated a referal code."});
//             }else{
//                 const nanoid=customAlphabet('123456VHKJLKGYTVOIM',6);//[...Array(6)].reduce(a=>a+p[~~(Math.random()*p.length)],'');
//                 var code=nanoid();
//                 user['generated_code']=code;
//                 user.save();
//                 res.status(200).json({status:true,data:{referal_code:code}})
//             }
//         }
//     });
    
// })

// router.get('/mask',[verifyToken],function(req,res){
//     User.findOne({_id:req.userId},'_id mask')
//     .exec(function(err,user){
//         if(err){
//             res.status(500).json({status:false,message:err});
//         }else{
//             if(user.mask&&user.mask>0){
//                 res.status(200).json({status:true,data:{maskCount:user.mask}})
//             }else{
//                 res.status(404).json({status:false,message:'You have no masks to redeem.'})
//             }
            
//         }
//     });
// })

// router.post('/redeem',[verifyToken,redeemValidator],function(req,res){

//     User.findOne({_id:req.userId},'_id mask')
//     .exec(function(err,user){
//         if(err){
//             res.status(500).json({status:false,message:err});
//         }else{
//             if(user.mask&&user.mask>=req.body.maskCount){
//                 var rew=new Rewards({
//                     type:"referal",
//                     maskCount:req.body.maskCount,
//                     address:req.body.address
//                 })
//                 rew.save();
//                 user.mask=JSON.parse(user['mask'])-JSON.parse(req.body.maskCount);
//                 user.save();
//                 res.status(200).json({status:true,message:"Your mask redeem request is under review.Please wait."})
//             }else{
//                 res.status(404).json({status:false,message:'You have not enough masks to redeem.'})
//             }
            
//         }
//     });
// })

router.get("/checkIn", [verifyToken], function (req, res) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set hours, minutes, seconds, and milliseconds to 0 for today's date

    UserCheckIn.findOne({ user: req.userId, createdAt: { $gte: today }  }).exec(async function (err, checkIn) {
      if (err) {
        res.json({ status: false, message: err });
      } else {
        if (checkIn) {
            // User has checked in for today
            console.log("User has checked in today.");
            res.status(200).json({
                status: true,
                message: "User CheckedIn today.",
              });
          } else {
            // User has not checked in for today
            console.log("User has not checked in today.");
            res.status(200).json({
                status: false,
                message: "User has not Checked In today",
              });
          }
      }
    });
  });


  router.get("/checkInReward", [verifyToken], function (req, res) {
    // Get the current date
    const currentDate = new Date();
    // Set the time to the beginning of the day
    currentDate.setHours(0, 0, 0, 0);
  
    // Check if the user has already checked in
    UserCheckIn.findOne({ userID: req.userId, createdAt: { $gte: currentDate }  }, function (err, existingCheckIn) {
      if (err) {
        res
          .status(500)
          .json({ status: false, message: "Error checking check-in status" });
      } else if (existingCheckIn) {
        // If the user has already checked in, return an error
        res
          .status(400)
          .json({ status: false, message: "User has already checked in for today" });
      } else {
        // User has not checked in yet, proceed with the check-in logic
        Wallet.findOne({ user: req.userId }).exec(async function (err, wallet) {
          if (err) {
            res.status(500).json({ status: false, message: err });
          } else {
            if (wallet) {
              // Create a new check-in entry in the UserCheckInModel
              const newCheckIn = new UserCheckIn({ userID: req.userId });
              newCheckIn.save(function (err) {
                if (err) {
                  console.error("Error saving check-in entry:", err);
                  res.status(500).json({
                    status: false,
                    message: "Failed to save check-in entry",
                  });
                } else {
                  // Continue with the rest of the code (points update, notifications, etc.)
                  wallet["points"] = wallet.points + 1;
                  wallet.save();
  
                  addTransaction(req.userId, "checkInReward", 1, 1, "completed");
                  sendPushNotification(
                    req.userId,
                    "Watched Rewarded Ad",
                    "You Have Received the Points for CheckIn"
                  );
                  saveAdsNotification(7, req.userId);
  
                  res.status(200).json({
                    status: true,
                    message: "Reward for CheckIn is saved",
                  });
                }
              });
            } else {
              console.error("Error saving check-in entry:", err);
              res.status(500).json({
                status: false,
                message: "Failed to save check-in entry",
              });
            }
          }
        });
      }
    });
  });

  var addTransaction = function(user, name, points, type, description, workout = null) {
    var trans = new TransactionDB({
        description: description,
        points: points,
        workout: workout,
        type: type,
        user: user
    });
    trans.save();
    //implement notifictaion here
    return;
  }

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
          content: "Watched Rewarded Ad"
        });
  
        not.save();
      }
    });
  };

  
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
module.exports = router;