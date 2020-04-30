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
// const orange = chalk.keyword('orange');
const green = chalk.keyword('green');
const blue = chalk.keyword('cyan');

const log = (value, color) => console.log(chalk.keyword(color)(JSON.stringify(value)));





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
app.get('/library/home', renderLibraryHome)
app.get('*', fourOhFour);

// Callback functions  
function homePage (request, response) {
  response.render('pages/index');
}

function handleSearchForm (request, response) {
  const { searchQuery } = request.body;  
  const key = process.env.API_KEY;
  const url = `https://api.unsplash.com/search/photos?query=${searchQuery}&client_id=${key}&per_page=1`;

  log(url, 'red');
  
  superagent.get(url).then(apiResponse => {
    const data = apiResponse.body.results;
    return data.map(element => new Picture(element));

  })
  .then(apiResults => {
      // log(apiResults, 'yellow');

    
    response.render('pages/search-results', { apiResults, searchQuery });
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
  const { category, _name, description, full_description, image, small_image, thumbnail, author, download, client_id, project_id } = request.body;

  // client_id = client_id ? client_id : 'n/a';
  // project_id = project_id ? project_id : 'n/a;
  
  let insertPicturesSQL = `INSERT INTO pictures (category, _name, description, full_description, image, small_image, thumbnail, author, download, client_id, project_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
  let insertPicturesValues = [category, _name, description, full_description, image, small_image, thumbnail, author, download, client_id, project_id];
  
  let insertClientSQL = `INSERT INTO client (_name) VALUES ($1);`
  let matchClient = `SELECT * FROM client WHERE _name=$1;`
  let clientValues = [client_id];

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

function renderLibraryHome (request, response) {
  // let clientSQL = `SELECT * FROM client`;
  let projectSQL = `SELECT * FROM project`;
  // let clientValue = [proj_id, client_id]
  
  dbClient.query(projectSQL)
  .then(records => {

    let customers = records.rows.map(object => {
      return object._name;
    }).sort()
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



// function selectByProject(request, response){
//   let data = request.body;
//   let client = request.body.project;
//   let sql = `SELECT * FROM pictures WHERE project_id = $1;`;
//   let safeValues = [project];
//   dbClient.query(sql, safevalues)
//     .then(results => {
//       response.render('pages/project-overview')
//     })
// }

// function addCustomer(request, response){
//   let data = request.body.customer;
//   let sql =  `INSERT INTO client (name) VALUES ($1);`;
//   let safeValues = [data];

//   dbClient.query(sql, safeValues)
//     .then((results) => {
//       response.render('pages/library', {});
//     })
// }

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


// let clientSQL = `SELECT * FROM client;`


// dbClient.query(clientSQL)
//    .then(results => {
//      let clientList = results.rows;  
         
//    })
//    .then(results => {
//      let projectSQL = `SELECT _name FROM project where client_id=$1;`
    
//      clientList.forEach(client => {
//        let projClient = [client];
//        dbClient.query(projectSQL, projClient)
//          .then(results => {
//             response.status(204).
//          })
//      })
    
    
// })
    
    