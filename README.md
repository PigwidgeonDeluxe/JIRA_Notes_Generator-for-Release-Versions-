# JIRA Release Notes Generator (using Epics)
Latest Version: V 0.7.1 - added center formatting to rfc_name column data and colours for Scope
## Synopsis
JIRA Release Notes Generator is a webapp for viewing release versions on JIRA for a given project.

## Motivation
This webapp was created to fulfill the need of creating tables for release version meeting notes.

## Note
This webapp does not have HTTPS for communication between the webapp and the user. This webapp only uses HTTPS for communicating with JIRA. 
As such, it is recommended only to use this webapp on a trusted secure network, or on the user's computer.

## Prerequisites
#### This webapp requires:
- npm
- node.js
- jquery (included)

#### Node.js dependencies (included as zip folders):
- body-parser
- ejs
- express
- jquery.tabulator

## Installation
0. Download node.js and npm; go to https://nodejs.org/en/ to download Node.js and https://nodejs.org/en/download/ to download npm. Administrator privileges will be required.
1. Download the webapp and install the prerequisites; use the "install" command in npm (or extract node_modules.zip) and extract the archive named jquery-ui-1.12.1 to its respectively named folder.
2. Run the webapp from a command prompt or terminal; open cmd/terminal, cd  to the webapp directory, and start the webapp using "node server.js" (without quotes).
3. The webapp should start on localhost port 8081 (localhost:8081). A different address can be specified by editing the server configuration file "server-conf.json", and may have to be altered if the default port is already taken. The webapp is tailored for a specific JIRA so custom fields may differ from other JIRAs.

##Troubleshooting Tips
###ETIMEDOUT
This means that the webapp was unable to connect to the JIRA API. Doublecheck the webapp's internet connection to see if there are any proxies or firewalls blocking the connection.
###JSON.parse error
This means that the returned JSON from JIRA was invalid. This usually means that the username or password you entered was incorrect. The least common reason would be an incorrect URL should the JIRA API ever be changed.

## Built With
This webapp was built with Tabulator using a custom CSS theme (borderless). The latest version of Tabulator can be found here: http://olifolkerd.github.io/tabulator/ and currently is used with this project under the MIT License. A copy of Tabulator and its original License is included in this Github. All credit for Tabulator goes to olifolkerd.

## License
This project is licensed under the MIT license. Refer to LICENSE.md for details.


##Screenshots
***
###Login Page
![Login Page](screenshots/jira release note generator login.png)
###Main Page
![Main Page](screenshots/jira release note generator table.png)
###File Directory Example
![File Directory Example](screenshots/file directory example.png)
***
