import { IsEnum, IsPhoneNumber, IsString, Length, Matches, MaxLength } from 'class-validator';
export enum Channel { WHATSAPP = 'WHATSAPP', SMS = 'SMS' }
export class SendOtpDto {
  @IsPhoneNumber() destination!: string;
  @IsEnum(Channel) channel!: Channel;
  @IsString() @MaxLength(40) @Matches(/^[a-z0-9_-]+$/) purpose!: string;
}
export class VerifyOtpDto {
  @IsString() @Length(20, 40) requestId!: string;
  @Matches(/^\d{6}$/) code!: string;
}
