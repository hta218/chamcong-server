var express = require('express');
var router = express.Router();

var moment = require('moment');
var { ObjectID } = require('mongodb');

var InstructorRecord = require('../../models/instructor-record');
var ClassInfo = require('../../models/class');

var {checkInFilter} = require('../auth-filter');

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

router.post('/', [checkInFilter], (req, res) => {
  var body = req.body;
  var instructor = body.instructorId;
  var course = body.course;
  var className = body.className;
  var classNo = body.classNo;
  var role = body.role;
  var recordDate = body.recordDate;
  var addedDate = moment();
  var disabled = false;

  var forcedSave = req.query.forcedSave;

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

  if (!forcedSave) {
    ClassInfo.getMaxSession(course, classNo).then(data => {
      InstructorRecord.getTotalClassSession(course, classNo).then(total => {
        
        if (total < data.maxSession) {
          InstructorRecord.saveAndGetSalary(instructorRecord, res);
        } else {
          res.json({success: 0, message: 'Total class is greater than course max session', verificationRequired: true});
        }

      }).catch(err => {
        res.json({success: 0, message: 'Get total class error', err});
      });
    }).catch(err => {
      res.json({success: 0, message: "Get max session error", err});
    }); 
  } else {
    instructorRecord.isOdd = true;
    InstructorRecord.saveAndGetSalary(instructorRecord, res);
  }
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

router.delete('/:recordId', [checkInFilter], (req, res) => {
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
