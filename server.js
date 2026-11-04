const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(express.static(__dirname));
const users = new Map();
const rooms = new Map();
const servers = [{
  id: "lobby", name: "Webdisc Topluluğu", owner: "Webdisc", icon: "W",
  channels: [{id:"genel",name:"genel",type:"text"},{id:"sohbet",name:"sohbet",type:"text"},{id:"ses",name:"Ses Odası",type:"voice"}]
}];
function publicUsers(){ return [...users.values()].map(({id,name,status})=>({id,name,status})); }
io.on("connection", socket => {
  socket.on("join-app", name => {
    name = String(name || "Misafir").trim().slice(0,24) || "Misafir";
    users.set(socket.id,{id:socket.id,name,status:"Çevrimiçi"});
    socket.data.name=name;
    socket.join("genel");
    socket.emit("init",{servers,users:publicUsers()});
    io.emit("users",publicUsers());
    socket.to("genel").emit("system",`${name} sohbete katıldı`);
  });
  socket.on("chat-message", data => {
    if(!socket.data.name) return;
    const text=String(data?.text||"").trim().slice(0,1500);
    if(!text) return;
    const channel=String(data.channel||"genel").slice(0,80);
    io.to(channel).emit("message",{id:Date.now()+Math.random(),name:socket.data.name,text,time:new Date().toISOString(),channel});
  });
  socket.on("join-channel", channel => {
    for(const r of socket.rooms) if(r!=="general" && r!=="genel" && r!=="lobby") socket.leave(r);
    socket.join(String(channel).slice(0,80));
  });
  socket.on("create-server", name => {
    const clean=String(name||"Yeni Sunucu").trim().slice(0,32)||"Yeni Sunucu";
    const id="srv-"+Math.random().toString(36).slice(2,9);
    const s={id,name:clean,owner:socket.data.name||"Üye",icon:clean[0].toUpperCase(),channels:[{id:id+"-genel",name:"genel",type:"text"},{id:id+"-ses",name:"Ses Odası",type:"voice"}]};
    servers.push(s); io.emit("servers",servers);
  });
  socket.on("voice-join", room => {
    room=String(room||"voice").slice(0,80);
    socket.join("voice:"+room);
    socket.to("voice:"+room).emit("voice-peer",socket.id);
    socket.emit("voice-users", [...(io.sockets.adapter.rooms.get("voice:"+room)||[])].filter(id=>id!==socket.id));
  });
  socket.on("voice-leave", room => { socket.leave("voice:"+String(room).slice(0,80)); });
  socket.on("rtc-offer", p => io.to(p.to).emit("rtc-offer",{from:socket.id,offer:p.offer}));
  socket.on("rtc-answer", p => io.to(p.to).emit("rtc-answer",{from:socket.id,answer:p.answer}));
  socket.on("rtc-ice", p => io.to(p.to).emit("rtc-ice",{from:socket.id,candidate:p.candidate}));
  socket.on("disconnect",()=>{users.delete(socket.id);io.emit("users",publicUsers());});
});
const port=process.env.PORT||3000;
server.listen(port,()=>console.log(`Webdisc running on http://localhost:${port}`));