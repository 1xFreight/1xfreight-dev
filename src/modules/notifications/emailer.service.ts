import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { InjectModel } from '@nestjs/mongoose';
import { Quote, QuoteDocument } from '../quote/entities/quote.entity';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { formatDate } from '../common/utils/date.util';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectModel(Quote.name) private readonly _quoteModel: Model<QuoteDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: {
        user: 'test@mibackwi3021ie90sajx89120yh31082o.store',
        pass: '5!evWmie',
      },
    });
  }

  async sendMail(
    from: string,
    to: string,
    subject: string,
    text: string,
    replyTo: string,
    html?: string,
  ) {
    const info = await this.transporter.sendMail({
      from, // Sender address
      to, // List of recipients
      subject, // Subject line
      text, // Plain text body
      replyTo,
      html: html, // HTML body (optional)
    });

    console.log('Message sent: %s', info.messageId);
    return info;
  }

  generateQuoteEmailHtml(
    quoteDetails: any,
    addresses: any[],
    items: any[],
    link: string,
    author: string,
  ): string {
    const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#ffffff;">
      <div style="width:100%;background-color:#ffffff;">
        <div style="width:100%;max-width:560px;padding:24px;margin:0 auto;background-color:#e6edff;border:2px solid rgba(0, 32, 221, 0.1);">
          <h2 style="font-size: 18px">${author}</h2>
          <div style="margin-top:16px;">
            <h3 style="color:#ffffff;font-weight:700;font-size:14px;text-transform:uppercase;background:#545454;padding:8px;border-radius:4px;">Details:</h3>
            ${Object.keys(quoteDetails)
              .map((key) => {
                if (typeof quoteDetails[key] === 'object') return '';
                return `
                <div style="padding:8px 12px;font-weight:600;font-size:13px;display:flex;justify-content:space-between;color:#646464;border-bottom:1px solid #ddd;">
                  <span>${key}:</span><span>${quoteDetails[key]}</span>
                </div>
                `;
              })
              .join('')}
          </div>
          <div style="margin-top:16px;">
            <h3 style="color:#ffffff;font-weight:700;font-size:14px;text-transform:uppercase;background:#545454;padding:8px;border-radius:4px;">Locations:</h3>
            ${addresses
              .map(
                (address, index) => `
              <div style="padding:8px 12px;font-weight:600;font-size:13px;display:flex;justify-content:space-between;color:#646464;border-bottom:1px solid #ddd;">
                <span>${index + 1}:</span><span>${address.address}</span>
              </div>
            `,
              )
              .join('')}
          </div>
          ${
            items.length > 0
              ? `
          <div style="margin-top:16px;">
            <h3 style="color:#ffffff;font-weight:700;font-size:14px;text-transform:uppercase;background:#545454;padding:8px;border-radius:4px;">Items:</h3>
            ${items
              .map(
                (item) => `
              <div style="padding:12px;border:2px solid rgba(0, 32, 221, 0.1);border-radius:4px;margin-bottom:12px;">
                ${Object.keys(item)
                  .map(
                    (key) => `
                  <div style="padding:8px 12px;font-weight:600;font-size:13px;display:flex;justify-content:space-between;color:#646464;border-bottom:1px solid #ddd;">
                    <span>${key}:</span><span>${item[key]}</span>
                  </div>
                `,
                  )
                  .join('')}
              </div>
            `,
              )
              .join('')}
          </div>
          `
              : ''
          }
          <div style="margin-top:24px;text-align:center;">
            <a href=${link} target="_blank" style="display:inline-block;width:100%;padding:16px 0;background:#0020DD;border-radius:8px;border:2px solid #ffffff;font-size:24px;color:#ffffff;text-decoration:none;">VIEW</a>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
    return htmlContent;
  }

  generateMessageEmailHtml(link: string, author: string, text: string): string {
    const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#ffffff;">
      <div style="width:100%;background-color:#ffffff;">
        <div style="width:100%;max-width:560px;padding:24px;margin:0 auto;background-color:#e6edff;border:2px solid rgba(0, 32, 221, 0.1);">
          <h2 style="font-size: 18px">${author}</h2>
          
          <div style="margin-top:16px;">
            <h3 style="color:#ffffff;font-weight:700;font-size:14px;text-transform:uppercase;background:#545454;padding:8px;border-radius:4px;">NEW MESSAGE:</h3>
           
              <div style="padding:8px 12px;font-weight:600;font-size:13px;display:flex;justify-content:space-between;color:#646464;border-bottom:1px solid #ddd;">
                <span>${text}</span>
              </div>
            
          </div>
        
          <div style="margin-top:24px;text-align:center;">
            <a href=${link} target="_blank" style="display:inline-block;width:100%;padding:16px 0;background:#0020DD;border-radius:8px;border:2px solid #ffffff;font-size:24px;color:#ffffff;text-decoration:none;">VIEW</a>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
    return htmlContent;
  }

  generateQuoteEmailHTML(quote, message = null) {
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
    
    
    <div style="display: flex; width: 100%; position: relative">
    <h1 style="color: #0020DD; font-size: 22px; font-weight: 600; margin-bottom: 0;max-width: 85%; width: 100%">${quote.author}</h1>
    <p style="color: #545454; font-size: 16px; opacity: 0.5;margin-bottom: 10px; float: right">#${quote.id}</p>
</div>
    <p style="color: #545454; font-size: 16px; opacity: 0.5;margin-bottom: 10px;">${quote.author} uses 1xFreight to manage spot quotes. Please provide a quote for the following shipment:</p>
    
    <!-- Route Information -->
    <div style="margin-bottom: 3px;display: flex; align-items: center;">
      <img src="https://i.ibb.co/pdc9hxf/route-50.png" alt="route" width="20" height="20"> <strong style="margin: 0 8px;">Route:</strong> ${quote.route}
    </div>

    <!-- Type Information -->
    <div style="margin-bottom: 3px;display: flex; align-items: center;">
      <img src="https://i.ibb.co/NZtLySv/type-50.png" alt="type" width="20" height="20"> <strong style="margin: 0 8px;">Type:</strong> ${quote.type}
    </div>
    
    <!-- Equipments if available -->
    ${
      quote.equipments && quote.equipments.length > 0
        ? `<div style="margin-bottom: 3px;display: flex; align-items: center;">
             <img src="https://i.ibb.co/kDYHHNV/equipment-50.png" alt="type" width="20" height="20"> <strong style="margin: 0 8px;">Equipments:</strong> ${quote.equipments.join(', ')}
           </div>`
        : ''
    }
    
     <!-- Commodity if available -->
    ${
      quote.commodity
        ? `<div style="margin-bottom: 3px;display: flex; align-items: center;">
             <img src="https://i.ibb.co/NV1rCYc/commodity-50.png" alt="type" width="20" height="20"> <strong style="margin: 0 8px;">Commodity:</strong> ${quote.commodity}
           </div>`
        : ''
    }
    
    <!-- Weight Information -->
    <div style="margin-bottom: 3px;display: flex; align-items: center;">
      <img src="https://i.ibb.co/k3VrYPH/weight-50.png" alt="type" width="20" height="20"> <strong style="margin: 0 8px;">Weight:</strong> ${quote.weight}
    </div>
    
    
    ${quote.pickup
      .map(
        (address) => `
  <div style="color: #545454;margin-bottom: 6px; margin-top: 50px;">
    <div style="display: flex; align-items: center;gap: 4px; color: #545454">
      <img src="https://i.ibb.co/j3NBz1j/location-50.png" alt="location" width="20" height="20">
      <strong style="margin: 0 8px;">Pickup ${quote.pickup.length > 1 ? address.order : ''}:</strong> ${address.address}
    </div>
    
    ${
      address.date
        ? `
      <div style="display: flex; align-items: center;gap: 4px; color: #545454">
      <img src="https://i.ibb.co/LvwBdYP/calendar-50.png" alt="calendar" width="20" height="20">
    <strong style="margin: 0 8px;">Pickup on:</strong> ${formatDate(address.date)} / ${address.time_start ?? ''} ${address.time_end ? ' - ' + address.time_end : ''}, ${address.shipping_hours}
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
      <strong style="margin: 0 8px;">Delivery ${quote.drop.length > 1 ? address.order : ''}:</strong> ${address.address}
    </div>
    
    ${
      address.date
        ? `
      <div style="display: flex; align-items: center;gap: 4px; color: #545454">
      <img src="https://i.ibb.co/LvwBdYP/calendar-50.png" alt="calendar" width="20" height="20">
    <strong style="margin: 0 8px;">Delivery on:</strong> ${formatDate(address.date)} / ${address.time_start ?? ''} ${address.time_end ? ' - ' + address.time_end : ''}, ${address.shipping_hours}
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
