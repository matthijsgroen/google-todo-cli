const fs = require("fs");
const path = require("path");
const readline = require("readline");
const homedir = require("os").homedir();

const folderPreferences = [process.env.XDG_CONFIG_HOME, homedir].filter(
  Boolean
);

const { google } = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/tasks"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.

const settingsPath = path.join(folderPreferences[0], ".google-task-cli");
const TOKEN_PATH = path.join(settingsPath, "token.json");

const setupCompleted = () => {
  if (!fs.existsSync(settingsPath)) {
    fs.mkdirSync(settingsPath);
  }
  const credentialsPath = path.join(settingsPath, "credentials.json");
  return fs.existsSync(credentialsPath);
};

const setup = pathToCredentials => {
  if (!fs.existsSync(pathToCredentials)) return false;
  const credentialsPath = path.join(settingsPath, "credentials.json");
  fs.copyFileSync(pathToCredentials, credentialsPath);
  return true;
};

const getTaskService = () =>
  new Promise((resolve, reject) => {
    if (!fs.existsSync(settingsPath)) {
      fs.mkdirSync(settingsPath);
    }
    const credentialsPath = path.join(settingsPath, "credentials.json");

    // Load client secrets from a local file.
    fs.readFile(credentialsPath, (err, content) => {
      if (err) return reject(err);
      // Authorize a client with credentials, then call the Google Tasks API.
      authorize(JSON.parse(content), auth => {
        const service = google.tasks({ version: "v1", auth });
        resolve(service);
      });
    });
  });

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question("Enter the code from that page here: ", code => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
        if (err) return console.error(err);
        console.log("Token stored to", TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

module.exports = {
  getTaskService,
  setupCompleted,
  setup
};
