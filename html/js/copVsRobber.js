/* jshint jquery: true */
/* -global Robot */
/* exported runDemo */

$(function() {
"use strict";

/* Invasive, unrelated to Barobo, and probably ill-advised mucking with the
 * global Object object! :D
 */

Object.defineProperty(Object.prototype, "update", {
  value: function (o) {
    var that = this;
    Object.getOwnPropertyNames(o).map(function (k) {
      that[k] = o[k];
    });
    return this;
}});

/* Mock Robot object for testing without any robots attached.
 */

var Robot;
if (typeof window.Robot === "undefined") {
  Robot = {};
  [
    "connectRobot",
    "disconnectRobot",
    "getRobotIDList",
    "moveNB",
    "printMessage",
    "setColorRGB",
    "setJointSpeeds",
    "stop",
  ].forEach(function (method) {
    Robot[method] = function () {};
  });
}
else {
  Robot = window.Robot;
}

/* Declarations.
 */

var
  /* Constants */
  wheelRadius = 1.75,
  blue = "4V21",
  red = "CZ98",
  imgH = 30, imgW = 40,
  ymin = -2, ymax = 12,

  /* Query parameters */

  // Code courtesy Github: http://goo.gl/vtSdBK
  qs = (function(a) {
    if (a === "") { return {}; }
    var b = {};
    for (var i = 0; i < a.length; ++i) {
      var p=a[i].split('=');
      if (p.length !== 2) { continue; }
      b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
    })(window.location.search.substr(1).split('&')),

  /* Prototype objects */
  cop = {
    color: "blue",
    label: "cop",
    data: [],
    speed: 2,
    start: -2,
    img: (new Image()).update({src: "img/cop.jpg"}),
    points: {
      symbol: function (ctx, x, y) {
        ctx.drawImage(cop.img, x - imgW/2, y - imgH/2, imgW, imgH);
      },
    },
    pos: 1.3,
  },
  robber = {
    color: "red",
    label: "robber",
    data: [],
    speed: 0.5,
    start: 4,
    img: (new Image()).update({src: "img/robber.jpg"}),
    points: {
      symbol: function (ctx, x, y) {
        ctx.drawImage(robber.img, x - imgW/2, y - imgH/2, imgW, imgH);
      },
    },
    pos: 0.7,
  },

  /* IOrefs (mutated globals) */
  xvst, pos,
  xvstSeries, posSeries,
  loopID,

  /* Functions */
  stopLoop = function () {
    if (loopID !== null) {
      clearTimeout(loopID);
      loopID = null;
    }
  },

  stopRobots = function () {
    stopLoop();
    Robot.stop(red);
    Robot.stop(blue);
  },

  nighttime = function () {
    stopRobots();
    Robot.disconnectRobot(red);
    Robot.disconnectRobot(blue);
  },

  plotCharts = function (xvsts, poss) {
    xvst = $.plot("#xvst", xvsts, {
      grid: {
        markings: [ { linewidth: 1, yaxis: { from: 0, to: 0 }, color: "#8A8A8A" } ],
      },
      xaxis: {
        min: 0,
        max: 10,
        tickSize: 1,
        tickDecimals: 0,
      },
      yaxis: {
        min: ymin,
        max: ymax,
        tickSize: 2,
        tickDecimals: 0,
      },
    });

    pos = $.plot("#pos", poss, {
      grid: {
        markings: [ { linewidth: 1, yaxis: { from: 0, to: 0 }, color: "#8A8A8A" } ],
      },
      xaxis: {
        show: false,
        reserveSpace: true,
        min: 0,
        max: 2,
        tickSize: 1,
        tickDecimals: 0,
      },
      yaxis: {
        show: true,
        min: ymin,
        max: ymax,
        tickSize: 2,
        tickDecimals: 0,
        tickFormatter: function() {
          return "";
        },
      },
      series: {
        points: { show: true }
      }
    });
  },

  resetCharts = function () {
    stopRobots();
    xvstSeries = [
      Object.create(cop),
      Object.create(robber),
      Object.create(cop).update(
        {
          points: {
            show: true
          },
          label: null,
          data: [[0, cop.start]]
        }),
      Object.create(robber).update(
        {
          points: {
            show: true
          },
          label: null,
          data: [[0, robber.start]]
        }),
    ];

    posSeries = [
      Object.create(cop).update(
        {
          data: [[cop.pos, cop.start]],
          label: null,
        }),
      Object.create(robber).update(
        {
          data: [[robber.pos, robber.start]],
          label: null,
        }),
    ];

    plotCharts(xvstSeries, posSeries);
  },

  iterDemo = (function() {
    var iter = 0;
    var timeout = 200; // milliseconds
    var step = timeout/1000.0;
    var tolerance = step / 2;
    var xstop;
    var d1, d2;

    function iterDemo(x) {
      var reset = false;
      var y1, y2;

      if (typeof x !== "undefined" && x !== null) {
        reset = true;
      }

      if (reset) {
        iter = 0;
        xstop = Math.abs(x);
        d1 = [[0, cop.start]];
        d2 = [[0, robber.start]];
      }
      iter = iter + step;
      Robot.printMessage(iter);
      y1 = cop.speed * iter + cop.start;
      y2 = robber.speed * iter + robber.start;
      d1.push([iter, y1]);
      d2.push([iter, y2]);

      xvstSeries[0].data = d1;
      xvstSeries[1].data = d2;
      xvstSeries[2].data = [[iter,y1]];
      xvstSeries[3].data = [[iter,y2]];
      posSeries[0].data = [[cop.pos, y1]];
      posSeries[1].data = [[robber.pos, y2]];
      xvst.setData(xvstSeries);
      pos.setData(posSeries);
      xvst.draw();
      pos.draw();
      if((xstop - iter) > (tolerance)) {
        loopID = setTimeout(iterDemo, timeout);
      }
      else {
        loopID = setTimeout(nighttime, timeout+500);
      }
    }

    return iterDemo;
  })(),

  runDemo = function () {
    var intersectGuess = parseFloat($("#guess").val());
    if (!isNaN(intersectGuess)) {
      if (typeof Robot !== 'undefined' && Robot !== null) {
        //var robotList = Robot.getRobotIDList();
        Robot.connectRobot(red);
        Robot.connectRobot(blue);

        Robot.setColorRGB(red, 255, 0, 0);
        Robot.setColorRGB(blue, 0, 0, 255);

        var redfunc = function(x) {
          return robber.speed * x + robber.start;
        };

        var bluefunc = function(x) {
          return cop.speed * x + cop.start;
        };

        var xstart = 0;
        var xstop = intersectGuess;

        var reddist = redfunc(xstop) - redfunc(xstart);
        var bluedist = bluefunc(xstop) - bluefunc(xstart);

        var redradians = reddist / wheelRadius;
        var blueradians = bluedist / wheelRadius;

        var redspeed = robber.speed / wheelRadius;
        var bluespeed = cop.speed / wheelRadius;

        Robot.setJointSpeeds(red, redspeed, redspeed, redspeed, redspeed);
        Robot.setJointSpeeds(blue, bluespeed, bluespeed, bluespeed, bluespeed);

        Robot.moveNB(red, redradians, 0, -redradians, 0);
        Robot.moveNB(blue, blueradians, 0, -blueradians, 0);
        iterDemo(intersectGuess);
      }
    }
  };

/* __main__
 */

setTimeout(resetCharts, 100);

if (parseInt(qs.intersect)) {
  setTimeout(runDemo, 200);
}

$("#guess").val(qs.intersect);
$("#demoBtn").click(runDemo);
$("#resetBtn").click(resetCharts);
$("#stopBtn").click(stopRobots);
$(window).resize(function () { plotCharts(xvstSeries, posSeries); });

});
