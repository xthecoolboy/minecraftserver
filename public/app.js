const socket = io();



socket.on('serverip',(data)=>{
    q('.server-ip').innerHTML = data;
})

q(".start-server").addEventListener("click",()=>{
        socket.emit('StartServer',{});
})
q(".stop-server").addEventListener("click",()=>{
        socket.emit('StopServer',{});
})
q(".make-op-button").addEventListener("click",()=>{
    socket.emit('OpPlayer',{name: q(".make-op").value});
})
q(".save-server").addEventListener("click",()=>{
    socket.emit('SaveServer',{});
})
q(".backup-server").addEventListener("click",()=>{
    socket.emit('´BackupServer',{});
})
q(".command-button").addEventListener("click",()=>{
    socket.emit('CommandIssued',{command: q(".command").value});
})



const serverProperties =[
    "PVP","SPAWN NPC","SPAWN ANIMALS","SPAWN MONSTERS","BROADCAST ACHIEVEMENTS","ONLINE MODE","WHITELIST","COMMAND BLOCKS"
]
serverProperties.forEach(curr => {
    console.log("yes");
    let selectorContainer = document.querySelector(".server-properties-container");
    let label = document.createElement("label");
    let selector = document.createElement("select");
    let on =document.createElement("option");
    let off =document.createElement("option");

    on.innerHTML = "ON"
    off.innerHTML = "OFF"
    on.value = "true";
    off.value = "false";
    selector.name = curr;
    selector.id = curr;
    selector.className = 'server-properties'
    label.setAttribute('for',curr);
    label.innerHTML = curr;
    selector.appendChild(on)
    selector.appendChild(off);
    selectorContainer.appendChild(label);
    selectorContainer.appendChild(selector);

})
/**
 * 
 * @param {Element} html 
 */
function q(html) {
    return document.querySelector(html);
}/*
function createElements(selectors){
    let selectorList = [];
    selectors.forEach(curr =>{
        document.createElement()
    })
}*/