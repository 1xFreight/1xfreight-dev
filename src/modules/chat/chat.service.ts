import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Chat, ChatDocument } from './chat.entity';
import { Model } from 'mongoose';
import { ObjectId } from 'mongodb';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name)
    private readonly _chatModel = Model<ChatDocument>,
    private readonly _notificationService: NotificationsService,
  ) {}

  async addMessage(user_id: string, data: Partial<Chat>, email: string) {
    const message = await this._chatModel.create({
      ...data,
      user_id,
      room: data.room,
      message: data.message,
    });

    this._notificationService.notifyNewMessage(data.room, message);

    return (
      await this._chatModel
        .aggregate([
          {
            $match: {
              _id: new ObjectId(message._id),
            },
          },
          {
            $addFields: {
              user_id_obj: { $toObjectId: '$user_id' },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id_obj',
              foreignField: '_id',
              as: 'user_id',
            },
          },
          {
            $lookup: {
              from: 'carriers',
              localField: 'user_id.email',
              foreignField: 'email',
              as: 'local_carrier',
            },
          },
          {
            $addFields: {
              user_id: {
                $arrayElemAt: ['$user_id', 0],
              },
              local_carrier: {
                $arrayElemAt: ['$local_carrier', 0],
              },
            },
          },
          {
            $project: {
              'user_id.password': 0,
              user_id_obj: 0,
            },
          },
        ])
        .exec()
    )[0];
  }

  async getRoomMessages(room: string) {
    return this._chatModel
      .aggregate([
        {
          $match: {
            room: room,
          },
        },
        {
          $addFields: {
            user_id_obj: { $toObjectId: '$user_id' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id_obj',
            foreignField: '_id',
            as: 'user_id',
          },
        },
        {
          $lookup: {
            from: 'carriers',
            localField: 'user_id.email',
            foreignField: 'email',
            as: 'local_carrier',
          },
        },
        {
          $addFields: {
            user_id: {
              $arrayElemAt: ['$user_id', 0],
            },
            local_carrier: {
              $arrayElemAt: ['$local_carrier', 0],
            },
          },
        },
        {
          $project: {
            'user_id.password': 0,
            user_id_obj: 0,
          },
        },
      ])
      .exec();
  }
}
