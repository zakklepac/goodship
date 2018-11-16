const express = require('express')
const http = require('http')
const socketIO = require('socket.io')

// our localhost port
const PORT = process.env.PORT || 4001;

const app = express()

// our server instance
const server = http.createServer(app)

// This creates our socket using the instance of the server
const io = socketIO(server)

let queue = [];    // list of sockets waiting for peers
let rooms = {};    // map socket.id => room

function findPeerForLoneSocket(socket) {
  if (queue.length) {
    let peer = queue.pop();
    let room = socket.id + '#' + peer.id;
    let isFirstPlayer = true;
    peer.join(room);
    socket.join(room);
    rooms[peer.id] = room;
    rooms[socket.id] = room;
    peer.emit('start game', isFirstPlayer);
    socket.emit('start game', !isFirstPlayer);
  } else {
    queue.push(socket);
  }
}

function getPeer(room, socket) {
  let peer = room.split('#');
  return peer[0] === socket ? peer[1] : peer[0];
}

// This is what the socket.io syntax is like, we will work this later
io.on('connection', (socket) => {
  console.log('User ' + socket.id + ' connected');
  socket.on('add player', () => {
    findPeerForLoneSocket(socket);
  });
  socket.on('send hit', (x, y) => {
    let room = rooms[socket.id];
    let peer = getPeer(room, socket.id);
    socket.broadcast.to(peer).emit('check hit', x, y);
  });
  socket.on('send result', (points) => {
    let room = rooms[socket.id];
    let peer = getPeer(room, socket.id);
    socket.broadcast.to(peer).emit('hit result', points);
  });
  socket.on('disconnect', () => {
    console.log('User ' + socket.id + ' disconnected');
    let room = rooms[socket.id];
    if (room !== undefined) {
      socket.leave(room);
      let peer = getPeer(room, socket.id);
      // send disconnect message
      // queue.push(peer);
      // delete room
    }
  });
});

server.listen(PORT, () => console.log(`whats good ${PORT}`))