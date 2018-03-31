var express = require('express');
var router = express.Router();
var Department = require('./../../models/department');

router.get('/', (req, res) => {
  Department.find((err, departments) => {
    if (err) {
      res.json({
        success: 0,
        message: "Couldn't get departments: " + err
      });
    } else {
      res.json({
        success: 1,
        data: departments
      });
    }
  });
});

module.exports = router;
