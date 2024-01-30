var express = require('express')
var router = express.Router()
const config = require("../config");
const db = require("../models");

const Package = db.package;
const User = db.user;

router.post('/',function(req,res){
	req.body['created_by']=req.body.created_by?req.body.created_by:"admin"
	Package.create(req.body,function(err,package){
		if(err){
			res.status(500).json({status:false,message:err,code:500});
		}else{
			res.status(200).json(
	        {
	          status:true,
	          message:"Package created successfully",
	          data:package
	        });
		};
	})
});


router.get('/',function(req,res){
	Package.find()
	.exec(function(err,packages){
		if(err){
			res.status(500).json({status:false,message:err,code:500});
		}else{
			res.status(200).json(
        {
			packages:packages
        });
		};
	});
});

router.put('/:id',function(req,res){
	Package.findOneAndUpdate(
		{_id: req.body._id},
		 {$set:req.body},
		 {new:true},
		 function(err,package){
		if(err){
			res.status(500).json({status:false,message:err,code:500});
		}else{
			res.status(200).json(
        {
        		status:true,        		
          		message:"Package Data updated successfully"
        });
		};
	})
})


router.delete('/:id',function(req,res){
	Package.deleteOne(
		{_id: req.params.id},
		 function(err,package){
		if(err){
			res.status(500).json({status:false,message:err,code:500});
		}else{
			res.status(200).json(
        {
        		status:true,        		
          		message:"Package Data Deleted successfully"
        });
		};
	})
})

router.post('/subscribe', [verifyToken] ,  function(req,res){
	User.updateOne({ _id: req.userId }, { subscription: req.body.packageId}, {new:true}, function(err, plan) {
        if (err) {
            res.status(500).json({ status: false, message: err })
        } else {
            console.log(plan);
            res.status(200).json({ status: true, message: "Subscribe to Plan Successfully!" })
        }
    })
});
module.exports=router;