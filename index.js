const express = require("express");
const bodyParser = require("body-parser");
const flashMessages = require("connect-flash");
const sessions = require("express-session");
const mongoose = require("mongoose");
const { Citizen } = require("./models/Citizen");
const { Message } = require("./models/Message");
const bcrypt = require("bcryptjs");
const PORT = 3300; // the port where our server will be running

// instantiating express
const app = express();
const httpServer = require("http").Server(app);
const socketIO = require("socket.io")(httpServer);
app.use(express.static("public")); // points to where the static files are.

// setting up the session
app.use(
  sessions({
    secret: "esn2024",
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flashMessages());
// setting up a middleware to send all flash messages
app.use(function (request, response, next) {
  response.locals.message = request.flash();
  next();
});

// set up the body-parser utility
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// setting the templating engine
app.set("view engine", "ejs");

// connecting to the database
const dbUrl =
  "mongodb+srv://gkasaazi:6nhq1kidDxCiynU1@cluster0.9px3e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// mongoose.connect(dbUrl, (err) => {
//   if (err) console.log(`Couldn't connect to MongoDB\n${err}`);
//   else console.log("Successfully connected to MongoDB");
// });
// mongoose.connect()
try {
  mongoose.connect(dbUrl);
  console.log("Successfully connected to MongoDB");
} catch (error) {
  // handleError(error);
  console.log(`Couldn't connect to MongoDB\n${error}`);
}

// creating global variables for easy access to the data they hold
var session, uname;
// loading the login page
app.get("/", (request, response) => {
  response.render("login");
});

// loading the register page
app.get("/register", (request, response) => {
  response.render("register");
});

// registering a user
app.post("/userRegister", (request, response) => {
  // getting the data from the user
  let email = request.body.email;
  let fullname = request.body.fullname;
  let pswd = request.body.password;
  let cpswd = request.body.confirmpassword;

  if (pswd != cpswd) {
    request.flash("error", "Entered passwords do not match! Please try again.");
    response.redirect("/register");
  } else {
    // request.flash("success", "This is the next thing on the agenda.");
    // response.redirect("/register");
    // testing that the account does not exist
    Citizen.findOne({ username: email }).then((user) => {
      if (user) {
        request.flash(
          "error",
          `${user.fullname} already exists! Please try again!`
        );
        response.redirect("/register");
      } else {
        // creating the account
        // encrypt the password
        bcrypt.hash(pswd, 10, async (err, hashedPassword) => {
          if (err) {
            request.flash("error", `Error while hashing the password ${err}!`);
            response.redirect("/register");
          } else {
            // create a model to save the data
            let citizen = new Citizen({
              username: email,
              fullname: fullname,
              password: hashedPassword,
            });
            // saving the data
            await citizen.save();
            request.flash(
              "success",
              `${fullname} successfully added to the system.\nPlease login with your new credentials.`
            );
            response.redirect("/");
          }
        });
      }
    });
  }
});

// logging in a user
app.post("/processLogin", (request, response) => {
  // getting the data from the user
  let email = request.body.email;
  let pswd = request.body.password;
  if (email === "") {
    request.flash("error", "The email field must be filled! Please try again.");
    response.redirect("/");
  }
  if (pswd === "") {
    request.flash(
      "error",
      "The password field must be filled too! Please try again."
    );
    response.redirect("/");
  }
  // check if the user exists
  Citizen.findOne({ username: email })
    .then((userInfo) => {
      if (userInfo) {
        // the user exists, check the password
        const hashedPassword = userInfo.password;
        bcrypt.compare(pswd, hashedPassword).then((result) => {
          if (result) {
            session = request.session;
            session.uid = userInfo.username;
            session.fname = userInfo.fullname;
            uname = userInfo.fullname;
            // request.flash("success", "You have logged in successfully.");
            response.redirect("/home");
          } else {
            request.flash("error", "Invalid Username/Password combination!");
            response.redirect("/");
          }
        });
      } else {
        request.flash("error", "Citizen not found in the system!");
        response.redirect("/");
      }
    })
    .catch((err) => {
      request.flash("error", `Error while logging in! \n${err}`);
      response.redirect("/");
    });
});

// Store typing timers for each socket
let typingTimers = {};

// Event for triggering user is typing
socketIO.on('connection', (socket)=>{
  /*from server side we will emit 'display' event once the user starts typing
  so that on the client side we can capture this event and display 
  '<data.user> is typing...' */
  
  socket.on('typing', (data) => {
    // If the user is typing
    if (data.typing === true) {
      socket.broadcast.emit('display', data);

      // If a timer exists for this user, clear it
      if (typingTimers[socket.id]) {
        clearTimeout(typingTimers[socket.id]);
      }

      // Start a new timer for 10 seconds
      typingTimers[socket.id] = setTimeout(() => {
        // Emit event to stop displaying 'is typing' after 10 seconds
        data.typing = false;
        //broadcast is a property of the socket object in Socket.IO. It allows you..
        //to send a message to all connected clients except the one that triggered the event.
        socket.broadcast.emit('display', data);
      }, 10000); // 10 seconds

    } else {
      // User stopped typing manually
      socket.broadcast.emit('display', data);

      // Clear the timer if the user manually stopped typing
      if (typingTimers[socket.id]) {
        clearTimeout(typingTimers[socket.id]);
        delete typingTimers[socket.id];
      }
    }
  });

  // Clear the timer when the socket disconnects
  socket.on('disconnect', () => {
    if (typingTimers[socket.id]) {
      clearTimeout(typingTimers[socket.id]);
      delete typingTimers[socket.id];
    }
  });
});



// Backend Code (Single Route for Search and Autocomplete):
// Search Route and autcomplete route
// handle the autocomplete logic directly within the existing search route. This way, the same route can 
// provide both search results and suggestions based on the input length or some other criteria.
app.post('/search', async (request, response) => {
  const searchCriteria = request.body.searchCriteria;

  // Check if searchCriteria is provided
  if (!searchCriteria) {
      return res.json({ success: false, message: 'No search criteria provided' });
  }

  // Determine if it's an autocomplete request (you can define your own condition)
  const isAutocomplete = searchCriteria.length < 3; // Example: if input is less than 3 characters, treat as autocomplete

  let searchResults;

  // If it's an autocomplete request, limit results and only return fullname
  if (isAutocomplete) {
      searchResults = await Citizen.find({
          $or: [
              { fullname: new RegExp(searchCriteria, 'i') },
              { username: new RegExp(searchCriteria, 'i') },
              { email: new RegExp(searchCriteria, 'i') }
          ]
      }, 'fullname')  // Only retrieve the 'fullname' field for suggestions
      .limit(5)        // Limit to 5 suggestions
      .exec();
      
      // Respond with suggestions
      if (searchResults.length > 0) {
          return response.json({ success: true, results: searchResults });
      } else {
          return response.json({ success: false, message: 'No suggestions found' });
      }
  }

  // For a full search request
  searchResults = await Citizen.find({
      $or: [
          { fullname: new RegExp(searchCriteria, 'i') },
          { username: new RegExp(searchCriteria, 'i') },
          { email: new RegExp(searchCriteria, 'i') }
      ]
  }).exec();

  // Respond with full search results
  if (searchResults.length > 0) {
      response.json({ success: true, results: searchResults });
  } else {app.post('/search', async (request, response) => {
    const searchCriteria = request.body.searchCriteria;

    // Check if searchCriteria is provided
    if (!searchCriteria) {
        return response.json({ success: false, message: 'No search criteria provided' });
    }

    // Determine if it's an autocomplete request
    const isAutocomplete = searchCriteria.length < 3;

    let searchResults;

    // If it's an autocomplete request, limit results and only return fullname
    if (isAutocomplete) {
        searchResults = await Citizen.find({
            $or: [
                { fullname: new RegExp(searchCriteria, 'i') },
                { username: new RegExp(searchCriteria, 'i') },
                { email: new RegExp(searchCriteria, 'i') }
            ]
        }, 'fullname')  // Only retrieve the 'fullname' field for suggestions
        .limit(5)        // Limit to 5 suggestions
        .exec();

        if (searchResults.length > 0) {
            return response.json({ success: true, results: searchResults });
        } else {
            return response.json({ success: false, message: 'No suggestions found' });
        }
    }

    // For a full search request
    searchResults = await Citizen.find({
        $or: [
            { fullname: new RegExp(searchCriteria, 'i') },
            { username: new RegExp(searchCriteria, 'i') },
            { email: new RegExp(searchCriteria, 'i') }
        ]
    }).exec();

    // If citizens are found, fetch their messages
    if (searchResults.length > 0) {
        const resultsWithMessages = await Promise.all(searchResults.map(async citizen => {
            // Fetch all messages sent by this citizen (by fullname or username)
            const messages = await Message.find({
                sender: { $in: [citizen.username, citizen.fullname] }
            }).exec();

            // Return the citizen's details along with their messages
            return {
                username: citizen.username,
                fullname: citizen.fullname,
                status: citizen.status,
                statusLastUpdated: citizen.statusLastUpdated,
                messages: messages  // Attach the messages array
            };
        }));

        // Respond with full search results including messages
        response.json({ success: true, results: resultsWithMessages });
    } else {
        response.json({ success: false, message: 'No matching records found' });
    }
});
      response.json({ success: false, message: 'No matching records found' });
  }
});





// loading the dashboard
app.get("/home", (request, response) => {
  if (session.uid && session.fname) {
    response.render("dashboard", {
      data: {
        userid: session.uid,
        fullname: session.fname,
      },
    });
  } else {
    response.redirect("/");
  }
});

// loading the searchinfo page
app.get("/searchinfo", (request, response) => {
  session = request.session;
  // uname = request.session.fullname;
  if (session.uid && session.fname) {
    response.render("searchinfo", {
      data: {
        userid: session.uid,
        fullname: session.fname,
      },
    });
  } else response.redirect("/");
});

// loading the sharestatus page
app.get("/sharestatus", (request, response) => {
  session = request.session;
  // uname = request.session.fullname;
  if (session.uid && session.fname) {
    response.render("sharestatus", {
      data: {
        userid: session.uid,
        fullname: session.fname,
      },
    });
  } else response.redirect("/");
});



//loading the chatroom
app.get("/chatroom", (request, response) => {
  session = request.session;
  // uname = request.session.fullname;
  if (session.uid && session.fname) {
    response.render("chatroom", {
      data: {
        userid: session.uid,
        fullname: session.fname,
      },
    });
  } else response.redirect("/");
});

// logging the user out
app.get("/logout", (request, response) => {
  request.session.destroy();
  session = "";
  response.redirect("/");
});

// saving the message to the database
app.post("/saveMessage", async (request, response) => {
  // create an object from the model
  var message = new Message(request.body);
  await message.save();
  // emit an event to the front end for displaying a sent message
  socketIO.emit("message", message);
  response.sendStatus(200);
});

// fetching the messages from the database
app.get("/fetchMessages", async (request, response) => {
  await Message.find({}).then((messages) => {
    if (messages) response.send(messages);
    else console.log(`Error while fetching messages!`);
  });
});

// receiving and emit a message when a user joins the chat
socketIO.on("connection", (socket) => {
  socketIO.emit("joined", uname);
  console.log(`${uname} has joined the chat.`);
});


// listen for incoming connections
httpServer.listen(PORT, () => {
  console.log(`The server is up and running on port ${PORT}`);
});