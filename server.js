var express = require('express');
var app = express();
var https = require('https');
var fs = require('fs');
var bodyParser = require('body-parser');
var ejs = require('ejs');
//global variables
var formattedjson;
var release_versions;
var table_data = {};
//var for column names; allows for easier column addition but jsonformat still needs to be edited
var col_names = ["id", "ch_id", "rfc_name", "description", "state", "priority", "impdate", "assignee", "effort"];
//
//set view engine to ejs
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static('public'));


//send CSS for global html formatting
app.get('/globalstyle.css', function(req, res) {
    //send homepage
    res.sendFile(__dirname + "/globalstyle.css");
})

//send CSS for global html formatting
app.get('/jquery.min.js', function(req, res) {
    //send homepage
    res.sendFile(__dirname + "/node_modules/jquery/dist/jquery.min.js");
})

//send CSS for global html formatting
app.get('/jquery-ui.min.css', function(req, res) {
    //send homepage
    res.sendFile(__dirname + "/jquery-ui-1.12.1/jquery-ui.min.css");
})

//send CSS for global html formatting
app.get('/jquery.js', function(req, res) {
    //send homepage
    res.sendFile(__dirname + "/node_modules/jquery/dist/jquery.js");
})

//send CSS for global html formatting
app.get('/jquery-ui.min.js', function(req, res) {
    //send homepage
    res.sendFile(__dirname + "/jquery-ui-1.12.1/jquery-ui.min.js");
})

//send tabulator css file
app.get('/tabulator.css', function(req, res) {
    //send homepage
    res.sendFile(__dirname + "/tabulator-master/tabulator.css");
})

//send tabulator js file
app.get('/tabulator.js', function(req, res) {
    //send homepage
    res.sendFile(__dirname + "/tabulator-master/tabulator.js");
})

//send ejs js file
app.get('/ejs.js', function(req, res) {
    //send homepage
    res.sendFile(__dirname + "/" + "ejs.js");
})

//send home/landing page to user
app.get('/', function(req, res) {
    //send homepage
    res.sendFile(__dirname + "/" + "homepage.html");
})

//page for printing
app.get('/printpage', function(req, res) {
    //res.end(JSON.stringify(formattedjson));
    //send the JSON along with the table ejs

    res.render('printable.ejs', {
        jsondata: formattedjson,
        columns: {
            col: col_names
        }
    });
})

//request the page
app.post('/response', function(req, res, next) {

    //get information from user submission
    user_response = {
        username: req.body.user_query,
        password: req.body.pw_query,
        project_key: req.body.pk_query
    };

    //url for getting all project IDs
    var id_options = {
        host: 'ondhdp.atlassian.net',
        path: "/rest/api/2/project",
        auth: user_response["username"] + ":" + user_response["password"]
    };

    var project_options;
    var project_id;

    /// callback functions ///

    id_callback = function(response) {
        var body = '';
        //another chunk of data has been recieved, so append it to `body`
        response.on('data', function(chunk) {
            body += chunk;
        })

        //the whole response has been recieved
        console.log("Response recieved, connection successful.");

        response.on('end', function() {

            console.log("Parsing recieved body for IDs.");
            //parse the body
            var parsedbody = parse_body(body);
            //get the requested project's id and store it in a global var
            project_id = id_finder(parsedbody, user_response["project_key"]);
            console.log("Project ID acquired: " + project_id);
            //res.send(project_id);
            return;

        }).on('end', function(){ //perform on the end of id_callback -- forces sequential execution
            project_options = id_options;
            project_options["path"] += "/" + project_id;
            console.log("id_callback END.");
            release_acquire();
        });
        
    }

    project_callback = function(response) {
        var body = '';
        //another chunk of data has been recieved, so append it to `body`
        response.on('data', function(chunk) {
            body += chunk;
        })

        //the whole response has been recieved
        console.log("Response recieved, connection successful.");

        response.on('end', function() {

            console.log("Parsing recieved body for release_versions.");
            //parse the body
            var parsedbody = parse_body(body);
            //get all release versions of the project
            release_versions = version_finder(parsedbody["versions"]);
            console.log("Release Versions acquired: " + release_versions);
            //res.send(release_versions);

        }).on('end', function(){ //once the function ends start the second one -- forces sequential execution
            console.log("project_callback END.");
            data_acquire();
        })

    }

    //first part of a recursive function that retrieves the data for all the versions
    function table_data_retrieval(response, i){

        //specify options for table data retrieval
        var table_options = {
            host: 'ondhdp.atlassian.net',
            auth: user_response["username"] + ":" + user_response["password"]
        };

        //if this is the last recurse, send the data and exit the function
        if (i == release_versions.length){
            //return the final array with all the tables and their respective data
            //return table_data;
            send_data(table_data);
            return;
        } else { //otherwise continue the recursive function
            request_tabledata(response, table_options, project_id, i);
            //console.log(table_data);
        }
    }

    //second part of a recursive function that retrieves data for the current version being recursed
    function request_tabledata(response, table_options, project_id, i){
        var parsedbody;
        //create a path for each different version
        table_options['path'] = "/rest/api/2/search?jql=project=" + project_id + "%20AND%20fixVersion%20in%20('" + release_versions[i].replace(/ /g, "%20") + "')";
        //console.log(table_options);

        table_callback = function(response){

            //perform callback
            var body = '';
            //another chunk of data has been recieved, so append it to `body`
            response.on('data', function(chunk) {
                body += chunk;
            })

            //the whole response has been recieved
            response.on('end', function() {
                console.log("Response recieved, connection successful: " + release_versions[i]);
                console.log("Parsing recieved body for data.");
                //parse the body
                parsedbody = parse_body(body);
                //console.log(parsedbody)
            }).on('end', function() {
                //get all required data for current table
                
                table_data[release_versions[i]] = jsonformat(parsedbody);
                table_data_retrieval(response, (i + 1));
                //return finalbody;
            });
        }

        //perform GET request for getting project id
        https.get(table_options, table_callback).on('error', (err) => {
            console.log(err);
            res.send(err);
        })
        
    }


    function send_data(final_data){
        //res.send(final_data);
       //.on('end', function(){ //once the last function ends, send the data
	    res.render('index.ejs', {
	        release_data: table_data,
	        releases: release_versions
	    });
        //}) 
    }


    ///acquisition functions/// -- created for sequential execution and formatting

    function id_acquire(){

        //perform GET request to get project id catch any errors and print them
        https.get(id_options, id_callback).on('error', (err) => {
            console.log(err);
            res.send(err);
        });
    }

    function release_acquire() {

        //perform GET request to get projects release versions catch any errors and print them
        https.get(project_options, project_callback).on('error', (err) => {
            console.log(err);
            res.send(err);
        });
    }

    function data_acquire(response) {

        //get the data for each version
        table_data_retrieval(response, 0);
    }


    

id_acquire();

})

//function that takes the JIRA JSON, then takes and formats the data for the table
function jsonformat(inputjson) {
    //create new list for final json output
    var outputjson = [];
    //loop for all issues
    //console.log(inputjson);
    for (i = 0; i < inputjson["issues"].length; i++) {
        //create a new array for current i
        outputjson.push({});
        //add id to current array
        outputjson[i][col_names[0]] = i;
        //add change id to current array
        outputjson[i][col_names[1]] = inputjson["issues"][i]["key"];
        //add rfc_name to current array
        outputjson[i][col_names[2]] = inputjson["issues"][i]["fields"]["summary"];
        //add description fields to current array
        outputjson[i][col_names[3]] = "";
        for (x = 0; x <= 8; x++) {
            //if the field isn't empty
            if (inputjson["issues"][i]["fields"]["customfield_1040" + x] != null) {
                //add the appropriate decription name for each description entry. ie 10402 us Business Impact
                if (x == 0) {
                    var desc_name = " Business Objective and Rationale: "
                } else if (x == 1) {
                    var desc_name = " Business Requirements: "
                } else if (x == 2) {
                    var desc_name = " Business Impact: "
                } else if (x == 3) {
                    var desc_name = " End User Impact: "
                } else if (x == 4) {
                    var desc_name = " Business/User Impact If Change Is Not Done: "
                } else if (x == 5) {
                    var desc_name = " Risk Assessment: "
                } else if (x == 6) {
                    var desc_name = " Solution: "
                } else if (x == 8) {
                    var desc_name = " Benefits: "
                }
                //add the formatted decription to the array
                outputjson[i]["description"] += desc_name + inputjson["issues"][i]["fields"]["customfield_1040" + x] + "\n" + "\n";
            }
        }
        //add the description as the description if it is not empty
        if (inputjson["issues"][i]["fields"]["description"] != null) {
            //add the formatted decription to the array
            outputjson[i]["description"] += " Description: " + inputjson["issues"][i]["fields"]["description"] + "\n" + "\n";
        }
        //add state to current array
        outputjson[i][col_names[4]] = inputjson["issues"][i]["fields"]["status"]["name"];
        //add priority to current array
        outputjson[i][col_names[5]] = inputjson["issues"][i]["fields"]["priority"]["name"];
        //add reporter to current array
        if (inputjson["issues"][i]["fields"]["duedate"] != null) {
            outputjson[i][col_names[6]] = inputjson["issues"][i]["fields"]["duedate"];
        } else {
            outputjson[i][col_names[6]] = "N/A";
        }
        //add assignee to current array if an assignee exists
        if (inputjson["issues"][i]["fields"]["assignee"] != null) {
            outputjson[i][col_names[7]] = inputjson["issues"][i]["fields"]["assignee"]["displayName"];
        } else {
            outputjson[i][col_names[7]] = "N/A";
        }
        //add the amount of effort/cost (estimate days * 900) if an estimation exists
        if (inputjson["issues"][i]["fields"]["customfield_10506"] != null) {
            outputjson[i][col_names[8]] = "$ " + parseFloat(inputjson["issues"][i]["fields"]["customfield_10506"]) * 900;
        } else {
            outputjson[i][col_names[8]] = "N/A";
        }

    }
    return outputjson;
}

//function that parses the body
function parse_body(body) {
    //try parsing the response; catch any errors
    try {
        var parsedbody = JSON.parse(body)
        return parsedbody;
    } catch (err) {
        //if there is an error, print error to console and user and stop execution
        errormessage = "JSON.parse error: " + err
        console.log(errormessage);
        throw UserException(errormessage + "Check that the user information or URL is valid.");
        return;
    }
}

//function that searches and finds a project's id based on the project key
function id_finder(parsedbody, key) {
    //go through each project
    for (i = 0; i < parsedbody.length; i++) {
        //if the project is found
        if (parsedbody[i]["key"] == key) {
            //return the project's id
            return parsedbody[i]["id"];
        }
    }
    //if the loop has gone through each project and the key has not been found
    throw UserException("404 Not Found: The given project key was not found. Please double check and try again.");
    return;
}

//function that returns all the names of the releases
function version_finder(parsedbody) {
    name_list = [];
    //go through each version
    for (i = 0; i < parsedbody.length; i++) {
        //add the version name to the name list
        name_list.push(parsedbody[i]["name"]);
    }
    return name_list;
}



//error message
function UserException(message, res) {
    console.log(message);
    //res.end(message);
    return;
}


//start server at port 8081
var server = app.listen(8081, function() {

    var host = server.address().address
    var port = server.address().port
        //print to console server address and port
    console.log("Server listening at http://%s:%s", host, port);

})