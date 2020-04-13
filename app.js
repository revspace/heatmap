const express = require('express')
const expressPromiseRouter = require("express-promise-router");
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
router.get("/", function(req, res){
  let now = new Date();
  const currentYear = `year${now.getFullYear()}`;
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fileNames = {
    "7days": "Last 7 Days",
    "70days": "Last 70 Days",
    "365days": "Last 365 Days",
    "alltime": "All Time"
  };

  return Promise.try(function(){
    let yearFileNames = {};
    for (var year=2010; year <= now.getFullYear(); year++) {
      yearFileNames[`year${year}`] = year.toString();
    }

    let normalHeatmaps = Promise.map(Object.keys(fileNames), (fileName) => {
      return getHeatmap(fileName, weekDays, fileNames);
    });

    let yearHeatmapSlider = Promise.map(Object.keys(yearFileNames), (fileName) => {
      return getHeatmap(fileName, weekDays, yearFileNames);
    });

    return Promise.all([
      normalHeatmaps,
      yearHeatmapSlider
    ]);
  }).then((data) => {
    let normalHeatmaps = data[0];
    let yearHeatmapSlider = data[1];

    let yearSlider = {
      firstYear: 2010,
      lastYear: now.getFullYear(),
      data: yearHeatmapSlider
    };

    res.render('index', {heatmaps: normalHeatmaps, yearSlider: yearSlider});
  });
});

function getHeatmap(filename, weekDays, fileNames) {
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

      //Move Sunday to end of array
      let shiftedHeatmap = heatmap;
      shiftedHeatmap.push(shiftedHeatmap.shift());

      return {header: fileNames[filename], dates: dates, heatmap: shiftedHeatmap, filename: filename};
    })
}

app.use(router);
app.use(express.static(path.join(__dirname, "public")));

function jsonHeaders(res) {
  res.set('content-type', 'application/json');
}

app.use('/api', express.static(path.join(__dirname, "heatmaps"), {setHeaders: jsonHeaders, index: true}));
app.engine('html', mustacheExpress());
app.set('view engine', 'html');

app.listen(3000, () => console.log('Heatmap started'))
