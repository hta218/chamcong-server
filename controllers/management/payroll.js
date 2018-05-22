var express = require('express');
var router = express.Router();

var moment = require('moment');
var mtz = require('moment-timezone');

var Instructor = require('./../../models/instructor');
var Salary = require('./../../models/salary');
var Course = require('./../../models/course');
var SystemInfo = require('./../../models/system-info');

var sendPayroll = require('./../../helpers/send-payroll');

// get instructor payroll router
router.get('/', (req, res) => {

  var instructorCode = req.query.code || 'undefined instructor code';

  var startDate = req.query.startDate ? req.query.startDate : moment().startOf('month');
  var endDate = req.query.endDate ? req.query.endDate : moment().endOf('month').format("YYYY-MM-DD");

  startDate = moment(startDate).toDate();
  endDate = moment(endDate).toDate();

  Instructor.aggregate([
    // Find the needed instructor
    {
      '$match' : {
        'code' : instructorCode
      }
    },
    // Find the records associate with the given instructor
    {
      '$lookup' : {
        'from' : 'instructorrecords',
        'localField' : '_id',
        'foreignField' : 'instructor',
        'as' : 'records'
      }
    },
    // Filter only the record with the given date range
    {
      '$project' : {
        "instructor" : {
          '_id' : "$_id",
          'firstName' : "$firstName",
          'lastName' : "$lastName",
          'code' : "$code",
          'email' : "$email",
          'courses' : "$courses",
          'paidTime' : "$paidTime"
        },
        'records' : {
          '$filter' : {
            "input" : '$records',
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
    // Unpack records for populating
    {
      '$unwind': '$records'
    },
    // Find the course for each record
    {
      "$lookup": {
        "from": "courses",
        "localField": "records.course",
        "foreignField": "_id",
        "as": "records.courses"
      }
    },
    // Flat out the found courses (only take the first item of array)
    {
      '$project' : {
        "instructor": 1,
        'records' : {
          "_id": 1,
          "classNo": 1,
          "recordDate": 1,
          "addedDate": 1,
          "role": 1,
          "course": { "$arrayElemAt": ["$records.courses", 0]}
        }
      }
    },
    // Combine course name and class no into className
    {
      '$project' : {
        "instructor": 1,
        'records' : {
          "_id": 1,
          "classNo": 1,
          "recordDate": 1,
          "addedDate": 1,
          "role": 1,
          // Use $substr to convert int to str: from 0 to -1 means from 0 to len-1
          "className": {"$concat": [ "$records.course.name", " ", {"$substr" : ['$records.classNo', 0, -1]} ]} ,
          "classNameAndRole": {"$concat": [ "$records.course.name", " ", {"$substr" : ['$records.classNo', 0, -1]}, " ", "$records.role" ]},
          "course": 1
        }
      }
    },
    // Temporarily group all records and generate payrollDetails
    {
      '$group': {
        '_id': "$instructor._id",
        "instructor": {"$first": "$instructor"},
        'records': { '$push': '$records' },
        'payrollDetails': { '$push': '$records' }
      }
    },
    {
      '$unwind': '$records'
    },
    // Get instructor salaries
    {
      '$lookup' : {
        'from' : 'salary',
        'localField' : 'instructor.code',
        'foreignField' : 'instructor',
        'as' : 'salaries'
      }
    },
    // Filter out only the relevant
    {
      '$project' : {
        "instructor": 1,
        'records' : 1,
        "payrollDetails": 1,
        'salaries' : {
          '$filter' : {
            'input' : '$salaries',
            'as' : 'salary',
            'cond' : {
              '$and' : [
                {'$eq' : ['$$salary.course', '$records.course._id']},
                {'$eq' : ['$$salary.role', '$records.role']}
              ]
            }
          }
        }
      }
    },
    // Flat out salary
    {
      '$project' : {
        "instructor": 1,
        "payrollDetails": 1,
        'records' : 1,
        'salary' : {'$arrayElemAt' : ['$salaries.salary', 0]} // select only [0] element
      }
    },
    {
      '$project' : {
        "instructor": 1,
        "payrollDetails": 1,
        'records' : 1,
        'salary' : {'$ifNull' : ['$salary', 0]}
      }
    },
    {
      '$group' : {
        '_id': '$records.classNameAndRole',
        "instructor": {"$first": "$instructor"},
        'payrollDetails': { '$first' : '$payrollDetails' },
        'totalClass' : { '$sum' : 1 },
        'totalSalary' : { '$sum' : '$salary' },
        'salary': {'$first': '$salary'},
        'className': {'$first': "$records.className"},
        "course": { "$first": "$records.course._id" },
        "role": { "$first": "$records.role" },
      }
    },
    {
      '$project': {
        "_id": 1,
        "instructor": 1,
        "payrollDetails": 1,
        "payroll": {
          'salary': '$salary',
          "totalClass": "$totalClass",
          "totalSalary": "$totalSalary",
          "course": "$course",
          "className": "$className",
          "role": "$role"
        }
      }
    },
    // Sum ALL up
    {
      '$group': {
        "_id": "$instructor._id",
        'payrollDetails': { '$first' : '$payrollDetails' },
        "instructor": {"$first": "$instructor"},
        "payroll": {"$push": "$payroll"},
        "totalMonthSalary": {"$sum": "$payroll.totalSalary"}
      }
    }
  ])
  .exec((err, results) => {
    if (err) {
      res.status(500).json({
        'success': 0,
        'message': 'Error while quering data',
        'error': err
      });
    }
    else if (results) {

      var data = {
        instructor: null,
        payroll: null,
        payrollDetails: null,
      };

      if (results.length != 0) {
        data = results[0];
      }

      res.json({
        'success': 1,
        'message': 'Fetched payroll successfully',
        instructor: data.instructor,
        payroll: data.payroll,
        payrollDetails: data.payrollDetails,
        summaryTime: { startDate, endDate },
        totalMonthSalary: data.totalMonthSalary
      });
    }
  });
});

var { accountantFilter } = require('../auth-filter');
router.use(accountantFilter);

// send instructor payroll via Gmail router
router.get('/send', (req, res) => {

  var instructorCode = req.query.code || 'undefined instructor code';
  var startDate = req.query.startDate ? req.query.startDate : moment().startOf('month');
  var endDate = req.query.endDate ? req.query.endDate : moment().endOf('month').format("YYYY-MM-DD");

  startDate = moment(startDate).toDate();
  endDate = moment(endDate).toDate();

  Instructor.aggregate([ 
    {
      '$match' : {
        'code' : instructorCode
      }
    },
    {
      '$lookup' : {
        'from' : 'instructorrecords',
        'localField' : '_id',
        'foreignField' : 'instructor',
        'as' : 'records'
      }
    },
    {
      '$project' : {
        '_id' : 1,
        'name' : 1,
        'code' : 1,
        'email' : 1,
        'paidTime' : 1,
        'records' : {
          '$filter' : {
            "input" : '$records',
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
      '$unwind' : '$records'
    },
    {
      '$project' : {
        '_id' : 1,
        'code' : 1,
        'name' : 1,
        'email' : 1,
        'paidTime' : 1,
        'course' : '$records.course',
        'className' : '$records.className',
        'role' : '$records.role'
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
        'code' : 1,
        'name' : 1,
        'email' : 1,
        'paidTime' : 1,
        'course' : 1,
        'className' : 1,
        'role' : 1,
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
        '_id' : 1,
        'code' : 1,
        'name' : 1,
        'email' : 1,
        'paidTime' : 1,
        'course' : 1,
        'className' : 1,
        'role' : 1,
        'salary' : {'$arrayElemAt' : ['$salaries.salary', 0]}
      }
    },
    {
      '$group' : {
        '_id' : {
          '_id' : '$_id',
          'name' : '$name',
          'code' : '$code',
          'email' : '$email',
          'paidTime' : '$paidTime',
          'course' : '$course',
          'className' : '$className',
          'role' : '$role',
          'salary' : '$salary'
        },
        'totalClass' : {'$sum' : 1},
        'totalSalary' : {'$sum' : '$salary'}
      }
    },
    {
      '$addFields' : {
        'instructor' : {
          '_id' : '$_id._id',
          'name' : '$_id.name',
          'code' : '$_id.code',
          'email' : '$_id.email',
          'paidTime' : '$_id.paidTime'
        }
      }
    },
    {
      '$project' : {
        '_id' : 0,
        'instructor' : 1,
        'course' : '$_id.course',
        'className' : '$_id.className',
        'role' : '$_id.role',
        'salary' : '$_id.salary',
        'totalClass' : 1,
        'totalSalary' : 1
      }
    },
    {
      '$group' : {
        '_id' : '$instructor',
        'payroll' : {
          '$push' : {
            'course' : '$course',
            'className' : '$className',
            'role' : '$role',
            'salary' : '$salary',
            'totalClass' : '$totalClass',
            'totalSalary' : '$totalSalary'
          }
        },
        'totalMonthSalary' : {'$sum' : '$totalSalary'}
      }
    }
  ])
  .exec((err, results) => {
    if (err) {
      res.json({success: 0, message: 'Unable to fetch instructor payroll'})
    } else {
      var instructorInfos = results[0];
      var instructor = {
        _id: instructorInfos._id._id,
        name: instructorInfos._id.name,
        code: instructorInfos._id.code,
        email: instructorInfos._id.email,
        paidTime: instructorInfos._id.paidTime,
        totalMonthSalary: instructorInfos.totalMonthSalary
      }
      var summaryTime = {
        'startDate' : startDate,
        'endDate' : endDate
      }

      var payroll = instructorInfos.payroll;

      // get admin mail infos
      var adminInfos = {};
      SystemInfo.findOne({"code" : "manager-mail"}, (err, admin) => {
        if (err) {
          console.log('Unable to fetch admin infos');
        } else {
          adminInfos = admin.infos;
          res.json({success: 1, message: 'Mail sent successfully', instructor, payroll});

          // send instructor payroll via gmail
          sendPayroll.send(adminInfos, summaryTime, instructor, payroll, (err, info) => {
            if (err) {
              res.json({success: 0, message: 'Unable to send email'});
            } else {

              var paidTime = instructor.paidTime;

              // reset instructor paid-time
              if (summaryTime.startDate.valueOf() < moment(paidTime.startDate).toDate().valueOf()) {
                Instructor.update(
                  { "code" : instructor.code },
                  { "$set" : { "paidTime.startDate" : moment(startDate).toDate() }},
                  (error) => {
                    if (error) {
                      console.log('Unable to update new paid-time end-date');
                    };
                  }
                );
              }

              if (summaryTime.endDate.valueOf() > moment(paidTime.endDate).toDate().valueOf()) {
                Instructor.update(
                  { "code" : instructor.code },
                  { "$set" : { "paidTime.endDate" : moment(endDate).toDate() }},
                  (error) => {
                    if (error) {
                      console.log('Unable to update new paid-time end-date');
                    };
                  }
                );
              }
              /////////////////////////////////////////////////////////////

              res.json({success: 1, message: 'Mail sent successfully', instructor, payroll});
            }
          });
        }
      });
    }
  });
});

module.exports = router;