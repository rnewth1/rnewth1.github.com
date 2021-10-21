/*
 * ----------------------
 * Gulpfile
 * ----------------------
 */


/*
 * Dependencies
 */

var gulp            = require('gulp'),
    plumber         = require('gulp-plumber'),
    favicons        = require('gulp-favicons'),
    svgSprite       = require('gulp-svg-sprite'),
    connect         = require('gulp-connect-php'),
    modernizr       = require('gulp-modernizr'),
    imagemin        = require('gulp-imagemin'),
    pngquant        = require('imagemin-pngquant'),
    uglify          = require('gulp-uglify'),
    browserSync     = require('browser-sync'),
    sass            = require('gulp-sass'),
    sourcemaps      = require('gulp-sourcemaps'),
    webpack         = require('webpack'),
    webpackConfig   = require('./webpack.config.js'),
    gulpUtil        = require('gulp-util'),
    autoprefixer    = require('gulp-autoprefixer');


/*
 * Variables
 */

var projectName         = 'Robert Newth',
    hasStatics          = true,
    baseDir             = './',
    assetsDir           = `${baseDir}assets/`;


/*
 * Task - Favicons
 * Apple touch icons
 */

// gulp.task('favicons', function () {
//     return gulp.src(`${assetsDir}img/favicon/favicon.png`)
//         .pipe(plumber())
//         .pipe(favicons({
//             appName: projectName,
//             developerName: 'Robert Newth',
//             developerURL: 'http://rnewth1.github.io',
//             background: '#fff',
//             path: `${assetsDir}img/favicon`,
//             url: baseDir,
//             display: 'standalone',
//             orientation: 'portrait',
//             version: 1.0,
//             logging: false,
//             online: false,
//             html: `${baseDir}favicons.html`,
//             pipeHTML: true,
//             replace: true,
//             icons: {
//                 android: true,
//                 appleIcon: true,
//                 appleStartup: false,
//                 coast: false,
//                 favicons: true,
//                 firefox: false,
//                 opengraph: true,
//                 twitter: true,
//                 windows: true,
//                 yandex: false
//             }
//         }))
//         .pipe(gulp.dest(`${assetsDir}img/favicon`));
// });


/*
 * Task - Sass
 */

gulp.task('sass', function () {
    gulp.src(`${assetsDir}scss/**/*.scss`)
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(sass({outputStyle : 'compressed'}))
        .pipe(autoprefixer())
        .pipe(sourcemaps.write(baseDir))
        .pipe(gulp.dest(`${assetsDir}css`));
});


/*
 * Task - Project dev
 * - wordpress, magento, statics & jekyll development tasks
 * - tasks used for starting browser-sync focused on specific environments
 */

gulp.task('project-dev', function () {
    browserSync.init([
        assetsDir + '**/*'
    ], {
        server: {
            baseDir: "./"
        }
    });
});


/*
 * Task - Modernizr
 */

gulp.task('modernizr', function() {
    gulp.src(`${assetsDir}{scss/**/*.scss,js/**/*.js}`)
        .pipe(plumber())
        .pipe(modernizr({
            tests : ['js'],
            options: [
                'addTest',
                'testProp',
                'setClasses',
                'fnBind'
            ]
        }))
        .pipe(uglify())
        .pipe(gulp.dest(`${assetsDir}js`));
});


/*
 * Task - Fonts
 * - Distributes fonts to two different folders
 */

gulp.task('fonts', function () {
    gulp.src(`${assetsDir}font/**/*.{ttf,woff,woff2,eof,svg}`)
        .pipe(gulp.dest(`${assetsDir}font`));
});


/*
 * Task - Bundle js
 */

// gulp.task('bundle-js', function(callback) {
//     webpack(webpackConfig, function(err, stats) {
//         if(err) throw new gulpUtil.PluginError('webpack', err);
//         gulpUtil.log('[webpack]', stats.toString({
//             chunks: false
//         }));
//         callback();
//     });
// });


/*
 * Task - Images
 * - Compress them!
 */

gulp.task('images', ['icons'], function () {
    gulp.src(`${assetsDir}img/**/*`)
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            multipass: true,
            use: [pngquant()]
        }))
        .pipe(gulp.dest(`${assetsDir}img`));
});


/*
 * Task - Icons
 */

gulp.task('icons', function() {
    gulp.src(`${assetsDir}img/icon/src/*.svg`)
    .pipe(plumber())
    .pipe(svgSprite({
        mode : {
            css : {
                dest : `${assetsDir}css`,
                layout : 'horizontal',
                sprite : '../img/icon/dist/icons.svg',
                prefix: '.',
                bust: false,
                render : {
                    scss : {
                        dest : '../scss/base/_icon.scss',
                        template : `${assetsDir}scss/base/_icon-template.scss`
                    }
                }
            }
        },
        variables : {
            spriteName : 'icon',
            spriteDimsX : 36,
            spriteDimsY : 36
        }
    }))
    .pipe(gulp.dest(baseDir));
});


/*
 * Task - Watch
 */

gulp.task('watch', function() {
    gulp.watch(`${assetsDir}scss/**/*.scss`, ['sass', 'modernizr']);
    // gulp.watch(`${assetsDir}js/src/**/*.js`, ['modernizr']);
    gulp.watch(`${assetsDir}img/**/*`, ['images']);
    gulp.watch(`${assetsDir}font/**/*`, ['fonts']);
});


/*
 * Task - Build all
 * - global helper for building all assets
 */

gulp.task('build-all', ['images', 'sass', 'fonts']);



/*
 * Task - Default
 * - Runs sass, browser-sync, scripts and image tasks
 * - Watchs for file changes for images, scripts and sass/css
 */

gulp.task('default', ['project-dev', 'watch']);
