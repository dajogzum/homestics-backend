
'use strict';
const express = require('express');
const router = express.Router();
const dbActions = require('../scripts/dbactions');
const utils = require('../scripts/utils');

router.get('/query_data/:what/:tformat/:where/:limit/:date', (req, res, next) => {
  let con = dbActions.makeConnection();
  let query = {
    what: req.params.what,
    tformat: "",
    where: req.params.where,
    limit: req.params.limit,
    date: req.params.date,
  };
  switch (req.params.tformat) {
    case "hours":
      query.tformat = "%H:%i";
      break;
    case "date":
      query.tformat = "%Y-%m-%d";
      break;
    case "fulldate":
      query.tformat = "%Y-%m-%d %H:%i";
      break;
    default:
      query.tformat = "Err!";
      break;
  };
  dbActions.queryData((err, Result) => {
    res.setHeader('Content-Type', 'application/json');
    res.render('data', {
      data: Result
    });
  }, query, con);
});

module.exports = router;