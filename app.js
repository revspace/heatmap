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

// Spec
//
// 64bit epoch
// first bit after that is on the timestamp
// resolution 1 minute
// ascii 0=closed 1=open ?=no data

// Node can only read 32bit epoch!
 
let app = express();
let router = expressPromiseRouter();

router.get("/", function(req, res){
  return Promise.try(function(){
    return readFile('statelog')
      .then((buffer) => {
        let timestamp = buffer.readUInt32LE(0);
        let date = new Date(timestamp*1000);
        let spaceStateBuffer = buffer.slice(8);

        let states = [];
        for (let byte of spaceStateBuffer) {
          if (byte == 49) {
            states.push({state: "open"});
          } else {
            states.push({state: "closed"});
          }
        }

        //return `Data starts at ${date}<br>${stateString}`;
        return {date: date, states: states};
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
