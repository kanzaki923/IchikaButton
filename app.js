var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const dotenv = require('dotenv').config();
const helmet = require('helmet'); 

const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api_v2');
const archivesRouter = require('./routes/archives');
const songRouter = require('./routes/song');
const voiceRouter = require('./routes/voice');
const resiyouRouter = require('./routes/resiyou');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(helmet());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/archives', archivesRouter);
app.use('/song', songRouter);
app.use('/voice', voiceRouter);
app.use('/resiyou', resiyouRouter);
app.use('/api/v2', apiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
