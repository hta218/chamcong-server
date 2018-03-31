var moment = require('moment');
var {ObjectID} = require('mongodb');

var express = require('express');
var router = express.Router();

var InstructorRecord = require('./../../models/instructor-record');

router.get('/', (req, res) => {
  var instructorId = req.query.instructorId || "";
  var startDate = req.query.startDate ? req.query.startDate : moment().startOf('month');
  var endDate = req.query.endDate ? req.query.endDate : moment().endOf('month').format("YYYY-MM-DD");

  instructorId = new ObjectID(instructorId);
  startDate = moment(startDate).toDate();
  endDate = moment(endDate).toDate();

  InstructorRecord.aggregate([
    {
      '$match' : {
        '$and' : [
          {'instructor' : {'$eq' : instructorId}},
          {'recordDate' : {'$gte' : startDate}},
          {'recordDate' : {'$lte' : endDate}},
          {'disabled' : {'$eq' : false}}
        ]
      }
    },
    {
      '$lookup' : {
        'from' : 'instructors',
        'localField' : 'instructor',
        'foreignField' : '_id',
        'as' : 'instructorInfo'
      }
    },
    {
      '$project' : {
        'course' : 1,
        'className' : 1,
        'role' : 1,
        'recordDate' : 1,
        'code' : {'$arrayElemAt' : ['$instructorInfo.code', 0]}
      }
    },
    {
      '$lookup' : {
        'from' : 'salary',
        'localField' : 'code',
        'foreignField' : 'instructor',
        'as' : 'salaries'
      }
    },
    {
      '$project' : {
        'course' : 1,
        'className' : 1,
        'code' : 1,
        'role' : 1,
        'recordDate' : 1,
        'salaries' : {
          '$filter' : {
            'input' : '$salaries',
            'as' : 'salary',
            'cond' : {
              '$and' : [
                {'$eq' : ['$$salary.course', '$course']},
                {'$eq' : ['$$salary.role', '$role']}
              ]
            }
          }
        }
      }
    },
    {
      '$project' : {
        '_id' : 0,
        'className' : 1,
        'role' : 1,
        'recordDate' : 1,
        'salary' : {'$arrayElemAt' : ['$salaries.salary', 0]}
      }
    },
    {
      '$group' : {
        '_id' : null,
        'records' : {'$push' : '$$ROOT'},
        'totalSalary' : {'$sum' : '$salary'}
      }
    }
  ]).exec((err, summary) => {
    if (err) {
      res.json({success: 0, message: 'Unable to fetch instructor-record summary'});
    } else {
      res.json({success: 1, message: 'Fetch summary successfully', summary: summary});
    }
  });
});

module.exports = router;
