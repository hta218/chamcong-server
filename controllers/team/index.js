var express = require('express');
var router = express.Router();

var { managerFilter } = require('../auth-filter');
var Team = require('./../../models/team');

router.use(managerFilter);

router.get('/', (req, res) => {
  Team.find((err, teams) => {
    if (err) {
      res.json({success: 0, message: 'Unable to load teams'})
    } else {
      res.json({success: 1, message: 'Fetch teams successfully', teams});
    }
  });
});

router.post('/', (req, res) => {
  var body = req.body;

  var name = body.name;
  var code = body.code;
  var maxNo = body.maxNo;

  var team = new Team({
    name,
    code,
    maxNo
  });

  team.save((err, savedTeam) => {
    if (err) {
      res.json({success: 0, message: 'Unable to save new team'});
    } else {
      res.json({success: 1, message: 'Saved team successfully', savedTeam});
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
