var express = require('express')
var router = express.Router()
const config = require("../config");
const db = require("../models");
const Joi = require('joi');
const Calculator = db.calculator;
var User = db.user;

router.post('/', [verifyToken], function(req, res) {
    //var date = new Date(req.body.time);
    //console.log(date);
    //date = date.getFullYear() + "/" + JSON.parse(date.getMonth()+1)  + "/" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes();

    if (req.body.type == 'Calorie') {
        var schema = Joi.object().keys({
            type: Joi.string().required(),
            weight: Joi.number().required(),
            weightUnit: Joi.string().empty(''),
            height: Joi.number().required(),
            heightUnit: Joi.string().empty(''),
            age: Joi.number().required(),
            workout: Joi.number().required(),
            //time: Joi.string().required(),
            result: Joi.number().required(),
            BMR: Joi.number().required(),
            BMI: Joi.number().required(),
            cal: Joi.number().required(),
            comments: Joi.string().empty('')

        });
        const result = schema.validate(req.body);
        const { value, error } = result;
        const valid = error == null;
        if (!valid) {
            res.status(422).json({
                status: false,
                message: 'Invalid or Missing fields.',
                error_details: error['details']
            })
        } else {
            var cal = new Calculator({
                user: req.userId,
                type: req.body.type,
                weight: req.body.weight,
                height: req.body.height,
                weightUnit: (req.body.weightUnit || req.body.weightUnit !== '') ? req.body.weightUnit : 'kg',
                heightUnit: (req.body.heightUnit || req.body.heightUnit !== '') ? req.body.heightUnit : 'cm',
                age: req.body.age,
                workout: req.body.workout,
                BMR: req.body.BMR,
                BMI: req.body.BMI,
                cal: req.body.cal,
                //time: date,
                result: req.body.result,
                comments: req.body.comments ? req.body.comments : ''
            })
            cal.save(function(err) {
                if (err) {
                    res.status(500).json({ status: true, err: err })
                } else {
                    res.status(200).json({ status: true, message: "Calorie Record saved." });
                }
            });
        }
    } else if (req.body.type == "BMI") {
        var schema = Joi.object().keys({
            type: Joi.string().required(),
            weight: Joi.number().required(),
            height: Joi.number().required(),
            weightUnit: Joi.string().empty(''),
            heightUnit: Joi.string().empty(''),
            // time: Joi.string().required(),
            BMI: Joi.number().empty(''),
            result: Joi.number().required(),
            comments: Joi.string().empty('')

        });
        const result = schema.validate(req.body);
        const { value, error } = result;
        const valid = error == null;
        if (!valid) {
            res.status(422).json({
                status: false,
                message: 'Invalid/missing fields.',
                error_details: error['details']
            })
        } else {
            var cal = new Calculator({
                user: req.userId,
                type: req.body.type,
                weight: req.body.weight,
                height: req.body.height,
                weightUnit: req.body.weightUnit ? req.body.weightUnit : 'kg',
                heightUnit: req.body.heightUnit ? req.body.heightUnit : 'cm',
                //time: date,
                BMI: req.body.BMI,
                result: req.body.result,
                comments: req.body.comments ? req.body.comments : ''
            })
            cal.save(function(err) {
                if (err) {
                    res.status(500).json({ status: true, err: err })
                } else {
                    res.status(200).json({ status: true, message: "BMI Record saved." });
                }
            });
        }

    } else if (req.body.type == "Macro") {
        var schema = Joi.object().keys({
            type: Joi.string().required(),
            weight: Joi.number().required(),
            weightUnit: Joi.string().empty(''),
            heightUnit: Joi.string().empty(''),
            height: Joi.number().required(),
            //time: Joi.string().required(),
            age: Joi.number().required(),
            gender: Joi.number().required(),
            unit: Joi.number().required(),
            goal: Joi.number().required(),
            activity: Joi.number().required(),
            result: Joi.number().required(),
            protein: Joi.number().required(),
            carbs: Joi.number().required(),
            fats: Joi.number().required(),
            comments: Joi.string().empty('')
        });
        const result = schema.validate(req.body);
        const { value, error } = result;
        const valid = error == null;
        if (!valid) {
            res.status(422).json({
                status: false,
                message: 'Invalid/missing fields',
                error_details: error['details']
            })
        } else {
            var cal = new Calculator({
                user: req.userId,
                type: req.body.type,
                weight: req.body.weight,
                height: req.body.height,
                weightUnit: req.body.weightUnit ? req.body.weightUnit : 'kg',
                heightUnit: req.body.heightUnit ? req.body.heightUnit : 'cm',
                //time: date,
                age: req.body.age,
                gender: req.body.gender,
                unit: req.body.unit,
                goal: req.body.goal,
                activity: req.body.activity,
                result: req.body.result,
                protein: req.body.protein,
                carbs: req.body.carbs,
                fats: req.body.fats,
                comments: req.body.comments ? req.body.comments : ''
            })
            cal.save(function(err) {
                if (err) {
                    res.status(500).json({ status: true, err: err })
                } else {
                    res.status(200).json({ status: true, message: "Macro Calculator Record saved." });
                }
            });
        }

    } else if (req.body.type == "ORM") {
        var schema = Joi.object().keys({
            type: Joi.string().required(),
            //time: Joi.string().required(),
            reps: Joi.number().required(),
            lifts: Joi.number().required(),
            unit: Joi.number().required(),
            result: Joi.number().required(),
            comments: Joi.string().empty('')
        });
        const result = schema.validate(req.body);
        const { value, error } = result;
        const valid = error == null;
        if (!valid) {
            res.status(422).json({
                status: false,
                message: 'Invalid/Missing fields',
                error_details: error['details']
            })
        } else {
            var cal = new Calculator({
                user: req.userId,
                type: req.body.type,
                //time: date,
                reps: req.body.reps,
                lifts: req.body.lifts,
                unit: req.body.unit,
                result: req.body.result,
                comments: req.body.comments ? req.body.comments : ''
            })
            cal.save(function(err) {
                if (err) {
                    res.status(500).json({ status: true, err: err })
                } else {
                    res.status(200).json({ status: true, message: "One Rep Max record saved." });
                }
            });
        }
    } else {
        res.json({ status: false, message: "Please specify valid calculator type.['Calorie','BMI','Macro','ORM']" });
    }
});
router.get('/', [verifyToken], function(req, res) {
    User.findOne({ _id: req.userId }).select("subscription subscriptionExpiry").exec(async function (err, user) {
        if (err) {
          res.json({ status: false, message: err });
        } else {
          if (user) {
            console.log("User", user);
            const currentDate = new Date();

            if(user.subscription === 1 && user.subscriptionExpiry > currentDate.getTime()){
                Calculator.find()
                .sort({ createdAt: "desc" })
                .where({ user: req.userId })
                .exec(function(err, cals) {
                    if (err) {
                        res.status(500).json({ status: false, message: "Something went wrong." });
                    } else {
                        res.json({ status: true, data: cals });
                    }
                });
            }else{
                const threeWeeksAgo = new Date();
                threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

                Calculator.find()
                .sort({ createdAt: "desc" })
                .where({ user: req.userId })
                .where("createdAt").gte(threeWeeksAgo)
                .exec(function(err, cals) {
                    if (err) {
                        res.status(500).json({ status: false, message: "Something went wrong." });
                    } else {
                        res.json({ status: true, data: cals });
                    }
                });
            }
          }
        }
    });
})
router.get('/:type', [verifyToken], function(req, res) {
    Calculator.find({ type: req.params.type })
        .sort({ createdAt: "desc" })
        .where({ user: req.userId })
        .exec(function(err, cals) {
            if (err) {
                res.status(500).json({ status: false, message: "Something went wrong." });
            } else {
                if (cals && cals.length > 0) {
                    res.json({ status: true, data: cals });
                } else {
                    res.json({ status: false, message: "No data saved against this calculator type." })
                }
            }
        });
})
router.delete('/:id', [verifyToken], function(req, res) {
    //delete one history item
    Calculator.deleteOne({_id:req.params.id})
        .exec(function(e) {
            if (e) {
                res.status(200).json({ status: false, message: e });
            } else {
                res.status(200).json({ status: true });
            }
        });
})
router.delete('/type/:type', [verifyToken], function(req, res) {
    //delete history of one calculator type
    Calculator.deleteMany({
            $and: [
                { user: req.userId }, { type: req.params.type }
            ]
        })
        .exec(function(e) {
            if (e) {
                res.status(200).json({ status: false, message: e });
            } else {
                res.status(200).json({ status: true });
            }
        });
})


module.exports = router;