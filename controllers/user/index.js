var express = require('express');
var router = express.Router();

router.use('/checkin-summary', require('./summary'));
router.use('/send-account', require('./send-account'));

module.exports = router;
