var express = require('express')
var router = express.Router()
const config = require("../config");
const db = require("../models");
var bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
var crypto = require("crypto");

const { verifyToken, isAdmin } = require('../middlewares/verifyToken');
var Support = db.support;
var id = crypto.randomBytes(20).toString('hex');

router.post("/", (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            subject,
            message
        } = req.body;
        if (!(first_name, last_name, email,
                subject, message)) {
            res.status(400).json("Please Input All Fields");
        } else {
            const requestid = crypto.randomBytes(3).toString('hex');
            Support.create({
                first_name,
                last_name,
                email: email.toLowerCase(),
                subject,
                message,
                status: 'pending',
                requestid,

            }, function(err, sup) {
                if (err) {
                    console.log(err);
                } else {
                    res.json({ message: "Your Query is successfully submitted. Request ID is :" + requestid });
                }
            });

        }

    } catch (err) {
        console.log(err);
    }

});
router.get('/',(req,res)=>{
  try {
        const {
            first_name,
            last_name,
            email,
            subject,
            message
        } = req.query;
        if (!(first_name, last_name, email,
                subject, message)) {
            res.status(400).json("Please Input All Fields");
        } else {
            const requestid = crypto.randomBytes(3).toString('hex');
            Support.create({
                first_name,
                last_name,
                email: email.toLowerCase(),
                subject,
                message,
                status: 'pending',
                requestid,

            }, function(err, sup) {
                if (err) {
                    console.log(err);
                } else {
                    res.json({ message: "Your Query is successfully submitted. Request ID is :" + requestid });
                }
            });

        }

    } catch (err) {
        console.log(err);
    }

})


module.exports = router;