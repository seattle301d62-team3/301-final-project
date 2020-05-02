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
app.post('/library/client-details', renderClientProjects);
app.post('/library/project-details', renderProjectDetails);
app.get('/library/home', renderLibraryHome)
app.get('*', fourOhFour);

// *** Callback functions ***
function homePage (request, response) {
  response.render('pages/index');
}

// Handle Incoming Search Form Data

function handleSearchForm (request, response) {
  const { searchQuery } = request.body;  
  const key = process.env.API_KEY;
  const url = `https://api.unsplash.com/search/photos?query=${searchQuery}&client_id=${key}&oreindtation=landscape&per_page=30`;
  
  superagent.get(url).then(apiResponse => {
    const data = apiResponse.body.results;
    return data.map(element => new Picture(element));

  })
  .then(apiResults => {
    response.render('pages/search-results', { apiResults, searchQuery });
  })
  .catch((err) => {
    console.error('Error when getting form data: ', err);
    response.status(500).render('pages/error', 
    {errorMessage: 'Could not get what you wanted from the API search.', 
    errorCorrect: `Make sure you're searching for something valid.`});
  }) 
}

// Hand off image info for render
function imageDetails(request, response) {
  const picture = request.body;  
  response.render('pages/image-details', { picture });
}

// Save Image Info to DB
function saveImage (request, response) {
  const { category, _name, description, full_description, image, small_image, thumbnail, author, download, client_id, project_id } = request.body;
  
  //Insert Info
  let insertPicturesSQL = `INSERT INTO pictures (category, _name, description, full_description, image, small_image, thumbnail, author, download, client_id, project_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
  let insertPicturesValues = [category, _name, description, full_description, image, small_image, thumbnail, author, download, client_id, project_id];
  
  //Data Match --- To prevent duplicate clients
  let insertClientSQL = `INSERT INTO client (_name) VALUES ($1);`
  let matchClient = `SELECT * FROM client WHERE _name=$1;`
  let clientValues = [client_id];
  // Data Match --- To Prevent Duplicate projects related to the same client
  let insertProjectSQL = `INSERT INTO project (_name, client_id) VALUES ($1, $2);`;
  let matchProject = `SELECT * FROM project WHERE _name=$1 and client_id=$2;`;
  let projectValues = [project_id, client_id];

  dbClient.query(insertPicturesSQL, insertPicturesValues)
    .then(recordResponse => {
      dbClient.query(matchClient, clientValues)
      .then(matchResults => {
        if (matchResults.rowCount === 0) {
          dbClient.query(insertClientSQL, clientValues)
        }
      })
    })
    .then(results => {
      dbClient.query(matchProject, projectValues)
      .then(matchProjectResults => {
        if (matchProjectResults.rowCount === 0){
          dbClient.query(insertProjectSQL, projectValues)
        }
      })
    })
    .then(()=> {
        // inserted into DB and refreshed page
        response.status(204).send();
    })
    .catch((err) => {
      console.error('Error: Inserting into the Database ', err);
      response.status(500).render('pages/error', 
      {
        errorMessage: 'Could not get what you wanted from the API search.', 
        errorCorrect: `Make sure you're searching for something valid.`
      })
    })
}

// Render Organization Overview / Library
function renderLibraryHome (request, response) {
  let clientSQL = `SELECT * FROM client`;
  
  dbClient.query(clientSQL)
  .then(records => {
    let customers = records.rows.map(object => object._name).sort()
    response.render('pages/library', { customers });
  })
  .catch((err) => {
      console.error('Error: Inserting into the Database ', err);
      response.status(500).render('pages/error', 
      {
        errorMessage: 'Did find what you were looking for', 
        errorCorrect: `Make sure you're searching for an existing client or project. You may need to create a new Client or Project.`
      });
    }) 
}

// Render Client Overview w/ list of Projects
function renderClientProjects (request, response) {
  const { client } = request.body  
  let matchSQL = `SELECT (_name) FROM project WHERE client_id=$1;`;
  let matchValue = [client]
 
  dbClient.query(matchSQL, matchValue)
    .then(projectResponse => {
      let data = projectResponse.rows
      let project = data.map(element => element._name)

      response.render('pages/client-details', {client, project})
    })
    .catch((err) => {
      console.error('Error in renderProjects ', err);
      response.status(500).render('pages/error', 
      {
        errorMessage: 'Could not find info on that client', 
        errorCorrect: `Make sure this client exists / has projects.`
      });
    }) 
}

// Render All Assets Save in a Project
function renderProjectDetails (request, response) {
  const {client, project} = request.body

  let sql = `SELECT image FROM pictures WHERE client_id=$1 and project_id=$2;`
  let sqlValues = [client, project]

  dbClient.query(sql, sqlValues)
    .then(results => {
      let data = results.rows
      let picture =data.map(obj => obj.image)
      response.render('pages/project-details', { picture })
    })
}

// Page Not Found / Error Page
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
        console.error('Connection Error with Database', err.stack);
      } else {
        console.log('Connected to Database!');
        //Turn app on to listening
        app.listen(PORT, () => console.log(`Listening on PORT: ${PORT}`));
      }
  });