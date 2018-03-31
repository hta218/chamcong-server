var moment = require('moment');
var mtz = require('moment-timezone');

var express = require('express');
var router = express.Router();

var Instructor = require('./../../models/instructor');

router.get('/', (req, res) => {
  var name = req.query.name || "";
  var startDate = req.query.startDate ? req.query.startDate : moment().startOf('month');
  var endDate = req.query.endDate ? req.query.endDate : moment().endOf('month').format("YYYY-MM-DD");

  startDate = moment(startDate).toDate();
  endDate = moment(endDate).toDate();

  var regexToSearchName = (name) ? `${name}` : "";

  Instructor.aggregate([
    {
      '$match' : {
        'searchName' : {
          '$regex' : regexToSearchName, "$options" : "i"
        }
      }
    },
    {
      '$lookup' : {
        'from' : 'instructorrecords', // collection name in !ACTUAL! database [https://github.com/Automattic/mongoose/issues/3858]
        'localField' : '_id',
        'foreignField' : 'instructor',
        'as' : 'details'
      }
    },
    {
      '$project' : {
        '_id' : 1,
        'name' : 1,
        'code' : 1,
        'paidTime' : 1,
        'details' : {
          '$filter' : {
            "input" : '$details',
            "as" : 'record',
            "cond" : {
              '$and' : [
                {'$gte' : ['$$record.recordDate', startDate]},
                {'$lte' : ['$$record.recordDate', endDate]},
                {'$eq' : ['$$record.disabled', false]}
              ]
            }
          }
        }
      }
    },
    {
      '$unwind' : '$details'
    },
    {
      '$project' : {
        '_id' : 1,
        'name' : 1,
        'code' : 1,
        'paidTime' : 1,
        'course' : '$details.course',
        'role' : '$details.role'
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
        '_id' : 1,
        'name' : 1,
        'code' : 1,
        'paidTime' : 1,
        'course' : 1,
        'role' : 1,
        'salaries' : {
          '$filter' : {
            'input' : '$salaries',
            'as' : 'salary',
            'cond' : {
              '$and' : [
                {'$eq' : ['$$salary.course', '$course']},
                {'$eq' : ['$$salary.role', '$role']},
              ]
            }
          }
        }
      }
    },
    {
      '$project' : {
        '_id' : 1,
        'name' : 1,
        'code' : 1,
        'paidTime' : 1,
        'course' : 1,
        'role' : 1,
        'salary' : {'$arrayElemAt' : ['$salaries.salary', 0]}
      }
    },
    {
      '$group' : {
        '_id' : {'_id' : '$_id', 'name' : '$name', 'code' : '$code', 'paidTime' : '$paidTime'},
        'payroll' : {
          '$push' : {
            "course": "$course",
            "role": "$role",
            "salary": '$salary'
          }
        },
        'totalClass' : {'$sum' : 1},
        'totalSalary' : {'$sum' : '$salary'}
      }
    },
    {
      '$project' : {
        '_id' : '$_id._id',
        'name' : '$_id.name',
        'code' : '$_id.code',
        'paidTime' : '$_id.paidTime',
        'payroll' : 1,
        'totalClass' : 1,
        'totalSalary' : 1
      }
    }
  ])
  .exec((err, payroll) => {
    if (err) {
      res.json({success: 0, message: 'Unable to fetch instructor summary'});
    } else {
      var summaryTime = {
        'startDate' : startDate,
        'endDate' : endDate
      }
      res.json({success: 1,
                message: 'Fetch data Successfully',
                summaryTime: summaryTime,
                payroll: payroll
              })
    }
  });
});


module.exports = router;
