
'use strict';
const debug = require('debug');
const express = require('express');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const request = require('request');
const fs = require('fs');
const reload = require('require-reload')(require)
var emptyconfig = false;
if (!fs.existsSync('./Config.json')) {
  console.log('cfg created!');
  emptyconfig = true;
  fs.writeFileSync('Config.json', '{"null": true}');
};
var dbActions;
const utils = require('./scripts/utils');
const routes = require('./routes/routes');
var Config = reload('./Config.json');

app.use(logger('dev'));
app.use(cookieParser());
app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');
app.use('/', routes);
app.disable('etag');
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

app.set('port', 4949);

const server = http.listen(app.get('port'), () => {
  debug('Backend server startend on port:  ' + server.address().port);
});

var Time = utils.refreshTime();
var Sgodzina = "";
var SdzienTyg = "";
var Smiesiac = "";
var Srok = "";

io.on('connection', (socket) => {

  let CFGobj = Config;
  socket.on("SAVECONFIG", (newConfig) => {
    fs.writeFileSync('Config.json', JSON.stringify(newConfig), (err) => {
      if (err) throw err;
      console.log('Config Saved!');
    });
    setTimeout(() => {
      Config = reload('./Config.json');
      emptyconfig = false;
      console.log("Config Reloaded");
    }, 2000);
  });
  socket.on('CONFIGONLY', (pass) => {
    pass(Config);
  });
  socket.on('INIT', (pass) => {
    dbActions.queryData((err, Result) => {
      pass(Config, Result);
    }, {
      where: "current",
      limit: Config.limit,
      date: "xd",
    }, dbActions.makeConnection());
  });
  socket.on("equations", (EQUA) => {
    CFGobj.equations = EQUA;
    fs.writeFileSync('Config.json', JSON.stringify(CFGobj), (err) => {
      if (err) throw err;
      console.log('Equations Saved!');
    });
    setTimeout(() => {
      Config = reload('./Config.json');
      emptyconfig = false;
      console.log("Config Reloaded");
    }, 2000);
  })
});

function push() {
  setTimeout(() => {
    console.log(utils.CColors.BgMagenta, utils.CColors.FgWhite, "Wyslano push 'update'", utils.CColors.Reset);
    dbActions.queryData((err, Result) => {
      io.emit('update', Result);
    }, {
      where: "current",
      limit: 1,
      date: "xd",
    }, dbActions.makeConnection());
  }, 1000);
};

function live() {
  const url = "http://" + Config.user + ":" + Config.pswd + "@" + Config.ip + ":" + Config.port + "/api/json/devices";
  request.get({
    url: url,
    json: true
  }, (err, response, body) => {
    if (!err && response.statusCode === 200) {
      const values = [
        body.List[Config.live[0][1]].stan,
        body.List[Config.live[1][1]].stan,
      ];
      io.emit('live', values);
    } else {
      return [null];
    }
  })
};
// SORTOWANIE NIE DZIALA
function sorting(firstInit) {
  if (Time.godzina != Sgodzina) {
    dbActions.dbSort("current");
    Sgodzina = Time.godzina;
    console.log('Db-godzina');
  };
  if (Time.dzienTyg != SdzienTyg) {
    if (firstInit) {
      setTimeout(() => {
        dbActions.dbSort("hours");
        console.log("hours xddddd");
      }, 10000);
    } else {
      setTimeout(() => {
        dbActions.dbSort("hours")
      }, 1000);
    }
    SdzienTyg = Time.dzienTyg;
    console.log('Db-tyg');
  };
  if (Time.miesiac != Smiesiac) {
    if (firstInit) {
      setTimeout(() => {
        dbActions.dbSort("days");
        console.log("days xddddd");
      }, 20000);
    } else {
      setTimeout(() => {
        dbActions.dbSort("days")
      }, 2000);
    }
    Smiesiac = Time.miesiac;
    console.log('Db-mies');
  };
  if (Time.rok != Srok) {
    if (firstInit) {
      setTimeout(() => {
        dbActions.dbSort("months");
        console.log("months xddddd");
      }, 30000);
    } else {
      setTimeout(() => {
        dbActions.dbSort("months")
      }, 3000);
    }
    Srok = Time.rok;
    console.log('Db-rok');
  };
}

//rozruch calej aplikacji

if (!emptyconfig && !Config.null) {
  console.log(utils.CColors.FgGreen, "Config detected", utils.CColors.Reset)
  dbActions = require("./scripts/dbactions");
  Start();
} else {
  console.log(utils.CColors.FgRed, "Check Your Config File!", utils.CColors.Reset);
  let starter = setInterval(() => {
    if (!emptyconfig && !Config.null) {
      console.log(utils.CColors.FgGreen, "Config detected", utils.CColors.Reset)
      dbActions = require("./scripts/dbactions");
      Start();
      clearInterval(starter);
    }
  }, 3000);
}

function Start() {
  if (Time.minuta % 2 == 0) {
    console.log(utils.CColors.FgGreen, `Server Started`, utils.CColors.Reset);
    dbActions.updates(push); //pierwszy update danych
    //sorting(true); //sortowanie niezalezne od czasu
    setInterval(live, 5000); //uruchomienie podgladau na zywo
    setTimeout(() => {
      setInterval(() => {
        Time = utils.refreshTime(); //odswiezanie czasu
        //sorting(false); //sortowanie zalezne od czasu
        if (Time.minuta % 2 == 0) {
          dbActions.updates(push); //aktualizacja bazy dancyh
        }
      }, 60 * 1000)
    }, Time.odliczanie * 1000)
  } else {
    console.log(utils.CColors.FgYellow, `Waiting for: ${Time.odliczanie} seconds`, utils.CColors.Reset);
    //sorting(true);
    setInterval(live, 5000);
    setTimeout(() => {
      dbActions.updates(push);
      setInterval(() => {
        Time = utils.refreshTime();
        //sorting(false);
        if (Time.minuta % 2 == 0) {
          dbActions.updates(push);
        }
      }, 60 * 1000)
    }, Time.odliczanie * 1000)
  }
}