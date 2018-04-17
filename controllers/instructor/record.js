var express = require('express');
var router = express.Router();

var moment = require('moment');
var { ObjectID } = require('mongodb');

var { getSalary } = require('../../helpers/get-salary');

var InstructorRecord = require('../../models/instructor-record');

router.get('/', (req, res) => {
  InstructorRecord.find({'disabled': false})
  .limit(20)
  .populate("instructor")
  .exec((err, instructorRecords) => {
    if (err) {
      res.json({sucess: 0, message: "Could not load data " + err});
    } else {
      res.json({sucess: 1, message: "Get ok", results: instructorRecords});
    }
  });
});

router.post('/', (req, res) => {
  var body = req.body;
  var instructor = body.instructorId;
  var course = body.course;
  var className = body.className;
  var classNo = body.classNo;
  var role = body.role;
  var recordDate = body.recordDate;
  var addedDate = moment();
  var disabled = false;

  var instructorRecord = new InstructorRecord({
    instructor,
    course,
    className,
    classNo,
    role,
    recordDate,
    addedDate,
    disabled
  });

  instructorRecord.save((err, savedInstructorRecord) => {
    if (err) {
      res.json({success: 0, message: "Unable to save instructor-record: " + err});
    } else {
      var salary = 0;

      getSalary(instructorRecord, salary).then((salary) => {
        res.json({
          success: 1,
          message: "Successfully save instructor-record",
          results: savedInstructorRecord,
          salary: salary
        });
      }).catch((err) => {
        res.json({
          success: 1,
          message: "Successfully save instructor-record",
          results: savedInstructorRecord,
          salary: salary
        });
      });
    }
  });
});

router.patch('/:recordId', (req, res) => {
  var recordId = req.params.recordId;
  
  var body = req.body;
  var course = body.course;
  var role = body.role;
  var className = body.className;

  InstructorRecord.findByIdAndUpdate(
    recordId,
  {
    "course": course,
    "role": role,
    "className": className
  }, {
    "new": true
  }, (err, updatedRecord) => {
    if (err) {
      res.json({success: 0, message: 'Unable to update record', err: err})
    } else {
      res.json({success: 1, message: "Updated successfully", updatedRecord});
    }
  });
});

router.delete('/:recordId', (req, res) => {
  var recordId = req.params.recordId;

  InstructorRecord.findByIdAndUpdate(
    recordId,
  {
    "disabled" : true
  }, {
    "new" : true
  }, (err, foundRecord) => {
    if (err) {
      res.json({success: 0, message: 'Unable to remove record', err: err})
    } else {
      res.json({success: 1, message: "Deleted record: ", foundRecord});
    }
  });
});

module.exports = router;
