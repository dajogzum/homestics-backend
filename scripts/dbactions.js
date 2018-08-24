
'use strict';
const mysql = require('mysql');
const request = require('request');
const fs = require('fs');
const utils = require('./utils');
const Config = require("../Config.json");

var dbActions = {
  makeConnection: () => {
    const dbCon = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: Config.dbName,
      multipleStatements: true,
    });
    dbCon.connect((err) => {
      if (err) {
        console.log(utils.CColors.FgWhite, utils.CColors.BgRed, `### Brak polaczenia z baza danych ###`, utils.CColors.Reset);
        throw err;
      } else {
        console.log(utils.CColors.FgGreen, `Polaczono z baza danych`, utils.CColors.Reset);
      }
    });
    return dbCon;
  },
  importArgs: () => {
    let names = [];
    let ids = [];
    for (let pos in Config.wykresy) {
      names.push(Config.wykresy[pos].name);
      ids.push(Config.wykresy[pos].id);
    };
    return {
      name: names,
      id: ids
    };
  },
  queryData: (callback, query, con) => {
    let queryaddon;
    if (query.date == "xd") {
      queryaddon = '';
    } else {
      let timestamp = new Date(query.date).toMysqlFormat("datePlusOne");
      queryaddon = "WHERE date>='" + query.date + "' AND date<'" + timestamp + "'";
    }
    con.query("SELECT * FROM `" + query.where + "` " + queryaddon + "ORDER BY `date` DESC LIMIT " + query.limit,
      (err, rows) => {
        let json = JSON.stringify(rows);
        callback(err, json);
      }
    );
    con.end(() => {
      console.log(utils.CColors.Bright, `Rozlaczono z baza danych`, utils.CColors.Reset)
    })
  },
  insertData: (body, con, db) => {
    const Args = dbActions.importArgs();
    const time = new Date().toMysqlFormat("fulldate");
    if (typeof body.List != "undefined") {
      let name = ``;
      let value = ``;
      for (let i = 0; i < Object.keys(Config.wykresy).length; i++) {
        name += `, \`${Args.name[i]}\``;
        value += `, ${body.List[Args.id[i]].stan}`;
      }
      con.query("INSERT INTO `current` (`date` " + name + ") SELECT * FROM (SELECT '" + time + "' " + value + ") AS tmp WHERE NOT EXISTS (SELECT `date` FROM `current` WHERE `date` = '" + time + "') LIMIT 1");
      console.log(utils.CColors.FgGreen, `Pomyslnie pobrano i zapisano dane z API serwera`, utils.CColors.Reset);
    } else if (typeof body[0] != "undefined" && typeof db != "number") {
      let query = "";
      body.forEach((key, index) => {
        let name = "";
        let value = "";
        const date = key.date;
        //console.log(date);
        for (let i = 0; i < Object.keys(Config.wykresy).length; i++) {
          name += `, \`${Args.name[i]}\``;
          value += `, ${key[Args.name[i]]}`;
        };
        query += "INSERT INTO `" + db + "` (`date` " + name + ") SELECT * FROM (SELECT '" + date + "' " + value + ") AS tmp WHERE NOT EXISTS (SELECT `date` FROM `" + db + "` WHERE `date` = '" + date + "') LIMIT 1; ";
        //console.log(query);
        //console.log(x++)
      })
      con.query(query);
    } else {
      console.log(utils.CColors.FgRed, `Cos poszlo nie tak w dbActions.insertData()\nDla: ${body} i ${db}`, utils.CColors.Reset)
    };
  },
  updates: (callback, errors) => {
    if (typeof errors != "undefined") {
      let errCon = errors;
    } else {
      let errCon = 0;
    }
    const con = dbActions.makeConnection();
    const url = "http://" + Config.user + ":" + Config.pswd + "@" + Config.ip + ":" + Config.port + "/api/json/devices";
    const urlLog = "http://***:***@" + Config.ip + ":" + Config.port + "/api/json/devices";
    console.log(utils.CColors.Bright, "Laczenie z: " + urlLog, utils.CColors.Reset);
    request.get({
      url: url,
      json: true
    }, (err, response, body) => {
      if (!err && response.statusCode === 200) {
        dbActions.insertData(body, con);
        callback();
        con.end(() => {
          console.log(utils.CColors.Bright, `Rozlaczono z baza danych`, utils.CColors.Reset)
        })
      } else {
        console.log(utils.CColorss.FgRed, `Blad podczas pobierania danych\nPonowne laczenie...`, utils.CColors.Reset);
        con.end();
        if (errCon >= 5) {
          console.log(utils.CColors.FgWhite, utils.CColors.BgRed, `### Nie udalo sie polaczyc! ###`, utils.CColors.Reset);
        } else {
          setTimeout(() => {
            dbActions.updates(callback, errCon++);
          }, 4000);
        }

      }
    })
  },
  dbSort: (caseType) => {
    let insertionCase, query;
    const con = dbActions.makeConnection();
    let col = "";
    const Args = dbActions.importArgs();
    for (let i = 0; i < Object.keys(Config.wykresy).length; i++) {
      col += ", AVG(`" + Args.name[i] + "`) AS `" + Args.name[i] + "`";
    }
    switch (caseType) {
      case "current":
        insertionCase = "hours";
        query = "SELECT DATE_FORMAT(`date`, '%Y-%m-%d %H:00') AS date " + col + " FROM `" + caseType + "` WHERE DATE_FORMAT(`date`, '%Y-%m-%d %H:00')<='" + utils.timeAgo(1, insertionCase) + "' GROUP BY DATE_FORMAT(`date`, '%d-%H') ORDER BY `date` DESC;";
        break;
      case "hours":
        insertionCase = "days";
        query = "SELECT DATE_FORMAT(`date`, '%Y-%m-%d') AS date " + col + " FROM `" + caseType + "` WHERE DATE_FORMAT(`date`, '%Y-%m-%d')<='" + utils.timeAgo(1, insertionCase) + "' GROUP BY DATE_FORMAT(`date`, '%Y-%m-%d') ORDER BY `date` DESC;";
        break;
      case "days":
        insertionCase = "months";
        query = "SELECT DATE_FORMAT(`date`, '%Y-%m-%d') AS date " + col + " FROM `" + caseType + "` WHERE DATE_FORMAT(`date`, '%Y-%m-%d')<='" + utils.timeAgo(1, insertionCase) + "' GROUP BY DATE_FORMAT(`date`, '%Y-%m') ORDER BY `date` DESC;";
        break;
      case "months":
        insertionCase = "years";
        query = "SELECT DATE_FORMAT(`date`, '%Y-%m') AS date " + col + " FROM `" + caseType + "` WHERE DATE_FORMAT(`date`, '%Y-%m')<='" + utils.timeAgo(1, insertionCase) + "' GROUP BY DATE_FORMAT(`date`, '%Y') ORDER BY `date` DESC;";
        break;
      default:
        insertionCase = 1;
    }
    //console.log(query);
    con.query(query,
      (err, rows) => {
        let json = JSON.parse(JSON.stringify(rows));
        dbActions.insertData(json, con, insertionCase);
      }
    );
    if (caseType == "current") {
      query = "DELETE FROM `current` WHERE DATE_FORMAT(`date`, '%%Y-%%m-%%d %%H:00')<'" + utils.timeAgo(Config.minuty_wstecz, "hours") + "';";
      //con.query(query);
      console.log(query);
    } else if (caseType == "hours") {
      query = "DELETE FROM `hours` WHERE DATE_FORMAT(`date`, '%%Y-%%m-%%d %%H:00')<'" + utils.timeAgo(Config.godziny_wstecz, "hours") + "';";
      //con.query(query);
      console.log(query);
    } else if (caseType == "days") {
      query = "DELETE FROM `days` WHERE DATE_FORMAT(`date`, '%%Y-%%m-%%d %%H:00')<'" + utils.timeAgo(Config.dni_wstecz, "days") + "';";
      //con.query(query);
      console.log(query);
    }
    setTimeout(() => {
      con.end(() => {
        console.log(utils.CColors.Bright, 'Rozlaczono z baza danych', utils.CColors.Reset)

      });
    }, 500);
  },
  saveEQ: (EQUA) => {
    let con = dbActions.makeConnection();
    console.log("saved_EQ");
  }
}

module.exports = dbActions;