const socket = io();

socket.on("serverip", (data) => {
  q(".server-ip").innerHTML = data;
});

q(".properties-server").addEventListener("click", () => {
  socket.emit("NewProperties", [
    { name: "motd", value: q("#MOTD").value },
    { name: "max-players", value: q("#Max").value },
    { name: "difficulty", value: q("#difficulty").value },
    { name: "spawn-npcs", value: q("#SPAWN-NPC").value },
    { name: "spawn-animals", value: q("#SPAWN-ANIMALS").value },
    { name: "spawn-monsters", value: q("#SPAWN-MONSTERS").value },
    { name: "online-mode", value: q("#ONLINE-MODE").value },
    { name: "white-list", value: q("#WHITELIST").value },
    { name: "enable-command-block", value: q("#COMMAND-BLOCKS").value },
  ]);
});

q(".start-server").addEventListener("click", () => {
  socket.emit("StartServer", {});
});
q(".stop-server").addEventListener("click", () => {
  socket.emit("StopServer", {});
});
q(".make-op-button").addEventListener("click", () => {
  socket.emit("OpPlayer", { name: q(".make-op").value });
});
q(".save-server").addEventListener("click", () => {
  socket.emit("SaveServer", {});
});
q(".backup-server").addEventListener("click", () => {
  socket.emit("BackupServer", {});
});
q(".command-button").addEventListener("click", () => {
  socket.emit("CommandIssued", { command: q(".command").value });
});

const serverProperties = [
  "PVP",
  "SPAWN-NPC",
  "SPAWN-ANIMALS",
  "SPAWN-MONSTERS",
  "ONLINE-MODE",
  "WHITELIST",
  "COMMAND-BLOCKS",
];
serverProperties.forEach((curr) => {
  console.log("yes");
  let selectorContainer = document.querySelector(
    ".server-properties-container"
  );
  let label = document.createElement("label");
  let selector = document.createElement("select");
  let on = document.createElement("option");
  let off = document.createElement("option");
  on.innerHTML = "true";
  off.innerHTML = "false";
  on.value = "true";
  off.value = "false";
  selector.name = curr;
  selector.id = curr;
  selector.className = "server-properties";
  label.setAttribute("for", curr);
  label.innerHTML = curr;
  selector.appendChild(on);
  selector.appendChild(off);
  selectorContainer.appendChild(label);
  selectorContainer.appendChild(selector);
});

socket.on("downloaded-properties", (data) => {
  data.forEach((property) => {
    console.log(property.property);
    switch (property.property) {
      case "motd":
        console.log(property);
        q("#MOTD").value = property.value;
        break;
      case "max-players":
        q("#Max").value = property.value;
        break;
      case "difficulty":
        q("#difficulty").value = property.value;
        break;
      case "pvp":
        q("#PVP").value = property.value;
        break;
      case "spawn-npcs":
        q("#SPAWN-NPC").value = property.value;
        break;
      case "spawn-animals":
        q("#SPAWN-ANIMALS").value = property.value;
        break;
      case "spawn-monsters":
        q("#SPAWN-MONSTERS").value = property.value;
        break;
      case "online-mode":
        q("#ONLINE-MODE").value = property.value;
        break;
      case "white-list":
        q("#WHITELIST").value = property.value;
        break;
      case "enable-command-block":
        q("#COMMAND-BLOCKS").value = property.value;
        break;
      default:
        break;
    }
  });
});

/**
 *
 * @param {Element} html
 */
function q(html) {
  return document.querySelector(html);
} /*
function createElements(selectors){
    let selectorList = [];
    selectors.forEach(curr =>{
        document.createElement()
    })
}*/
