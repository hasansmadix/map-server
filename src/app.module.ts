import { ClassSerializerInterceptor, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from './shared/modules/config/config.module';
import { DatabaseModule } from './shared/modules/typeorm/typeorm.module';
import { AppJwtModule } from './shared/modules/jwt/jwt.module';
import { StaffModule } from './modules/staff/staff.module';
import { SettingsModule } from './modules/settings/settings.module';
import { LanguagesModule } from './modules/languages/languages.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { UploadModule } from './shared/modules/upload/upload.module';
import { SupabaseModule } from './services/supabase/supabase.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { MediaModule } from './modules/media/media.module';
import { PaginationModule } from './common/pagination/pagination.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { BroadcastModule } from './modules/broadcast/broadcast.module';
import { IntentModule } from './modules/intent/intent.module';
import { LeadsModule } from './modules/leads/leads.module';
import { MailModule } from './shared/modules/mail/mail.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    DatabaseModule,
    AppJwtModule,
    UploadModule,
    SupabaseModule,
    MailModule,
    StaffModule,
    SettingsModule,
    LanguagesModule,
    ArticlesModule,
    ProjectsModule,
    MediaModule,
    PaginationModule,
    EquipmentModule,
    BroadcastModule,
    IntentModule,
    LeadsModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
