const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const bodyParser = require("body-parser");
const cors = require("cors");
const PORT = process.env.PORT || 5000;
const morgan = require("morgan");
require("dotenv").config();

//require route
const userRoute = require("./routes/user");
const messageRoute = require('./routes/message');
const adminRoute = require('./routes/admin');

const ConversationModel = require("./models/conversation");
const MessageModel = require("./models/messages");

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(bodyParser.json());
app.use(morgan("tiny"));

//use route
app.use("/", userRoute);
app.use("/message", messageRoute);
app.use("/admin", adminRoute);

//chạy khi client kết nối lên server
io.on("connection", (socket) => {

  // Join room nếu đã chat rồi.
  socket.on('join_conversation', idUser => {
    ConversationModel.findOne({
      idUser
    }).then(conversation => {
      if (!conversation) return;

      socket.join(conversation._id);
    })
  })

  socket.on('admin_join_conversation', idConversation => {
    socket.join(idConversation);
  })

  //tạo room và join room
  socket.on("create_conversation", currentUser => {
    
    const conversation = new ConversationModel({
      idUser: currentUser._id,
      nameConversation: currentUser.fullname,
    });
    conversation
      .save()
      .then(data => {
        socket.join(data._id);
        socket.emit('responseRoom', data._id);
      });
  });

  //chat
  socket.on('chat', data => {

    const { _id, sender, message, idConversation } = data.data;
    socket.join(idConversation);
    
    const payload = { idConversation, sender, message, _id }

    io.to(idConversation).emit('message_server_return', payload)
  })



  socket.on("disconnect", () => {
    io.emit("user-leave", "Bạn ấy đã rời cuộc trò truyện");
  });

});

server.listen(PORT, () => {
  console.log(`Server has started on port ${PORT}`);
});