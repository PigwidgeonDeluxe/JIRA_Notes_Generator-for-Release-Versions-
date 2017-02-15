var express = require('express');
var app = express();
var https = require('https');
var fs = require('fs');
var bodyParser = require('body-parser');
var ejs = require('ejs');
//global variables
var formattedjson;
var release_epics;
var table_data = {};
//var for column names; allows for easier column addition but jsonformat still needs to be edited
var col_names = ["id", "ch_id", "rfc_name", "state", "priority", "impdate", "assignee", "component"];
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

    //url for getting all Epics //sorts by ASCending and filters by issues that have a production end date in the last seven days and later, or null
    var project_options = {
        host: 'ondhdp.atlassian.net',
        path: "https://ondhdp.atlassian.net/rest/api/2/search?jql=issuetype=Epic%20AND%20project=" + user_response["project_key"] + '%20AND%20issuetype%3DEpic%20AND%20("Production%20End%20Date"%20>%3D%20-7d%20OR%20"Production%20End%20Date"%20%3D%20null)%20ORDER%20BY%20%27Epic%20Name%27%20ASC',
        auth: user_response["username"] + ":" + user_response["password"]
    };

    /// callback functions ///

    project_callback = function(response /*, err*/) {
        var body = '';
        //another chunk of data has been recieved, so append it to `body`
        response.on('data', function(chunk) {
            body += chunk;
        })

        //the whole response has been recieved
        console.log("Response recieved, connection successful.");

        response.on('end', function() {

            console.log("Parsing recieved body for release_epics.");
            //parse the body
            var parsedbody = parse_body(body);

            //get all epics of the project
            release_epics = epic_data(parsedbody["issues"]);
            console.log("Release Epics acquired: " + release_epics);

        }).on('end', function(){ //once the function ends start the second one -- forces sequential execution
            console.log("project_callback END.");
            data_acquire();
        })

        //if (err) {return next(err);}
    }

    //first part of a recursive function that retrieves the data for all the versions
    function table_data_retrieval(response, i /*, err*/){

        //specify options for table data retrieval
        var table_options = {
            host: 'ondhdp.atlassian.net',
            auth: user_response["username"] + ":" + user_response["password"]
        };

        //print error to user
        if (typeof release_epics == "string" | typeof release_epics == "undefined") {
            res.send(release_epics);
            return;
        //if this is the last recurse, send the data and exit the function
        }else if (i == release_epics.length){
            //send the final array with all the tables and their respective data
            console.log("Sending data to front.")
            send_data(table_data);
            return;
        } else { //otherwise continue the recursive function
            request_tabledata(response, table_options, i);
            //console.log(table_data);
        }

        //if (err) {return next(err);}
    }

    //second part of a recursive function that retrieves data for the current version being recursed
    function request_tabledata(response, table_options, i /*, err*/){
        var parsedbody;
        //create a path for each different version
        table_options['path'] = "https://ondhdp.atlassian.net/rest/api/2/search?jql=%22Epic%20Link%22%20=%20" + release_epics[i]["key"];

        table_callback = function(response){

            //perform callback
            var body = '';
            //another chunk of data has been recieved, so append it to `body`
            response.on('data', function(chunk) {
                body += chunk;
            })

            //the whole response has been recieved
            response.on('end', function() {
                console.log("Response recieved, connection successful: " + release_epics[i]["key"]);
                console.log("Parsing recieved body for data.");
                //parse the body
                parsedbody = parse_body(body);
                
            }).on('end', function() {
                //get all required data for current table
                
                table_data[release_epics[i]["key"]] = jsonformat(parsedbody);
                table_data_retrieval(response, (i + 1));
                //return finalbody;
            });
        }

        //perform GET request for getting project id
        var req = https.get(table_options, table_callback)

        req.on('error', (err) => {
            console.log(err);
            res.send(err);
        })
        
        //if (err) {return next(err);}
    }


    ///acquisition functions/// -- created for sequential execution and formatting

    function release_acquire(/*err*/) {
        
        //perform GET request to get projects release versions catch any errors and print them
        var req = https.get(project_options, project_callback)

        req.on('error', (err) => {
            console.log(err);
            res.send(err);
        });
        
        //if (err) {return next(err);}
    }

    function data_acquire(response /*, err*/) {

        //get the data for each version
        table_data_retrieval(response, 0);

        //if (err) {return next(err);}
    }

    

    //send the acquired data to the user with the main page (index.ejs) using ejs 
    function send_data(final_data /*, err*/){
        res.render('index.ejs', {
            release_data: table_data,
            releases: release_epics
        });

        //if (err) {return next(err);}
    }



release_acquire();

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
        outputjson[i][col_names[2]] = '<center><td valign="top">' + inputjson["issues"][i]["fields"]["summary"] + "</td></center>";
        //add state to current array
        outputjson[i][col_names[3]] = inputjson["issues"][i]["fields"]["status"]["name"];
        //add priority to current array
        outputjson[i][col_names[4]] = inputjson["issues"][i]["fields"]["priority"]["name"];
        //add reporter to current array
        if (inputjson["issues"][i]["fields"]["duedate"] != null) {
            outputjson[i][col_names[5]] = inputjson["issues"][i]["fields"]["duedate"];
        } else {
            outputjson[i][col_names[5]] = "N/A";
        }
        //add assignee to current array if an assignee exists
        if (inputjson["issues"][i]["fields"]["assignee"] != null) {
            outputjson[i][col_names[6]] = inputjson["issues"][i]["fields"]["assignee"]["displayName"];
        } else {
            outputjson[i][col_names[6]] = "N/A";
        }

        //add the component type[s]; loop through and add each component or set as N/A if there aren't any
        if (inputjson["issues"][i]["fields"]["components"].length != 0){
            if (inputjson["issues"][i]["fields"]["components"][0]["name"] != null ) {
                outputjson[i][col_names[7]] = [];
                for (x = 0; x <  inputjson["issues"][i]["fields"]["components"].length; x++){
                    outputjson[i][col_names[7]].push(inputjson["issues"][i]["fields"]["components"][x]["name"]);
                }
            } else {
                outputjson[i][col_names[7]] = "N/A";
            }
        } else {
                outputjson[i][col_names[7]] = "N/A";
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
        errormessage = "JSON.parse error: " + err + " ;Check that the given information or port is valid.";
        console.log(errormessage);
        return errormessage;
    }
}

//function that returns all the names of the releases
function epic_data(parsedbody) {
    try {
        data_list = [];
        //go through each version
        for (i = 0; i < parsedbody.length; i++) {
            //get each value and remove dashes
            var preprod_start = month_name(parsedbody[i]["fields"]["customfield_11300"]).replace(/-/g,' ');
            var preprod_end = month_name(parsedbody[i]["fields"]["customfield_11301"]).replace(/-/g,' ');
            var prod_start = month_name(parsedbody[i]["fields"]["customfield_11302"]).replace(/-/g,' ');
            var prod_end = month_name(parsedbody[i]["fields"]["customfield_11303"]).replace(/-/g,' ');
            //add the key and version name to the name list
            data_list.push({"key":parsedbody[i]["key"], 
                "summary":parsedbody[i]["fields"]["summary"],
                "epic":parsedbody[i]["fields"]["customfield_10005"],
                "go_live":prod_end,
                "preprod":[preprod_start, preprod_end],
                "prod":[prod_start, prod_end],
                "duedate":month_name(parsedbody[i]["fields"]["duedate"]).replace(/-/g,' '),
                "status":parsedbody[i]["fields"]["status"]["name"],
            });
        }
        return data_list;
    } catch (err) {
        //if there is an error, print error to console and user and stop execution
        errormessage = "Operational Error: " + err + " ; Check that the user information, project, or URL is valid.";
        console.log(errormessage);
        //return the error message string to trigger error message to user
        return errormessage;
    }
}

//converts month number to month name (format must be yyyy-mm-dd including dash symbols)
function month_name(inputdate){
    //if the inputdate is not undefined
    if (inputdate != undefined){
        var month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        input_array = inputdate.split("-");
        return input_array[0] + "-" + month_names[input_array[1] - 1] + "-" + input_array[2]
    } else {
        return "N/A";
    }
}

//error handling - UNUSED
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

//load server-config.json to get setting for port
fs.readFile('server-conf.json', 'utf8', function(err, data){
    if (err) {
        console.log("Configuration file server-conf.json' not found. Using default port 8081.");
        var settings_port = "8081";
    } else {
        var parsedsettings = parse_body(data);
        var settings_port = parsedsettings["port"];
    } 
    //start server at given port
    var server = app.listen(settings_port, function() {
        var host = server.address().address
        var port = server.address().port
            //print to console server address and port
        console.log("Server listening at http://%s:%s", host, port);

    })
});

