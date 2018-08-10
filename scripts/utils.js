
'use strict';
var utils = {
  refreshTime: () => {
    const Time = new Date;
    const Days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    console.log(utils.CColors.Bright, `Current Time: ${Days[Time.getDay()]} ${utils.twoDigits(Time.getDate())}-${utils.twoDigits(Time.getMonth() + 1)}-${Time.getFullYear()} ${utils.twoDigits(Time.getHours())}:${utils.twoDigits(Time.getMinutes())}:${utils.twoDigits(Time.getSeconds())}`, utils.CColors.Reset);
    return {
      sekunda: Time.getSeconds(),
      minuta: Time.getMinutes(),
      godzina: Time.getHours(),
      dzienMies: Time.getDate(),
      dzienTyg: Time.getDay(),
      miesiac: Time.getMonth() + 1,
      rok: Time.getFullYear(),
      odliczanie: 60 - Time.getSeconds(),
    };
  },
  timeAgo: (number, Case) => {
    const f = new Date();
    switch (Case) {
      case "hours":
        f.setHours(f.getHours() - number);
        return f.getFullYear() + "-" + utils.twoDigits(1 + f.getMonth()) + "-" + utils.twoDigits(f.getDate()) + " " + utils.twoDigits(f.getHours()) + ":" + utils.twoDigits(f.getMinutes()) + ":00";
        break;
      case "days":
        f.setDate(f.getDate() - number);
        return f.getFullYear() + "-" + utils.twoDigits(1 + f.getMonth()) + "-" + utils.twoDigits(f.getDate());
        break;
      case "months":
        f.setMonth(f.getMonth() - number);
        return f.getFullYear() + "-" + utils.twoDigits(1 + f.getMonth());
        break;
      case "years":
        f.setFullYear(f.getFullYear() - number);
        return f.getFullYear();
        break;
      default:
        break;
    }
  },
  twoDigits: (Digit) => {
    if (0 <= Digit && Digit < 10) return "0" + Digit.toString();
    if (-10 < Digit && Digit < 0) return "-0" + (-1 * Digit).toString();
    return Digit.toString();
  },
  CColors: {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",
    FgBlack: "\x1b[30m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgWhite: "\x1b[37m",
    BgBlack: "\x1b[40m",
    BgRed: "\x1b[41m",
    BgGreen: "\x1b[42m",
    BgYellow: "\x1b[43m",
    BgBlue: "\x1b[44m",
    BgMagenta: "\x1b[45m",
    BgCyan: "\x1b[46m",
    BgWhite: "\x1b[47m",
  },
}

Date.prototype.toMysqlFormat = (Case) => {
  const time = new Date;
  switch (Case) {
    case "date":
      return time.getFullYear() + "-" + utils.twoDigits(1 + time.getMonth()) + "-" + utils.twoDigits(time.getDate());
    case "datePlusOne":
      return time.getFullYear() + "-" + utils.twoDigits(1 + time.getMonth()) + "-" + utils.twoDigits(time.getDate() + 1);
    case "hours":
      return utils.twoDigits(time.getHours()) + ":" + utils.twoDigits(time.getMinutes()) + ":00";
    case "fulldate":
      return time.getFullYear() + "-" + utils.twoDigits(1 + time.getMonth()) + "-" + utils.twoDigits(time.getDate()) + " " + utils.twoDigits(time.getHours()) + ":" + utils.twoDigits(time.getMinutes()) + ":00";
  }
};

module.exports = utils;