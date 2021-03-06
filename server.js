"use strict";
require('dotenv').config();
const PORT = process.env.PORT || 8080;
const ENV = process.env.ENV || "development";
const express = require("express");
const bodyParser = require("body-parser");
const sass = require("node-sass-middleware");
const app = express();
const knexConfig = require("./knexfile");
const knex = require("knex")(knexConfig[ENV]);
const morgan = require('morgan');
const knexLogger = require('knex-logger');
const cookieSession = require('cookie-session');
app.use(cookieSession({
  name: 'session',
  keys: ['anks'],
  maxAge: 24 * 60 * 60 * 1000 // Cookie Options, 24 hours
}));
// Seperated Routes for each Resource
//const usersRoutes = require("./routes/users");
// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));
// Log knex SQL queries to STDOUT as well
//app.use(knexLogger(knex));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use("/styles", sass({
  src: __dirname + "/styles",
  dest: __dirname + "/public/styles",
  debug: true,
  outputStyle: 'expanded'
}));
app.use(express.static("public"));
// Mount all resource routes
//app.use("/api/users", usersRoutes(knex));
// Home page
app.get("/register", (req, res) => {
  var loggedIn = {email: req.session.email};
  res.render("register", loggedIn);
});
// Home page
app.get("/", (req, res) => {
  var loggedIn = {email: req.session.email};
  res.render("index", loggedIn);
});
``
// Register page
app.get("/register", (req, res) => {
  var loggedIn = {email: req.session.email};
  res.render("register", loggedIn);
});

app.post("/register", (req, res) => {
  knex('users')
    .where({
      email: req.body.email
    })
    .then(function (rows) {
      if (rows.length > 0) {
        res.send('Sorry user already exists with the email: ' + req.body.email)
      } else {
        //after validating if the user (email) already doesnt exists, then insert the data into DB
        const user = {
          email: req.body.email,
          password: req.body.password,
          user_name: req.body.username
        };
        knex("users")
          .insert(user)
          .then(function () {
            res.redirect("/login");
          })
          .catch(function (error) {
            res.send('Error Occurred, Please check your email and try again later ' + error.message);
          })
      }
    })
    .catch(function (error) {
      console.error(error)
      res.send('Error Occurred ' + error)
    });
})
// Login page
app.get("/login", (req, res) => {
  var loggedIn = {email: req.session.email};
  res.render("login", loggedIn);
});

app.post("/login", (req, res) => {
  //validating if the email already exists in DB
  knex('users')
    .where({
      email: req.body.email
    })
    .then(function (rows) {
      if (rows.length > 0) {
        console.log(JSON.stringify(rows[0]))
        if (req.body.password === rows[0].password) {
          console.log('Password Matches');
          req.session.email = req.body.email;
          req.session.user_id = rows[0].id; //setting the cookies with user Id
          res.redirect('/');
        } else {
          console.log('Password fails')
          res.send('Sorry, Incorrect Password, Please try again!')
        }
      } else {
        res.send('No User Found with the email: ' + req.body.email)
      }
    })
    .catch(function (error) {
      console.error(error)
      res.send('Error Occurred ' + error)
    });
});

app.get("/maps/new", (req, res) => { //this is the route to create new maps
  var loggedIn = {email: req.session.email};
  res.render("createmaps", loggedIn);
})


app.get("/maps/data/:id", (req, res) => { //this is the route which loads the RAW data

  var renderMapPointsArray = {};
  var mapID = req.params.id;

  knex('maps')
    .where({
      id: mapID //map id taken from request params
    })
    .then(function (maprows) {
      if (maprows.length > 0) {
        renderMapPointsArray['map_name'] = maprows[0].map_name;
        renderMapPointsArray['map_latitude'] = maprows[0].latitude;
        renderMapPointsArray['map_longitude'] = maprows[0].longitude;
        renderMapPointsArray['map_zoomlevel'] = maprows[0].zoomlevel;
        renderMapPointsArray['user_id'] = maprows[0].user_id;
        console.log(renderMapPointsArray);

        knex('points')
          .where({
            map_id: mapID //map id taken from request params
          })
          .then(function (pointrows) {
            console.log('Points Query Results');

            if (pointrows.length > 0) {
              var pointsArray = [];
              pointrows.forEach(singlePoint => {
                var point = {
                  title: singlePoint.title,
                  description: singlePoint.description,
                  latitude: singlePoint.latitude,
                  longitude: singlePoint.longitude,
                };
                pointsArray.push(point);
              });
              renderMapPointsArray['pointsArray'] = pointsArray;
              console.log(renderMapPointsArray);
            }

            res.json(renderMapPointsArray); //send the RAW mapPoint data

          }).catch(function (error) {
            res.send(error);
          });
      } else {
        res.send("Invalid map id");
      }
    }).catch(function (error) {
      res.send(error);
    });
})

app.get("/maps/:id", (req, res) => {
  var loggedIn = {email: req.session.email};

  res.render("rendermaps", {mapId: req.params.id, email: loggedIn.email});

})

app.post("/maps", (req, res) => { //this is the route to create new maps

  let map = {
    'map_name': req.body.mapname,
    'latitude': parseFloat(req.body.lat),
    'longitude': parseFloat(req.body.lng),
    'zoomlevel': parseInt(req.body.zoom),
    'user_id': parseInt(req.session.user_id)
  };

  console.log(map);

  knex("maps")
    .returning('id')
    .insert(map)
    .then(function (ids) {
      console.log(`map id: ${ids[0]}`);
      console.log('sending response');
      res.json({
        id: ids[0]
      });
    })
    .catch(function (error) {
      console.log('Error Occurred,  ' + error.message);
      res.send(error.message);
    })
})


app.post("/points", (req, res) => {

  let point = {
    'title': req.body.title,
    'description': req.body.description,
    'latitude': parseFloat(req.body.latitude),
    'longitude': parseFloat(req.body.longitude),
    'user_id': parseInt(req.session.user_id),
    'map_id': req.body.map_id
  };

  knex("points")
    .insert(point)
    .then(function () {
      console.log('point added');
      res.send("point added");
    })
    .catch(function (error) {
      console.log('Error Occurred,  ' + error.message);
      res.send(error.message);
    })
})


app.get("/mapslist", (req, res) => { //this is the route to get maps list
  //on client side, it will be an ajax call
  //return list of maps

  var renderMapsArray = {};
  knex('maps')
    .then(function (mapsrow) {
      if (mapsrow.length > 0) {
        var mapsArray = [];
        mapsrow.forEach(singleMap => {
          var map = {
            map_id: singleMap.id,
            map_name: singleMap.map_name
          };
          mapsArray.push(map);
        });
        renderMapsArray['mapsArray'] = mapsArray;
        console.log(renderMapsArray);
      }

      res.json(renderMapsArray);

    }).catch(function (error) {
      res.send(error);
    });

})

app.post("/addfavorites", (req, res) => {

  knex("favorites")
  .insert({user_id:req.session.user_id, map_id:req.body.map_id})
  .then(function () {
    // req.json({user_id:req.session.user_id, map_id:req.body.map_id})
    res.status(201).send()
    console.log("checking Favs")
  })
  .catch(function (error) {
    res.send('Error Occurred,' + error.message);
  })

})

app.post("/logout", (req, res) => {
  req.session.email = null;
  res.redirect("/");
})

app.get("/user/:id", (req, res) => {
  res.render("user", {userId: req.params.id});

})

app.post("/user", (req, res) => {
  // res.render("user", {userId: req.params.id});
  knex('users')
    .where({
      email: req.body.email
    })
    .then(function (rows) {
      if (rows.length > 0) {
        console.log(JSON.stringify(rows[0]))
        if (req.body.password === rows[0].password) {
          console.log('Password Matches')
          req.session.email = req.body.email;
          req.session.user_id = rows[0].id; //setting the cookies with user Id
          res.redirect('/')
        } else {
          console.log('Password fails')
          res.send('Sorry, Incorrect Password, Please try again!')
        }
      } else {
        res.send('No User Found with the email: ' + req.body.email)
      }
    })
    .catch(function (error) {
      console.error(error)
      res.send('Error Occurred ' + error)
    });
});


app.listen(PORT, () => {
  console.log("Example app listening on port " + PORT);
});
