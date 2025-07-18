import Chat from '../models/Chat.js';
import User from '../models/User.js';

export const accessChat = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.sendStatus(400);

  let chat = await Chat.findOne({
    isGroupChat: false,
    users: { $all: [req.user._id, userId] },
  }).populate("users", "-password").populate("latestMessage");

  if (chat) return res.send(chat);

  chat = await Chat.create({ chatName: "sender", isGroupChat: false, users: [req.user._id, userId] });
  const fullChat = await Chat.findById(chat._id).populate("users", "-password");
  res.status(200).send(fullChat);
};

export const fetchChats = async (req, res) => {
  const chats = await Chat.find({ users: { $in: [req.user._id] } })
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage")
    .sort({ updatedAt: -1 });

  res.status(200).send(chats);
};
