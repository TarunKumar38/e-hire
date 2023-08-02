const express = require('express');
const dotenv = require('dotenv').config();
const http = require('http');
const cors = require('cors');
const request = require('request');
const app = express();
app.use(cors());
const server = http.createServer(app);
const socket = require('socket.io');
const io = socket(server, { cors: { origin: '*' } });

const users = {};

const socketToRoom = {};

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('codeChanged', ([code, roomId]) => {
    socket.broadcast.to(roomId).emit('codeChanged1', code);
  });

  socket.on('outputChanged', ([text, roomId]) => {
    socket.broadcast.to(roomId).emit('outputChanged1', text);
  });

  socket.on('inputChanged', ([text, roomId]) => {
    socket.broadcast.to(roomId).emit('inputChanged1', text);
  });

  socket.on('submit-code', ([data, roomId]) => {
    request(
      {
        url: process.env.COMPILER_API_URL,
        method: 'POST',
        json: data,
      },
      function (error, response, body) {
        io.to(roomId).emit('recieve-output', body);
      }
    );
  });

  socket.on('join room', (roomID) => {
    if (users[roomID]) {
      const length = users[roomID].length;
      if (length === 4) {
        socket.emit('room full');
        return;
      }
      users[roomID].push(socket.id);
    } else {
      users[roomID] = [socket.id];
    }
    socketToRoom[socket.id] = roomID;
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);

    socket.emit('all users', usersInThisRoom);
  });

  socket.on('sending signal', (payload) => {
    io.to(payload.userToSignal).emit('user joined', {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on('returning signal', (payload) => {
    io.to(payload.callerID).emit('receiving returned signal', {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on('disconnect', () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
    }
  });
});

server.listen(process.env.PORT);
