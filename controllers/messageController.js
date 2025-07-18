import Message from '../models/Message.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';

export const sendMessage = async (req, res) => {
  const { content, chatId } = req.body;
  if (!content || !chatId) return res.sendStatus(400);

  let message = await Message.create({
    sender: req.user._id,
    content,
    chat: chatId,
  });

  message = await message.populate("sender", "name pic");
  message = await message.populate("chat");
  message = await User.populate(message, {
    path: "chat.users",
    select: "name pic email",
  });

  await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

  res.json(message);
};

export const allMessages = async (req, res) => {
  const messages = await Message.find({ chat: req.params.chatId })
    .populate("sender", "name pic email")
    .populate("chat");

  res.json(messages);
};
