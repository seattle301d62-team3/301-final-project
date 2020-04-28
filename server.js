'use strict'  

// Dotenv - For linking values
require('dotenv').config();

// Express and Method-Override -- Express uses url, methodoverride, static files and sets ejs engine.
const express = require('express');
const app = express();
const methodOverride = require('method-override');
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('./public'));
app.set('view engine', 'ejs');

// Chalk - Color coding for console logs  
const chalk = require('chalk');
const red = chalk.keyword('red');
const orange = chalk.keyword('orange');
const green = chalk.keyword('green');
const blue = chalk.keyword('cyan');

// Postgress and PORT
const pg = require('pg');
const dbClient = new pg.Client(process.env.DATABASE_URL);
const PORT = process.env.PORT || 3001;

// SuperAgent - Used to talked with API
const superagent = require('superagent');

// Database connection
dbClient.connect(err => {
    if (err){
      console.error(red('Connection Error with Database'), err.stack);
    } else {
      console.log(green('Connected to Database!'));
      //Turn app on to listening
      app.listen(PORT, () => console.log(`Listening on PORT: ${blue(PORT)}`));
    }
  });

// CRUD OPERATIONS BELOW

app.get('/', homePage);  
app.post('/search', handlePhotos)


// Callback functions  

function homePage (request, response) {
  response.render('pages/index');
}

function handlePhotos (request, response) {
  response.send('on search page');
}