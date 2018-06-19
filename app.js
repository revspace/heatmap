const express = require('express')
const expressPromiseRouter = require("express-promise-router");
const cron = require('node-cron');
const Promise = require("bluebird");
const bhttp = require("bhttp");
const unhandledError = require("unhandled-error");
const readFile = Promise.promisify(require("fs").readFile);
const mustacheExpress = require('mustache-express');
const path =  require("path");

let errorReporter = unhandledError((error, context) => {
  console.error(error, context);
});

let app = express();
let router = expressPromiseRouter();
let now = new Date();
const currentYear = `year${now.getFullYear()}`;
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fileNames = {
  [currentYear]: "This Year",
  "alltime": "All Time",
  "7days": "Last 7 Days",
  "70days": "Last 70 Days",
  "365days": "Last 365 Days"
};

router.get("/", function(req, res){
  return Promise.try(function(){
    for (var year=2010; year < now.getFullYear(); year++) {
      fileNames[`year${year}`] = year.toString();
    }

    return Promise.map(Object.keys(fileNames), (fileName) => {
      return getHeatmap(fileName);
    });
  }).then((heatmaps) => {
    let shiftedHeatmapDatas = [];
    heatmaps.forEach((heatmapData) => {
      let originalHeatmap = heatmapData.heatmap;
      let shiftedHeatmap = originalHeatmap;
      //Move Sunday to end of array
      shiftedHeatmap.push(shiftedHeatmap.shift());
      shiftedHeatmapDatas.push({header: heatmapData.header, heatmap: shiftedHeatmap});
    })
    console.log(shiftedHeatmapDatas);
    let data = {heatmaps: shiftedHeatmapDatas};
    res.render('index', data);
  });
});

function getHeatmap(filename) {
  return readFile(`heatmaps/${filename}.json`, 'ascii')
    .then((file) => JSON.parse(file))
    .then((json) => {
      let dates = {
        from: json.begin.iso,
        to: json.end.iso
      };

      let jsonHeatmap = json.heatmap;

      let heatmap = [];
      json.heatmap.forEach((values, index) => {
        let columns = [];
        values.forEach((percentage) => {
          let color = `hsla(${1.2*percentage}, 100%, 50%, 1)`;
          columns.push({color: color, percentage: percentage.toString()}); //nbsp
        });

        heatmap.push({
          day: weekDays[index],
          columns: columns
        });
      });

      return {header: fileNames[filename], heatmap: heatmap};
    })
}

app.use(router);
app.use(express.static(path.join(__dirname, "public")));
app.engine('html', mustacheExpress());
app.set('view engine', 'html');

app.listen(3000, () => console.log('Heatmap started'))
