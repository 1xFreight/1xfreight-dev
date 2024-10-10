import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { InjectModel } from '@nestjs/mongoose';
import { Quote, QuoteDocument } from '../quote/entities/quote.entity';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { formatDate, formatDateTime } from '../common/utils/date.util';
import { QuoteStatusEnum } from '../common/enums/quote-status.enum';
import * as process from 'process';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectModel(Quote.name) private readonly _quoteModel: Model<QuoteDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || '', // Ensure a fallback in case the env variable is undefined
      port: Number(process.env.SMTP_PORT) || 587, // Ensure port is a number
      secure: process.env.SMTP_SECURE === 'true', // Convert to boolean explicitly
      auth: {
        user: process.env.SMTP_USER || '', // Add fallback
        pass: process.env.SMTP_PASS || '', // Add fallback
      },
    });
  }

  async sendMail(
    from: string,
    to: string,
    subject: string,
    text: string,
    html?: string,
  ) {
    const info = await this.transporter.sendMail({
      from, // Sender address
      to, // List of recipients
      subject, // Subject line
      text, // Plain text body
      html: html, // HTML body (optional)
    });

    console.log('Message sent: %s', info.messageId);
    return info;
  }

  generateQuoteEmailHTML(quote, message = null, statusUpdate = null) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Quote</title>
</head>
<body style="font-family: Arial, sans-serif; font-size: 16px; color: #545454; margin: 0; padding: 0; width: 100%; background-color: #f4f4f4;">
  <div style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;box-shadow: 0px 0px 10px rgba(0,0,0,0.1);">
    
    ${
      message
        ? `
      <h3 style="margin-bottom: 12px">New message</h3>
      <div style="width: calc(100% - 40px); background: #f9fafe;padding: 20px;">
      <h5 style="margin: 0">${message.author}  <span style="color: #4e63e9; font-weight: 500">${message.time}</span></h5>
      <div style="width: calc(100% - 40px); margin-left: 20px;margin-right: 20px;margin-bottom: 20px; background: #4e63e9; border-radius: 12px; color: whitesmoke; padding: 8px">
      ${message.text} ${message.documentSize ? `<span style="font-size: 10px; padding: 4px; border: 1px solid white; border-radius: 8px">${message.documentSize}</span>` : ''}
</div>
    
</div>

${
  !!message.viewChat
    ? `<a href="${message.viewChat}" target="_blank" style="color: #0020DD; text-decoration: none;font-size: 16px; float: right; display: inline-flex">
        View Chat
        <img src="https://i.ibb.co/NLkf2Dg/right-arrow-70.png" width="30" alt="arrow" style="margin-top: -2px;">
      </a>`
    : ''
}
    `
        : ''
    }
    
    ${
      statusUpdate
        ? `
    <div style="width: 100%">
   <div style="font-size: 16px; color: black; font-weight: 500; margin-top: 0px;">
  ${statusUpdate.carrierName} <span style="float:right; opacity: 0.5"> ${statusUpdate.notificationTime ? formatDateTime(statusUpdate.notificationTime) : ''}</span>
</div> 
  <div style="font-size: 16px; color: black; font-weight: 400; margin-top: -5px;">
  <span style="opacity: 0.35">${statusUpdate.oldStatus ? 'changed quote status' : 'carrier arrived at location'} </span>
</div> 

${
  statusUpdate.oldStatus && statusUpdate.newStatus
    ? `<div style="display: flex; vertical-align: center; margin-left: auto; margin-top:10px">
    
  <p style="font-weight: 500; color: #82C181; font-size: 16px; opacity: 0.7;margin-top: 4px; margin-left: 0px">
    ${statusUpdate.oldStatus.replace('_', ' ')}
  </p>
  <p style="margin-top: 5px;margin-left: 15px;margin-right: 20px; color: #82C181; opacity: 0.6">
    →
  </p>
  <p style="font-weight: 500; color: #82C181; font-size: 20px; margin: 0" >
    ${statusUpdate.newStatus.replace('_', ' ')}
  </p>
</div>`
    : ''
}
  
  
  ${
    statusUpdate.arrival
      ? `<p>
    ${statusUpdate.arrival}
  </p>`
      : ''
  }
  
</div>
      
    `
        : ''
    }
    
    ${quote.status == QuoteStatusEnum.CANCELED ? ` <p>This shipment was canceled by ${quote.author}.</p>` : ''}
    
    
    <div style="display: flex; width: 100%; position: relative">
    <h1 style="color: #0020DD; font-size: 22px; font-weight: 600; margin-bottom: 0;max-width: 85%; width: 100%">${quote.author}</h1>
    <p style="color: #545454; font-size: 16px; opacity: 0.5;margin-bottom: 10px; float: right">#${quote.id}</p>
</div>
    <p style="color: #545454; font-size: 16px; opacity: 0.5;margin-bottom: 10px;">${quote.author} uses 1xFreight to manage spot quotes. Please provide a quote for the following shipment:</p>
    
    <!-- Route Information -->
    <div style="margin-bottom: 3px;display: flex; align-items: center;">
      <img src="https://i.ibb.co/pdc9hxf/route-50.png" alt="route" width="20" height="20"> <strong style="margin: 0 8px; white-space: nowrap">Route:</strong> ${quote.route}
    </div>

    <!-- Type Information -->
    <div style="margin-bottom: 3px;display: flex; align-items: center;">
      <img src="https://i.ibb.co/NZtLySv/type-50.png" alt="type" width="20" height="20"> <strong style="margin: 0 8px; white-space: nowrap">Type:</strong> ${quote.type}
    </div>
    
    <!-- Equipments if available -->
    ${
      quote.equipments && quote.equipments.length > 0
        ? `<div style="margin-bottom: 3px;display: flex; align-items: center;">
             <img src="https://i.ibb.co/kDYHHNV/equipment-50.png" alt="type" width="20" height="20"> <strong style="margin: 0 8px; white-space: nowrap">Equipments:</strong> ${quote.equipments.join(', ')}
           </div>`
        : ''
    }
    
     <!-- Commodity if available -->
    ${
      quote.commodity
        ? `<div style="margin-bottom: 3px;display: flex; align-items: center;">
             <img src="https://i.ibb.co/NV1rCYc/commodity-50.png" alt="type" width="20" height="20"> <strong style="margin: 0 8px; white-space: nowrap">Commodity:</strong> ${quote.commodity}
           </div>`
        : ''
    }
    
    <!-- Weight Information -->
    <div style="margin-bottom: 3px;display: flex; align-items: center;">
      <img src="https://i.ibb.co/k3VrYPH/weight-50.png" alt="type" width="20" height="20"> <strong style="margin: 0 8px; white-space: nowrap">Weight:</strong> ${quote.weight}
    </div>
    
    
    ${quote.pickup
      .map(
        (address) => `
  <div style="color: #545454;margin-bottom: 6px; margin-top: 50px;">
    <div style="display: flex; align-items: center;gap: 4px; color: #545454">
      <img src="https://i.ibb.co/j3NBz1j/location-50.png" alt="location" width="20" height="20">
      <strong style="margin: 0 8px; white-space: nowrap">Pickup ${quote.pickup.length > 1 ? address.order : ''}:</strong> ${address.address}
    </div>
    
    ${
      address.date
        ? `
      <div style="display: flex; align-items: center;gap: 4px; color: #545454">
      <img src="https://i.ibb.co/LvwBdYP/calendar-50.png" alt="calendar" width="20" height="20">
    <strong style="margin: 0 8px; white-space: nowrap">Pickup on:</strong> ${formatDate(address.date)} / ${address.time_start ?? ''} ${address.time_end ? ' - ' + address.time_end : ''}, ${address.shipping_hours?.toLowerCase() ?? ''}
    </div>
    `
        : ''
    }
    
  </div>
  `,
      )
      .join('')}
    
    ${quote.drop
      .map(
        (address) => `
  <div style="color: #545454;margin-bottom: 6px; margin-top: 50px;">
    <div style="display: flex; align-items: center;gap: 4px; color: #545454">
      <img src="https://i.ibb.co/j3NBz1j/location-50.png" alt="location" width="20" height="20">
      <strong style="margin: 0 8px; white-space: nowrap">Delivery ${quote.drop.length > 1 ? address.order : ''}:</strong> ${address.address}
    </div>
    
    ${
      address.date
        ? `
      <div style="display: flex; align-items: center;gap: 4px; color: #545454">
      <img src="https://i.ibb.co/LvwBdYP/calendar-50.png" alt="calendar" width="20" height="20">
    <strong style="margin: 0 8px; white-space: nowrap">Delivery on:</strong> ${formatDate(address.date)} / ${address.time_start ?? ''} ${address.time_end ? ' - ' + address.time_end : ''}, ${address.shipping_hours?.toLowerCase() ?? ''}
    </div>
    `
        : ''
    }
    
  </div>
  `,
      )
      .join('')}
    
    
    ${
      quote.isHazard
        ? `
      <div style="color: #545454; border: 2px solid #ED0000; justify-content: center; border-radius: 8px; margin-top: 20px">
      
        <div style="padding-left: 20px; padding-top: 15px; padding-bottom: 5px; display: flex; align-items: center;">
        <img src="https://i.ibb.co/xjLCvVG/hazard-icon-70.png" alt="warning" width="30" height="30">
      <p style="margin-top: 3px">This shipment contains hazardous goods!</p>
      </div>
    </div>
    `
        : ''
    }
    

    <!-- Button for more information or action -->   
    <div style="width: 100%;margin-top: 20px;display: inline-block">
      
          ${
            !!quote.declineUrl
              ? `<a href="${quote.declineUrl}" target="_blank" style=" color: #ED0000; text-decoration: none; font-size: 16px">
    Decline quote
    </a>`
              : ''
          }
          
          ${
            !!quote.viewUrl
              ? `<a href="${quote.viewUrl}" target="_blank" style="color: #0020DD; text-decoration: none;font-size: 16px; float: right; display: inline-flex">
        View Quote
        <img src="https://i.ibb.co/NLkf2Dg/right-arrow-70.png" width="30" alt="arrow" style="margin-top: -2px;">
      </a>`
              : ''
          }
          

      
    </div>

  </div>
</body>
</html>
`;
  }
}
