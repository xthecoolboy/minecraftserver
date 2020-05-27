const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const path = require("path");
const fs = require("fs");
const cp = require("child_process");
const fetch = require("isomorphic-fetch");
const ngrok = require("ngrok");
const cron = require("node-cron");
const Zip = require("adm-zip");
const exec = cp.exec;
var Dropbox = require("dropbox").Dropbox;
const axios = require("axios");
var dbx = new Dropbox({
  fetch: fetch,
  accessToken:
    "tGNdy6kRMnAAAAAAAAAALDeEkLl4GymkETKTwgLUE3tIkCqK7OQij4TymHs9oRrp",
});
var child;
const PORT = process.env.PORT || "5000";
const dir = path.join(__dirname, "server.jar");
var url;
var isTheServerOn = false;
if (!fs.existsSync(path.join(__dirname, "server_data"))) {
  fs.mkdirSync(path.join(__dirname, "server_data"));
}
console.log("NAME OF DIR : ", dir);
app.use(express.static(path.join(__dirname, "public")));

const socketIoHandler = () => {
  io.on("connection", (socket) => {
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
              let a = data.split("\n");
              a.forEach((res) => {
                let b = res.split("=");
                listOfProperties.push({ property: b[0], value: b[1] });
              });
              console.log(listOfProperties);
              socket.emit("downloaded-properties", listOfProperties);
            }
          );
        }
      );
    });
    socket.emit("serverip", url);
    socket.on("NewProperties", (data) => {
      let string = "";
      Promise.all(
        data.map((property) => {
          string += `${property.name}=${property.value}\n`;
        })
      ).then((res) => {
        fs.writeFile(
          path.join(__dirname, "server.properties"),
          string,
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
    socket.on("StartServer", async (data) => {
      if (!isTheServerOn) {
        url = await ngrok.connect({
          proto: "tcp",
          authtoken: "1cSMJNUrNTcgwynxtmpK3b3XNAu_7RAw7CfnKCSN7ZsEoVK8N",
          addr: 25565,
        });
        socket.emit("serverip", url);
        console.log(url);
        console.log("Initialazing");
        dbx.filesDownload({ path: "/mcserver.jar" }).then((serverJar) => {
          fs.writeFile(
            path.join(__dirname, "mcserver.jar"),
            serverJar.fileBinary,
            () => {
              dbx
                .filesDownload({ path: "/world.zip" })
                .then((worldFile) => {
                  ExtractZipFile(worldFile);
                })
                .catch((err) => {
                  console.log("No backup found, creating new world");
                  ExecuteServerJar();
                });
            }
          );
        });
      }
    });
    socket.on("StopServer", async (data) => {
      if (isTheServerOn) {
        await backupServer();
        isTheServerOn = false;
        console.log("Stopping server");
        child.stdin.write("stop\n");
      } else {
        console.log("Server hasn't started");
      }
    });
    socket.on("BackupServer", async (data) => {
      if (isTheServerOn) {
        console.log("Backing up server");
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
      } else {
        console.log("server has to be online to backup");
      }
    });
    socket.on("OpPlayer", (data) => {
      console.log("Opping Player");
      child.stdin.write(`op ${data.name}\n`);
    });
    socket.on("SaveServer", (data) => {
      console.log("Saving server");
      child.stdin.write("save-all\n");
    });
    socket.on("CommandIssued", (data) => {
      console.log("Issuing Command");
      child.stdin.write(data.command + "\n");
    });
  });
};

const ExtractZipFile = (zipBinary) => {
  console.log("Found Backup");
  var zip = new Zip(zipBinary.fileBinary);
  console.log("Extracting world");
  zip.extractAllToAsync(path.join(__dirname, "server_data"), true, (err) => {
    ExecuteServerJar();
  });
};

const ExecuteServerJar = () => {
  createServerConfig();
  cron.schedule("*/5 * * * *", () => {
    backupServer();
    axios.get("https://mcserverdmj.herokuapp.com/").then((res) => {
      console.log("Pinging each 5 minutes");
    });
  });
  isTheServerOn = true;
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
    console.log(data);
  });
  child.stderr.on("data", (data) => {
    console.log(data);
  });
};
const backupServer = async () => {
  SaveServer();
  setTimeout(() => {
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
};
const SaveServer = () => {
  console.log("Saving server");
  child.stdin.write("save-all\n");
};
const createServerConfig = () => {
  fs.writeFile(path.join(__dirname, "server_data"), "eula=true", (err) => {});
  dbx.filesDownload({ path: "/server.properties" }).then((data) => {
    fs.writeFile(
      path.join(__dirname, "server_data", "server.properties"),
      data.fileBinary,
      () => {}
    );
  });
};
socketIoHandler();

server.listen(PORT, () => console.log("SERVER RUNNING ON PORT : " + PORT));
