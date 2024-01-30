var express = require('express')
var router = express.Router()
const config = require("../config");
const db = require("../models");
var bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");

const { verifyToken, isAdmin } = require('../middlewares/verifyToken');
const { Challenge, workout } = require('../middlewares/validations');
var User = db.user;
var Workout_challenge = db.challenge;
var Workout = db.workout;
var Gym = db.gym;
var Notification = db.notification;
const axios = require('axios').default;
const async = require('async');
router.get('/workout_challenge/:id', [verifyToken], function(req, res) { //get one challenge for video demo
    Workout_challenge.findOne({ _id: req.params.id })
        .exec(function(err, wout) {
            if (err) {
                res.json({ error: err });
            } else {
                res.status(200).json({ status: true, challenge: wout });
            }
        });
})

router.get("/gymList", function(req, res) {
    /*User.update({}, {workout: {}},function(e,u){
        if(e){
            console.log(e);
        }else{
            console.log("saved");
        }
    });*/
    /*User.find()
        .select("workout")
        .exec(function(err, users) {
            if (err) {
                console.log(err);
            } else {
                for (var i = 0; i < users.length; i++) {
                    //users[i]=users[i].toObject();
                    delete users[i]._doc.workout;
                    users[i].save();
                    //if (!users[i].workout.days||users[i].workout.days.length==0) {
                       // console.log(users[i].workout)
                                               
                    //}
                }
            }
        });*/

});
router.get('/notifications', [verifyToken], function(req, res) {
    if (req.query.nots && req.query.nots == 0) { //show unread nots
        Notification.find({ receiver: req.userId })
            .where({ is_viewed: false })
            .exec(function(e, n) {
                if (e) {
                    console.log(e);
                } else {
                    if (n && n.length > 0) {
                        res.json({ status: true, data: n.length })
                    } else {
                        res.json({ status: true, data: 0 })
                    }
                }
            })

    } else {
        Notification.find({ receiver: req.userId })
            .populate('user', '_id firstName lastName username gender profile_picture date_of_birth vaccinated  weight typeWeight height typeHeight')
            .populate('post', "_id image caption privacy allowComments allowLikes type video")
            .populate("messageId")
            .populate("workoutId")
            .sort({ createdAt: -1 })
            .exec(function(e, n) {
                if (e) {
                    console.log(e);
                } else {
                    if (n && n.length > 0) {
                        let finalObj = {}
                        n.forEach((games) => {
                            games = games.toObject();
                            let cd = JSON.stringify(games.createdAt);
                            const date = cd.split('T')[0].replace('"', '');
                            //console.log(JSON.parse(date));
                            if (finalObj[date]) {
                                finalObj[date].push(games);
                            } else {
                                finalObj[date] = [games];
                            }
                        })
                        res.json({ status: true, data: finalObj })
                    } else {
                        res.json({ status: true, data: {} })
                    }
                }
            })
    }
})
router.get('/notifications/view/:id', [verifyToken], function(req, res) {
    Notification.updateOne({ _id: req.params.id }, { is_viewed: true })
        .exec(function(err) {
            if (err) {
                res.json({ status: false, error: err })
            } else {
                res.json({ status: true })
            }
        });
})
router.get('/notifications/accept/:id', [verifyToken], function(req, res) {
    Notification.updateOne({ _id: req.params.id }, { is_accepted: true, is_viewed: true })
        .exec(function(err) {
            if (err) {
                res.json({ status: false, error: err })
            } else {
                res.json({ status: true })
            }
        });
})

/*router.post('/subscription/verify', [verifyToken], function(req, res) {
    var googleReceiptVerify = new GoogleReceiptVerify({
        email: ServiceAccount.client_email,
        key: ServiceAccount.private_key
    });
    let response = googleReceiptVerify.verifySub({
        packageName: req.body.packageName,
        productId: req.body.productId,
        purchaseToken: req.body.purchaseToken,
    });

    if (response.isSuccessful === true) {
        User.updateOne({ _id: req.userId }, { purchaseToken: req.body.purchaseToken, subscription: 1, productId: req.body.productId }, function(e, p) {
            if (e) {
                res.json({ status: false, error: e })
            } else {
                res.json({ status: true, message: "Purchase verified." })
            }
        })

    } else {
        User.updateOne({ _id: req.userId }, { subscription: 0 }, function(e, p) {
            if (e) {
                res.json({ status: false, error: e })
            } else {
                res.json({ status: true, message: "Purchase not valid." })
            }
        })
        
    }
})*/
router.get('/maintenance', function(req, res) {
    if (config.maintenance) {
        res.json({ status: true, data: true })
    } else {
        res.json({ status: true, data: false })
    }
})
module.exports = router;