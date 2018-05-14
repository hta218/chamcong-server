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

module.exports = router;
