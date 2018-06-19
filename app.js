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
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

router.get("/", function(req, res){
  return Promise.try(function(){
    return readFile('alltime.json', 'ascii')
      .then((file) => JSON.parse(file))
      .then((json) => {
        let dates = {
          from: json.begin.iso,
          to: json.end.iso
        };

        let jsonHeatmap = json.heatmap;
        jsonHeatmap.push(jsonHeatmap.shift()); //Move Sunday to end of array

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

        return {dates: dates, heatmaps: [{header: "All Time Heatmap", heatmap: heatmap}]};
      })
      .catch((e) => {
        console.error("Error reading file", e);
      });
  }).then((data) => {
    res.render('index', data);
  });
});

app.use(router);
app.use(express.static(path.join(__dirname, "public")));
app.engine('html', mustacheExpress());
app.set('view engine', 'html');

app.listen(3000, () => console.log('Heatmap started'))
