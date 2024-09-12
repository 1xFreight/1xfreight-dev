import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Chat, ChatDocument } from './chat.entity';
import { Model } from 'mongoose';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name)
    private readonly _chatModel = Model<ChatDocument>,
  ) {}

  async addMessage(user_id: string, data: Partial<Chat>) {
    const message = await this._chatModel.create({
      ...data,
      user_id,
      room: data.room,
      message: data.message,
    });

    return this._chatModel
      .findOne({ _id: message._id })
      .populate({ path: 'user_id', select: 'name email' })
      .exec();
  }

  async getRoomMessages(room: string) {
    return this._chatModel
      .find({ room })
      .populate({ path: 'user_id', select: 'name email' })
      .exec();
  }
}
