const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const path = require("path");
const fs = require("fs");
const cp = require("child_process");
const fetch = require("isomorphic-fetch");
const Zip = require("adm-zip");
const exec = cp.exec;
var Dropbox = require("dropbox").Dropbox;
var dbx = new Dropbox({
  fetch: fetch,
  accessToken:
    "tGNdy6kRMnAAAAAAAAAALDeEkLl4GymkETKTwgLUE3tIkCqK7OQij4TymHs9oRrp",
});
var child;
const PORT = process.env.PORT || "5000";
const dir = path.join(__dirname, "server.jar");
if (!fs.existsSync("./server_data")) {
  fs.mkdirSync("server_data");
}
console.log("NAME OF DIR : ", dir);
app.use(express.static(path.join(__dirname, "public")));

const socketIoHandler = () => {
  io.on("connection", (socket) => {
    socket.on("StartServer", (data) => {
      console.log("Initialazing");
      dbx.filesDownload({ path: "/mcserver.jar" }).then((serverJar) => {
        fs.writeFile("/", serverJar.fileBinary, () => {
          dbx
            .filesDownload({ path: "/world.zip" })
            .then((worldFile) => {
              ExtractZipFile(worldFile);
            })
            .catch((err) => {
              console.log("No backup found, creating new world");
              ExecuteServerJar();
            });
        });
      });
    }); /*
    socket.on("StopServer", async (data) => {
      console.log("Stopping server");
      child.stdin.write("stop\n");
      var zip = new Zip();
      zip.addLocalFolder("./server_data/");
      zip.writeZip("world.zip", (err) => {
        fs.readFile("world.zip", (err, res) => {
          console.log("Making Backup");
          dbx
            .filesUpload({
              path: "/world.zip",
              contents: zip.toBuffer(),
              mode: { ".tag": "overwrite" },
            })
            .then((res) => {
              console.log("Backup Complete");
            });
        });
      });
    });*/
    socket.on("StopServer", async (data) => {
      console.log("Stopping server");
      child.stdin.write("stop\n");
      var zip = new Zip();
      zip.addLocalFolder("./server_data/");
      console.log("Making Backup");
      dbx
        .filesUpload({
          path: "/world.zip",
          contents: zip.toBuffer(),
          mode: { ".tag": "overwrite" },
        })
        .then((res) => {
          console.log("Backup Complete");
        });
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
  zip.extractAllToAsync("./server_data", true, (err) => {
    ExecuteServerJar();
  });
};

const ExecuteServerJar = () => {
  createServerConfig();
  console.log("Starting Server");
  child = exec(
    "javaw -Xms512M -Xmx512M -jar " +
      path.join(__dirname, "mcserver.jar") +
      " nogui",
    {
      cwd: "./server_data/",
    }
  );
  child.stdout.on("data", (data) => {
    console.log(data);
  });
  child.stderr.on("data", (data) => {
    console.log(data);
  });
};
const createServerConfig = () => {
  fs.writeFile("./server_data/eula.txt", "eula=true", () => {});
  //fs.writeFile("./server_data/server.properties", "");
};
socketIoHandler();

server.listen(PORT, () => console.log("SERVER RUNNING ON PORT : " + PORT));
