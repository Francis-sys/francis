const socket = io();
var typing=false;
var timeout=undefined;
var user;
$(() => {
  $("#sendButton").click(() => {
    var fullname = document.querySelector("#fullname").textContent;
    // used the value method to get form inputs
    var sentMessage = $("#sendMessage").val();
    var currentTime = getCurrentTime();
    // alert(
    //   `Fullname: ${fullname} \nMessage: ${sentMessage} \nTime 'n Date: ${currentTime}`
    // );
    var message = {
      sender: fullname,
      message: sentMessage,
      sentTime: currentTime,
    };
    saveMessage(message); // delegating the message to be sent by the saveMessage function
    $("#sendMessage").val(""); // clearing the text box after sending the message
  });
  getMessages();

  socket.on("joined", (username) => {
    var fullname = document.querySelector("#fullname").textContent;
    if (username == fullname) {
      $("#alert").text("");
      $("#alert").remove("p");
      $("#alert").append(
        `<p style='position:absolute;'><center><em>You joined the chat</em></center></p>`
      );
    } else {
      $("#alert").text("");
      $("#alert").remove("p");
      $("#alert").append(
        `<p style='position:absolute;'><center><strong>${username} joined the chat.</strong></center></p>`
      );
    }
    scrollContainer();

    // Implementing for typing event from other users
    $(document).ready(function(){
      $('#sendMessage').keypress((e)=>{
        if(e.which!=13){
          typing=true
          socket.emit('typing', data={user:fullname, typing:true})
          timeout=setTimeout(typingTimeout, 3000)
        }else{
          clearTimeout(timeout)
          typingTimeout()
          //sendMessage() function will be called once the user hits enter
          sendMessage()
        }
      })
      //code for triggering the user is typing
          socket.on('display', (data)=>{
        if(data.typing==true)
          //Putting the space between the user name and the word is typing using this\u00A0
        //  ${data.user} was introduced before \u00A0 to display users full names but it was remove because the used is already diplaye on the dashboard
          $('#typing').text(`\u00A0 is typing...`)
        else
          $('#typing').text("")
      })
    })

    // JavaScript code that handles the search input, fetches autocomplete suggestions, and displays search results 
    document.addEventListener('DOMContentLoaded', () => {
      const searchForm = document.getElementById('search-form');
      const searchInput = document.getElementById('search-criteria');
      const suggestionBox = document.getElementById('suggestion-box');
      const resultsList = document.getElementById('results-list');

      let typingTimer; // Timer identifier
      const typingDelay = 300; // Delay in milliseconds

      // Listen for input in the search criteria field
      searchInput.addEventListener('input', () => {
          // Clear previous suggestions
          suggestionBox.innerHTML = '';

          const searchCriteria = searchInput.value.trim();

          // Clear the timer if the user is typing
          clearTimeout(typingTimer);

          // Set a new timer
          typingTimer = setTimeout(async () => {
              if (searchCriteria.length < 3) {
                  // Don't perform a search if the input is less than 3 characters
                  return;
              }

              try {
                  const response = await fetch('/search', {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ searchCriteria })
                  });

                  const data = await response.json();

                  if (data.success && data.results) {
                      // Display suggestions
                      data.results.forEach(result => {
                          const suggestionItem = document.createElement('div');
                          suggestionItem.classList.add('suggestion-item');
                          suggestionItem.textContent = result.fullname; // Display the fullname
                          suggestionItem.onclick = () => {
                              // Fill the input with the selected suggestion
                              searchInput.value = result.fullname; 
                              suggestionBox.innerHTML = ''; // Clear suggestions
                          };
                          suggestionBox.appendChild(suggestionItem);
                      });
                  } else {
                      suggestionBox.innerHTML = '<div class="suggestion-item">No suggestions found</div>';
                  }
              } catch (error) {
                  console.error('Error fetching suggestions:', error);
                  suggestionBox.innerHTML = '<div class="suggestion-item">Error fetching suggestions</div>';
              }
          }, typingDelay);
      });

      // Handle the form submission
      searchForm.addEventListener('submit', async (event) => {
          event.preventDefault(); // Prevent default form submission

          const searchCriteria = searchInput.value.trim();

          // Perform a search request
          try {
              const response = await fetch('/search', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ searchCriteria })
              });

              const data = await response.json();

              // Clear previous results
              resultsList.innerHTML = '';

              if (data.success && data.results) {
                  // Display search results
                  data.results.forEach(result => {
                      const listItem = document.createElement('li');
                      listItem.textContent = `${result.fullname} - ${result.email}`; // Display results (customize as needed)
                      resultsList.appendChild(listItem);
                  });
              } else {
                  resultsList.innerHTML = '<li>No results found</li>';
              }
          } catch (error) {
              console.error('Error fetching results:', error);
              resultsList.innerHTML = '<li>Error fetching results</li>';
          }
      });
    })
  });
});





// displaying messages on the UI
function getMessages() {
  $.get("http://localhost:3300/fetchMessages", (messages) => {
    messages.forEach(displayMessage);
  });
  scrollContainer();
}

// listening to the "message" event
socket.on("message", displayMessage);
// function for diplaying the message on the screen
function displayMessage(message) {
  var fullname = document.querySelector("#fullname").textContent;
  if (message.sender == fullname) {
    $("#messages").append(`<div id="messageContainer1">
                              <div id="messageHeader">
                              <div id="senderName">Me</div>
                              <div id="sentTime">${message.sentTime}</div>
                              </div>
                              <p>${message.message}</p>
                              </div>`);
  } else {
    $("#messages").append(`<div id="messageContainer">
                              <div id="messageHeader">
                              <div id="senderName">${message.sender}</div>
                              <div id="sentTime">${message.sentTime}</div>
                              </div>
                              <p>${message.message}</p>
                              </div>`);
  }
  scrollContainer();
}
// function to get the current date and time
function getCurrentTime() {
  var today = new Date();
  var currentDate = [
    today.getDate(),
    today.getMonth() + 1,
    today.getFullYear(),
  ];
  var currentTime = [today.getHours(), today.getMinutes(), today.getSeconds()];
  //   converting from 24 hours to 12 hours format
  var suffix = currentTime[0] < 12 ? "AM" : "PM"; // using the ternary operator
  currentTime[0] = currentTime[0] < 12 ? currentTime[0] : currentTime[0] - 12;
  // adding zero to the date or month in the currentDate object/array
  currentDate[0] = currentDate[0] < 10 ? "0" + currentDate[0] : currentDate[0];
  currentDate[1] = currentDate[1] < 10 ? "0" + currentDate[1] : currentDate[1];

  // adding zero for when the hours, minutes and/or seconds are less than 10
  currentTime[0] = currentTime[0] < 10 ? "0" + currentTime[0] : currentTime[0];
  currentTime[1] = currentTime[1] < 10 ? "0" + currentTime[1] : currentTime[1];
  currentTime[2] = currentTime[2] < 10 ? "0" + currentTime[2] : currentTime[2];

  // returning the combined date and time
  return currentDate.join("-") + " " + currentTime.join(":") + " " + suffix;
}

// function to send the message to the server
function saveMessage(message) {
  $.post("http://localhost:3300/saveMessage", message);
}
// scrolling to the last message
function scrollContainer() {
  $("#messages").scrollTop($("#messages")[0].scrollHeight);
}