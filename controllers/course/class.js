var express = require('express');
var router = express.Router();

var Course = require('./../../models/course');
var ClassInfo = require('./../../models/class');

router.get('/', (req, res) => {
  ClassInfo.find((err, classes) => {
    if (err) {
      res.json({success: 0, message: 'Unable to load classes'})
    } else {
      res.json({success: 1, message: 'Fetch classes successfully', classes});
    }
  });
});

router.post('/', (req, res) => {
  var body = req.body;
  
  var {course, classNo, maxSession} = body;

  var newClass = new ClassInfo({course, classNo, maxSession});

  newClass.save((err, savedClassInfo) => {
    if (err) {
      res.json({success: 0, message: 'unable to save new class infomation', err});
    } else {
      res.json({success: 1, message: 'Saved class info successfully', savedClassInfo});
    }
  });
});

// router.patch('/:id', (req, res) => {
//   var body = req.body;
//   var courseId = req.params.id;

//   var name = body.name;
//   var description = body.description;
//   var maxClass = body.maxClass;

//   // NOTE: use findOneAndUpdate() to return the updated document
//   // ref: https://davidburgos.blog/return-updated-document-mongoose/

//   Course.findOneAndUpdate(
//     {
//       "_id": courseId
//     },
//     {
//       "name" : name,
//       "description" : description,
//       "maxClass" : maxClass
//     },
//     {
//       new: true
//     }, (err, courseUpdated) => {
//       if (err) {
//        res.json({success: 0, message: "Unale to update course"});
//       } else {
//        res.json({success: 1, message: "Updated successfully", courseUpdated});
//       }
//     }
//   );
// });

// router.delete('/:id', (req, res) => {
//   const id = req.params.id;

//   Course.findOne({"_id": id}, (err, foundCourse) => {
//     if (err) {
//       res.json({success: 0, message: "Unable to find course"});
//     } else if(!foundCourse) {
//       res.json({success: 0, message: "Course not found"});
//     } else {
//       Course.update({
//         "_id" : id
//       }, {
//         "isActive" : false
//       }, (err, foundCourse) => {});
//       res.json({success: 1, message: "Deleted course: ", foundCourse});
//     }
//   });
// });

module.exports = router;
