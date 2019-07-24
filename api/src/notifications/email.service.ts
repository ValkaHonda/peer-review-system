import { Injectable } from "@nestjs/common";
import { MailerService } from "@nest-modules/mailer";

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
  ) { }

  public sendEmail(to: string, subject: string, text: string): void {
    this
      .mailerService
      .sendMail({
        to: to, // sender address
        // from: 'valentin808@gmail.com', // list of receivers
        subject: subject, // Subject line
        text: text, // plaintext body
        html: '<b>Notification service</b>', // HTML body content
      })
      .then((success) => {
          console.log(success);
      })
      .catch((err) => {
          console.log(err);
      });
  }
}