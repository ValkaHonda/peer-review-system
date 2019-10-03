import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoreModule } from './core/core.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { WorkItemModule } from './workItem/work-item.module';
import { TeamModule } from './team/team.module';
import { TeamInvitationModule } from './team-invitation/team-invitation.module';
import { Review } from './entities/review.entity';
import { ReviewRequestsModule } from './review-requests/review-requests.module';
import { HandlebarsAdapter, MailerModule } from '@nest-modules/mailer';
import { NotificatorModule } from './notifications/notifaction.module';
import { EmailService } from './notifications/email.service';
import { FilesModule } from './files/files.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: configService.dbType as any,
        host: configService.dbHost,
        port: configService.dbPort,
        username: configService.dbUsername,
        password: configService.dbPassword,
        database: configService.dbName,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        
        migrations: [__dirname + '/migrations'],
        synchronize: true,
      }),
    }),
    MailerModule.forRoot({
      // transport: 'smtps://user@domain.com:pass@smtp.domain.com',
      transport: 'smtps://mailservices321@gmail.com:blog123blog@smtp.gmail.com',
      defaults: {
        from:'"blog blog" <mailservices321@gmail.com>',
      },
      template: {
        dir: __dirname + '/templates',
        adapter: new HandlebarsAdapter(), // or new PugAdapter()
        options: {
          strict: true,
        },
      },
    }),
    MulterModule.register({
      dest: './uploads'
    }),
    AuthModule,
    UsersModule,
    CoreModule, 
    ConfigModule,
    WorkItemModule,
    ConfigModule, 
    TeamModule, 
    TeamInvitationModule, 
    ReviewRequestsModule,
    NotificatorModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
