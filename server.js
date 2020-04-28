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

// *** Routes ***
app.get('/', homePage);  
app.post('/search', handleSearchForm);
app.post('/imageDetails', imageDetails);
app.post('/save', saveImage);
app.get('*', fourOhFour);

// Callback functions  
function homePage (request, response) {
  response.render('pages/index');
}

function handleSearchForm (request, response) {
  const { searchQuery } = request.body;  
  const key = process.env.API_KEY;
  const url = `https://api.unsplash.com/search/photos?query=${searchQuery}&client_id=${key}`;
  
  superagent.get(url).then(apiResponse => {
    const data = apiResponse.body.results;
    return data.map(element => new Picture(element));
  })
  .then(apiResults => {
    response.render('pages/search-results', { apiResults });
  })
  .catch((err) => {
    console.error('Error when getting form data: ', err);
    response.status(500).render('pages/error', 
    {errorMessage: 'Could not get what you wanted from the API search.', 
    errorCorrect: `Make sure you're searching for something valid.`});
  }) 
}

function imageDetails(request, response) {
  const picture = request.body;
  response.render('pages/image-details', { picture });
}

function saveImage (request, response) {
  const { category, name, description, full_description, image, small_image, thumbnail, author, download } = request.body;
  
  let insertSQL = `INSERT INTO pictures (category, _name, description, full_description, image, small_image, thumbnail, author, download) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
  let insertValues = [category, name, description, full_description, image, small_image, thumbnail, author, download];
  
  dbClient.query(insertSQL, insertValues).then(recordResponse => {
    // item is stored
    response.send('I saved');
  })
  .catch((err) => {
    console.error('Error: Inserting into the Database ', err);
    response.status(500).render('pages/error', 
    {errorMessage: 'Could not get what you wanted from the API search.', 
    errorCorrect: `Make sure you're searching for something valid.`});
  }) 
}

function fourOhFour (request, response) {
  response.status(404).render('pages/error', {
    errorMessage: 'Page not found', 
    errorCorrect: 'The path you took, leads only here. Some would call this, "nowhere".'
  }
  )}
  
  // *** Constructor Functions ***
  
  function Picture (obj) {
    this.category = obj.tags[0].title ? obj.tags[0].title : "No category found.";
    this._name = obj.description ? obj.description : "No name found.";
    this.description = obj.alt_description ? obj.alt_description : "No description found.";
    this.full_description = obj.tags[0].source ? obj.tags[0].source.description : "No full-description found."; 
    this.image = obj.urls.regular ? obj.urls.regular : "No image found.";
    this.small_image = obj.urls.small ? obj.urls.small : "No small_image found.";
    this.thumbnail = obj.urls.thumb ? obj.urls.thumb : "No thumbnail found.";
    this.author = obj.user.name ? obj.user.name : "No author found.";
    this.download = obj.links.download ? obj.links.download : "No download link found.";
  }
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