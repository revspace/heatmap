const Promise = require("bluebird");
const path = require("path");
const gulp = require("gulp");
const gulpNamedLog = require("gulp-named-log");
const gulpRename = require("gulp-rename");
const gulpNodemon = require("gulp-nodemon");
const gulpCached = require("gulp-cached");
const presetSCSS = require("@joepie91/gulp-preset-scss");

const awaitServer = require("await-server");

const gulpLivereload = require("gulp-livereload");
const patchLivereloadLogger = require("@joepie91/gulp-partial-patch-livereload-logger");

patchLivereloadLogger(gulpLivereload);

let config = {
    scss: {
        source: "./scss/**/*.scss",
        destination: "./public/css/"
    },
    cssModules: []
}

let serverLogger = gulpNamedLog("server");

gulp.task("nodemon", ["scss", "livereload"], () => {
    gulpNodemon({
        script: "app.js",
        ignore: [
            "gulpfile.js",
            "node_modules",
            "public"
        ],
        ext: "js html json"
    }).on("start", () => {
        Promise.try(() => {
            serverLogger.info("Starting...");
            return awaitServer(3000);
        }).then(() => {
            serverLogger.info("Started!");
            gulpLivereload.changed("*");
        });
    });
});

gulp.task("scss", () => {
    return gulp.src(config.scss.source)
        .pipe(presetSCSS({
            livereload: gulpLivereload
        }))
        .pipe(gulp.dest(config.scss.destination));
});

gulp.task("livereload", () => {
    gulpLivereload.listen({
        quiet: true
    });
});

gulp.task("watch-css", () => {
    gulp.watch(config.scss.source, ["scss"]);
});

gulp.task("watch", ["nodemon", "watch-css"]);

gulp.task("default", ["watch"]);

