//NODE NATIVE MODULES

const path = require("path");
const fs = require("fs");
const cp = require("child_process");

//SERVER SIDE
const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
//SERVER SIDE

//DROPBOX
var Dropbox = require("dropbox").Dropbox;
const fetch = require("isomorphic-fetch");
//END DROPBOX

//KEEPING ALIVE SERVER AND BACKUPS
const Cron = require("cron").CronJob;
const axios = require("axios");
//END KEEPING ALIVE SERVER
//ZIPPING FILES
const Zip = require("adm-zip");
//END ZIPPING FILES
//END NPM INSTALLED MODULES

//MY MANAGERS IMPORTS
const Ngrok = require("./ngrokManager");
const State = require("./ServerStateManager");

//Initialize ngrok
const ngrok = new Ngrok(
  "tcp",
  "1cSMJNUrNTcgwynxtmpK3b3XNAu_7RAw7CfnKCSN7ZsEoVK8N",
  "25565"
);
//Initialize state manager
const state = State();
//Initialize express
const exec = cp.exec;
//Initialize Cronjob
var job = new Cron({
  cronTime: "*/5 * * * *",
  onTick: () => {
    BackupServer();
    axios.get("https://mcserverdmj.herokuapp.com/").then((res) => {
      console.log("Pinging each 5 minutes");
    });
  },
  start: false,
});

var dbx = new Dropbox({
  fetch: fetch,
  accessToken:
    "tGNdy6kRMnAAAAAAAAAALDeEkLl4GymkETKTwgLUE3tIkCqK7OQij4TymHs9oRrp",
});
var child;
const PORT = process.env.PORT || "5000";
var url;
if (!fs.existsSync(path.join(__dirname, "server_data"))) {
  fs.mkdirSync(path.join(__dirname, "server_data"));
}

app.use(express.static(path.join(__dirname, "public")));

const socketIoHandler = () => {
  io.on("connection", (socket) => {
    url = ngrok.GetUrl();
    UpdateOnNewConnection(socket);
    SendServerPropetiesToClient(socket);
    UpdateServerPropertiesStorage(socket);

    socket.on("StartServer", async (data) => {
      if (state.CurrentState() === state.GetStates().stopped) {
        console.log("Initialazing");
        state.ChangeState(state.GetStates().starting);
        socket.emit("serverStatus", state.CurrentState());
        console.log(state.CurrentState());
        Promise.all([
          DownloadMinecraftJar(data.link),
          DownloadMinecraftWorld().catch((err) => {
            console.log("World not found creating a new one");
            StartServer(socket);
          }),
        ]).then(async () => {
          StartServer(socket);
        });
      } else {
        console.log("The server is already online or is starting");
      }
    });

    socket.on("StopServer", async (data) => {
      StopServer();
    });
    socket.on("BackupServer", async (data) => {
      BackupServer();
    });
    socket.on("OpPlayer", (data) => {
      if (state.CurrentState() === state.GetStates().started) {
        console.log("Opping Player");
        child.stdin.write(`op ${data.name}\n`);
      } else {
        console.log("The server has to be online to perform actions");
      }
    });
    socket.on("SaveServer", (data) => {
      if (state.CurrentState() === state.GetStates().started) {
        console.log("Saving server");
        child.stdin.write("save-all\n");
      } else {
        console.log("The server has to be online to perform actions");
      }
    });
    socket.on("CommandIssued", (data) => {
      if (state.CurrentState() === state.GetStates().started) {
        console.log("Issuing Command");
        child.stdin.write(data.command + "\n");
      } else {
        console.log("The server has to be online to perform actions");
      }
    });
  });
};

const ExecuteServerJar = async (socket) => {
  await createServerConfig();
  console.log("Starting Server");
  child = exec(
    "java -Xms512M -Xmx512M -jar " +
      path.join(__dirname, "mcserver.jar") +
      " nogui",
    {
      cwd: path.join(__dirname, "server_data"),
    }
  );
  child.stdout.on("data", (data) => {
    if (data.indexOf("Done") !== -1) {
      console.log("Server has started, now joinable");
      state.ChangeState(state.GetStates().started);
      job.start();
      socket.emit("serverStatus", state.CurrentState());
    }
    console.log(data);
  });
  child.stderr.on("data", (data) => {
    job.stop();
    console.log(data);
  });
};

const StartServer = async (socket) => {
  await ngrok.Start();
  url = ngrok.GetUrl();
  console.log(ngrok.GetUrl());
  socket.emit("serverIp", url);
  ExecuteServerJar(socket);
};
const StopServer = async () => {
  if (state.CurrentState() === state.GetStates().started) {
    state.ChangeState(state.GetStates().stopped);
    job.stop()
    socket.emit("serverStatus", state.CurrentState());
    console.log("Stopping server");
    await BackupServer();
    child.stdin.write("stop\n");
    url = "";
    socket.emit("serverip", url);
  } else {
    console.log("Server hasn't started");
  }
};
const BackupServer = async () => {
  if (state.CurrentState() === state.GetStates().started) {
    SaveServer();
    setTimeout(() => {
      console.log("Beginning server backup ");
      var zip = new Zip();
      zip.addLocalFolder(path.join(__dirname, "server_data"));
      dbx
        .filesUpload({
          path: "/world.zip",
          contents: zip.toBuffer(),
          mode: { ".tag": "overwrite" },
        })
        .then((res) => {
          console.log("Backup Complete");
        });
    }, 3000);
  } else {
    console.log("Server has to be online to backup");
  }
};

const DownloadMinecraftJar = (linkToVersion) => {
  return new Promise((resolve, reject) => {
    let stream = fs.createWriteStream("server.jar");
    axios
      .get(linkToVersion)
      .then((res) => {
        res.pipe(stream);
        resolve();
      })
      .catch((err) => reject());
  });
};
const DownloadMinecraftWorld = () => {
  return dbx.filesDownload({ path: "/world.zip" }).then((worldFile) => {
    var zip = new Zip(worldFile.fileBinary);
    console.log("Extracting world");
    zip.extractAllToAsync(
      path.join(__dirname, "server_data"),
      true,
      (err) => {}
    );
  });
};

const SaveServer = () => {
  console.log("Saving server");
  child.stdin.write("save-all\n");
};
const createServerConfig = () => {
  return new Promise((resolve, reject) => {
    fs.writeFile(
      path.join(__dirname, "server_data", "eula.txt"),
      "eula=true",
      (err) => {}
    );
    dbx
      .filesDownload({ path: "/server.properties" })
      .then((data) => {
        fs.writeFile(
          path.join(__dirname, "server_data", "server.properties"),
          data.fileBinary,
          () => {
            resolve();
          }
        );
      })
      .catch((err) => reject());
  });
};
const SendServerPropetiesToClient = (socket) => {
  dbx.filesDownload({ path: "/server.properties" }).then((properties) => {
    fs.writeFile(
      path.join(__dirname, "server_data", "server.properties"),
      properties.fileBinary,
      (err) => {
        fs.readFile(
          path.join(__dirname, "server_data", "server.properties"),
          "utf8",
          (err, data) => {
            let listOfProperties = [];
            let tmp = data.split("\n");
            tmp.forEach((res) => {
              let property = res.split("=");
              listOfProperties.push({
                property: property[0],
                value: property[1],
              });
            });
            socket.emit("downloaded-properties", listOfProperties);
          }
        );
      }
    );
  });
};
const UpdateServerPropertiesStorage = (socket) => {
  socket.on("NewProperties", (data) => {
    let newProperties = "";
    Promise.all(
      data.map((property) => {
        newProperties += `${property.name}=${property.value}\n`;
      })
    ).then((res) => {
      fs.writeFile(
        path.join(__dirname, "server.properties"),
        newProperties,
        (err) => {
          fs.readFile(
            path.join(__dirname, "server.properties"),
            "utf8",
            (err, res) => {
              dbx
                .filesUpload({
                  path: "/server.properties",
                  contents: res,
                  mode: { ".tag": "overwrite" },
                })
                .then((res) => {
                  console.log("updated properties");
                });
            }
          );
        }
      );
    });
  });
};
const UpdateOnNewConnection = (socket) => {
  socket.emit("serverStatus", state.CurrentState());
  if (url !== "") {
    socket.emit("serverIp", url);
  }
};

socketIoHandler();

server.listen(PORT, () => console.log("SERVER RUNNING ON PORT : " + PORT));
