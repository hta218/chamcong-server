var express = require('express');
var mongoose = require('mongoose');

var Department = require('./../../models/department');
var sendMail = require('./../../helpers/email');

var ObjectId = mongoose.Types.ObjectId;
var router = express.Router();

router.post('/', (req, res) => {
    var body = req.body;
    var departmentIds = body.departmentIds;
    var content = body.content;
    var departmentObjectIds = departmentIds.map((departmentId) => { return ObjectId(departmentId) });
    
    Department
    .find({_id : { $in: departmentObjectIds }})
    .populate('contactPoint')
    .exec((err, departments) => {
        if (err) {
            res.json({
                success: 0,
                message: "Coudn't not retrieve department: " + err
            });
        }
        else if(departments == null || departments.length == 0) {
                res.json({
                    success: 0,
                    message: "Requested deparments are empty"
                }); 
        }
        else {
            var toEmails = departments.map((department) => { return department.contactPoint.email });
            sendMail(toEmails, req.user.email, "Feedback chấm công", content, () => {
                res.json({
                    success: 1,
                    message: "Feedback sent"
                });
            });
        }
    });
});

module.exports = router;