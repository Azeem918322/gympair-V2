const db = require("../models");
const User = db.user;
const jwt=require('jsonwebtoken');
const {secret} = require('../config');
const { validate, ValidationError, Joi } = require('express-validation');
var multer=require('multer');
const mime = require('mime');
verifySignUp = (req, res, next) => {
    // Email
    if(req.body.email&&req.body.username&&req.body.password){
    User.findOne({email: req.body.email})
    .exec((err, user) => {
      if (err) {
        res.status(500).json({ status:false,code:500,message: err });
        return;
      }

      if (user) {
        res.status(500).json({status:false,code:409, message: "Failed! Email is already in use!" });
        return;
      }else{
          User.findOne({phoneNumber: req.body.phoneNumber})
            .exec((err1, user1) => {
              if (err1) {
                res.status(500).json({ status:false,code:500,message: err });
                return;
              }
              if (user1) {
                res.status(500).json({status:false,code:409, message: "Failed! phone Number is already in registered!" });
                return;
              }else{
                  User.findOne({username: req.body.username})
                      .exec((err2, user2) => {
                        if (err2) {
                          res.status(500).json({ status:false,code:500,message: err });
                          return;
                        }

                        if (user2) {
                          res.status(500).json({status:false,code:409, message: "Failed! Username is already in use!" });
                          return;
                        }
                        next();
                    });  
                }
            });  
          }
    });
    }else{
      res.status(500).json({ status:false,code:500,message: "Incomplete Input data.please provide email,password and username" });
    
    return;
    }  
};


module.exports = {verifySignUp};